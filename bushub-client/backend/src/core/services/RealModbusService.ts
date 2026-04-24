import { EventEmitter } from 'events';

import ModbusRTU from 'modbus-serial';

import { buildReverseIndex, ReverseIndexSpec } from '../../meta/protocols/mockValueGenerator';
import { ILogger } from '../../shared/interfaces/ILogger';
import { getModbusConfig, getModbusAddressMapping } from '../../utils/environment';
import {
  ModbusReadRequest,
  ModbusWriteRequest,
  ModbusResponse,
  QueueStatus,
  UnitQueueStatus,
  IModbusCommunication,
} from '../interfaces/IModbusCommunication';

// ✅ 정적 import로 변경

// 타입 정의
interface IModbusConfig {
  port: string;
  baudRate: number;
  timeout: number;
  rtscts?: boolean; // RTS/CTS 흐름 제어
  packetLogging?: boolean;
  enablePortTest?: boolean;
}

interface IAddressMapping {
  do: Record<string, (number | null)[]>;
  di: Record<string, (number | null)[]>;
  schedule: Record<string, Record<string, (number | null)[]>>;
  hvac: Record<string, number>;
  heatExchanger: Record<string, number>;
  sensor: Record<string, number>;
}

// ✅ 에러 타입 정의 추가
enum ModbusErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  HARDWARE_ERROR = 'HARDWARE_ERROR',
  PROTOCOL_ERROR = 'PROTOCOL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

interface ModbusErrorInfo {
  type: ModbusErrorType;
  message: string;
  retryable: boolean;
  originalError: any;
}

/**
 * 실제 Modbus 하드웨어와 통신하는 서비스
 */
export class RealModbusService implements IModbusCommunication {
  // ✅ ModbusRTU 타입으로 명시
  private modbusClient: ModbusRTU | null = null;
  private _isConnected = false;
  private connectionRetryCount = 0;
  private maxConnectionRetries = 3;
  private logger: ILogger | undefined;
  private config: IModbusConfig;
  private addressMapping: IAddressMapping;
  private reverseIndex: Map<string, ReverseIndexSpec> | undefined;

  // ✅ 연결 상태 관리 개선
  private connectionPromise: Promise<boolean> | null = null;

  constructor(logger?: ILogger, config?: any) {
    this.logger = logger;
    this.config = config || getModbusConfig();
    this.addressMapping = getModbusAddressMapping();
    this.reverseIndex = buildReverseIndex();
    this.logger?.debug(`[RealModbusService] 초기화 완료 - Baud Rate: ${this.config?.baudRate || 'unknown'}bps`);
    this.logger?.debug(`[RealModbusService] Reverse Index 구축 완료 - 크기: ${this.reverseIndex.size}`);
  }

  // ==================== IModbusCommunication 구현 ====================

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    // ✅ 실제 연결 상태 검증 추가
    return this._isConnected && this.modbusClient !== null;
  }

  /**
   * 🆕 중앙큐를 통한 명령 실행 - RealModbusService에서는 직접 통신만 수행
   */
  async executeCommand(command: any): Promise<any> {
    try {
      if (command.type === 'read') {
        return await this.readRegisters({
          slaveId: parseInt(command.unitId),
          functionCode: command.functionCode,
          address: command.address,
          length: command.lengthOrValue,
        });
      } else if (command.type === 'write') {
        return await this.writeRegister({
          slaveId: parseInt(command.unitId),
          functionCode: command.functionCode,
          address: command.address,
          value: command.lengthOrValue,
        });
      }
      throw new Error(`지원하지 않는 명령 타입: ${command.type}`);
    } catch (error) {
      this.logger?.error(`[RealModbusService] executeCommand 실패: ${this.errorToSearchableString(error)}`);
      throw error;
    }
  }

  /**
   * 포트 접근 테스트 (modbus-serial)
   * connectRTUBuffered는 Promise를 반환하므로 await·이벤트·타임아웃을 한 경로로 묶어 미처리 rejection을 방지한다.
   */
  private async testPortAccess(): Promise<boolean> {
    this.logger?.info(`[RealModbusService] 포트 ${this.config.port} 접근 테스트 시작`);

    const testClient = new ModbusRTU();
    const testConnectOptions: any = { baudRate: this.config.baudRate };
    if (this.config.rtscts) {
      testConnectOptions.rtscts = true;
    }

    const closeSafe = async (): Promise<void> => {
      try {
        await testClient.close();
      } catch {
        /* 닫기 실패는 무시 */
      }
    };

    const testEmitter = testClient as unknown as EventEmitter;
    let onError: ((err: unknown) => void) | undefined;

    try {
      const errorPromise = new Promise<never>((_, reject) => {
        onError = (err: unknown) => {
          reject(err instanceof Error ? err : new Error(this.errorToSearchableString(err)));
        };
        testEmitter.once('error', onError);
      });

      await Promise.race([
        testClient.connectRTUBuffered(this.config.port, testConnectOptions),
        errorPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('포트 접근 테스트 타임아웃')), 5000)),
      ]);

      if (onError) {
        testEmitter.removeListener('error', onError);
      }

      await closeSafe();
      this.logger?.info(`[RealModbusService] 포트 ${this.config.port} 접근 테스트 성공`);
      return true;
    } catch (error) {
      if (onError) {
        testEmitter.removeListener('error', onError);
      }
      this.logger?.warn(`[RealModbusService] 포트 접근 테스트 실패: ${this.errorToSearchableString(error)}`);
      await closeSafe();
      return false;
    }
  }

  /**
   * 연결 시도 (modbus-serial 전용)
   */
  async connect(): Promise<boolean> {
    try {
      this.logger?.info(`[RealModbusService] 포트 ${this.config.port} 연결 시도`);

      // 포트 사전 테스트(실패해도 본 연결 시도는 진행 — 테스트만으로는 일시적/USB 재열림 등을 구분하기 어려움)
      if (this.config.enablePortTest !== false) {
        const portAccessible = await this.testPortAccess();
        if (!portAccessible) {
          this.logger?.warn(
            `[RealModbusService] 포트 ${this.config.port} 사전 테스트 실패 — Modbus 본 연결을 계속 시도합니다`,
          );
        }
      }

      // ✅ 기존 클라이언트 재사용 또는 새로 생성
      if (!this.modbusClient) {
        this.modbusClient = new ModbusRTU();
      }

      // RTU Buffered 연결 설정
      const connectOptions: any = {
        baudRate: this.config.baudRate,
      };
      // RTS/CTS 흐름 제어 설정 (옵션)
      if (this.config.rtscts) {
        connectOptions.rtscts = true;
      }
      await this.modbusClient.connectRTUBuffered(this.config.port, connectOptions);

      this.modbusClient.setTimeout(this.config.timeout);
      this._isConnected = true;
      this.connectionRetryCount = 0;

      this.logger?.info(`[RealModbusService] Modbus 클라이언트 설정 완료`);
      return true;
    } catch (error) {
      this.connectionRetryCount++;
      const detail = this.errorToSearchableString(error);
      const errorMsg = `[RealModbusService] 연결 시도 실패 (${this.connectionRetryCount}/${this.maxConnectionRetries}): ${detail}`;
      this.logger?.error(errorMsg);

      if (this.connectionRetryCount >= this.maxConnectionRetries) {
        const finalErrorMsg = `[RealModbusService] 최대 재시도 횟수 초과 - 포트 ${this.config.port} 연결 불가 (${detail})`;
        this.logger?.error(finalErrorMsg);
        throw new Error(finalErrorMsg);
      }
      throw error instanceof Error ? error : new Error(detail);
    }
  }

  /**
   * ✅ 연결 재시도 (지수 백오프 적용)
   */
  async retryConnection(): Promise<boolean> {
    this.logger?.info(`[RealModbusService] 연결 재시도 시작`);

    // 지수 백오프 적용 (1초, 2초, 4초...)
    const backoffDelay = Math.min(1000 * Math.pow(2, this.connectionRetryCount), 30000);
    this.logger?.info(`[RealModbusService] ${backoffDelay}ms 후 재시도`);

    await new Promise((resolve) => setTimeout(resolve, backoffDelay));

    this.connectionRetryCount = 0;
    return await this.connect();
  }

  /** 시리얼/Modbus 에러에서 검색용 문자열 (PortNotOpenError 객체 등) */
  private errorToSearchableString(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name} ${error.message}`;
    }
    if (typeof error === 'object' && error !== null) {
      const o = error as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name : '';
      const message = typeof o.message === 'string' ? o.message : '';
      const errno = typeof o.errno === 'string' ? o.errno : '';
      return `${name} ${message} ${errno}`;
    }
    return String(error);
  }

  /** USB 재연결·포트 끊김 등 재연결 후 재시도할 만한 오류 */
  private isRecoverableSerialError(error: unknown): boolean {
    const s = this.errorToSearchableString(error).toLowerCase();
    if (s.includes('portnotopen') || s.includes('port not open')) {
      return true;
    }
    if (s.includes('econnrefused')) {
      return true;
    }
    if (s.includes('port is closed') || (s.includes('closed') && s.includes('port'))) {
      return true;
    }
    return false;
  }

  /**
   * ✅ 에러 분류 및 처리 개선
   */
  private classifyError(error: any, context: string): ModbusErrorInfo {
    let errorType = ModbusErrorType.UNKNOWN_ERROR;
    let retryable = false;
    let message = '알 수 없는 오류가 발생했습니다';

    // serialport 등 Error 가 아닌 { name, message, errno } 객체
    if (error && typeof error === 'object' && !(error instanceof Error)) {
      const name = String((error as { name?: string }).name ?? '');
      const msg = String((error as { message?: string }).message ?? '');
      if (name === 'PortNotOpenError' || msg.toLowerCase().includes('port not open')) {
        return {
          type: ModbusErrorType.CONNECTION_ERROR,
          message: `${context}: 시리얼 포트가 열려 있지 않습니다`,
          retryable: true,
          originalError: error,
        };
      }
    }

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // 연결 관련 에러
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        errorType = ModbusErrorType.TIMEOUT_ERROR;
        retryable = true;
        message = '통신 타임아웃이 발생했습니다';
      }
      // 하드웨어 관련 에러
      else if (errorMessage.includes('connection') || errorMessage.includes('port')) {
        errorType = ModbusErrorType.CONNECTION_ERROR;
        retryable = true;
        message = '연결 오류가 발생했습니다';
      }
      // 프로토콜 관련 에러
      else if (errorMessage.includes('invalid') || errorMessage.includes('function code')) {
        errorType = ModbusErrorType.PROTOCOL_ERROR;
        retryable = false;
        message = '잘못된 Modbus 명령입니다';
      }
      // 검증 관련 에러
      else if (errorMessage.includes('validation') || errorMessage.includes('address')) {
        errorType = ModbusErrorType.VALIDATION_ERROR;
        retryable = false;
        message = '잘못된 주소 또는 값입니다';
      }
      // 하드웨어 응답 에러
      else if (errorMessage.includes('response') || errorMessage.includes('slave')) {
        errorType = ModbusErrorType.HARDWARE_ERROR;
        retryable = true;
        message = '하드웨어 응답 오류가 발생했습니다';
      }
      // 시리얼 포트 관련 에러
      else if (errorMessage.includes('serial') || errorMessage.includes('com') || errorMessage.includes('tty')) {
        errorType = ModbusErrorType.CONNECTION_ERROR;
        retryable = true;
        message = '시리얼 포트 연결 오류가 발생했습니다';
      }
      // 권한 관련 에러
      else if (
        errorMessage.includes('permission') ||
        errorMessage.includes('access') ||
        errorMessage.includes('denied')
      ) {
        errorType = ModbusErrorType.CONNECTION_ERROR;
        retryable = false;
        message = '포트 접근 권한이 없습니다';
      }
      // 디바이스 관련 에러
      else if (errorMessage.includes('device') || errorMessage.includes('busy') || errorMessage.includes('not found')) {
        errorType = ModbusErrorType.HARDWARE_ERROR;
        retryable = true;
        message = '디바이스 오류가 발생했습니다';
      }
      // 프로토콜 관련 추가 에러
      else if (errorMessage.includes('crc') || errorMessage.includes('checksum') || errorMessage.includes('parity')) {
        errorType = ModbusErrorType.PROTOCOL_ERROR;
        retryable = true;
        message = '프로토콜 통신 오류가 발생했습니다';
      }
    } else {
      // Error 객체가 아닌 경우 — 객체 형태면 짧게 표시
      if (error && typeof error === 'object') {
        const name = (error as { name?: string }).name;
        const msg = (error as { message?: string }).message;
        if (name || msg) {
          message = `${name ?? '?'}: ${msg ?? ''}`;
        } else {
          message = `예상치 못한 에러 타입: ${typeof error}, 값: ${JSON.stringify(error)}`;
        }
      } else {
        message = `예상치 못한 에러 타입: ${typeof error}, 값: ${JSON.stringify(error)}`;
      }
    }

    return {
      type: errorType,
      message: `${context}: ${message}`,
      retryable,
      originalError: error,
    };
  }

  async disconnect(): Promise<void> {
    const client = this.modbusClient;
    try {
      if (client) {
        await client.close();
        this.logger?.info(`[RealModbusService] RS485 연결 해제 완료`);
      }
    } catch (error) {
      this.logger?.warn(
        `[RealModbusService] 연결 해제 중 오류(상태는 정리함): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      this._isConnected = false;
      this.modbusClient = null;
      this.connectionPromise = null;
    }
  }

  /**
   * 읽기/쓰기 공통: 포트 끊김 등 복구 가능 오류 시 disconnect → connect 후 1회만 재시도 (USB·내장 RS-485 공통)
   */
  private async runWithSerialReconnect<T>(operation: () => Promise<T>, label: 'read' | 'write'): Promise<T> {
    try {
      if (!this.isConnected()) {
        await this.connect();
      }
      return await operation();
    } catch (error) {
      if (!this.isRecoverableSerialError(error)) {
        throw error;
      }
      this.logger?.warn(
        `[RealModbusService] 시리얼 끊김 감지(${label}), 재연결 후 1회 재시도: ${this.errorToSearchableString(error)}`,
      );
      await this.disconnect();
      await this.connect();
      return await operation();
    }
  }

  async readRegisters(request: ModbusReadRequest): Promise<ModbusResponse> {
    try {
      const result = await this.runWithSerialReconnect(() => this.executeRealRead(request), 'read');

      return {
        success: true,
        data: result,
        commandId: `read_${request.slaveId}_${request.functionCode}_${request.address}_${Date.now()}`,
        processingTime: 0, // 🆕 큐 처리 시간 제거
      };
    } catch (error) {
      // ✅ 에러 분류 및 처리
      const errorInfo = this.classifyError(error, '읽기 명령 실행 실패');
      this.logger?.error(`[RealModbusService] ${errorInfo.message}`);

      return {
        success: false,
        error: errorInfo.message,
        commandId: `error_${Date.now()}`,
        processingTime: 0,
      };
    }
  }

  async writeRegister(request: ModbusWriteRequest): Promise<ModbusResponse> {
    try {
      const result = await this.runWithSerialReconnect(() => this.executeRealWrite(request), 'write');

      return {
        success: true,
        data: [result], // 단일 값을 배열로 변환
        commandId: `write_${request.slaveId}_${request.functionCode}_${request.address}_${Date.now()}`,
        processingTime: 0, // 🆕 큐 처리 시간 제거
      };
    } catch (error) {
      // ✅ 에러 분류 및 처리
      const errorInfo = this.classifyError(error, '쓰기 명령 실행 실패');
      this.logger?.error(`[RealModbusService] ${errorInfo.message}`);

      return {
        success: false,
        error: errorInfo.message,
        commandId: `error_${Date.now()}`,
        processingTime: 0,
      };
    }
  }

  // ==================== IModbusCommunication 인터페이스 구현 ====================

  getQueueStatus(): QueueStatus {
    // 실제 하드웨어 모드에서는 큐 상태를 반환하지 않음
    return {
      highPriority: 0,
      normalPriority: 0,
      lowPriority: 0,
      isProcessing: false,
      totalCommands: 0,
    };
  }

  getUnitQueueStatus(unitId: string): UnitQueueStatus {
    // 실제 하드웨어 모드에서는 유닛별 큐 상태를 반환하지 않음
    return {
      highPriority: 0,
      normalPriority: 0,
      lowPriority: 0,
      totalCommands: 0,
    };
  }

  clearQueue(): void {
    // 실제 하드웨어 모드에서는 큐를 사용하지 않음
    this.logger?.info('[RealModbusService] 큐 기능은 실제 하드웨어 모드에서 지원되지 않습니다');
  }

  destroy(): void {
    this.disconnect();
    this.logger?.info('[RealModbusService] 서비스 정리 완료');
  }

  isMockMode(): boolean {
    return false; // 실제 하드웨어 통신
  }

  // ==================== 실제 Modbus 통신 메서드 ====================

  private async executeRealRead(request: ModbusReadRequest): Promise<number[]> {
    try {
      if (!this.modbusClient) {
        throw new Error('Modbus 클라이언트가 초기화되지 않음');
      }

      // ✅ Slave ID 설정
      this.modbusClient.setID(request.slaveId);

      let result: number[] = [];

      switch (request.functionCode) {
        case 1: // Read Coil Status
          const coilResult = await this.modbusClient.readCoils(request.address, request.length);
          if (request.length === 1) {
            result = [coilResult.data[0] ? 1 : 0];
          } else {
            result = this.convertModbusResultToNumberArray(coilResult, request);
          }
          break;

        case 2: // Read Input Status
          const inputResult = await this.modbusClient.readDiscreteInputs(request.address, request.length);
          result = this.convertModbusResultToNumberArray(inputResult, request);
          break;

        case 3: // Read Holding Registers
          const holdingResult = await this.modbusClient.readHoldingRegisters(request.address, request.length);
          result = this.convertModbusResultToNumberArray(holdingResult, request);
          break;

        case 4: // Read Input Registers
          const inputRegResult = await this.modbusClient.readInputRegisters(request.address, request.length);
          result = this.convertModbusResultToNumberArray(inputRegResult, request);
          break;

        default:
          throw new Error(`지원하지 않는 Function Code: ${request.functionCode}`);
      }

      // Reverse Index에서 필드 정보 조회
      const key = `${request.functionCode}:${request.address}`;
      const spec = this.reverseIndex?.get(key);
      const fieldInfo = spec?.field ? ` (${spec.field})` : '';

      // this.logger?.info(
      //   `[RealModbusService] 읽기 성공 - FC: ${request.functionCode}, Address: ${request.address}${fieldInfo}, Length: ${request.length}, Data: ${result}`,
      // );
      return result;
    } catch (error) {
      this.logger?.error(
        `[RealModbusService] 읽기 실패 - FC: ${request.functionCode}, Address: ${request.address}, Length: ${
          request.length
        }, Error: ${this.errorToSearchableString(error)}`,
      );
      throw error;
    }
  }

  private async executeRealWrite(request: ModbusWriteRequest): Promise<number> {
    try {
      if (!this.modbusClient) {
        throw new Error('Modbus 클라이언트가 초기화되지 않음');
      }

      // Reverse Index에서 필드 정보 조회
      const key = `${request.functionCode}:${request.address}`;
      const spec = this.reverseIndex?.get(key);
      const fieldInfo = spec?.field ? ` (${spec.field})` : '';

      // ✅ Slave ID 설정 후 지연 추가 (설정 완료 대기)
      this.modbusClient.setID(request.slaveId);
      // await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms 지연

      let result = 0;

      switch (request.functionCode) {
        case 5: // Write Single Coil
          const coilValue = this.applyFieldReverseConversion(request.value, spec);

          const writeResult = await this.modbusClient.writeCoil(request.address, coilValue);
          result = this.convertWriteResultToNumber(writeResult);
          break;

        case 6: // Write Single Register
          const registerValue = this.applyFieldReverseConversion(request.value, spec);

          const registerResult = await this.modbusClient.writeRegister(request.address, registerValue);
          result = this.convertWriteResultToNumber(registerResult);
          break;

        case 15: // Write Multiple Coils
          // 🆕 Multiple Coils는 배열 형태로 처리
          if (Array.isArray(request.value)) {
            const coilValues = request.value.map((val) => this.applyFieldReverseConversion(val, spec));
            const coilsResult = await this.modbusClient.writeCoils(request.address, coilValues);
            result = this.convertWriteResultToNumber(coilsResult);
          } else {
            // 단일 값인 경우 배열로 변환
            const coilValue = this.applyFieldReverseConversion(request.value, spec);
            const coilsResult = await this.modbusClient.writeCoils(request.address, [coilValue]);
            result = this.convertWriteResultToNumber(coilsResult);
          }
          break;

        case 16: // Write Multiple Registers
          // 🆕 Multiple Registers는 배열 형태로 처리
          if (Array.isArray(request.value)) {
            const registerValues = request.value.map((val) => this.applyFieldReverseConversion(val, spec));
            const registersResult = await this.modbusClient.writeRegisters(request.address, registerValues);
            result = this.convertWriteResultToNumber(registersResult);
          } else {
            // 단일 값인 경우 배열로 변환
            const registerValue = this.applyFieldReverseConversion(request.value, spec);
            const registersResult = await this.modbusClient.writeRegisters(request.address, [registerValue]);
            result = this.convertWriteResultToNumber(registersResult);
          }
          break;

        default:
          throw new Error(`지원하지 않는 Function Code: ${request.functionCode}`);
      }

      return result;
    } catch (error) {
      // ✅ 에러 분류 및 처리 개선
      const errorInfo = this.classifyError(error, 'Modbus 쓰기 명령 실패');
      this.logger?.error(`[RealModbusService] ${errorInfo.message}`);
      this.logger?.error(`  - Function Code: ${request.functionCode}`);
      this.logger?.error(`  - Address: ${request.address}`);
      this.logger?.error(`  - Value: ${request.value} (타입: ${typeof request.value})`);
      this.logger?.error(`  - Slave ID: ${request.slaveId}`);

      throw error; // 에러를 다시 던져서 상위에서 처리
    }
  }

  // ==================== 주소 매핑 유틸리티 ====================

  /**
   * DO 번호에 해당하는 주소 가져오기
   */
  getDOAddress(doNumber: number, type: 'mode' | 'operation' | 'status' | 'schedule'): number | null {
    if (doNumber < 1 || doNumber > 16) return null;
    return this.addressMapping.do[type][doNumber - 1] || null;
  }

  /**
   * DI 번호에 해당하는 주소 가져오기
   */
  getDIAddress(diNumber: number, type: 'enable' | 'status'): number | null {
    if (diNumber < 1 || diNumber > 16) return null;
    return this.addressMapping.di[type][diNumber - 1] || null;
  }

  /**
   * 스케줄 주소 가져오기
   */
  getScheduleAddress(
    doNumber: number,
    scheduleType: 'schedule1' | 'schedule2',
    timeType: 'startHour' | 'startMinute' | 'endHour' | 'endMinute',
  ): number | null {
    if (doNumber < 1 || doNumber > 16) return null;
    return this.addressMapping.schedule[scheduleType][timeType][doNumber - 1] || null;
  }

  /**
   * HVAC 주소 가져오기
   */
  getHVACAddress(type: keyof typeof this.addressMapping.hvac): number {
    return this.addressMapping.hvac[type];
  }

  /**
   * Heat Exchanger 주소 가져오기
   */
  getHeatExchangerAddress(type: keyof typeof this.addressMapping.heatExchanger): number {
    return this.addressMapping.heatExchanger[type];
  }

  /**
   * Sensor 주소 가져오기
   */
  getSensorAddress(type: keyof typeof this.addressMapping.sensor): number {
    return this.addressMapping.sensor[type];
  }

  // ==================== 연결 상태 및 진단 ====================

  /**
   * 연결 상태 확인
   */
  getConnectionStatus(): { isConnected: boolean; retryCount: number; maxRetries: number } {
    return {
      isConnected: this._isConnected,
      retryCount: this.connectionRetryCount,
      maxRetries: this.maxConnectionRetries,
    };
  }

  /**
   * 통신 설정 정보
   */
  getCommunicationConfig() {
    return {
      ...this.config,
      addressMapping: this.addressMapping,
    };
  }

  // ✅ ModbusRTU 결과를 number[]로 변환하는 유틸리티 메서드 (필드별 변환 적용)
  private convertModbusResultToNumberArray(result: any, request: ModbusReadRequest): number[] {
    try {
      // Reverse Index에서 필드 정보 조회
      const key = `${request.functionCode}:${request.address}`;
      const spec = this.reverseIndex?.get(key);

      // 기본 데이터 변환
      let rawData: number[] = [];

      // 1단계: result.data 구조 처리 (Modbus 응답의 일반적인 형태)
      if (result && typeof result === 'object' && result.data && Array.isArray(result.data)) {
        rawData = result.data.map((item: any) => {
          const num = Number(item);
          return isNaN(num) ? 0 : num;
        });
      }
      // 2단계: 직접 배열 처리
      else if (Array.isArray(result)) {
        rawData = result.map((item) => {
          const num = Number(item);
          return isNaN(num) ? 0 : num;
        });
      }
      // 3단계: 단일 값 처리
      else {
        const num = Number(result);
        rawData = [isNaN(num) ? 0 : num];
      }

      // 필드별 적절한 변환 적용
      const converted = rawData.map((rawValue) => this.applyFieldConversion(rawValue, spec));

      return converted;
    } catch (error) {
      this.logger?.error(
        `[RealModbusService] 데이터 변환 중 오류: ${this.errorToSearchableString(error)}, 원본: ${JSON.stringify(
          result,
        )}`,
      );
      return [0];
    }
  }

  // 필드별 변환 로직
  private applyFieldConversion(rawValue: number, spec?: ReverseIndexSpec): number {
    if (!spec) {
      return rawValue; // 기본 변환
    }

    const field = spec.field || '';
    const deviceType = (spec.deviceType || '').toString();
    const clientId = spec.clientId || '';

    // 🎯 c0101, c0102 삼성 냉난방기 전용 변환 (MODE/SPEED) — LG 현장(c0103~)은 매핑 생략
    if ((clientId === 'c0101' || clientId === 'c0102') && deviceType === 'cooler') {
      // MODE 변환: 삼성 Modbus 값 → REST API 값
      // 삼성 Modbus: 0x0000=자동, 0x0001=냉방, 0x0002=제습, 0x0003=송풍, 0x0004=난방
      // REST API: 0=냉방, 1=제습, 2=송풍, 3=자동, 4=난방
      if (field === 'mode') {
        const modbusValue = Number(rawValue);
        const modeMap: Record<number, number> = {
          0: 0, // 자동 → 자동
          1: 1, // 냉방 → 냉방
          2: 2, // 제습 → 제습
          3: 3, // 송풍 → 송풍
          4: 4, // 난방 → 난방
        };
        const restApiValue = modeMap[modbusValue];
        if (restApiValue === undefined) {
          this.logger?.warn(`[RealModbusService] 알 수 없는 Modbus MODE 값: ${modbusValue}`);
          return modbusValue; // 기본값으로 원본 반환
        }
        return restApiValue;
      }

      // SPEED 변환: 삼성 Modbus 값 → REST API 값
      // 삼성 Modbus: 0x0000=자동, 0x0001=미풍, 0x0002=약풍, 0x0003=강풍
      // REST API: 1=약, 2=중, 3=강, 4=자동
      if (field === 'speed') {
        const modbusValue = Number(rawValue);
        const speedMap: Record<number, number> = {
          0: 4, // 자동 → 자동
          1: 1, // 미풍 → 약
          2: 2, // 약풍 → 중
          3: 3, // 강풍 → 강
        };
        const restApiValue = speedMap[modbusValue];
        if (restApiValue === undefined) {
          this.logger?.warn(`[RealModbusService] 알 수 없는 Modbus SPEED 값: ${modbusValue}`);
          return 1; // 기본값으로 약 반환
        }
        return restApiValue;
      }
    }

    // const type = (spec.type || '').toString();

    // // boolean 계열 (0/1 유지)
    // if (type === 'boolean' || field === 'auto' || field === 'power' || field === 'alarm') {
    //   return rawValue === 1 ? 1 : 0; // 명확한 boolean 값
    // }

    // // 시간/분 필드 (범위 제한)
    // if (field.includes('hour')) {
    //   return Math.max(0, Math.min(23, rawValue)); // 0-23 범위
    // }

    // if (field.includes('minute')) {
    //   return Math.max(0, Math.min(59, rawValue)); // 0-59 범위
    // }

    // // 통합 센서 값 범위
    // if (deviceType === 'integrated_sensor' || deviceType === 'sensor') {
    //   if (field === 'hum') {
    //     return rawValue / 10; // 습도 스케일링 (0.0~100.0%)
    //   }
    //   if (field === 'pm100' || field === 'pm25' || field === 'pm10') {
    //     return Math.max(0, Math.min(1000, rawValue)); // 0-1000 범위
    //   }
    //   if (field === 'co2') {
    //     return Math.max(400, Math.min(10000, rawValue)); // 400-10000 범위
    //   }
    //   if (field === 'voc') {
    //     return Math.max(0, Math.min(60000, rawValue)); // 0-60000 범위
    //   }
    // }

    // 기본 변환
    return rawValue;
  }

  // 필드별 역변환 로직 (사용자 값 → 하드웨어 값)
  private applyFieldReverseConversion(userValue: any, spec?: ReverseIndexSpec): any {
    if (!spec) {
      return userValue; // 기본 변환
    }

    const field = spec.field || '';
    const type = (spec.type || '').toString();
    const deviceType = (spec.deviceType || '').toString();
    const clientId = spec.clientId || '';

    // 🎯 c0101, c0102 삼성 냉난방기 전용 변환 (MODE/SPEED) — LG 현장(c0103~)은 매핑 생략
    if ((clientId === 'c0101' || clientId === 'c0102') && deviceType === 'cooler') {
      // MODE 변환: REST API 값 → 삼성 Modbus 값
      // REST API: 0=냉방, 1=제습, 2=송풍, 3=자동, 4=난방
      // 삼성 Modbus: 0x0000=자동, 0x0001=냉방, 0x0002=제습, 0x0003=송풍, 0x0004=난방
      if (field === 'mode') {
        const modeValue = Number(userValue);
        const modeMap: Record<number, number> = {
          0: 0, // 냉방 → 냉방
          1: 1, // 제습 → 제습
          2: 2, // 송풍 → 송풍
          3: 3, // 자동 → 자동
          4: 4, // 난방 → 난방
        };
        const modbusValue = modeMap[modeValue];
        if (modbusValue === undefined) {
          this.logger?.warn(`[RealModbusService] 지원하지 않는 MODE 값: ${modeValue}`);
          return modeValue; // 기본값으로 원본 반환
        }
        return modbusValue;
      }

      // SPEED 변환: REST API 값 → 삼성 Modbus 값
      // REST API: 1=약, 2=중, 3=강, 4=자동
      // 삼성 Modbus: 0x0000=자동, 0x0001=미풍, 0x0002=약풍, 0x0003=강풍
      if (field === 'speed') {
        const speedValue = Number(userValue);
        const speedMap: Record<number, number> = {
          1: 1, // 약 → 미풍
          2: 2, // 중 → 약풍
          3: 3, // 강 → 강풍
          4: 0, // 자동 → 자동
        };
        const modbusValue = speedMap[speedValue];
        if (modbusValue === undefined) {
          this.logger?.warn(`[RealModbusService] 지원하지 않는 SPEED 값: ${speedValue}`);
          return 1; // 기본값으로 미풍 반환
        }
        return modbusValue;
      }
    }

    // 온도 역변환 (사용자 온도 → 하드웨어 레지스터 값)
    if (field === 'temp' || field === 'cur_temp') {
      return Math.round(userValue * 10 + 2000); // 온도 역스케일링
    }

    if (field.includes('summer_cont_temp') || field.includes('winter_cont_temp')) {
      return Math.round(userValue * 10); // 온도 역스케일링
    }

    // boolean 계열 (true/false → 1/0)
    if (type === 'boolean' || field === 'auto' || field === 'power' || field === 'alarm') {
      return Boolean(userValue) ? 1 : 0; // boolean → 0/1
    }

    // 시간/분 필드 (범위 제한)
    if (field.includes('hour')) {
      return Math.max(0, Math.min(23, Number(userValue))); // 0-23 범위
    }

    if (field.includes('minute')) {
      return Math.max(0, Math.min(59, Number(userValue))); // 0-59 범위
    }

    // 통합 센서는 읽기 전용이므로 쓰기 시도 시 경고
    if (deviceType === 'integrated_sensor' || deviceType === 'sensor') {
      this.logger?.warn(`[RealModbusService] 통합 센서는 읽기 전용입니다 - Field: ${field}`);
      return userValue; // 원본 값 그대로 반환
    }

    // 기본 변환
    return Number(userValue);
  }

  // ✅ ModbusRTU write 메서드의 결과를 number로 변환하는 유틸리티 메서드
  private convertWriteResultToNumber(result: any): number {
    if (Array.isArray(result)) {
      return Number(result[0]); // 쓰기 명령의 경우 단일 값을 반환
    }
    return Number(result);
  }

  /**
   * 🆕 Modbus 데이터 무결성 검증 메서드 (필드별 검증 적용)
   */
  private validateModbusData(
    convertedData: number[],
    originalData: any,
    spec?: ReverseIndexSpec,
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    try {
      // 1. 데이터 타입 검증
      if (!Array.isArray(convertedData)) {
        issues.push('Converted data is not an array');
      }

      // 2. 필드별 적절한 범위 검증
      for (let i = 0; i < convertedData.length; i++) {
        const value = convertedData[i];

        if (spec) {
          const field = spec.field || '';
          const type = (spec.type || '').toString();
          const deviceType = (spec.deviceType || '').toString();

          // 온도 필드 검증
          if (field === 'temp' || field === 'cur_temp') {
            if (value < -40 || value > 125) {
              issues.push(`Temperature value ${value}°C is out of range [-40, 125]`);
            }
          }

          // boolean 필드 검증
          else if (type === 'boolean' || field === 'auto' || field === 'power' || field === 'alarm') {
            if (value !== 0 && value !== 1) {
              issues.push(`Boolean value ${value} is not 0 or 1`);
            }
          }

          // 시간 필드 검증
          else if (field.includes('hour')) {
            if (value < 0 || value > 23) {
              issues.push(`Hour value ${value} is out of range [0, 23]`);
            }
          }

          // 분 필드 검증
          else if (field.includes('minute')) {
            if (value < 0 || value > 59) {
              issues.push(`Minute value ${value} is out of range [0, 59]`);
            }
          }

          // 통합 센서 필드 검증
          else if (deviceType === 'integrated_sensor' || deviceType === 'sensor') {
            if (field === 'hum' && (value < 0 || value > 100)) {
              issues.push(`Humidity value ${value}% is out of range [0, 100]`);
            }
            if (field === 'co2' && (value < 400 || value > 10000)) {
              issues.push(`CO2 value ${value} is out of range [400, 10000]`);
            }
            if (field === 'pm100' || field === 'pm25' || field === 'pm10') {
              if (value < 0 || value > 1000) {
                issues.push(`PM value ${value} is out of range [0, 1000]`);
              }
            }
            if (field === 'voc' && (value < 0 || value > 60000)) {
              issues.push(`VOC value ${value} is out of range [0, 60000]`);
            }
          }

          // 기본 Modbus 범위 검증 (필드별 검증이 없는 경우)
          else {
            if (value < 0 || value > 65535) {
              issues.push(`Value at index ${i} (${value}) is out of Modbus range [0, 65535]`);
            }
          }
        } else {
          // spec이 없는 경우 기본 Modbus 범위 검증
          if (value < 0 || value > 65535) {
            issues.push(`Value at index ${i} (${value}) is out of Modbus range [0, 65535]`);
          }
        }
      }

      // 3. 데이터 일관성 검증
      if (convertedData.length > 1) {
        const avg = convertedData.reduce((sum, val) => sum + val, 0) / convertedData.length;
        const variance = convertedData.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / convertedData.length;

        // 급격한 변화 감지 (표준편차가 평균의 50% 이상)
        if (Math.sqrt(variance) > Math.abs(avg) * 0.5) {
          issues.push('High variance detected in data - possible sensor issue or communication error');
        }
      }

      return { isValid: issues.length === 0, issues };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      issues.push(`Validation error: ${errorMessage}`);
      return { isValid: false, issues };
    }
  }
}
