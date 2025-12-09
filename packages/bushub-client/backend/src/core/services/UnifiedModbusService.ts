import { ILogger } from '../../shared/interfaces/ILogger';
import { getModbusConfig } from '../../utils/environment';
import {
  ModbusReadRequest,
  ModbusWriteRequest,
  ModbusResponse,
  QueueStatus,
  UnitQueueStatus,
} from '../interfaces/IModbusCommunication';

import { IPollingDataPersistenceService } from './interfaces/IPollingDataPersistenceService';
import { IUnifiedModbusCommunicationService } from './interfaces/IUnifiedModbusCommunicationService';
import { ModbusCommand, ModbusCommandQueue } from './ModbusCommandQueue';

/**
 * 통합 Modbus 서비스
 * Mock 모드와 실제 RS-485 모드를 상황에 맞게 선택하여 사용
 */
export class UnifiedModbusService {
  private logger: ILogger | undefined;
  private config: ReturnType<typeof getModbusConfig>;
  private activeService: 'real' | 'mock' = 'mock';

  // 🆕 중앙 큐를 직접 사용
  private centralCommandQueue: ModbusCommandQueue;
  private communicationService: IUnifiedModbusCommunicationService;
  private pollingDataPersistenceService: IPollingDataPersistenceService | undefined;

  constructor(
    centralCommandQueue: ModbusCommandQueue,
    communicationService: IUnifiedModbusCommunicationService,
    pollingDataPersistenceService?: IPollingDataPersistenceService,
    logger?: ILogger,
  ) {
    this.logger = logger;
    this.config = getModbusConfig();

    // 🆕 새로운 서비스들 주입
    this.centralCommandQueue = centralCommandQueue;
    this.communicationService = communicationService;
    this.pollingDataPersistenceService = pollingDataPersistenceService;

    // 🆕 실시간 Mock 상태 확인
    const currentMockStatus = this.config.mockStatus;

    this.logger?.debug(
      `[UnifiedModbusService] 초기화 완료 (Mock 모드: ${currentMockStatus.enabled}, 포트: ${this.config.port}, 보드레이트: ${this.config.baudRate}bps)`,
    );

    // 🆕 Mock 상태 상세 로깅
    this.logger?.debug(`[UnifiedModbusService] Mock 상태: ${currentMockStatus.reason}`);
  }

  /**
   * 연결 시도
   */
  async connect(): Promise<boolean> {
    try {
      // 🆕 실시간 Mock 상태 확인
      const currentConfig = getModbusConfig();

      if (currentConfig.mockEnabled) {
        // Mock 모드 (명시적으로 활성화된 경우에만 사용)
        this.activeService = 'mock';
        this.logger?.info(`[UnifiedModbusService] Mock 모드로 연결 (${currentConfig.mockStatus.reason})`);
        return true;
      }
      // 실제 RS-485 하드웨어 연결 시도
      this.logger?.info('[UnifiedModbusService] 실제 RS-485 하드웨어 연결 시도');
      const realConnected = await this.communicationService.connect();

      if (realConnected) {
        this.activeService = 'real';
        // 🆕 UnifiedModbusCommunicationService의 activeService도 'real'로 설정
        this.communicationService.setActiveService('real');
        this.logger?.info('[UnifiedModbusService] 실제 RS-485 하드웨어 연결 성공');
        return true;
      }
      // Mock 모드 폴백 제거: 연결 실패 시 에러 처리
      const errorMsg = `[UnifiedModbusService] 실제 RS-485 하드웨어 연결 실패`;
      this.logger?.error(errorMsg);
      throw new Error(errorMsg);
    } catch (error) {
      this.logger?.error(`[UnifiedModbusService] 연결 시도 실패: ${error}`);

      // Mock 모드 비활성화 시 에러 전파 (Docker 재시작 유도)
      const currentConfig = getModbusConfig();
      if (!currentConfig.mockEnabled) {
        throw new Error(`[UnifiedModbusService] 실제 하드웨어 연결 실패: ${error}`);
      }

      // 명시적으로 Mock 모드가 활성화된 경우에만 연결 허용
      this.activeService = 'mock';
      this.logger?.info(`[UnifiedModbusService] Mock 모드로 연결 (${currentConfig.mockStatus.reason})`);
      return true;
    }
  }

  /**
   * 연결 해제
   */
  async disconnect(): Promise<void> {
    try {
      await this.communicationService.disconnect();
      this.logger?.info(`[UnifiedModbusService] ${this.activeService} 서비스 연결 해제 완료`);
    } catch (error) {
      this.logger?.error(`[UnifiedModbusService] 연결 해제 실패: ${error}`);
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.communicationService.isConnected();
  }

  /**
   * 활성 서비스 정보 반환
   */
  getActiveServiceInfo(): { service: string; status: any } {
    if (this.activeService === 'real') {
      return {
        service: 'real',
        status: { isConnected: this.communicationService.isConnected() },
      };
    }
    return {
      service: 'mock',
      status: { isConnected: true, mode: 'mock' },
    };
  }

  /**
   * 서비스 상태 요약
   */
  getServiceSummary(): string {
    const info = this.getActiveServiceInfo();
    return `활성 서비스: ${info.service}, 연결 상태: ${info.status.isConnected ? '연결됨' : '연결 안됨'}`;
  }

  // ==================== IModbusCommunication 구현 ====================

  async readRegisters(request: ModbusReadRequest): Promise<ModbusResponse> {
    // 🆕 중앙 큐를 통한 명령 처리로 변경
    const command = {
      id: `read_${request.slaveId}_${request.functionCode}_${request.address}_${Date.now()}`,
      type: 'read' as const,
      unitId: request.slaveId.toString(),
      functionCode: request.functionCode,
      address: request.address,
      lengthOrValue: request.length,
      priority: 'normal' as const,
      timestamp: new Date(),
      resolve: () => {
        // Placeholder for queue resolution
      },
      reject: () => {
        // Placeholder for queue resolution
      },
    };

    return await this.executeCommand(command);
  }

  async writeRegister(request: ModbusWriteRequest): Promise<ModbusResponse> {
    // 🆕 중앙 큐를 통한 명령 처리로 변경
    const command = {
      id: `write_${request.slaveId}_${request.functionCode}_${request.address}_${Date.now()}`,
      type: 'write' as const,
      unitId: request.slaveId.toString(),
      functionCode: request.functionCode,
      address: request.address,
      lengthOrValue: request.value,
      priority: 'high' as const,
      timestamp: new Date(),
      resolve: () => {
        // Placeholder for queue resolution
      },
      reject: () => {
        // Placeholder for queue resolution
      },
    };

    return await this.executeCommand(command);
  }

  getQueueStatus(): QueueStatus {
    // 🆕 새로운 큐 매니저 사용
    return this.centralCommandQueue.getQueueStatus();
  }

  getUnitQueueStatus(unitId: string): UnitQueueStatus {
    // 🆕 새로운 큐 매니저 사용 (기본 구현)
    const status = this.centralCommandQueue.getQueueStatus();
    return {
      totalCommands: status.totalCommands,
      highPriority: status.highPriority,
      normalPriority: status.normalPriority,
      lowPriority: status.lowPriority,
    };
  }

  clearQueue(): void {
    // 🆕 새로운 큐 매니저 사용
    this.centralCommandQueue.clearQueue();
  }

  destroy(): void {
    // 🆕 새로운 통신 서비스 사용
    this.communicationService.disconnect();
  }

  // ==================== 기타 메서드 ====================

  /**
   * Mock 모드 여부 확인
   */
  isMockMode(): boolean {
    return this.activeService === 'mock';
  }

  /**
   * Mock 모드로 강제 전환
   */
  async forceMockMode(): Promise<void> {
    this.logger?.info('[UnifiedModbusService] Mock 모드로 강제 전환');
    this.activeService = 'mock';
    this.communicationService.setActiveService('mock');
  }

  /**
   * 실제 모드로 전환 시도
   */
  async switchToRealMode(): Promise<boolean> {
    if (this.config.mockEnabled) {
      this.logger?.warn('[UnifiedModbusService] Mock 모드가 활성화되어 있어 실제 모드로 전환할 수 없습니다');
      return false;
    }

    const connected = await this.communicationService.connect();
    if (connected) {
      this.activeService = 'real';
      this.communicationService.setActiveService('real');
      this.logger?.info('[UnifiedModbusService] 실제 모드 전환 성공');
      return true;
    }
    this.logger?.error('[UnifiedModbusService] 실제 모드 전환 실패');
    return false;
  }

  /**
   * 현재 모드 정보 반환
   */
  getCurrentModeInfo(): Record<string, any> {
    return {
      mockMode: this.activeService === 'mock',
      activeService: this.activeService,
      canSwitchToReal: !this.config.mockEnabled,
      connectionStatus: this.communicationService.isConnected(),
    };
  }

  /**
   * 서비스 상태 반환
   */
  getServiceStatus(): Record<string, any> {
    const baseStatus = {
      mockMode: this.activeService === 'mock',
      activeService: this.activeService,
      queueStatus: this.getQueueStatus(),
      timestamp: new Date().toISOString(),
    };

    if (this.activeService === 'real') {
      return {
        ...baseStatus,
        connectionStatus: this.communicationService.isConnected(),
      };
    }
    return {
      ...baseStatus,
      mockStatus: { isConnected: true, mode: 'mock' },
    };
  }

  // ==================== IUnifiedModbusCommunication 인터페이스 구현 ====================

  /**
   * Unit 연결 상태 확인
   */
  isUnitConnected(unit: any): boolean {
    // 기본 구현 - 필요시 확장
    return this.isConnected();
  }

  // ==================== 중앙 Queue 관련 메서드들 ====================

  /**
   * 중앙 Queue를 통한 통합 명령 처리
   */
  async executeCommand(command: ModbusCommand): Promise<any> {
    try {
      // 1. 큐에 명령 추가 및 처리 대기
      const result = await this.centralCommandQueue.addCommandObject(command);

      // 2. 읽기 명령인 경우 결과를 data 컬렉션에 저장 (구조만 준비)
      if (command.type === 'read' && result.success && this.pollingDataPersistenceService) {
        await this.pollingDataPersistenceService.saveModbusReadResult(command.unitId, command.unitId, command, result);
      }

      return result;
    } catch (error) {
      this.logger?.error(`[UnifiedModbusService] 명령 실행 실패: ${command.id} - ${error}`);
      throw error;
    }
  }

  /**
   * 중앙 Queue 상태 조회
   */
  getCentralQueueStatus(): QueueStatus {
    return this.centralCommandQueue.getQueueStatus();
  }

  /**
   * 중앙 Queue 정리
   */
  clearCentralQueue(): void {
    this.centralCommandQueue.clearQueue();
    this.logger?.info('[UnifiedModbusService] 중앙 Queue 정리 완료');
  }

  /**
   * 중앙 Queue 통계 정보
   */
  getCentralQueueStats(): Record<string, any> {
    const status = this.centralCommandQueue.getQueueStatus();
    return {
      totalCommands: status.totalCommands,
      highPriority: status.highPriority,
      normalPriority: status.normalPriority,
      lowPriority: status.lowPriority,
      processing: status.isProcessing,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🎯 폴링 성능 메트릭 조회 (UnifiedModbusPollerService에서 가져옴)
   */
  getPerformanceMetrics() {
    // ServiceContainer를 통해 UnifiedModbusPollerService에 접근
    try {
      const { ServiceContainer } = require('../container/ServiceContainer');
      const serviceContainer = ServiceContainer.getInstance();
      const pollerService = serviceContainer.getUnifiedModbusPollerService();
      return pollerService.getPerformanceMetrics();
    } catch (error) {
      this.logger?.warn(`[UnifiedModbusService] 성능 메트릭 조회 실패: ${error}`);
      return {
        totalPollingCalls: 0,
        successfulPolls: 0,
        failedPolls: 0,
        averageResponseTime: 0,
        lastCleanup: new Date(),
      };
    }
  }
}
