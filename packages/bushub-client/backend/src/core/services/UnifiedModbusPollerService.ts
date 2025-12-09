import { CLIENT_PORT_MAPPINGS } from '../../data/clientPortMappings';
import { getModbusAddressMapping, isModbusMockEnabled } from '../../utils/environment';
import { ServiceContainer } from '../container/ServiceContainer';
import { ILogger } from '../interfaces/ILogger';
import { IUnifiedModbusCommunication } from '../interfaces/IModbusCommunication';

import { DataSyncService } from './DataSyncService';

/**
 * SNGIL DDC 폴링 서비스 설정
 */
export interface SNGILDDCConfig {
  deviceId: string;
  unitId: string;
  slaveId: number;
  baudRate: number;
  port: string;
  pollingInterval: number;
}

/**
 * Modbus 레지스터 데이터 구조
 */
export interface ModbusRegister {
  address: number;
  value: number;
  functionCode: number;
}

/**
 * 폴링 통계 정보
 */
export interface PollingStats {
  isPolling: boolean;
  activePolling: string[];
  totalPolling: number;
  mockMode: boolean;
  lastUpdate: Date;
}

/**
 * 통합 Modbus 폴링 서비스
 * 기존 하드코딩된 폴링과 새로운 매핑 기반 폴링을 통합
 */
export class UnifiedModbusPollerService {
  private logger: ILogger | undefined;
  private modbusService: IUnifiedModbusCommunication;
  private addressMapping: ReturnType<typeof getModbusAddressMapping>;

  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private singlePollingTimer: NodeJS.Timeout | null = null;
  private isPolling = false;
  // 인플라이트 락: 폴링 타이머 콜백 재진입 방지
  private isPollingCycleRunning = false;
  private mockMode = false;
  private onDataCallback?: ((data: any) => void) | undefined;

  private defaultPollingInterval = 20000; // 20초
  private nextPollingInterval: number | null = null; // 다음 주기부터 적용할 간격

  // 🆕 1단계: 조건부 폴링을 위한 캐시 관련 프로퍼티 추가
  private deviceCache: Array<{ deviceId: string; unitId: string; deviceType: string }> = [];
  private lastDeviceCacheUpdate = 0;
  private readonly DEVICE_CACHE_TTL = 5 * 60 * 1000; // 5분

  // 🆕 DataSyncService 추가
  private dataSyncService: DataSyncService | null = null;

  // 🎯 Phase 4: 성능 최적화를 위한 추가 프로퍼티
  private readonly MAX_RETRY_ATTEMPTS = 1; // 최대 재시도 횟수
  private readonly RETRY_DELAY = 100; // 재시도 지연 시간 (ms)
  private readonly MEMORY_CLEANUP_INTERVAL = 10 * 60 * 1000; // 메모리 정리 간격 (10분)
  private memoryCleanupTimer: NodeJS.Timeout | null = null;
  private performanceMetrics: {
    totalPollingCalls: number;
    successfulPolls: number;
    failedPolls: number;
    averageResponseTime: number;
    lastCleanup: Date;
  } = {
    totalPollingCalls: 0,
    successfulPolls: 0,
    failedPolls: 0,
    averageResponseTime: 0,
    lastCleanup: new Date(),
  };

  // 🆕 에러 메시지 상세화를 위한 속성
  private currentPollingCycle = 0;
  private stopRequested = false;

  constructor(modbusService: IUnifiedModbusCommunication, logger?: ILogger, onDataCallback?: (data: any) => void) {
    this.modbusService = modbusService;
    this.logger = logger;
    this.addressMapping = getModbusAddressMapping();
    this.mockMode = isModbusMockEnabled();

    // 🆕 DataSyncService 초기화
    try {
      const serviceContainer = ServiceContainer.getInstance();
      this.dataSyncService = serviceContainer.getDataSyncService();
      this.logger?.debug(`[UnifiedModbusPollerService] DataSyncService 초기화 완료`);
    } catch (error) {
      this.logger?.warn(`[UnifiedModbusPollerService] DataSyncService 초기화 실패: ${error}`);
      this.dataSyncService = null;
    }

    this.logger?.debug(`[UnifiedModbusPollerService] 초기화 완료 (Mock 모드: ${this.mockMode})`);

    // 🎯 Phase 4: 메모리 정리 타이머 시작
    this.startMemoryCleanupTimer();
  }

  // 🆕 DataSyncService 설정 메서드
  public setDataSyncService(dataSyncService: DataSyncService): void {
    this.dataSyncService = dataSyncService;
    this.logger?.debug(`[UnifiedModbusPollerService] DataSyncService 설정 완료`);
  }

  // 🆕 일괄처리 관련 메서드들

  /**
   * 🎯 Phase 4: 메모리 정리 타이머 시작
   */
  private startMemoryCleanupTimer(): void {
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer);
    }

    this.memoryCleanupTimer = setInterval(() => {
      this.performMemoryCleanup();
    }, this.MEMORY_CLEANUP_INTERVAL);

    this.logger?.info(`[UnifiedModbusPollerService] 메모리 정리 타이머 시작 (${this.MEMORY_CLEANUP_INTERVAL}ms)`);
  }

  /**
   * 🎯 Phase 4: 메모리 정리 수행
   */
  private performMemoryCleanup(): void {
    try {
      const startTime = Date.now();
      let cleanedItems = 0;

      // 🎯 만료된 캐시 정리
      const now = Date.now();
      if (now - this.lastDeviceCacheUpdate > this.DEVICE_CACHE_TTL) {
        this.deviceCache = [];
        this.lastDeviceCacheUpdate = 0;
        cleanedItems++;
        this.logger?.debug(`[UnifiedModbusPollerService] 만료된 디바이스 캐시 정리`);
      }

      // 🎯 성능 메트릭 업데이트
      this.performanceMetrics.lastCleanup = new Date();
      this.logger?.debug(
        `[UnifiedModbusPollerService] 메모리 정리 완료: ${cleanedItems}개 항목, 소요시간: ${Date.now() - startTime}ms`,
      );
    } catch (error) {
      this.logger?.error(`[UnifiedModbusPollerService] 메모리 정리 실패: ${error}`);
    }
  }

  /**
   * 🎯 Phase 4: 성능 메트릭 업데이트 (즉시 저장 방식)
   */
  private updatePerformanceMetrics(success: boolean, responseTime: number): void {
    this.performanceMetrics.totalPollingCalls++;

    if (success) {
      this.performanceMetrics.successfulPolls++;
    } else {
      this.performanceMetrics.failedPolls++;
    }

    // 🎯 평균 응답 시간 계산 (이동 평균) - 폴링+저장 시간 포함
    const alpha = 0.1; // 가중치
    this.performanceMetrics.averageResponseTime =
      alpha * responseTime + (1 - alpha) * this.performanceMetrics.averageResponseTime;
  }

  /**
   * 🎯 Phase 4: 성능 메트릭 조회
   */
  getPerformanceMetrics(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * 🎯 폴링 사이클 실행 상태 조회
   */
  getIsPollingCycleRunning(): boolean {
    return this.isPollingCycleRunning;
  }

  /**
   * 동적 폴링 간격 가져오기 (시스템 설정에서 읽기)
   */
  private async getPollingInterval(): Promise<number> {
    try {
      const systemService = ServiceContainer.getInstance().getSystemService();
      const systemSettings = await systemService?.getSettings();
      return systemSettings?.runtime?.pollingInterval || 20000; // 기본값: 20초
    } catch (error) {
      this.logger?.warn(`[UnifiedModbusPollerService] 폴링 간격 설정을 가져올 수 없습니다. 기본값 사용: 20000ms`);
      return 20000;
    }
  }

  /**
   * 시스템 모드 확인 (pollingEnabled 상태 기반)
   */
  private async getSystemMode(): Promise<string> {
    try {
      const systemService = ServiceContainer.getInstance().getSystemService();
      const settings = await systemService.getSettings();

      if (settings?.runtime?.pollingEnabled) {
        return 'auto';
      }
      return 'manual';
    } catch (error) {
      this.logger?.error(`[UnifiedModbusPollerService] 시스템 모드 확인 실패: ${error}`);
      return 'manual';
    }
  }

  /**
   * Data 컬렉션에서 등록된 장비 목록을 조회 (캐시 사용)
   */
  private async getRegisteredDevicesWithCache(): Promise<
    Array<{ deviceId: string; unitId: string; deviceType: string }>
  > {
    try {
      const now = Date.now();

      // 🎯 캐시가 유효한 경우 캐시된 데이터 반환
      if (this.deviceCache.length > 0 && now - this.lastDeviceCacheUpdate < this.DEVICE_CACHE_TTL) {
        this.logger?.debug(`[UnifiedModbusPollerService] 캐시된 장비 목록 사용 (${this.deviceCache.length}개)`);
        return this.deviceCache;
      }

      // 🎯 Data 컬렉션에서 장비 목록 조회
      const { Data } = await import('../../models/schemas/DataSchema');
      const devices = await Data.find({}).lean();

      if (!devices || devices.length === 0) {
        this.logger?.info(`[UnifiedModbusPollerService] Data 컬렉션이 비어있습니다.`);
        this.deviceCache = [];
        this.lastDeviceCacheUpdate = now;
        return [];
      }

      // 🎯 장비 목록 구성
      const deviceList = [];
      for (const device of devices) {
        if (device.units && Array.isArray(device.units)) {
          for (const unit of device.units) {
            deviceList.push({
              deviceId: device.deviceId,
              unitId: unit.unitId,
              deviceType: device.type || 'unknown',
            });
          }
        }
      }

      // 🎯 캐시 업데이트
      this.deviceCache = deviceList;
      this.lastDeviceCacheUpdate = now;

      this.logger?.info(`[UnifiedModbusPollerService] 등록된 장비 ${deviceList.length}개 발견`);
      return deviceList;
    } catch (error) {
      this.logger?.error(`[UnifiedModbusPollerService] 등록된 장비 목록 조회 실패: ${error}`);
      return [];
    }
  }

  /**
   * 다음 폴링 주기부터 폴링 간격 변경 예약
   */
  async schedulePollingIntervalChange(newInterval: number): Promise<void> {
    this.nextPollingInterval = newInterval;
    this.logger?.info(`[UnifiedModbusPollerService] 다음 폴링 주기부터 간격을 ${newInterval}ms로 변경합니다.`);
  }

  // ==================== 기본 폴링 메서드 ====================

  /**
   * 기본 폴링 시작 (시스템 상태 확인용)
   */
  async startBasicPolling(slaveId = 1, onData?: (data: any) => void): Promise<string> {
    try {
      // 🎯 3단계: 통합 폴링 시스템 사용
      this.logger?.info(`[UnifiedModbusPollerService] 기본 폴링 시작 - Slave: ${slaveId}`);

      // �� 필수 폴링 시작 (시스템 상태만 확인)
      const pollIds = await this.startEssentialPolling(slaveId, this.defaultPollingInterval, onData);

      if (pollIds.length > 0) {
        this.logger?.info(`[UnifiedModbusPollerService] 기본 폴링 시작 완료 - ID: ${pollIds[0]}`);
        return pollIds[0];
      }
      throw new Error('기본 폴링 시작 실패');
    } catch (error) {
      this.logger?.error(`[UnifiedModbusPollerService] 기본 폴링 시작 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 기본 폴링 중지
   */
  stopBasicPolling(pollId: string): boolean {
    const intervalId = this.pollingIntervals.get(pollId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(pollId);
      this.logger?.info(`[UnifiedModbusPollerService] 기본 폴링 중지 - ID: ${pollId}`);
      return true;
    }
    return false;
  }

  // ==================== SNGIL DDC 전용 폴링 ====================

  /**
   * SNGIL DDC 통합 폴링 시작 (타이머 포함)
   */
  async startSNGILUnifiedPolling(slaveId = 1, interval = 5000, onData?: (data: any) => void): Promise<string> {
    try {
      // 🎯 3단계: 통합 폴링 시스템 사용
      this.logger?.info(
        `[UnifiedModbusPollerService] SNGIL DDC 통합 폴링 시작 - Slave: ${slaveId}, 간격: ${interval}ms`,
      );

      // 🎯 통합 폴링 시작
      const pollIds = await this.startUnifiedPolling(slaveId, onData);

      if (pollIds.length > 0) {
        this.logger?.info(`[UnifiedModbusPollerService] 통합 폴링 시작 완료 - ID: ${pollIds[0]}`);
        return pollIds[0];
      }
      throw new Error('폴링 시작 실패');
    } catch (error) {
      this.logger?.error(`[UnifiedModbusPollerService] SNGIL DDC 통합 폴링 시작 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 특정 폴링 중지
   */
  stopPolling(pollId: string): boolean {
    const intervalId = this.pollingIntervals.get(pollId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(pollId);
      this.logger?.info(`[UnifiedModbusPollerService] 폴링 중지 - ID: ${pollId}`);
      return true;
    }
    return false;
  }

  /**
   * 모든 폴링 중지
   */
  stopAllPolling(): void {
    this.stopRequested = true;
    // 통합 폴링 타이머 정리
    if (this.singlePollingTimer) {
      clearInterval(this.singlePollingTimer);
      this.singlePollingTimer = null;
    }

    // 개별 폴링 타이머들 정리
    for (const [pollId, intervalId] of this.pollingIntervals.entries()) {
      clearInterval(intervalId);
      this.logger?.debug(`[UnifiedModbusPollerService] 폴링 중지 - ID: ${pollId}`);
    }
    this.pollingIntervals.clear();

    // 콜백 정리
    this.onDataCallback = undefined;

    this.logger?.info(`[UnifiedModbusPollerService] 모든 폴링 중지 완료`);
  }

  // ==================== 통합 폴링 메서드 ====================

  /**
   * SNGIL DDC 통합 폴링 시작 (시스템 모드 체크 포함)
   */
  async startAllSNGILPolling(slaveId = 1, onData?: (data: any) => void): Promise<string[]> {
    try {
      this.stopRequested = false;
      // 시스템 모드 확인
      if (!(await this.isSystemModeAuto())) {
        this.logger?.warn('[UnifiedModbusPollerService] 시스템 모드가 auto가 아닙니다. 폴링을 시작하지 않습니다.');
        return [];
      }

      // 🎯 통합 폴링 시스템 사용
      this.logger?.info(`[UnifiedModbusPollerService] 통합 폴링 시스템으로 시작합니다.`);
      try {
        const serviceContainer = ServiceContainer.getInstance();
        const unifiedModbusService = serviceContainer.getUnifiedModbusService();
        const queueStatus = unifiedModbusService?.getQueueStatus();
        if (queueStatus) {
          this.logger?.info(
            `[UnifiedModbusPollerService] 현재 Modbus 큐 상태 - 총 ${queueStatus.totalCommands}개 (high: ${queueStatus.highPriority}, normal: ${queueStatus.normalPriority}, low: ${queueStatus.lowPriority})`,
          );
        }
      } catch (queueError) {
        this.logger?.warn(`[UnifiedModbusPollerService] 큐 상태 조회 실패: ${queueError}`);
      }
      return this.startUnifiedPolling(slaveId, onData);
    } catch (error) {
      this.logger?.error(`[UnifiedModbusPollerService] 통합 폴링 시작 실패: ${error}`);
      // 🎯 Fallback 제거 - 에러 발생 시 빈 배열 반환
      this.logger?.warn(`[UnifiedModbusPollerService] 에러 발생으로 폴링을 시작하지 않습니다.`);
      return [];
    }
  }

  // ==================== 새로운 폴링 시스템 연동 ====================

  /**
   * 특정 장비에 대한 폴링 실행
   */
  async executePollingForDevice(deviceId: string, unitId: string, deviceType: string): Promise<any> {
    const startTime = Date.now();

    try {
      // 🎯 Device 컬렉션에서 clientId 조회
      const clientId = await this.getClientIdFromDeviceCollection(deviceId);
      if (!clientId) {
        throw new Error(`Client ID not found for device: ${deviceId}`);
      }

      // 🎯 CLIENT_PORT_MAPPINGS에서 직접 Actions 추출
      const clientMapping = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];

      if (!clientMapping || !clientMapping[deviceType]) {
        const availableTypes = clientMapping ? Object.keys(clientMapping) : [];
        const suggestion = this.findSimilarDeviceType(deviceType, availableTypes);

        throw new Error(
          `Device type '${deviceType}' not found in ${clientId}. ` +
            `Available types: [${availableTypes.join(', ')}]. ` +
            `Suggestion: ${suggestion ? `Try '${suggestion}'` : 'No similar type found'}. ` +
            `Context: Polling cycle ${this.currentPollingCycle || 'unknown'}, Device: ${deviceId}/${unitId}`,
        );
      }

      // COMMON_SYSTEM_PORTS는 unitId가 없음
      if (deviceType === 'ddc_time' || deviceType === 'seasonal') {
        // COMMON_SYSTEM_PORTS 폴링 지원
        return await this.executeCommonSystemPortPolling(clientId, deviceType);
      }

      // 일반 디바이스는 unitId 필요
      if (!clientMapping[deviceType][unitId]) {
        throw new Error(`Unit '${unitId}' not found in ${clientId}/${deviceType}`);
      }

      const unitMapping = clientMapping[deviceType][unitId];

      // 🎯 GET_로 시작하는 Actions만 폴링 (읽기 전용)
      const pollingActions = Object.keys(unitMapping).filter((action) => action.startsWith('GET_'));

      if (pollingActions.length === 0) {
        this.logger?.warn(`[UnifiedModbusPollerService] No polling actions found for ${deviceId}/${unitId}`);
        return { success: false, message: 'No polling actions available' };
      }

      // 🎯 통합시간 명령어 확인
      const timeIntegratedActions = pollingActions.filter((action) => {
        const actionConfig = unitMapping[action];
        return actionConfig === 'TIME_INTEGRATED';
      });

      this.logger?.info(
        `[UnifiedModbusPollerService] Starting polling for ${deviceId}/${unitId} with ${pollingActions.length} actions`,
      );

      const results = [];

      // 🎯 각 Action에 대해 폴링 실행 (재시도 로직 포함)
      for (const action of pollingActions) {
        try {
          const result = await this.executePollingActionWithRetry(deviceId, unitId, deviceType, action);
          results.push({ action, success: true, data: result });
        } catch (error) {
          this.logger?.warn(
            `[UnifiedModbusPollerService] Action ${action} failed after retries: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          results.push({ action, success: false, error: error instanceof Error ? error.message : String(error) });
        }
      }

      // 🆕 개별 장비별 통신 에러/성공 처리
      if (results.some((r) => !r.success)) {
        await this.handleCommunicationErrorForDevice(deviceId, unitId);
      } else {
        await this.handleCommunicationSuccess(deviceId, unitId);
      }

      const successCount = results.filter((r) => r.success).length;
      const responseTime = Date.now() - startTime;

      // 🎯 Phase 4: 성능 메트릭 업데이트
      this.updatePerformanceMetrics(true, responseTime);

      // 🆕 폴링 결과 통계 수집
      const pollingStats = {
        deviceId,
        unitId,
        deviceType,
        totalActions: pollingActions.length,
        successfulActions: successCount,
        failedActions: pollingActions.length - successCount,
        successRate: ((successCount / pollingActions.length) * 100).toFixed(1),
        responseTime,
        timestamp: new Date(),
      };

      this.logger?.debug(
        `[UnifiedModbusPollerService] Polling completed: ${successCount}/${pollingActions.length} actions successful (${pollingStats.successRate}%), Response time: ${responseTime}ms`,
      );

      // 🆕 상세 성공/실패 로깅
      if (successCount > 0) {
        const successfulActions = results.filter((r) => r.success).map((r) => r.action);
        this.logger?.debug(`[UnifiedModbusPollerService] Successful actions: ${successfulActions.join(', ')}`);
      }

      if (results.some((r) => !r.success)) {
        const failedActions = results.filter((r) => !r.success).map((r) => `${r.action} (${r.error})`);
        this.logger?.warn(`[UnifiedModbusPollerService] Failed actions: ${failedActions.join(', ')}`);
      }

      return {
        success: true,
        deviceId,
        unitId,
        deviceType,
        totalActions: pollingActions.length,
        successfulActions: successCount,
        responseTime,
        results,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 🎯 Phase 4: 성능 메트릭 업데이트 (실패)
      this.updatePerformanceMetrics(false, responseTime);

      this.logger?.error(
        `[UnifiedModbusPollerService] Polling failed for ${deviceId}/${unitId}: ${
          error instanceof Error ? error.message : String(error)
        }, Response time: ${responseTime}ms`,
      );
      return { success: false, error: error instanceof Error ? error.message : String(error), responseTime };
    }
  }

  /**
   * 🎯 COMMON_SYSTEM_PORTS 폴링 실행
   */
  private async executeCommonSystemPortPolling(clientId: string, deviceType: string): Promise<any> {
    const startTime = Date.now();

    try {
      // 🎯 CLIENT_PORT_MAPPINGS에서 COMMON_SYSTEM_PORTS 액션 추출
      const clientMapping = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];

      if (!clientMapping || !clientMapping[deviceType]) {
        const availableTypes = clientMapping ? Object.keys(clientMapping) : [];
        const suggestion = this.findSimilarDeviceType(deviceType, availableTypes);

        throw new Error(
          `Device type '${deviceType}' not found in ${clientId}. ` +
            `Available types: [${availableTypes.join(', ')}]. ` +
            `Suggestion: ${suggestion ? `Try '${suggestion}'` : 'No similar type found'}. ` +
            `Context: COMMON_SYSTEM_PORTS polling, Device: ${deviceType}`,
        );
      }

      // 🎯 GET_로 시작하는 Actions만 폴링 (읽기 전용)
      const pollingActions = Object.keys(clientMapping[deviceType]).filter((action) => action.startsWith('GET_'));

      if (pollingActions.length === 0) {
        this.logger?.warn(`[UnifiedModbusPollerService] No polling actions found for ${deviceType}`);
        return { success: false, message: 'No polling actions available' };
      }

      this.logger?.info(
        `[UnifiedModbusPollerService] Starting COMMON_SYSTEM_PORTS polling for ${deviceType} with ${pollingActions.length} actions`,
      );

      const results = [];

      // 🎯 각 Action에 대해 폴링 실행 (재시도 로직 포함)
      for (const action of pollingActions) {
        try {
          const result = await this.executeCommonSystemPortActionWithRetry(clientId, deviceType, action);
          results.push({ action, success: true, data: result });
        } catch (error) {
          this.logger?.warn(
            `[UnifiedModbusPollerService] Action ${action} failed after retries: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          results.push({ action, success: false, error: error instanceof Error ? error.message : String(error) });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const responseTime = Date.now() - startTime;

      // 🎯 Phase 4: 성능 메트릭 업데이트
      this.updatePerformanceMetrics(true, responseTime);

      this.logger?.info(
        `[UnifiedModbusPollerService] COMMON_SYSTEM_PORTS polling completed: ${successCount}/${pollingActions.length} actions successful, Response time: ${responseTime}ms`,
      );

      return {
        success: true,
        clientId,
        deviceType,
        totalActions: pollingActions.length,
        successfulActions: successCount,
        responseTime,
        results,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 🎯 Phase 4: 성능 메트릭 업데이트 (실패)
      this.updatePerformanceMetrics(false, responseTime);

      this.logger?.error(
        `[UnifiedModbusPollerService] COMMON_SYSTEM_PORTS polling failed for ${deviceType}: ${
          error instanceof Error ? error.message : String(error)
        }, Response time: ${responseTime}ms`,
      );
      return { success: false, error: error instanceof Error ? error.message : String(error), responseTime };
    }
  }

  /**
   * 🎯 COMMON_SYSTEM_PORTS 액션 재시도 로직을 포함한 실행
   */
  private async executeCommonSystemPortActionWithRetry(
    clientId: string,
    deviceType: string,
    action: string,
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const startTime = Date.now();
        const result = await this.executeCommonSystemPortAction(clientId, deviceType, action);
        const responseTime = Date.now() - startTime;

        // 🎯 성공 시 성능 메트릭 업데이트
        this.updatePerformanceMetrics(true, responseTime);

        if (attempt > 1) {
          this.logger?.info(
            `[UnifiedModbusPollerService] COMMON_SYSTEM_PORTS action ${action} succeeded on attempt ${attempt} for ${deviceType}`,
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          const delay = this.RETRY_DELAY * attempt; // 간단한 지수 백오프
          this.logger?.warn(
            `[UnifiedModbusPollerService] COMMON_SYSTEM_PORTS action ${action} failed on attempt ${attempt} for ${deviceType}, retrying in ${delay}ms: ${lastError.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay)); // 간단한 sleep 구현
        }
      }
    }

    throw (
      lastError || new Error(`COMMON_SYSTEM_PORTS action ${action} failed after ${this.MAX_RETRY_ATTEMPTS} attempts`)
    );
  }

  /**
   * 🎯 COMMON_SYSTEM_PORTS 액션 실행
   */
  private async executeCommonSystemPortAction(clientId: string, deviceType: string, action: string): Promise<any> {
    try {
      // 🎯 CLIENT_PORT_MAPPINGS에서 액션 설정 확인
      const clientMapping = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];

      if (!clientMapping || !clientMapping[deviceType] || !clientMapping[deviceType][action]) {
        throw new Error(`Action ${action} not found for ${clientId}/${deviceType}`);
      }

      const actionConfig = clientMapping[deviceType][action];
      // this.logger?.info(`[executeCommonSystemPortAction] 액션 설정: ${JSON.stringify(actionConfig)}`);

      // 🎯 새로운 매핑 구조에 맞게 functionCode와 address 추출
      let functionCode: number;
      let address: number;

      if (actionConfig.port) {
        // 새로운 구조: { port: { functionCode, address } }
        functionCode = actionConfig.port.functionCode;
        address = actionConfig.port.address;
      } else if (actionConfig.functionCode && actionConfig.address) {
        // 하위 호환성: { functionCode, address }
        functionCode = actionConfig.functionCode;
        address = actionConfig.address;
      } else {
        throw new Error(`Invalid action config for ${action}: missing functionCode or address`);
      }

      // 🎯 Modbus 명령 생성
      const modbusCommand = {
        id: `polling_common_system_${clientId}_${deviceType}_${action}_${Date.now()}`,
        type: 'read' as const,
        unitId: '1', // 기본값
        functionCode,
        address,
        lengthOrValue: actionConfig.length || 1,
        priority: 'low' as const,
        timestamp: new Date(),
        resolve: () => {
          // Placeholder for queue resolution
        },
        reject: () => {
          // Placeholder for queue resolution
        },
      };

      // this.logger?.info(
      //   `[executeCommonSystemPortAction] Modbus 명령 생성: ${JSON.stringify({
      //     id: modbusCommand.id,
      //     functionCode: modbusCommand.functionCode,
      //     address: modbusCommand.address,
      //     lengthOrValue: modbusCommand.lengthOrValue,
      //   })}`,
      // );

      // 🎯 Modbus 실행
      const modbusResult = await this.modbusService.executeCommand(modbusCommand);

      // 🎯 실행 결과 상세 분석
      this.logger?.info(
        `[executeCommonSystemPortAction] Modbus 실행 결과: ${JSON.stringify({
          success: modbusResult.success,
          hasData: !!modbusResult.data,
          dataLength: modbusResult.data?.length,
          dataType: typeof modbusResult.data,
          error: modbusResult.error,
          errorType: typeof modbusResult.error,
        })}`,
      );

      if (modbusResult.data) {
        this.logger?.info(`[executeCommonSystemPortAction] 데이터 내용: ${JSON.stringify(modbusResult.data)}`);
      }

      // 🎯 성공/실패 판단 및 처리
      if (!modbusResult.success) {
        this.logger?.error(`[executeCommonSystemPortAction] Modbus 실행 실패: success=false`);
        throw new Error(`Modbus execution failed: success=false`);
      } else if (!modbusResult.data) {
        this.logger?.error(`[executeCommonSystemPortAction] Modbus 실행 실패: data가 없음`);
        throw new Error(`Modbus execution failed: no data returned`);
      } else if (!Array.isArray(modbusResult.data) || modbusResult.data.length === 0) {
        this.logger?.error(`[executeCommonSystemPortAction] Modbus 실행 실패: data 배열이 비어있음`);
        throw new Error(`Modbus execution failed: empty data array`);
      } else {
        const result = modbusResult.data[0]; // ✅ 수정: data.data[0] → data[0]
        this.logger?.info(`[executeCommonSystemPortAction] Modbus 실행 성공: ${result}`);
        return result;
      }
    } catch (error) {
      this.logger?.error(
        `[UnifiedModbusPollerService] COMMON_SYSTEM_PORTS 액션 실행 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * 🎯 Phase 4: 재시도 로직을 포함한 폴링 액션 실행
   */
  private async executePollingActionWithRetry(
    deviceId: string,
    unitId: string,
    deviceType: string,
    action: string,
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const startTime = Date.now();
        const result = await this.executePollingAction(deviceId, unitId, deviceType, action);
        const responseTime = Date.now() - startTime;

        // 🎯 성공 시 성능 메트릭 업데이트
        this.updatePerformanceMetrics(true, responseTime);

        if (attempt > 1) {
          this.logger?.info(
            `[UnifiedModbusPollerService] Action ${action} succeeded on attempt ${attempt} for ${deviceId}/${unitId}`,
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const responseTime = this.RETRY_DELAY;

        // 🎯 실패 시 성능 메트릭 업데이트
        this.updatePerformanceMetrics(false, responseTime);

        this.logger?.warn(
          `[UnifiedModbusPollerService] Action ${action} failed on attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS} for ${deviceId}/${unitId}: ${lastError.message}`,
        );

        // 🎯 마지막 시도가 아니면 재시도 지연
        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          await this.delay(this.RETRY_DELAY);
        }
      }
    }

    // 🎯 모든 재시도 실패
    throw lastError || new Error(`Action ${action} failed after ${this.MAX_RETRY_ATTEMPTS} attempts`);
  }

  /**
   * 🎯 Phase 4: 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 특정 장비의 Client ID를 찾습니다.
   */
  private async getClientIdFromDeviceCollection(deviceId: string): Promise<string | null> {
    try {
      const { DeviceModel } = await import('../../models/Device');
      const deviceModel = new DeviceModel();
      const device = await deviceModel.findById(deviceId);

      if (device && device.clientId) {
        this.logger?.debug(`[UnifiedModbusPollerService] Device ${deviceId}의 clientId: ${device.clientId}`);
        return device.clientId;
      }

      this.logger?.warn(`[UnifiedModbusPollerService] Device ${deviceId}에서 clientId를 찾을 수 없음`);
      return null;
    } catch (error) {
      this.logger?.error(`[UnifiedModbusPollerService] Device 조회 실패: ${error}`);
      return null;
    }
  }

  /**
   * 특정 장비의 특정 액션을 실행합니다.
   */
  private async executePollingAction(
    deviceId: string,
    unitId: string,
    deviceType: string,
    action: string,
  ): Promise<any> {
    try {
      // 🎯 직접 Client Port Mappings에서 Action 정보 추출
      const clientId = (await this.getClientIdFromDeviceCollection(deviceId)) || 'c0101';
      const clientMapping = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];

      if (!clientMapping) {
        throw new Error(`Client mapping not found for ${clientId}`);
      }

      // 🎯 직접 deviceType 사용 (이미 알고 있음)
      if (!clientMapping[deviceType] || !clientMapping[deviceType][unitId]) {
        throw new Error(`Device type '${deviceType}' or unit '${unitId}' not found in ${clientId}`);
      }

      const unitMapping = clientMapping[deviceType][unitId];
      const foundAction = unitMapping[action];

      if (!foundAction) {
        throw new Error(`Action ${action} not found for ${clientId}/${deviceType}/${unitId}`);
      }

      // 🎯 Phase 2: 통합된 시간 명령어 처리
      if (foundAction === 'TIME_INTEGRATED') {
        // this.logger?.info(
        //   `[UnifiedModbusPollerService] 🎯 통합시간 명령어 처리 시작: ${clientId}/${deviceType}/${unitId}/${action}`,
        // );
        return await this.executeIntegratedTimeAction(clientId, deviceType, unitId, action);
      }

      // 🎯 기존 Modbus 통신 실행 (개별 HOUR/MINUTE 명령어)
      // 🆕 새로운 중앙 큐 시스템 사용
      const modbusCommand = {
        id: `polling_action_${deviceId}_${unitId}_${action}_${Date.now()}`,
        type: 'read' as const,
        unitId: '1', // 기본값
        functionCode: foundAction.port.functionCode,
        address: foundAction.port.address,
        lengthOrValue: foundAction.length || 1,
        priority: 'low' as const,
        timestamp: new Date(),
        resolve: () => {
          // Placeholder for queue resolution
        },
        reject: () => {
          // Placeholder for queue resolution
        },
      };

      // Modbus 커맨드 송수신 시간 측정
      const commandStartTime = Date.now();
      const modbusResult = await this.modbusService.executeCommand(modbusCommand);
      const commandDuration = Date.now() - commandStartTime;

      // 성능 로그 (DEBUG 레벨로 제한하여 로그 양 조절)
      this.logger?.debug(
        `[UnifiedModbusPollerService] 📡 Modbus 커맨드: ${action} (FC:${foundAction.port.functionCode}, Addr:${foundAction.port.address}) - ${commandDuration}ms`,
      );

      if (modbusResult.success) {
        return modbusResult.data;
      }
      throw new Error(`Modbus read failed for action ${action}: ${modbusResult.error}`);
    } catch (error) {
      this.logger?.error(
        `[UnifiedModbusPollerService] executePollingAction failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * 🎯 Phase 2: 통합된 시간 명령어 실행 (HOUR/MINUTE 분해 및 조합)
   */
  private async executeIntegratedTimeAction(
    clientId: string,
    deviceType: string,
    unitId: string,
    action: string,
  ): Promise<any> {
    try {
      // this.logger?.info(
      //   `[UnifiedModbusPollerService] 통합된 시간 명령어 실행: ${clientId}/${deviceType}/${unitId}/${action}`,
      // );

      // 🎯 CLIENT_PORT_MAPPINGS에서 HOUR/MINUTE 명령어 찾기
      const clientMapping = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];

      if (!clientMapping || !clientMapping[deviceType] || !clientMapping[deviceType][unitId]) {
        throw new Error(`Mapping not found for ${clientId}/${deviceType}/${unitId}`);
      }

      const unitMapping = clientMapping[deviceType][unitId];

      // 🎯 통합된 시간 명령어에 대응하는 HOUR/MINUTE 명령어 찾기
      const hourAction = this.findHourAction(action);
      const minuteAction = this.findMinuteAction(action);

      if (!hourAction || !minuteAction) {
        throw new Error(`HOUR/MINUTE actions not found for ${action}`);
      }

      // 🎯 HOUR/MINUTE 명령어 실행 (시간 측정 포함)
      const hourStartTime = Date.now();
      const hourResult = await this.executeHourMinuteAction(clientId, deviceType, unitId, hourAction);
      const hourDuration = Date.now() - hourStartTime;

      const minuteStartTime = Date.now();
      const minuteResult = await this.executeHourMinuteAction(clientId, deviceType, unitId, minuteAction);
      const minuteDuration = Date.now() - minuteStartTime;

      // 성능 로그 (DEBUG 레벨)
      // this.logger?.debug(
      //   `[UnifiedModbusPollerService] 📡 통합시간 명령어: ${action} - HOUR ${hourDuration}ms | MINUTE ${minuteDuration}ms`,
      // );

      // 🎯 HOUR/MINUTE 결과를 통합된 "HH:mm" 형식으로 조합
      const integratedTime = this.combineHourMinute(hourResult, minuteResult);

      // this.logger?.info(`[UnifiedModbusPollerService] 통합된 시간 명령어 완료: ${action} = ${integratedTime}`);

      return integratedTime;
    } catch (error) {
      this.logger?.error(
        `[UnifiedModbusPollerService] 통합된 시간 명령어 실행 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * 🎯 HOUR 명령어 찾기
   */
  private findHourAction(action: string): string | null {
    // 🎯 통합된 시간 명령어를 HOUR 명령어로 변환
    const hourActionMap: Record<string, string> = {
      GET_START_TIME_1: 'GET_START_TIME_1_HOUR',
      GET_END_TIME_1: 'GET_END_TIME_1_HOUR',
      GET_START_TIME_2: 'GET_START_TIME_2_HOUR',
      GET_END_TIME_2: 'GET_END_TIME_2_HOUR',
    };

    return hourActionMap[action] || null;
  }

  /**
   * 🎯 MINUTE 명령어 찾기
   */
  private findMinuteAction(action: string): string | null {
    // 🎯 통합된 시간 명령어를 MINUTE 명령어로 변환
    const minuteActionMap: Record<string, string> = {
      GET_START_TIME_1: 'GET_START_TIME_1_MINUTE',
      GET_END_TIME_1: 'GET_END_TIME_1_MINUTE',
      GET_START_TIME_2: 'GET_START_TIME_2_MINUTE',
      GET_END_TIME_2: 'GET_END_TIME_2_MINUTE',
    };

    return minuteActionMap[action] || null;
  }

  /**
   * 🎯 HOUR/MINUTE 명령어 실행
   */
  private async executeHourMinuteAction(
    clientId: string,
    deviceType: string,
    unitId: string,
    action: string,
  ): Promise<number> {
    try {
      // 🎯 1단계: CLIENT_PORT_MAPPINGS 로딩
      // this.logger?.info(`[executeHourMinuteAction] CLIENT_PORT_MAPPINGS 로딩 완료`);

      // 🎯 2단계: 클라이언트 매핑 확인
      const clientMapping = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];

      if (!clientMapping || !clientMapping[deviceType] || !clientMapping[deviceType][unitId]) {
        throw new Error(`Mapping not found for ${clientId}/${deviceType}/${unitId}`);
      }

      // 🎯 3단계: 액션 설정 확인
      const unitMapping = clientMapping[deviceType][unitId];
      const actionConfig = unitMapping[action];
      // this.logger?.debug(`[executeHourMinuteAction] 액션 설정: ${JSON.stringify(actionConfig)}`);

      if (!actionConfig) {
        throw new Error(`Action ${action} not found for ${clientId}/${deviceType}/${unitId}`);
      }

      // �� Modbus 통신 실행
      // 🎯 4단계: Modbus 명령 생성
      // 새로운 매핑 구조에 맞게 functionCode와 address 추출
      let functionCode: number;
      let address: number;

      if (actionConfig.port) {
        // 새로운 구조: { port: { functionCode, address } }
        functionCode = actionConfig.port.functionCode;
        address = actionConfig.port.address;
      } else if (actionConfig.functionCode && actionConfig.address) {
        // 하위 호환성: { functionCode, address }
        functionCode = actionConfig.functionCode;
        address = actionConfig.address;
      } else {
        throw new Error(`Invalid action config for ${action}: missing functionCode or address`);
      }

      const modbusCommand = {
        id: `polling_hour_minute_${clientId}_${deviceType}_${unitId}_${action}_${Date.now()}`,
        type: 'read' as const,
        unitId: '1', // 기본값
        functionCode,
        address,
        lengthOrValue: actionConfig.length || 1,
        priority: 'low' as const,
        timestamp: new Date(),
        resolve: () => {
          // Placeholder for queue resolution
        },
        reject: () => {
          // Placeholder for queue resolution
        },
      };

      // this.logger?.info(
      //   `[executeHourMinuteAction] Modbus 명령 생성: ${JSON.stringify({
      //     id: modbusCommand.id,
      //     functionCode: modbusCommand.functionCode,
      //     address: modbusCommand.address,
      //     lengthOrValue: modbusCommand.lengthOrValue,
      //   })}`,
      // );

      // 🎯 5단계: Modbus 실행
      const modbusResult = await this.modbusService.executeCommand(modbusCommand);

      // 🎯 6단계: 실행 결과 상세 분석
      // this.logger?.info(
      //   `[executeHourMinuteAction] Modbus 실행 결과: ${JSON.stringify({
      //     success: modbusResult.success,
      //     hasData: !!modbusResult.data,
      //     dataLength: modbusResult.data?.length,
      //     dataType: typeof modbusResult.data,
      //     error: modbusResult.error,
      //     errorType: typeof modbusResult.error,
      //   })}`,
      // );

      if (modbusResult.data) {
        this.logger?.debug(`[executeHourMinuteAction] 데이터 내용: ${JSON.stringify(modbusResult.data)}`);
      }

      // 🎯 7단계: 성공/실패 판단 및 처리
      if (!modbusResult.success) {
        this.logger?.error(`[executeHourMinuteAction] Modbus 실행 실패: success=false`);
        throw new Error(`Modbus execution failed: success=false`);
      } else if (!modbusResult.data) {
        this.logger?.error(`[executeHourMinuteAction] Modbus 실행 실패: data가 없음`);
        throw new Error(`Modbus execution failed: no data returned`);
      } else if (!Array.isArray(modbusResult.data) || modbusResult.data.length === 0) {
        this.logger?.error(`[executeHourMinuteAction] Modbus 실행 실패: data 배열이 비어있음`);
        throw new Error(`Modbus execution failed: empty data array`);
      } else {
        const result = modbusResult.data[0]; // ✅ 수정: data.data[0] → data[0]
        // this.logger?.info(`[executeHourMinuteAction] Modbus 실행 성공: ${result}`);
        return result;
      }
    } catch (error) {
      this.logger?.error(
        `[UnifiedModbusPollerService] HOUR/MINUTE 명령어 실행 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * 🎯 HOUR/MINUTE 결과를 통합된 "HH:mm" 형식으로 조합
   */
  private combineHourMinute(hour: number, minute: number): string {
    // 🎯 HOUR와 MINUTE 값을 "HH:mm" 형식의 문자열로 조합
    const hourStr = hour.toString().padStart(2, '0');
    const minuteStr = minute.toString().padStart(2, '0');
    return `${hourStr}:${minuteStr}`;
  }

  // ==================== 상태 및 정보 ====================

  /**
   * 현재 실행 중인 폴링 목록
   */
  getActivePolling(): string[] {
    return Array.from(this.pollingIntervals.keys());
  }

  /**
   * 폴링 상태 확인
   */
  isPollingActive(): boolean {
    return this.pollingIntervals.size > 0;
  }

  /**
   * 폴링 통계 정보
   */
  getPollingStats(): Record<string, any> {
    return {
      activePollingCount: this.pollingIntervals.size,
      activePollingIds: this.getActivePolling(),
      isPollingActive: this.isPollingActive(),
      mockMode: this.mockMode,
      defaultPollingInterval: this.defaultPollingInterval,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🎯 Phase 4: 서비스 정리 (메모리 정리 포함)
   */
  destroy(): void {
    try {
      // 🎯 기존 폴링 중지
      this.stopAllPolling();

      // 🎯 메모리 정리 타이머 정리
      if (this.memoryCleanupTimer) {
        clearInterval(this.memoryCleanupTimer);
        this.memoryCleanupTimer = null;
        this.logger?.info(`[UnifiedModbusPollerService] 메모리 정리 타이머 정리 완료`);
      }

      // 🎯 캐시 정리
      this.deviceCache = [];
      this.lastDeviceCacheUpdate = 0;

      // 🎯 성능 메트릭 초기화
      this.performanceMetrics = {
        totalPollingCalls: 0,
        successfulPolls: 0,
        failedPolls: 0,
        averageResponseTime: 0,
        lastCleanup: new Date(),
      };

      // 🎯 콜백 정리
      this.onDataCallback = undefined;

      this.logger?.info(`[UnifiedModbusPollerService] 서비스 정리 완료 (메모리 정리 포함)`);
    } catch (error) {
      this.logger?.error(`[UnifiedModbusPollerService] 서비스 정리 중 오류 발생: ${error}`);
    }
  }

  // 🆕 1단계: 조건부 폴링을 위한 새로운 메서드들

  /**
   * 새로운 폴링 (매핑 방식)
   */
  private async startMappedPolling(slaveId: number, onData?: (data: any) => void): Promise<string[]> {
    try {
      const pollingInterval = await this.getPollingInterval();
      const pollId = this.startMappedPollingWithTimer(pollingInterval);

      this.logger?.info(`[UnifiedModbusPollerService] 매핑 기반 폴링 시작 완료 - ID: ${pollId}`);
      return [pollId];
    } catch (error) {
      this.logger?.error(
        `[UnifiedModbusPollerService] 매핑 기반 폴링 시작 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // 🎯 Fallback 제거 - 에러 발생 시 빈 배열 반환
      return [];
    }
  }

  /**
   * 매핑 기반 폴링 타이머 시작
   */
  private startMappedPollingWithTimer(interval: number): string {
    const pollId = `mapped_polling_${Date.now()}`;

    // 🎯 기존 타이머 정리
    if (this.singlePollingTimer) {
      clearInterval(this.singlePollingTimer);
    }

    // 🎯 새로운 타이머 시작
    this.singlePollingTimer = setInterval(async () => {
      if (this.isPollingCycleRunning) {
        // 재진입 방지: 이전 사이클이 아직 진행 중이면 이번 주기 스킵
        return;
      }
      this.isPollingCycleRunning = true;
      try {
        // 🎯 매 폴링 주기마다 장비 목록 재확인
        const currentDevices = await this.getRegisteredDevicesWithCache();

        if (currentDevices.length === 0) {
          this.logger?.info(`[UnifiedModbusPollerService] Data 컬렉션이 비어있습니다. 이번 주기 폴링을 건너뜁니다.`);
          return;
        }

        // 🎯 매핑 기반 폴링 실행
        await this.executeMappedPollingForAllDevices();

        // 🎯 폴링 간격 변경이 예약되어 있다면 적용
        if (this.nextPollingInterval !== null) {
          await this.applyPollingIntervalChange();
        }
      } catch (error) {
        this.logger?.error(
          `[UnifiedModbusPollerService] 매핑 기반 폴링 실패: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        this.isPollingCycleRunning = false;
      }
    }, interval);

    this.pollingIntervals.set(pollId, this.singlePollingTimer);

    this.logger?.info(`[UnifiedModbusPollerService] 매핑 기반 폴링 타이머 시작 - ID: ${pollId}, 간격: ${interval}ms`);

    return pollId;
  }

  /**
   * 특정 장비에 대한 폴링 실행
   */
  private async executeMappedPollingForAllDevices(): Promise<void> {
    const cycleStartTime = Date.now();
    let deviceQueryTime = 0;
    let totalPollingTime = 0;

    try {
      this.logger?.info(`[UnifiedModbusPollerService] 🚀 폴링 사이클 시작 - ${new Date().toISOString()}`);

      if (this.stopRequested) {
        this.logger?.info('[UnifiedModbusPollerService] 폴링 중지 요청 감지 - 사이클 실행을 건너뜁니다.');
        return;
      }

      // 웹소켓으로 실제 폴링 사이클 시작 로그 전송
      try {
        const serviceContainer = ServiceContainer.getInstance();
        if (serviceContainer) {
          const webSocketService = serviceContainer.getWebSocketService();
          webSocketService?.broadcastLog('info', 'system', '폴링 사이클이 시작되었습니다.');
        }
      } catch (wsError) {
        this.logger?.warn(`[UnifiedModbusPollerService] 웹소켓 로그 전송 실패: ${wsError}`);
      }

      // 1단계: 장비 조회 시간 측정
      const deviceQueryStart = Date.now();
      const devices = await this.getRegisteredDevicesWithCache();
      deviceQueryTime = Date.now() - deviceQueryStart;

      // 2단계: 폴링 + 즉시 저장 시간 측정
      const pollingStartTime = Date.now();
      for (const device of devices) {
        if (this.stopRequested) {
          this.logger?.info('[UnifiedModbusPollerService] 폴링 중지 요청으로 남은 장비 처리를 중단합니다.');
          break;
        }

        const deviceStartTime = Date.now();
        let modbusTime = 0;
        let dataSyncTime = 0;

        try {
          // Modbus 통신 시간 측정
          const modbusStartTime = Date.now();
          const pollingResult = await this.executePollingForDevice(device.deviceId, device.unitId, device.deviceType);
          modbusTime = Date.now() - modbusStartTime;

          if (pollingResult) {
            // DataSync 즉시 저장 시간 측정
            const dataSyncStartTime = Date.now();

            // 🎯 즉시 저장
            await this.savePollingDataWithRetry(device.deviceId, device.unitId, device.deviceType, pollingResult);

            dataSyncTime = Date.now() - dataSyncStartTime;

            const deviceEndTime = Date.now();
            const deviceDuration = deviceEndTime - deviceStartTime;
            this.logger?.debug(
              `[UnifiedModbusPollerService] ✅ 장비 폴링+저장 완료: ${device.deviceId}/${device.unitId} - 총 ${deviceDuration}ms (Modbus ${modbusTime}ms | DataSync ${dataSyncTime}ms)`,
            );
          }
        } catch (error) {
          const deviceEndTime = Date.now();
          const deviceDuration = deviceEndTime - deviceStartTime;
          this.logger?.error(
            `[UnifiedModbusPollerService] ❌ 장비 폴링 실패: ${device.deviceId}/${
              device.unitId
            } - 총 ${deviceDuration}ms (Modbus ${modbusTime}ms | DataSync ${dataSyncTime}ms) 후 실패: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      totalPollingTime = Date.now() - pollingStartTime;

      if (this.stopRequested) {
        this.logger?.info('[UnifiedModbusPollerService] 폴링 중지 요청으로 사이클을 조기에 종료했습니다.');
        return;
      }

      const cycleEndTime = Date.now();
      const cycleDuration = cycleEndTime - cycleStartTime;

      // 상세 성능 분석 로그
      this.logger?.info(
        `[UnifiedModbusPollerService] ✅ 폴링 사이클 완료 - 총 ${cycleDuration}ms (${devices.length}개 장비)`,
      );
      this.logger?.info(
        `[UnifiedModbusPollerService] 📊 성능 분석: 장비조회 ${deviceQueryTime}ms | 폴링+저장 ${totalPollingTime}ms`,
      );

      // 웹소켓으로 폴링 사이클 완료 로그 전송
      try {
        const serviceContainer = ServiceContainer.getInstance();
        if (serviceContainer) {
          const webSocketService = serviceContainer.getWebSocketService();
          webSocketService?.broadcastLog(
            'info',
            'system',
            `폴링 사이클이 완료되었습니다. (${devices.length}개 장비, ${cycleDuration}ms)`,
          );
        }
      } catch (wsError) {
        this.logger?.warn(`[UnifiedModbusPollerService] 웹소켓 로그 전송 실패: ${wsError}`);
      }
    } catch (error) {
      const cycleEndTime = Date.now();
      const cycleDuration = cycleEndTime - cycleStartTime;
      this.logger?.error(`[UnifiedModbusPollerService] ❌ 폴링 사이클 실패 - ${cycleDuration}ms 후 실패: ${error}`);

      // 웹소켓으로 폴링 사이클 실패 로그 전송
      try {
        const serviceContainer = ServiceContainer.getInstance();
        if (serviceContainer) {
          const webSocketService = serviceContainer.getWebSocketService();
          webSocketService?.broadcastLog('error', 'system', `폴링 사이클이 실패했습니다. (${cycleDuration}ms 후 실패)`);
        }
      } catch (wsError) {
        this.logger?.warn(`[UnifiedModbusPollerService] 웹소켓 로그 전송 실패: ${wsError}`);
      }
    }
  }

  /**
   * 폴링 간격 변경 적용
   */
  private async applyPollingIntervalChange(): Promise<void> {
    const newInterval = this.nextPollingInterval;
    if (newInterval !== null) {
      this.logger?.info(`[UnifiedModbusPollerService] 폴링 간격을 ${newInterval}ms로 변경합니다.`);
      this.nextPollingInterval = null; // 변경 후 초기화
      // 현재 타이머가 있다면 간격을 변경하고 새로운 타이머를 다시 시작
      if (this.singlePollingTimer) {
        clearInterval(this.singlePollingTimer);
        this.singlePollingTimer = setInterval(async () => {
          if (this.isPollingCycleRunning) {
            return;
          }
          this.isPollingCycleRunning = true;
          try {
            const currentDevices = await this.getRegisteredDevicesWithCache();
            if (currentDevices.length === 0) {
              this.logger?.info(
                `[UnifiedModbusPollerService] Data 컬렉션이 비어있습니다. 이번 주기 폴링을 건너뜁니다.`,
              );
              return;
            }
            await this.executeMappedPollingForAllDevices();
            if (this.nextPollingInterval !== null) {
              await this.applyPollingIntervalChange();
            }
          } catch (error) {
            this.logger?.error(
              `[UnifiedModbusPollerService] 폴링 간격 변경 적용 실패: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          } finally {
            this.isPollingCycleRunning = false;
          }
        }, newInterval);
      }
    }
  }

  /**
   * 시스템 모드가 auto인지 확인
   */
  private async isSystemModeAuto(): Promise<boolean> {
    const systemMode = await this.getSystemMode();
    return systemMode === 'auto';
  }

  /**
   * 통합 폴링 시작 (MAPPED_ONLY 전용, Fallback 없음)
   */
  private async startUnifiedPolling(slaveId: number, onData?: (data: any) => void): Promise<string[]> {
    try {
      this.logger?.info(`[UnifiedModbusPollerService] MAPPED_ONLY 폴링 시작`);

      // 🎯 MAPPED_ONLY만 실행
      return this.startMappedPolling(slaveId, onData);
    } catch (error) {
      this.logger?.error(
        `[UnifiedModbusPollerService] MAPPED_ONLY 폴링 시작 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // 🎯 Fallback 제거 - 에러 발생 시 빈 배열 반환
      return [];
    }
  }

  /**
   * 필수 폴링 시작 (Data 컬렉션이 비어있을 때 시스템 상태만 확인)
   */
  private async startEssentialPolling(
    slaveId: number,
    interval: number,
    onData?: (data: any) => void,
  ): Promise<string[]> {
    try {
      const pollId = `essential_polling_${Date.now()}`;

      // 🎯 기존 타이머 정리
      if (this.singlePollingTimer) {
        clearInterval(this.singlePollingTimer);
      }

      // 🎯 필수 폴링 타이머 시작
      this.singlePollingTimer = setInterval(async () => {
        try {
          await this.executeEssentialPolling(slaveId);
        } catch (error) {
          this.logger?.error(
            `[UnifiedModbusPollerService] 필수 폴링 실행 실패: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }, interval);

      this.pollingIntervals.set(pollId, this.singlePollingTimer);

      this.logger?.info(`[UnifiedModbusPollerService] 필수 폴링 시작 - ID: ${pollId}, 간격: ${interval}ms`);
      return [pollId];
    } catch (error) {
      this.logger?.error(
        `[UnifiedModbusPollerService] 필수 폴링 시작 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * 필수 폴링 실행 (시스템 상태만 확인)
   */
  private async executeEssentialPolling(slaveId: number): Promise<void> {
    try {
      // 🎯 시스템 상태만 확인하는 최소한의 폴링
      this.logger?.debug(`[UnifiedModbusPollerService] 필수 폴링 실행 - 시스템 상태 확인`);

      // 🎯 시스템 상태 확인을 위한 핵심 레지스터만 읽기
      // 🆕 새로운 중앙 큐 시스템 사용
      const systemStatusCommand = {
        id: `essential_polling_system_status_${slaveId}_${Date.now()}`,
        type: 'read' as const,
        unitId: slaveId.toString(),
        functionCode: 3, // Read Holding Registers
        address: 100, // 시스템 상태 레지스터 주소
        lengthOrValue: 1,
        priority: 'low' as const,
        timestamp: new Date(),
        resolve: () => {
          // Placeholder for queue resolution
        },
        reject: () => {
          // Placeholder for queue resolution
        },
      };

      const systemStatusResult = await this.modbusService.executeCommand(systemStatusCommand);

      if (systemStatusResult.success) {
        this.logger?.debug(`[UnifiedModbusPollerService] 시스템 상태 확인 성공 - Slave: ${slaveId}`);

        // �� 시스템 상태 데이터가 있으면 콜백 호출
        if (this.onDataCallback) {
          this.onDataCallback({
            type: 'system_status',
            slaveId,
            data: systemStatusResult.data,
            timestamp: new Date(),
          });
        }
      } else {
        this.logger?.warn(`[UnifiedModbusPollerService] 시스템 상태 확인 실패 - Slave: ${slaveId}`);
      }
    } catch (error) {
      this.logger?.error(
        `[UnifiedModbusPollerService] 필수 폴링 실행 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  // 🎯 하드코딩 폴링 메서드들 제거됨 - 매핑 기반 폴링으로 대체

  /**
   * 🆕 폴링 데이터 저장 (재시도 로직 포함)
   */
  private async savePollingDataWithRetry(
    deviceId: string,
    unitId: string,
    deviceType: string,
    pollingResult: any,
    maxRetries = 2,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.dataSyncService) {
          this.logger?.warn(`[UnifiedModbusPollerService] DataSyncService가 초기화되지 않았습니다.`);
          return false;
        }

        // 🎯 DataSyncService를 사용하여 데이터 저장
        const syncResult = await this.dataSyncService.syncPollingData(deviceId, unitId, deviceType, pollingResult);

        if (syncResult.success) {
          this.logger?.debug(
            `[UnifiedModbusPollerService] 폴링 데이터 저장 성공: ${deviceId}/${unitId} - ${syncResult.updatedFields}개 필드`,
          );
          return true;
        }
        throw new Error(syncResult.error || 'Unknown sync error');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (attempt === maxRetries) {
          this.logger?.error(
            `[UnifiedModbusPollerService] 폴링 데이터 저장 실패 (${maxRetries}회 시도): ${deviceId}/${unitId} - ${errorMessage}`,
          );
          return false;
        }
        this.logger?.warn(
          `[UnifiedModbusPollerService] 폴링 데이터 저장 재시도 (${attempt}/${maxRetries}): ${deviceId}/${unitId} - ${errorMessage}`,
        );
        // 재시도 전 지연 (지수 백오프)
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
    }
    return false;
  }

  /**
   * 🆕 폴링 결과를 Data 컬렉션에 저장 (기존 메서드 - 호환성 유지)
   */
  private async savePollingDataToCollection(
    deviceId: string,
    unitId: string,
    deviceType: string,
    pollingResult: any,
  ): Promise<void> {
    const success = await this.savePollingDataWithRetry(deviceId, unitId, deviceType, pollingResult);
    if (!success) {
      throw new Error(`Failed to save polling data for ${deviceId}/${unitId}`);
    }
  }

  /**
   * 🎯 clientId에서 deviceId 추출
   */
  private getDeviceIdFromClientId(clientId: string): string {
    // 🎯 clientId 패턴: c0101 → d001, c0102 → d002, etc.
    if (clientId.startsWith('c0')) {
      const clientNumber = clientId.substring(2);
      const deviceNumber = parseInt(clientNumber, 10);
      return `d${deviceNumber.toString().padStart(3, '0')}`;
    }
    return 'd001'; // 기본값
  }

  // 🎯 성능 메트릭 로깅
  private logPerformanceMetrics(): void {
    this.logger?.info(`[UnifiedModbusPollerService] 성능 메트릭:`, {
      totalPollingCalls: this.performanceMetrics.totalPollingCalls,
      successfulPolls: this.performanceMetrics.successfulPolls,
      failedPolls: this.performanceMetrics.failedPolls,
      averageResponseTime: this.performanceMetrics.averageResponseTime,
    });
  }

  /**
   * 🆕 유사한 deviceType을 찾는 헬퍼 메서드
   */
  private findSimilarDeviceType(targetType: string, availableTypes: string[]): string | null {
    if (availableTypes.length === 0) return null;

    // 문자열 유사도 검사 (간단한 구현)
    const similarities = availableTypes.map((type) => ({
      type,
      score: this.calculateSimilarity(targetType, type),
    }));

    const bestMatch = similarities.sort((a, b) => b.score - a.score)[0];
    return bestMatch.score > 0.3 ? bestMatch.type : null; // 30% 이상 유사도
  }

  /**
   * 🆕 문자열 유사도 계산 (Levenshtein 거리 기반)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * 🆕 Levenshtein 거리 계산
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // 삭제
          matrix[j - 1][i] + 1, // 삽입
          matrix[j - 1][i - 1] + indicator, // 치환
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 🆕 통신 에러 처리 (전체 시스템)
   */
  private async handleCommunicationError(): Promise<void> {
    try {
      const { ServiceContainer } = await import('../container/ServiceContainer');
      const serviceContainer = ServiceContainer.getInstance();

      const statusService = serviceContainer.getService('statusService') as any;
      const errorService = serviceContainer.getService('errorService') as any;

      this.logger?.warn(`[UnifiedModbusPollerService] 통신 에러 처리 - 전체 시스템`);
      await statusService.setCommunicationError();
      await errorService.createCommunicationError();
    } catch (error) {
      this.logger?.error(`[UnifiedModbusPollerService] 통신 에러 처리 실패: ${error}`);
    }
  }

  /**
   * 🆕 개별 장비 통신 에러 처리
   */
  private async handleCommunicationErrorForDevice(deviceId: string, unitId: string): Promise<void> {
    try {
      const { ServiceContainer } = await import('../container/ServiceContainer');
      const serviceContainer = ServiceContainer.getInstance();

      const statusService = serviceContainer.getService('statusService') as any;
      const errorService = serviceContainer.getService('errorService') as any;

      this.logger?.warn(`[UnifiedModbusPollerService] 통신 에러 처리 - ${deviceId}/${unitId}`);
      await statusService.setCommunicationErrorForDevice(deviceId, unitId); // 통신 에러 상태 설정
      await errorService.createCommunicationErrorForDevice(deviceId, unitId);
    } catch (error) {
      this.logger?.error(`[UnifiedModbusPollerService] 개별 장비 통신 에러 처리 실패: ${error}`);
    }
  }

  /**
   * 🆕 통신 성공 처리 (개별 장비)
   */
  private async handleCommunicationSuccess(deviceId: string, unitId: string): Promise<void> {
    try {
      const { ServiceContainer } = await import('../container/ServiceContainer');
      const serviceContainer = ServiceContainer.getInstance();

      const statusService = serviceContainer.getService('statusService') as any;
      const errorService = serviceContainer.getService('errorService') as any;

      this.logger?.info(`[UnifiedModbusPollerService] 통신 성공 처리 - ${deviceId}/${unitId}`);
      await statusService.clearCommunicationErrorForDevice(deviceId, unitId);
      await errorService.clearCommunicationErrorForDevice(deviceId, unitId);
    } catch (error) {
      this.logger?.error(`[UnifiedModbusPollerService] 통신 성공 처리 실패: ${error}`);
    }
  }
}
