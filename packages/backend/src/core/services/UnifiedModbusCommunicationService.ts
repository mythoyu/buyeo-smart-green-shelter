import { ILogger } from '../../shared/interfaces/ILogger';
import { ServiceContainer } from '../container/ServiceContainer';

import { IUnifiedModbusCommunicationService, ModbusResponse } from './interfaces/IUnifiedModbusCommunicationService';
import { MockModbusService } from './MockModbusService';
import { ModbusCommand } from './ModbusCommandQueue';
import { RealModbusService } from './RealModbusService';

export class UnifiedModbusCommunicationService implements IUnifiedModbusCommunicationService {
  private realService: RealModbusService;
  private mockService: MockModbusService;
  private activeService: 'real' | 'mock' = 'mock';
  private logger: ILogger | undefined;

  constructor(logger?: ILogger) {
    this.logger = logger;
    this.realService = new RealModbusService(logger);
    this.mockService = new MockModbusService(logger);
  }

  /**
   * ServiceContainer 초기화
   */
  initialize(serviceContainer: ServiceContainer): void {
    this.mockService.initialize(serviceContainer);
    this.logger?.debug('[UnifiedModbusCommunicationService] ServiceContainer 초기화 완료');
  }

  async executeDirect(command: ModbusCommand): Promise<ModbusResponse> {
    try {
      this.logger?.debug(
        `[UnifiedModbusCommunicationService] 명령 실행 시작 - Service: ${this.activeService}, Type: ${command.type}, FC: ${command.functionCode}, Address: ${command.address}, Unit: ${command.unitId}`,
      );

      if (this.activeService === 'mock') {
        // this.logger?.warn(`[UnifiedModbusCommunicationService] Mock 모드 사용 중 - 실제 하드웨어와 통신하지 않습니다`);
      }

      if (this.activeService === 'real') {
        // 🆕 RealModbusService에 executeDirect 메소드가 없으므로 기존 메소드 사용
        if (command.type === 'read') {
          this.logger?.debug(`[UnifiedModbusCommunicationService] Real 서비스 읽기 명령 실행`);
          const readLength = Array.isArray(command.lengthOrValue)
            ? command.lengthOrValue.length
            : command.lengthOrValue;
          const readReq = {
            slaveId: parseInt(command.unitId),
            functionCode: command.functionCode,
            address: command.address,
            length: readLength,
            context: 'polling' as const,
            ...(command.clientId !== undefined ? { clientId: command.clientId } : {}),
          };
          const result = await this.realService.readRegisters(readReq);
          // 🆕 타입 변환하여 호환성 맞춤
          this.logger?.debug(`[UnifiedModbusCommunicationService] Real 서비스 읽기 완료 - Success: ${result.success}`);
          return {
            success: result.success,
            data: result.data,
            ...(result.error && { error: result.error }),
          };
        }
        this.logger?.debug(`[UnifiedModbusCommunicationService] Real 서비스 쓰기 명령 실행`);
        const writeReq = {
          slaveId: parseInt(command.unitId),
          functionCode: command.functionCode,
          address: command.address,
          value: command.lengthOrValue,
          context: 'control' as const,
          ...(command.clientId !== undefined ? { clientId: command.clientId } : {}),
        };
        const result = await this.realService.writeRegister(writeReq);
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
        const mockReadLength = Array.isArray(command.lengthOrValue)
          ? command.lengthOrValue.length
          : command.lengthOrValue;
        const mockReadReq = {
          slaveId: parseInt(command.unitId),
          functionCode: command.functionCode,
          address: command.address,
          length: mockReadLength,
          context: 'polling' as const,
          ...(command.clientId !== undefined ? { clientId: command.clientId } : {}),
        };
        const result = await this.mockService.readRegisters(mockReadReq);
        // 🆕 타입 변환하여 호환성 맞춤
        this.logger?.debug(`[UnifiedModbusCommunicationService] Mock 서비스 읽기 완료 - Success: ${result.success}`);
        return {
          success: result.success,
          data: result.data,
          ...(result.error && { error: result.error }),
        };
      }
      this.logger?.debug(`[UnifiedModbusCommunicationService] Mock 서비스 쓰기 명령 실행`);
      const mockWriteReq = {
        slaveId: parseInt(command.unitId),
        functionCode: command.functionCode,
        address: command.address,
        value: command.lengthOrValue,
        context: 'control' as const,
        ...(command.clientId !== undefined ? { clientId: command.clientId } : {}),
      };
      const result = await this.mockService.writeRegister(mockWriteReq);
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
      // 🆕 activeService 체크 제거 - 순환 의존성 문제 해결
      // 항상 realService.connect() 시도
      const connected = await this.realService.connect();
      this.logger?.info(`[UnifiedModbusCommunicationService] 연결 시도 결과: ${connected ? '성공' : '실패'}`);
      return connected;
    } catch (error) {
      this.logger?.error(`[UnifiedModbusCommunicationService] 연결 실패: ${error}`);
      return false;
    }
  }

  isConnected(): boolean {
    try {
      if (this.activeService === 'real') {
        const connected = this.realService.isConnected();
        this.logger?.debug(`[UnifiedModbusCommunicationService] Real 서비스 연결 상태: ${connected}`);
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
        await this.realService.disconnect();
        this.logger?.debug(`[UnifiedModbusCommunicationService] Real 서비스 연결 해제 완료`);
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
