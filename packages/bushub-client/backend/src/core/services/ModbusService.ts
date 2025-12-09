import ModbusRTU from 'modbus-serial';

import { isModbusMockEnabled } from '../../config/mock.config'; // USB 테스트 모드 추가
import { getModbusConfig } from '../../config/modbus.config'; // src/config/modbus.config.ts에서 가져오기
import { IUnit } from '../../models/schemas/UnitSchema';
import { ILogger } from '../../shared/interfaces/ILogger';
import { HttpModbusError, HttpValidationError } from '../../shared/utils/responseHelper';
import { IModbusRepository } from '../repositories/interfaces/IModbusRepository';

import { IModbusService } from './interfaces/IModbusService';
import { IWebSocketService } from './interfaces/IWebSocketService';
// import { ModbusCommandQueue } from './ModbusCommandQueue'; // 🚧 제거 예정
import { ModbusCommand } from './ModbusCommandQueue';
import { UnifiedModbusService } from './UnifiedModbusService'; // 🆕 UnifiedModbusService 추가

// Modbus 패킷 정보를 위한 인터페이스
interface ModbusPacketInfo {
  transactionId?: number;
  protocolId: number;
  length: number;
  unitId: number;
  functionCode: number;
  data: Buffer | number[];
  checksum?: number;
}

// Mock 모드 및 USB 테스트 모드 설정 - 중앙화된 설정 사용
const USE_MOCK = isModbusMockEnabled();

export class ModbusService implements IModbusService {
  private _client: ModbusRTU;
  private connections: Map<string, ModbusRTU> = new Map();
  // private commandQueue: ModbusCommandQueue; // 🚧 제거 예정
  private config = getModbusConfig();

  // 🆕 UnifiedModbusService 인스턴스 추가
  private unifiedModbusService: UnifiedModbusService;

  constructor(
    private modbusRepository: IModbusRepository,
    private webSocketService?: IWebSocketService,
    private logger?: ILogger,
  ) {
    // this.commandQueue = new ModbusCommandQueue(logger); // 🚧 제거 예정

    // 🚧 TODO: UnifiedModbusService는 ServiceContainer에서 주입받아야 함
    // 현재는 임시로 null로 설정
    this.unifiedModbusService = null as any;
    this.logger?.warn('[ModbusService] UnifiedModbusService는 ServiceContainer에서 주입받아야 합니다');

    if (!USE_MOCK) {
      this._client = new ModbusRTU();
    } else {
      this._client = {} as ModbusRTU; // Prevent type errors in mock mode
    }
  }

  async connect(unit: IUnit): Promise<void> {
    if (USE_MOCK) {
      this.logger?.info(`Mock Modbus 연결: Unit ${unit.name} (${unit.unitId})`);
      return;
    }

    // USB 테스트 모드 또는 RS485 모드에서 실제 통신 수행
    try {
      const client = new ModbusRTU();

      if (client.isOpen) {
        await client.close(() => {
          // Empty callback for close operation
        });
      }

      // RS485 모드: modbus.config.ts의 설정 사용
      const modbusConfig = getModbusConfig();
      const { port } = modbusConfig;
      const { baudRate } = modbusConfig;
      const { slaveId } = modbusConfig;

      this.logger?.info(`RS485 모드 연결 시도: Port: ${port}, BaudRate: ${baudRate}, SlaveId: ${slaveId}`);

      await client.connectRTUBuffered(port, {
        baudRate,
      });

      client.setID(slaveId);
      client.setTimeout(this.config.timeout);

      this.connections.set(unit.unitId, client);

      // 연결 정보 저장
      this.modbusRepository.saveConnection({
        unitId: unit.unitId,
        port,
        baudRate,
        slaveId,
        isConnected: true,
        lastConnected: new Date(),
      });

      const mode = 'RS485';
      this.logger?.info(
        `Modbus 연결 성공: Unit ${unit.name} (${unit.unitId}) - 모드: ${mode}, Port: ${port}, BaudRate: ${baudRate}, SlaveId: ${slaveId}`,
      );

      // 연결 성공 브로드캐스팅
      this.webSocketService?.broadcastLog(
        'info',
        'modbus',
        `Modbus 연결 성공: ${unit.name} (${unit.unitId}) - 모드: ${mode}, Port: ${port}, BaudRate: ${baudRate}, SlaveId: ${slaveId}`,
      );
    } catch (error) {
      const mode = 'RS485';
      this.logger?.error(`Modbus 연결 실패: Unit ${unit.name} (${unit.unitId}) - 모드: ${mode} - ${error}`);

      // 연결 실패 브로드캐스팅
      this.webSocketService?.broadcastLog(
        'error',
        'modbus',
        `Modbus 연결 실패: ${unit.name} (${unit.unitId}) - 모드: ${mode} - ${error}`,
      );

      throw error;
    }
  }

  async disconnect(unit: IUnit): Promise<void> {
    if (USE_MOCK) {
      this.logger?.info(`Mock Modbus 연결 해제: Unit ${unit.name} (${unit.unitId})`);
      return;
    }

    const client = this.connections.get(unit.unitId);
    if (client) {
      try {
        await client.close(() => {
          // Empty callback for close operation
        });
        this.connections.delete(unit.unitId);

        const mode = 'RS485';
        this.logger?.info(`Modbus 연결 해제 성공: Unit ${unit.name} (${unit.unitId}) - 모드: ${mode}`);

        // 연결 해제 브로드캐스팅
        this.webSocketService?.broadcastLog(
          'info',
          'modbus',
          `Modbus 연결 해제: ${unit.name} (${unit.unitId}) - 모드: ${mode}`,
        );
      } catch (error) {
        const mode = 'RS485';
        this.logger?.error(`Modbus 연결 해제 실패: Unit ${unit.name} (${unit.unitId}) - 모드: ${mode} - ${error}`);
      }
    }
  }

  isConnected(unit: IUnit): boolean {
    return this.connections.has(unit.unitId);
  }

  async read(unit: IUnit, functionCode: number, address: number, length: number): Promise<any> {
    // 🆕 중앙큐를 통한 명령 실행
    const command: ModbusCommand = {
      id: `modbus_read_${unit.unitId}_${functionCode}_${address}_${Date.now()}`,
      type: 'read',
      unitId: unit.unitId,
      functionCode,
      address,
      lengthOrValue: length,
      priority: 'low', // 폴링은 낮은 우선순위
      timestamp: new Date(),
      resolve: () => {
        // Placeholder for queue resolution
      },
      reject: () => {
        // Placeholder for queue resolution
      },
    };

    // 🆕 UnifiedModbusService를 통한 명령 실행
    return await this.unifiedModbusService.executeCommand(command);
  }

  async write(unit: IUnit, functionCode: number, address: number, value: any): Promise<any> {
    // 🆕 중앙큐를 통한 명령 실행
    const command: ModbusCommand = {
      id: `modbus_write_${unit.unitId}_${functionCode}_${address}_${Date.now()}`,
      type: 'write',
      unitId: unit.unitId,
      functionCode,
      address,
      lengthOrValue: value,
      priority: 'high', // 제어는 높은 우선순위
      timestamp: new Date(),
      resolve: () => {
        // Placeholder for queue resolution
      },
      reject: () => {
        // Placeholder for queue resolution
      },
    };

    // 🆕 UnifiedModbusService를 통한 명령 실행
    return await this.unifiedModbusService.executeCommand(command);
  }

  /**
   * 실제 읽기 명령 실행 (기존 read 메서드의 로직)
   */
  private async executeReadCommand(unit: IUnit, functionCode: number, address: number, length: number): Promise<any> {
    try {
      const mode = 'RS485';
      this.logger?.info(
        `Modbus 읽기: Unit ${unit.name} (${unit.unitId}) - 모드: ${mode} - FC:${functionCode}, Addr:${address}, Len:${length}`,
      );

      if (USE_MOCK) {
        // Mock 모드에서도 패킷 정보 로깅
        const mockPacket = this.generateMockPacketInfo(unit, functionCode, address, length, true);
        this.logModbusPacket('TX', mockPacket, 'Mock Read Request');

        // Mock 데이터
        const result = {
          value: Math.random() * 100,
          timestamp: new Date(),
        };

        // Mock 결과 저장
        this.modbusRepository.saveReadResult({
          value: result.value,
          timestamp: result.timestamp,
          unitId: unit.unitId,
          functionCode,
          address,
          length,
        });

        this.logger?.info(`Modbus 읽기 성공: Unit ${unit.name} (${unit.unitId}) - Mock 모드 - 결과: ${result.value}`);
        return result;
      }

      // 실제 Modbus 통신 (USB 테스트 모드 또는 RS485 모드)
      const client = this.connections.get(unit.unitId);
      if (!client) {
        throw new HttpModbusError(`No Modbus connection for unit ${unit.unitId}`);
      }

      // 실제 통신 패킷 정보 로깅 (TX)
      const txPacket = this.generateMockPacketInfo(unit, functionCode, address, length, true);
      this.logModbusPacket('TX', txPacket, `${mode} Read Request`);

      let result;
      switch (functionCode) {
        case 3: // Read Holding Registers
          result = await client.readHoldingRegisters(address, length);
          break;
        case 4: // Read Input Registers
          result = await client.readInputRegisters(address, length);
          break;
        case 1: // Read Coils
          result = await client.readCoils(address, length);
          break;
        case 2: // Read Discrete Inputs
          result = await client.readDiscreteInputs(address, length);
          break;
        default:
          throw new HttpValidationError(`Unsupported function code: ${functionCode}`);
      }

      // 응답 패킷 정보 로깅 (RX)
      const rxPacket: ModbusPacketInfo = {
        transactionId: txPacket.transactionId || 0,
        protocolId: 0,
        length: 3 + (result.data?.length || 0) * 2, // UnitID + FC + ByteCount + Data
        unitId: 1, // 기본값으로 1 사용
        functionCode,
        data: Array.isArray(result.data)
          ? result.data.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : Number(v)))
          : [],
      };
      this.logModbusPacket('RX', rxPacket, `${mode} Read Response`);

      const readResult = {
        value: typeof result.data[0] === 'number' ? result.data[0] : 0,
        timestamp: new Date(),
      };

      // 결과 저장
      this.modbusRepository.saveReadResult({
        value: readResult.value,
        timestamp: readResult.timestamp,
        unitId: unit.unitId,
        functionCode,
        address,
        length,
      });

      this.logger?.info(
        `Modbus 읽기 성공: Unit ${unit.name} (${unit.unitId}) - 모드: ${mode} - 결과: ${readResult.value}`,
      );

      // 읽기 성공 브로드캐스팅
      this.webSocketService?.broadcastLog(
        'info',
        'modbus',
        `Modbus 읽기 성공: ${unit.name} (${unit.unitId}) - 모드: ${mode} - FC:${functionCode}, Addr:${address}, Len:${length}, Value:${readResult.value}`,
      );

      return readResult;
    } catch (error) {
      const mode = 'RS485';
      this.logger?.error(`Modbus 읽기 실패: Unit ${unit.name} (${unit.unitId}) - 모드: ${mode}`);

      // 읽기 실패 브로드캐스팅
      this.webSocketService?.broadcastLog(
        'error',
        'modbus',
        `Modbus 읽기 실패: ${unit.name} (${
          unit.unitId
        }) - 모드: ${mode} - FC:${functionCode}, Addr:${address}, Len:${length} - ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      throw error;
    }
  }

  /**
   * 실제 쓰기 명령 실행 (기존 write 메서드의 로직)
   */
  private async executeWriteCommand(unit: IUnit, functionCode: number, address: number, value: any): Promise<any> {
    try {
      const mode = 'RS485';
      this.logger?.info(
        `Modbus 쓰기: Unit ${unit.name} (${unit.unitId}) - 모드: ${mode} - FC:${functionCode}, Addr:${address}, Value:${value}`,
      );

      // Mock 모드 디버깅 로그 추가
      this.logger?.info(`[DEBUG] USE_MOCK: ${USE_MOCK}, MODBUS_MOCK_ENABLED: ${process.env.MODBUS_MOCK_ENABLED}`);
      this.logger?.info(`[DEBUG] Mock 모드: ${USE_MOCK ? '🟡 활성화' : '🟢 비활성화'}`);
      this.logger?.info(`[DEBUG] 실제 하드웨어 통신: ${USE_MOCK ? '❌ 시뮬레이션' : '✅ 실제 통신'}`);

      if (USE_MOCK) {
        // Mock 모드에서도 패킷 정보 로깅
        const mockPacket = this.generateMockPacketInfo(unit, functionCode, address, value, false);
        this.logModbusPacket('TX', mockPacket, 'Mock Write Request');

        // Mock 데이터
        const result = {
          success: true,
          timestamp: new Date(),
        };

        // Mock 결과 저장
        this.modbusRepository.saveWriteResult({
          success: result.success,
          timestamp: result.timestamp,
          unitId: unit.unitId,
          functionCode,
          address,
          value,
        });

        this.logger?.info(`Modbus 쓰기 성공: Unit ${unit.name} (${unit.unitId}) - Mock 모드 - 값: ${value}`);
        return result;
      }

      // 실제 Modbus 통신 (USB 테스트 모드 또는 RS485 모드)
      const client = this.connections.get(unit.unitId);
      if (!client) {
        throw new HttpModbusError(`No Modbus connection for unit ${unit.unitId}`);
      }

      // 실제 통신 패킷 정보 로깅 (TX)
      const txPacket = this.generateMockPacketInfo(unit, functionCode, address, value, false);
      this.logModbusPacket('TX', txPacket, `${mode} Write Request`);

      switch (functionCode) {
        case 5: // Write Single Coil
          await client.writeCoil(address, value);
          break;
        case 6: // Write Single Register
          await client.writeRegister(address, value);
          break;
        case 15: // Write Multiple Coils
          await client.writeCoils(address, value);
          break;
        case 16: // Write Multiple Registers
          await client.writeRegisters(address, value);
          break;
        default:
          throw new HttpValidationError(`Unsupported function code: ${functionCode}`);
      }

      // 응답 패킷 정보 로깅 (RX) - Write는 단순한 ACK
      const rxPacket: ModbusPacketInfo = {
        transactionId: txPacket.transactionId || 0,
        protocolId: 0,
        length: 6, // UnitID + FC + Address(2) + Value(2)
        unitId: 1, // 기본값으로 1 사용
        functionCode,
        data: [address >> 8, address & 0xff, value >> 8, value & 0xff],
      };
      this.logModbusPacket('RX', rxPacket, `${mode} Write Response`);

      const writeResult = {
        success: true,
        timestamp: new Date(),
      };

      // 결과 저장
      this.modbusRepository.saveWriteResult({
        success: writeResult.success,
        timestamp: writeResult.timestamp,
        unitId: unit.unitId,
        functionCode,
        address,
        value,
      });

      this.logger?.info(`Modbus 쓰기 성공: Unit ${unit.name} (${unit.unitId}) - 모드: ${mode} - 값: ${value}`);
      return writeResult;
    } catch (error) {
      const mode = 'RS485';
      this.logger?.error(`Modbus 쓰기 실패: Unit ${unit.name} (${unit.unitId}) - 모드: ${mode}`);
      throw error;
    }
  }

  // Modbus 패킷 정보를 로깅하는 헬퍼 메서드
  private logModbusPacket(direction: 'TX' | 'RX', packetInfo: ModbusPacketInfo, additionalInfo?: string): void {
    const dataHex = Array.isArray(packetInfo.data)
      ? packetInfo.data.map((b) => b.toString(16).padStart(2, '0')).join(' ')
      : packetInfo.data.toString('hex');

    this.logger?.info(
      `[ModbusPacket] ${direction} | UnitID: ${packetInfo.unitId} | FC: ${packetInfo.functionCode} | Length: ${
        packetInfo.length
      } | Data: ${dataHex}${additionalInfo ? ` | ${additionalInfo}` : ''}`,
    );
  }

  // Mock 모드에서도 패킷 정보를 시뮬레이션
  private generateMockPacketInfo(
    unit: IUnit,
    functionCode: number,
    address: number,
    lengthOrValue: number,
    isRead: boolean,
  ): ModbusPacketInfo {
    const transactionId = Math.floor(Math.random() * 65536);
    const protocolId = 0; // Modbus TCP는 0, RTU는 해당 없음
    const unitId = 1; // 기본값으로 1 사용, 실제로는 시스템 설정에서 가져와야 함

    let data: number[];
    let packetLength: number;

    if (isRead) {
      // Read request
      data = [address >> 8, address & 0xff, lengthOrValue >> 8, lengthOrValue & 0xff];
      packetLength = 6; // UnitID + FC + Address(2) + Length(2)
    } else {
      // Write request
      data = [address >> 8, address & 0xff, lengthOrValue >> 8, lengthOrValue & 0xff];
      packetLength = 6; // UnitID + FC + Address(2) + Value(2)
    }

    return {
      transactionId,
      protocolId,
      length: packetLength,
      unitId,
      functionCode,
      data,
    };
  }

  /**
   * 🆕 큐 상태 조회 - UnifiedModbusService로 위임
   */
  getQueueStatus() {
    return this.unifiedModbusService.getQueueStatus();
  }

  /**
   * 🆕 특정 유닛의 큐 상태 조회 - UnifiedModbusService로 위임
   */
  getUnitQueueStatus(unitId: string) {
    return this.unifiedModbusService.getUnitQueueStatus(unitId);
  }

  /**
   * 🆕 큐 정리 - UnifiedModbusService로 위임
   */
  clearQueue(): void {
    this.unifiedModbusService.clearQueue();
  }

  // 🆕 readRegisters 메소드 추가 - 내부적으로 UnifiedModbusService 사용
  async readRegisters(request: any): Promise<any> {
    try {
      this.logger?.info(
        `[ModbusService] readRegisters 호출: Slave ${request.slaveId}, FC ${request.functionCode}, Addr ${request.address}, Len ${request.length}`,
      );

      // ModbusCommand 생성
      const command = {
        id: `modbus_read_${request.slaveId}_${request.functionCode}_${request.address}_${Date.now()}`,
        type: 'read' as const,
        unitId: request.slaveId.toString(),
        functionCode: request.functionCode,
        address: request.address,
        lengthOrValue: request.length,
        priority: 'normal' as const,
        timestamp: new Date(),
        resolve: () => {
          // Placeholder for queue resolution
        }, // 🆕 resolve 속성 추가
        reject: () => {
          // Placeholder for queue resolution
        }, // 🆕 reject 속성 추가
      };

      // UnifiedModbusService를 통한 중앙 큐 실행
      const result = await this.unifiedModbusService.executeCommand(command);

      // 기존 응답 형식으로 변환
      return {
        success: result.success,
        data: result.data,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error(`[ModbusService] readRegisters 실패: ${error}`);
      throw error;
    }
  }

  // 🆕 writeRegister 메소드 추가 - 내부적으로 UnifiedModbusService 사용
  async writeRegister(request: any): Promise<any> {
    try {
      this.logger?.info(
        `[ModbusService] writeRegister 호출: Slave ${request.slaveId}, FC ${request.functionCode}, Addr ${request.address}, Value ${request.value}`,
      );

      // ModbusCommand 생성
      const command = {
        id: `modbus_write_${request.slaveId}_${request.functionCode}_${request.address}_${Date.now()}`,
        type: 'write' as const,
        unitId: request.slaveId.toString(),
        functionCode: request.functionCode,
        address: request.address,
        lengthOrValue: request.value,
        priority: 'high' as const,
        timestamp: new Date(),
        resolve: () => {
          // Placeholder for queue resolution
        }, // 🆕 resolve 속성 추가
        reject: () => {
          // Placeholder for queue resolution
        }, // 🆕 reject 속성 추가
      };

      // UnifiedModbusService를 통한 중앙 큐 실행
      const result = await this.unifiedModbusService.executeCommand(command);

      // 기존 응답 형식으로 변환
      return {
        success: result.success,
        data: result.data,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger?.error(`[ModbusService] writeRegister 실패: ${error}`);
      throw error;
    }
  }
}
