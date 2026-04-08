import { connectToDatabase, disconnectFromDatabase, mongoConnectionManager } from '../database/mongoose';
import { ensurePeopleCounterRawTtlIndex } from '../init/ensurePeopleCounterRawTtlIndex';
import { seedUsers, checkDatabaseStatus } from '../init/seedUsers';
import { logInfo, logError, logWarn, logDebug } from '../logger';
// SNGILDDCPollingManager는 UnifiedModbusPollerService로 대체됨
import { getModbusConfig } from '../utils/environment';

import { ServiceContainer } from './container/ServiceContainer';

function formatInitError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === 'object' && error !== null) {
    const o = error as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name : '';
    const message = typeof o.message === 'string' ? o.message : '';
    const joined = `${name} ${message}`.trim();
    return joined || JSON.stringify(error);
  }
  return String(error);
}

export interface InitStatus {
  mongodb: boolean;
  serviceContainer: boolean;
  systemSettings: boolean;
  basicData: boolean;
  databaseStatus: boolean;
  apiKeys: boolean;
  webSocket: boolean;
  logScheduler: boolean;
  ddcPolling: boolean;
  modbusService: boolean;
  ddcTimeSync: boolean; // 🎯 추가
  pollingRecovery: boolean; // 🔄 추가
}

export class ServerInitializer {
  private initStatus: InitStatus = {
    mongodb: false,
    serviceContainer: false,
    systemSettings: false,
    basicData: false,
    databaseStatus: false,
    apiKeys: false,
    webSocket: false,
    logScheduler: false,
    ddcPolling: false,
    modbusService: false,
    ddcTimeSync: false, // 🎯 추가
    pollingRecovery: false, // 🔄 추가
  };

  private serviceContainer: any;
  private apiKeyService: any;
  private systemService: any;
  private isShuttingDown = false;

  constructor() {
  }

  private updateInitStatus(key: keyof InitStatus, success: boolean): void {
    this.initStatus[key] = success;
    const completed = Object.values(this.initStatus).filter(Boolean).length;
    const total = Object.keys(this.initStatus).length;
    const percentage = Math.round((completed / total) * 100);

    // 4단계로 간소화: 25%, 50%, 75%, 100%만 표시
    if (percentage === 25 || percentage === 50 || percentage === 75 || percentage === 100) {
      logInfo(`📊 초기화 진행률: ${percentage}% (${completed}/${total})`);
    }
  }

  private async initializeMongoDB(): Promise<void> {
    logInfo('📡 MongoDB 연결 중...');
    await connectToDatabase();
    await ensurePeopleCounterRawTtlIndex();
    mongoConnectionManager.startConnectionMonitoring();
    logInfo('✅ MongoDB 연결 및 모니터링 시작 완료');
    this.updateInitStatus('mongodb', true);
  }

  private async initializeServiceContainer(): Promise<void> {
    logInfo('🔧 ServiceContainer 초기화 중...');

    // 🆕 Phase 2: ServiceContainer 인스턴스 가져오기
    this.serviceContainer = ServiceContainer.getInstance();

    // 🆕 Phase 2: 초기화 상태 확인
    if (this.serviceContainer.isInitialized()) {
      logDebug('⚠️ ServiceContainer가 이미 초기화되어 있습니다.');
    } else {
      logDebug('🆕 ServiceContainer 초기화 시작...');
      // 🆕 Phase 2: ServiceContainer 명시적 초기화
      this.serviceContainer.initializeServices();
    }

    // 🆕 Phase 2: 초기화 후 상태 검증
    if (!this.serviceContainer.isInitialized()) {
      throw new Error('ServiceContainer 초기화 실패');
    }

    // 🆕 Phase 2: 필수 서비스 가져오기 및 검증
    try {
      this.apiKeyService = this.serviceContainer.getApiKeyService();
      this.systemService = this.serviceContainer.getSystemService();

      if (!this.apiKeyService || !this.systemService) {
        throw new Error('필수 서비스 초기화 실패');
      }

      logInfo('✅ ServiceContainer 및 필수 서비스 초기화 완료');
      this.updateInitStatus('serviceContainer', true);
    } catch (error) {
      logError(`❌ ServiceContainer 서비스 검증 실패: ${error}`);
      throw error;
    }
  }

  /** DB에 system(s) 문서가 없으면 스키마 기본값으로 1건 생성 */
  private async ensureSystemSettingsDocument(): Promise<void> {
    try {
      const systemService = this.serviceContainer.getSystemService();
      if (!systemService) {
        logWarn('⚠️ SystemService 없음 — 시스템 설정 시드 생략');
        return;
      }
      const existing = await systemService.getSettings();
      if (existing) {
        return;
      }
      logInfo('📋 시스템 설정 문서 없음 — 기본값으로 초기 생성');
      await systemService.resetToDefaults();
      logInfo('✅ 시스템 설정 기본 문서 생성 완료');
    } catch (error) {
      logWarn(`⚠️ 시스템 설정 자동 생성 실패 (API로 이후 설정 가능): ${error}`);
    }
  }

  private async initializeBasicData(): Promise<void> {
    try {
      await seedUsers();
      logInfo('✅ 기본 데이터 등록 완료');
      this.updateInitStatus('basicData', true);
    } catch (error) {
      logError(`❌ 기본 데이터 등록 실패: ${error}`);
      logWarn('⚠️ 기본 사용자 없이 계속 진행합니다.');
    }
  }

  private async checkDatabaseStatus(): Promise<void> {
    try {
      await checkDatabaseStatus();
      logInfo('✅ 데이터베이스 상태 확인 완료');
      this.updateInitStatus('databaseStatus', true);
    } catch (error) {
      logError(`❌ 데이터베이스 상태 확인 실패: ${error}`);
      logWarn('⚠️ 상태 확인 없이 계속 진행합니다.');
    }
  }

  private async loadApiKeys(): Promise<void> {
    try {
      await this.apiKeyService.loadApiKeysToMemory();
      logInfo('✅ API 키 메모리 로드 완료');
      this.updateInitStatus('apiKeys', true);
    } catch (error) {
      logError(`❌ API 키 메모리 로드 실패: ${error}`);
      logWarn('⚠️ API 키 없이 계속 진행합니다.');
    }
  }

  private async initializeWebSocket(app: any): Promise<void> {
    try {
      const webSocketService = this.serviceContainer.getWebSocketService();
      webSocketService.initialize(app.server);
      logInfo('✅ WebSocket 서비스 초기화 완료');
      this.updateInitStatus('webSocket', true);
    } catch (error) {
      logError(`❌ WebSocket 서비스 초기화 실패: ${error}`);
      logWarn('⚠️ WebSocket 없이 계속 진행합니다.');
    }
  }

  private async startLogScheduler(): Promise<void> {
    try {
      const logSchedulerService = this.serviceContainer.getLogSchedulerService();
      logSchedulerService.start();
      logInfo('✅ 로그 스케줄러 시작 완료');
      this.updateInitStatus('logScheduler', true);
    } catch (error) {
      logError(`❌ 로그 스케줄러 시작 실패: ${error}`);
      logWarn('⚠️ 로그 스케줄러 없이 계속 진행합니다.');
    }
  }

  /**
   * DDC 폴링 시작 (DB 상태 기반)
   */
  private async startDDCPolling(): Promise<void> {
    try {
      logInfo('📋 SNGIL DDC 폴링 시작 중...');
      this.updateInitStatus('ddcPolling', false);

      const unifiedModbusPollerService = this.serviceContainer.getUnifiedModbusPollerService();
      const systemService = this.serviceContainer.getSystemService();

      if (!unifiedModbusPollerService || !systemService) {
        logError('❌ 필수 서비스를 찾을 수 없습니다.');
        this.updateInitStatus('ddcPolling', false);
        return;
      }

      // 🔄 DB에서 폴링 상태 확인 (기존 설정 보존)
      const pollingState = await systemService.getPollingState(false); // 기존 설정 보존
      const shouldStartPolling = pollingState?.pollingEnabled ?? false; // 기본값: false

      if (!shouldStartPolling) {
        logInfo('📋 DB 설정에 따라 폴링을 시작하지 않습니다.');
        this.updateInitStatus('ddcPolling', true);
        logInfo('✅ 폴링 중지 상태로 초기화 완료');
        return;
      }

      // 🎯 3단계: 통합 폴링 시스템 사용
      // Data 컬렉션 상태 확인
      const { Data } = await import('../models/schemas/DataSchema');
      const deviceCount = await Data.countDocuments({});

      if (deviceCount === 0) {
        logInfo('📋 Data 컬렉션이 비어있습니다. 필수 폴링만 시작합니다.');
        await unifiedModbusPollerService.startBasicPolling();
        this.updateInitStatus('ddcPolling', true);
        logInfo('✅ 필수 폴링 시작 완료');
      } else {
        logInfo(`📋 Data 컬렉션에 ${deviceCount}개 장비가 등록되어 있습니다. 통합 폴링을 시작합니다.`);
        await unifiedModbusPollerService.startAllSNGILPolling();
        this.updateInitStatus('ddcPolling', true);
        logInfo('✅ 통합 폴링 시작 완료');
      }
    } catch (error) {
      logError(`❌ DDC 폴링 시작 실패: ${error}`);
      this.updateInitStatus('ddcPolling', false);
    }
  }

  /**
   * 🎯 DDC 시간 동기화 서비스 시작
   */
  private async startDdcTimeSync(): Promise<void> {
    try {
      logInfo('🕐 DDC 시간 동기화 서비스 시작 중...');

      const ddcTimeSyncService = this.serviceContainer.getDdcTimeSyncService();

      // 첫 동기화와 스케줄링을 모두 startScheduledSync에서 처리
      await ddcTimeSyncService.startScheduledSync();

      logInfo('✅ DDC 시간 동기화 서비스 시작 완료');
      this.updateInitStatus('ddcTimeSync', true);
    } catch (error) {
      logError(`❌ DDC 시간 동기화 서비스 시작 실패: ${error}`);
      this.updateInitStatus('ddcTimeSync', false);
    }
  }

  /**
   * 🔄 폴링 자동 복구 서비스 시작
   */
  private async startPollingRecovery(): Promise<void> {
    try {
      logInfo('🔄 폴링 자동 복구 서비스 시작 중...');

      const pollingAutoRecoveryService = this.serviceContainer.getPollingAutoRecoveryService();
      await pollingAutoRecoveryService.startAutoRecovery();

      logInfo('✅ 폴링 자동 복구 서비스 시작 완료');
      this.updateInitStatus('pollingRecovery', true);
    } catch (error) {
      logError(`❌ 폴링 자동 복구 서비스 시작 실패: ${error}`);
      this.updateInitStatus('pollingRecovery', false);
    }
  }

  private async fallbackToMemoryMode(): Promise<void> {
    logWarn('⚠️ MongoDB 연결 실패, 서버 종료...');
    throw new Error('MongoDB 연결 실패로 서버를 시작할 수 없습니다.');
  }

  public async initialize(app: any): Promise<void> {
    try {
      logInfo('🚀 서버 시작 중...');

      // 1단계: MongoDB 연결
      await this.initializeMongoDB();

      // 2단계: ServiceContainer 초기화
      await this.initializeServiceContainer();

      // 3단계: systems 컬렉션에 문서가 없으면 기본값으로 1건 생성 (피플카운터 폴러 등이 findOne 스팸을 내지 않도록)
      await this.ensureSystemSettingsDocument();

      this.updateInitStatus('systemSettings', true);

      // 4단계: 기본 데이터 등록
      await this.initializeBasicData();

      // 5단계: 데이터베이스 상태 확인
      await this.checkDatabaseStatus();

      // 6단계: API 키 메모리 로드
      await this.loadApiKeys();

      logInfo('🎉 ServerInitializer.initialize() 완료!');
    } catch (error) {
      logError(`❌ 서버 초기화 실패: ${error}`);

      if (error instanceof Error && error.message.includes('MongoDB')) {
        await this.fallbackToMemoryMode();
      } else {
        logError('❌ 치명적인 오류로 서버를 시작할 수 없습니다.');
        throw error;
      }
    }
  }

  public async initializeServices(app: any): Promise<void> {
    // 7단계: WebSocket 서비스 초기화
    await this.initializeWebSocket(app);

    // 8단계: 로그 스케줄러 시작
    await this.startLogScheduler();

    // 9단계: SNGIL DDC 폴링 시작
    await this.startDDCPolling();

    // 🎯 10단계: UnifiedModbusService 연결 시도 (순서 변경)
    await this.initializeModbusServices();

    // 🎯 11단계: DDC 시간 동기화 서비스 시작 (Modbus 연결 후)
    await this.startDdcTimeSync();

    // 🔄 12단계: 폴링 자동 복구 서비스 시작
    await this.startPollingRecovery();

    // 13단계: 피플카운터 폴러 시작 (DDC pollingEnabled일 때 tick에서 시리얼 폴링)
    await this.startPeopleCounterPoller();
  }

  /**
   * Fastify/컨테이너 “우아한 종료”를 위한 정리 파이프라인.
   * - 타이머/폴러 stop
   * - WebSocket close
   * - Modbus disconnect
   * - Mongo monitoring 중지 + disconnect
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logWarn('[SHUTDOWN] shutdown() 중복 호출 — 무시');
      return;
    }
    this.isShuttingDown = true;

    logInfo('[SHUTDOWN] ServerInitializer: graceful shutdown 파이프라인 시작');

    const sc = this.serviceContainer;
    if (!sc) {
      logWarn('[SHUTDOWN] ServiceContainer 없음 — 서비스 단계 생략');
    }

    // 1) 폴링/스케줄러부터 먼저 중지
    logInfo('[SHUTDOWN] ① PeopleCounterPoller stop…');
    try {
      sc?.getPeopleCounterPoller?.()?.stop?.();
      logInfo('[SHUTDOWN] ① PeopleCounterPoller stop 완료');
    } catch (e) {
      logWarn(`[SHUTDOWN] ① PeopleCounterPoller stop 실패: ${e}`);
    }

    logInfo('[SHUTDOWN] ② PollingAutoRecovery stop…');
    try {
      sc?.getPollingAutoRecoveryService?.()?.stopAutoRecovery?.();
      logInfo('[SHUTDOWN] ② PollingAutoRecovery stop 완료');
    } catch (e) {
      logWarn(`[SHUTDOWN] ② PollingAutoRecovery stop 실패: ${e}`);
    }

    logInfo('[SHUTDOWN] ③ DdcTimeSync stopScheduledSync…');
    try {
      sc?.getDdcTimeSyncService?.()?.stopScheduledSync?.();
      logInfo('[SHUTDOWN] ③ DdcTimeSync stop 완료');
    } catch (e) {
      logWarn(`[SHUTDOWN] ③ DdcTimeSync stop 실패: ${e}`);
    }

    logInfo('[SHUTDOWN] ④ UnifiedModbusPoller stopAllPolling…');
    try {
      sc?.getUnifiedModbusPollerService?.()?.stopAllPolling?.();
      logInfo('[SHUTDOWN] ④ UnifiedModbusPoller stopAllPolling 완료');
    } catch (e) {
      logWarn(`[SHUTDOWN] ④ UnifiedModbusPoller stopAllPolling 실패: ${e}`);
    }

    // 2) 나머지 스케줄러/로깅 중지
    logInfo('[SHUTDOWN] ⑤ LogScheduler stop…');
    try {
      sc?.getLogSchedulerService?.()?.stop?.();
      logInfo('[SHUTDOWN] ⑤ LogScheduler stop 완료');
    } catch (e) {
      logWarn(`[SHUTDOWN] ⑤ LogScheduler stop 실패: ${e}`);
    }

    // 3) WebSocket 종료 (클라이언트 정리)
    logInfo('[SHUTDOWN] ⑥ WebSocket close…');
    try {
      sc?.getWebSocketService?.()?.close?.();
      logInfo('[SHUTDOWN] ⑥ WebSocket close 완료');
    } catch (e) {
      logWarn(`[SHUTDOWN] ⑥ WebSocket close 실패: ${e}`);
    }

    // 4) Modbus 통신 연결 해제
    logInfo('[SHUTDOWN] ⑦ UnifiedModbusService disconnect…');
    try {
      const unifiedModbusService = sc?.getUnifiedModbusService?.();
      if (unifiedModbusService?.disconnect) {
        await unifiedModbusService.disconnect();
        logInfo('[SHUTDOWN] ⑦ UnifiedModbusService disconnect 완료');
      } else {
        logInfo('[SHUTDOWN] ⑦ UnifiedModbusService disconnect 생략 (서비스 없음)');
      }
    } catch (e) {
      logWarn(`[SHUTDOWN] ⑦ UnifiedModbusService disconnect 실패: ${e}`);
    }

    // 5) Mongo 연결/모니터링 정리
    logInfo('[SHUTDOWN] ⑧ Mongo 연결 모니터링 중지…');
    try {
      mongoConnectionManager.stopConnectionMonitoring?.();
      logInfo('[SHUTDOWN] ⑧ Mongo 연결 모니터링 중지 완료');
    } catch (e) {
      logWarn(`[SHUTDOWN] ⑧ mongoConnectionManager stop 실패: ${e}`);
    }

    logInfo('[SHUTDOWN] ⑨ Mongoose disconnect…');
    try {
      await disconnectFromDatabase();
      logInfo('[SHUTDOWN] ⑨ Mongoose disconnect 완료');
    } catch (e) {
      logWarn(`[SHUTDOWN] ⑨ disconnectFromDatabase 실패: ${e}`);
    }

    logInfo('[SHUTDOWN] ServerInitializer: graceful shutdown 파이프라인 끝');
  }

  private async startPeopleCounterPoller(): Promise<void> {
    try {
      const poller = this.serviceContainer.getPeopleCounterPoller();
      if (poller) {
        await poller.start();
        logInfo('✅ 피플카운터 폴러 시작 (pollingEnabled ON일 때 PEOPLE_COUNTER_PORT 폴링)');
      }
    } catch (error) {
      logWarn(`⚠️ 피플카운터 폴러 시작 건너뜀: ${error}`);
    }
  }

  private async initializeModbusServices(): Promise<void> {
    try {
      logInfo('🔧 Modbus 서비스 연결 시도 중...');

      const unifiedModbusService = this.serviceContainer.getUnifiedModbusService();
      if (unifiedModbusService) {
        const connected = await unifiedModbusService.connect();
        if (connected) {
          const serviceInfo = unifiedModbusService.getActiveServiceInfo();
          logInfo(`✅ Modbus 서비스 연결 성공: ${serviceInfo.service} 모드`);

          // 🆕 Mock 모드 상태 로깅
          const config = getModbusConfig();
          if (serviceInfo.service === 'mock') {
            logInfo(`🟡 Mock 모드로 동작 중 (${config.mockStatus.reason})`);
          } else {
            logInfo(`🟢 실제 하드웨어 모드로 동작 중 (포트: ${config.port}, 보드레이트: ${config.baudRate}bps)`);
          }

          this.updateInitStatus('modbusService', true);
        } else {
          logWarn('⚠️ Modbus 서비스 연결 실패');
        }
      } else {
        logWarn('⚠️ UnifiedModbusService를 찾을 수 없음');
      }
    } catch (error) {
      logError(`❌ Modbus 서비스 초기화 실패: ${formatInitError(error)}`);

      // Docker Compose 재시작 정책을 위해 서버 종료 (Mock 모드가 아닌 경우)
      const isMockEnabled = process.env.MODBUS_MOCK_ENABLED === 'true';
      if (!isMockEnabled) {
        logError('💥 Modbus 하드웨어 연결 실패로 서버를 종료합니다. (Docker 재시작 유도)');
        logError('🔧 해결 방법:');
        logError('   1. Windows: 관리자 권한으로 실행');
        logError('   2. Linux: sudo usermod -a -G dialout $USER');
        logError('   3. 또는 MODBUS_MOCK_ENABLED=true로 설정');
        throw new Error(
          'Modbus 포트 접근 권한이 없습니다. 관리자 권한으로 실행하거나 MODBUS_MOCK_ENABLED=true로 설정하세요.',
        );
      }

      logWarn('⚠️ Mock 모드가 활성화되어 있어 서버를 계속 실행합니다.');
    }
  }

  public getInitStatus(): InitStatus {
    return { ...this.initStatus };
  }

  public getServices(): { serviceContainer: any; apiKeyService: any; systemService: any } {
    return {
      serviceContainer: this.serviceContainer,
      apiKeyService: this.apiKeyService,
      systemService: this.systemService,
    };
  }

  public printFinalStatus(): void {
    const finalCompleted = Object.values(this.initStatus).filter(Boolean).length;
    const finalTotal = Object.keys(this.initStatus).length;

    logInfo('='.repeat(60));
    logInfo(`🎯 서버 초기화 완료: ${finalCompleted}/${finalTotal} 서비스`);
    logInfo(`📊 성공률: ${Math.round((finalCompleted / finalTotal) * 100)}%`);

    if (finalCompleted < finalTotal) {
      const failedServices = Object.entries(this.initStatus)
        .filter(([_, success]) => !success)
        .map(([service]) => service);
      logWarn(`⚠️ 실패한 서비스: ${failedServices.join(', ')}`);
    }
    logInfo('='.repeat(60));
  }
}
