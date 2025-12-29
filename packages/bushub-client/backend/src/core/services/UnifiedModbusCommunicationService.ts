import { getModbusConfig } from '../../config/modbus.config';
import { getHvacModbusConfig } from '../../config/hvac.config';
import { ILogger } from '../../shared/interfaces/ILogger';
import { ServiceContainer } from '../container/ServiceContainer';

import { IUnifiedModbusCommunicationService, ModbusResponse } from './interfaces/IUnifiedModbusCommunicationService';
import { MockModbusService } from './MockModbusService';
import { ModbusCommand } from './ModbusCommandQueue';
import { RealModbusService } from './RealModbusService';

export class UnifiedModbusCommunicationService implements IUnifiedModbusCommunicationService {
  // ❄️ 포트별 RealModbusService 인스턴스 관리 (Map)
  private realServices: Map<string, RealModbusService> = new Map();
  private mockService: MockModbusService;
  private activeService: 'real' | 'mock' = 'mock';
  private logger: ILogger | undefined;

  constructor(logger?: ILogger) {
    this.logger = logger;
    // ttyS0 인스턴스는 기본으로 생성 (기존 동작 유지)
    const defaultConfig = getModbusConfig();
    this.realServices.set('/dev/ttyS0', new RealModbusService(logger, defaultConfig));
    this.mockService = new MockModbusService(logger);
  }

  /**
   * ServiceContainer 초기화
   */
  initialize(serviceContainer: ServiceContainer): void {
    this.mockService.initialize(serviceContainer);
    this.logger?.debug('[UnifiedModbusCommunicationService] ServiceContainer 초기화 완료');
  }

  /**
   * 포트별 RealModbusService 인스턴스 가져오기 (Lazy initialization)
   * @param port 포트 경로 (예: '/dev/ttyS0', '/dev/ttyS1')
   * @returns RealModbusService 인스턴스
   */
  private getRealServiceForPort(port: string): RealModbusService {
    // 기본 포트는 기본 설정 사용 (기존 인스턴스)
    if (port === '/dev/ttyS0' || !port) {
      const defaultService = this.realServices.get('/dev/ttyS0');
      if (defaultService) {
        return defaultService;
      }
      // 없으면 새로 생성 (초기화 시점에 생성되었어야 하지만 안전장치)
      const defaultConfig = getModbusConfig();
      const service = new RealModbusService(this.logger, defaultConfig);
      this.realServices.set('/dev/ttyS0', service);
      return service;
    }

    // 다른 포트는 HVAC 설정 사용 (lazy initialization)
    if (!this.realServices.has(port)) {
      this.logger?.info(`[UnifiedModbusCommunicationService] 포트 ${port}용 RealModbusService 인스턴스 생성`);
      const hvacConfig = getHvacModbusConfig(port);
      const service = new RealModbusService(this.logger, hvacConfig);
      this.realServices.set(port, service);
    }

    return this.realServices.get(port)!;
  }

  async executeDirect(command: ModbusCommand): Promise<ModbusResponse> {
    try {
      // ❄️ 포트 결정 (기본값: /dev/ttyS0)
      const port = command.port || '/dev/ttyS0';

      this.logger?.debug(
        `[UnifiedModbusCommunicationService] 명령 실행 시작 - Service: ${this.activeService}, Port: ${port}, Type: ${command.type}, FC: ${command.functionCode}, Address: ${command.address}, Unit: ${command.unitId}`,
      );

      if (this.activeService === 'mock') {
        // this.logger?.warn(`[UnifiedModbusCommunicationService] Mock 모드 사용 중 - 실제 하드웨어와 통신하지 않습니다`);
      }

      if (this.activeService === 'real') {
        // ❄️ 포트별 RealModbusService 인스턴스 사용
        const realService = this.getRealServiceForPort(port);

        // 🆕 RealModbusService에 executeDirect 메소드가 없으므로 기존 메소드 사용
        if (command.type === 'read') {
          this.logger?.debug(`[UnifiedModbusCommunicationService] Real 서비스 읽기 명령 실행 (포트: ${port})`);
          const result = await realService.readRegisters({
            slaveId: parseInt(command.unitId),
            functionCode: command.functionCode,
            address: command.address,
            length: command.lengthOrValue,
            context: 'polling', // 🆕 올바른 context 값 사용
          });
          // 🆕 타입 변환하여 호환성 맞춤
          this.logger?.debug(`[UnifiedModbusCommunicationService] Real 서비스 읽기 완료 - Success: ${result.success}`);
          return {
            success: result.success,
            data: result.data,
            ...(result.error && { error: result.error }),
          };
        }
        this.logger?.debug(`[UnifiedModbusCommunicationService] Real 서비스 쓰기 명령 실행 (포트: ${port})`);
        const result = await realService.writeRegister({
          slaveId: parseInt(command.unitId),
          functionCode: command.functionCode,
          address: command.address,
          value: command.lengthOrValue,
          context: 'control', // 🆕 올바른 context 값 사용
        });
        // 🆕 타입 변환하여 호환성 맞춤
        this.logger?.debug(`[UnifiedModbusCommunicationService] Real 서비스 쓰기 완료 - Success: ${result.success}`);
        return {
          success: result.success,
          data: result.data,
          ...(result.error && { error: result.error }),
        };
      }
      // 🆕 MockModbusService에 executeDirect 메소드가 없으므로 기존 메소드 사용
      if (command.type === 'read') {
        this.logger?.debug(`[UnifiedModbusCommunicationService] Mock 서비스 읽기 명령 실행`);
        const result = await this.mockService.readRegisters({
          slaveId: parseInt(command.unitId),
          functionCode: command.functionCode,
          address: command.address,
          length: command.lengthOrValue,
          context: 'polling', // 🆕 올바른 context 값 사용
        });
        // 🆕 타입 변환하여 호환성 맞춤
        this.logger?.debug(`[UnifiedModbusCommunicationService] Mock 서비스 읽기 완료 - Success: ${result.success}`);
        return {
          success: result.success,
          data: result.data,
          ...(result.error && { error: result.error }),
        };
      }
      this.logger?.debug(`[UnifiedModbusCommunicationService] Mock 서비스 쓰기 명령 실행`);
      const result = await this.mockService.writeRegister({
        slaveId: parseInt(command.unitId),
        functionCode: command.functionCode,
        address: command.address,
        value: command.lengthOrValue,
        context: 'control', // 🆕 올바른 context 값 사용
      });
      // 🆕 타입 변환하여 호환성 맞춤
      this.logger?.debug(`[UnifiedModbusCommunicationService] Mock 서비스 쓰기 완료 - Success: ${result.success}`);
      return {
        success: result.success,
        data: result.data,
        ...(result.error && { error: result.error }),
      };
    } catch (error) {
      this.logger?.error(`[UnifiedModbusCommunicationService] 명령 실행 실패: ${error}`);
      throw error;
    }
  }

  setActiveService(service: 'real' | 'mock'): void {
    const previousService = this.activeService;
    this.activeService = service;
    this.logger?.info(`[UnifiedModbusCommunicationService] 서비스 모드 변경: ${previousService} → ${service}`);
  }

  async connect(): Promise<boolean> {
    try {
      this.logger?.debug(`[UnifiedModbusCommunicationService] 연결 시도 시작`);
      // ❄️ 기본 포트(/dev/ttyS0)만 연결 시도 (기존 동작 유지)
      // 다른 포트는 필요할 때 lazy initialization으로 연결됨
      const defaultService = this.getRealServiceForPort('/dev/ttyS0');
      const connected = await defaultService.connect();
      this.logger?.info(`[UnifiedModbusCommunicationService] 기본 포트(/dev/ttyS0) 연결 시도 결과: ${connected ? '성공' : '실패'}`);
      return connected;
    } catch (error) {
      this.logger?.error(`[UnifiedModbusCommunicationService] 연결 실패: ${error}`);
      return false;
    }
  }

  isConnected(): boolean {
    try {
      if (this.activeService === 'real') {
        // ❄️ 기본 포트(/dev/ttyS0) 연결 상태 확인 (기존 동작 유지)
        const defaultService = this.getRealServiceForPort('/dev/ttyS0');
        const connected = defaultService.isConnected();
        this.logger?.debug(`[UnifiedModbusCommunicationService] Real 서비스 연결 상태 (기본 포트): ${connected}`);
        return connected;
      }
      this.logger?.debug(`[UnifiedModbusCommunicationService] Mock 서비스 연결 상태: 항상 연결됨`);
      return true; // Mock 모드는 항상 연결됨
    } catch (error) {
      this.logger?.error(`[UnifiedModbusCommunicationService] 연결 상태 확인 실패: ${error}`);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.logger?.debug(`[UnifiedModbusCommunicationService] 연결 해제 시작 - Service: ${this.activeService}`);
      if (this.activeService === 'real') {
        // ❄️ 모든 포트의 RealModbusService 연결 해제
        const disconnectPromises: Promise<void>[] = [];
        for (const [port, service] of this.realServices.entries()) {
          disconnectPromises.push(
            service
              .disconnect()
              .then(() => {
                this.logger?.debug(`[UnifiedModbusCommunicationService] 포트 ${port} 연결 해제 완료`);
              })
              .catch((error) => {
                this.logger?.warn(`[UnifiedModbusCommunicationService] 포트 ${port} 연결 해제 실패: ${error}`);
              }),
          );
        }
        await Promise.all(disconnectPromises);
        this.logger?.debug(`[UnifiedModbusCommunicationService] 모든 Real 서비스 연결 해제 완료`);
      } else {
        this.logger?.debug(`[UnifiedModbusCommunicationService] Mock 서비스는 연결 해제 불필요`);
      }
      // Mock 모드는 연결 해제 불필요
      this.logger?.debug(`[UnifiedModbusCommunicationService] ${this.activeService} 서비스 연결 해제 완료`);
    } catch (error) {
      this.logger?.error(`[UnifiedModbusCommunicationService] 연결 해제 실패: ${error}`);
    }
  }
}
