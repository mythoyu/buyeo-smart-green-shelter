import { connectToDatabase, disconnectFromDatabase, mongoConnectionManager } from '../database/mongoose';
import { ensurePeopleCounterRawTtlIndex } from '../init/ensurePeopleCounterRawTtlIndex';
import { seedUsers, checkDatabaseStatus } from '../init/seedUsers';
import { Logger } from '../shared/services/Logger';
// SNGILDDCPollingManager는 UnifiedModbusPollerService로 대체됨
import { getModbusConfig } from '../utils/environment';

import { ServiceContainer } from './container/ServiceContainer';
import { SnapshotScheduler } from './services/SnapshotScheduler';

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
  private readonly log = new Logger(ServerInitializer.name);

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
      this.log.debug(`📊 초기화 진행률: ${percentage}% (${completed}/${total})`);
    }
  }

  private async initializeMongoDB(): Promise<void> {
    this.log.debug('📡 MongoDB 연결 중...');
    await connectToDatabase();
    await ensurePeopleCounterRawTtlIndex();
    mongoConnectionManager.startConnectionMonitoring();
    this.log.debug('✅ MongoDB 연결 및 모니터링 시작 완료');
    this.updateInitStatus('mongodb', true);
  }

  private async initializeServiceContainer(): Promise<void> {
    this.log.debug('🔧 ServiceContainer 초기화 중...');

    // 🆕 Phase 2: ServiceContainer 인스턴스 가져오기
    this.serviceContainer = ServiceContainer.getInstance();

    // 🆕 Phase 2: 초기화 상태 확인
    if (this.serviceContainer.isInitialized()) {
      this.log.debug('⚠️ ServiceContainer가 이미 초기화되어 있습니다.');
    } else {
      this.log.debug('🆕 ServiceContainer 초기화 시작...');
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

      this.log.debug('✅ ServiceContainer 및 필수 서비스 초기화 완료');
      this.updateInitStatus('serviceContainer', true);
    } catch (error) {
      this.log.error(`❌ ServiceContainer 서비스 검증 실패: ${error}`);
      throw error;
    }
  }

  /** DB에 system(s) 문서가 없으면 스키마 기본값으로 1건 생성 */
  private async ensureSystemSettingsDocument(): Promise<void> {
    try {
      const systemService = this.serviceContainer.getSystemService();
      if (!systemService) {
        this.log.warn('⚠️ SystemService 없음 — 시스템 설정 시드 생략');
        return;
      }
      const existing = await systemService.getSettings();
      if (existing) {
        return;
      }
      this.log.debug('📋 시스템 설정 문서 없음 — 기본값으로 초기 생성');
      await systemService.resetToDefaults();
      this.log.debug('✅ 시스템 설정 기본 문서 생성 완료');
    } catch (error) {
      this.log.warn(`⚠️ 시스템 설정 자동 생성 실패 (API로 이후 설정 가능): ${error}`);
    }
  }

  private async initializeBasicData(): Promise<void> {
    try {
      await seedUsers();
      this.log.debug('✅ 기본 데이터 등록 완료');
      this.updateInitStatus('basicData', true);
    } catch (error) {
      this.log.error(`❌ 기본 데이터 등록 실패: ${error}`);
      this.log.warn('⚠️ 기본 사용자 없이 계속 진행합니다.');
    }
  }

  private async checkDatabaseStatus(): Promise<void> {
    try {
      await checkDatabaseStatus();
      this.log.debug('✅ 데이터베이스 상태 확인 완료');
      this.updateInitStatus('databaseStatus', true);
    } catch (error) {
      this.log.error(`❌ 데이터베이스 상태 확인 실패: ${error}`);
      this.log.warn('⚠️ 상태 확인 없이 계속 진행합니다.');
    }
  }

  /**
   * 접점 포트 할당 캐시 초기화
   * - 활성 현장 1대 배포를 가정하여, 활성 clientId 외 문서는 정리
   * - DB에 없는 유닛은 TS 기본 매핑 기준으로 누락분만 insert
   */
  private async seedUnitDoAssignments(): Promise<void> {
    try {
      const { PortMappingService } = await import('./services/PortMappingService');
      const portMapping = PortMappingService.getInstance();

      const { Client } = await import('../models/schemas/ClientSchema');
      const activeClient = await Client.findOne({ status: 'active' }).lean();

      if (activeClient?.id) {
        await portMapping.purgePortAssignmentsExcept(activeClient.id);
        await portMapping.seedMissingFromTs(activeClient.id);
        this.log.debug(`✅ 접점 포트 할당 시드 완료 (현장: ${activeClient.id})`);
      } else {
        await portMapping.refreshFromDatabase();
        this.log.debug('✅ 등록된 활성 현장 없음 — 접점 포트 전체 시드 생략, 캐시만 로드');
      }
    } catch (error) {
      this.log.error(`❌ 접점 포트 할당 시드 실패: ${error}`);
      this.log.warn('⚠️ TS 기본 매핑만 사용하여 계속 진행합니다.');
      const { PortMappingService } = await import('./services/PortMappingService');
      await PortMappingService.getInstance().refreshFromDatabase();
    }
  }

  private async loadApiKeys(): Promise<void> {
    try {
      await this.apiKeyService.loadApiKeysToMemory();
      this.log.debug('✅ API 키 메모리 로드 완료');
      this.updateInitStatus('apiKeys', true);
    } catch (error) {
      this.log.error(`❌ API 키 메모리 로드 실패: ${error}`);
      this.log.warn('⚠️ API 키 없이 계속 진행합니다.');
    }
  }

  private async initializeWebSocket(app: any): Promise<void> {
    try {
      const webSocketService = this.serviceContainer.getWebSocketService();
      webSocketService.initialize(app.server);
      this.log.debug('✅ WebSocket 서비스 초기화 완료');
      this.updateInitStatus('webSocket', true);
    } catch (error) {
      this.log.error(`❌ WebSocket 서비스 초기화 실패: ${error}`);
      this.log.warn('⚠️ WebSocket 없이 계속 진행합니다.');
    }
  }

  private async startLogScheduler(): Promise<void> {
    try {
      const logSchedulerService = this.serviceContainer.getLogSchedulerService();
      logSchedulerService.start();
      this.log.debug('✅ 로그 스케줄러 시작 완료');
      this.updateInitStatus('logScheduler', true);
    } catch (error) {
      this.log.error(`❌ 로그 스케줄러 시작 실패: ${error}`);
      this.log.warn('⚠️ 로그 스케줄러 없이 계속 진행합니다.');
    }
  }

  private async startSnapshotScheduler(): Promise<void> {
    try {
      const snapshotScheduler = SnapshotScheduler.getInstance();
      snapshotScheduler.initialize(this.serviceContainer);
      this.log.debug('✅ 스냅샷 스케줄러 시작 완료');
    } catch (error) {
      this.log.error(`❌ 스냅샷 스케줄러 시작 실패: ${error}`);
      this.log.warn('⚠️ 스냅샷 스케줄러 없이 계속 진행합니다.');
    }
  }

  /**
   * DDC 폴링 시작 (DB 상태 기반)
   */
  private async startDDCPolling(): Promise<void> {
    try {
      this.log.debug('📋 SNGIL DDC 폴링 시작 중...');
      this.updateInitStatus('ddcPolling', false);

      const unifiedModbusPollerService = this.serviceContainer.getUnifiedModbusPollerService();
      const systemService = this.serviceContainer.getSystemService();

      if (!unifiedModbusPollerService || !systemService) {
        this.log.error('❌ 필수 서비스를 찾을 수 없습니다.');
        this.updateInitStatus('ddcPolling', false);
        return;
      }

      // 🔄 DB에서 폴링 상태 확인 (기존 설정 보존)
      const pollingState = await systemService.getPollingState(false); // 기존 설정 보존
      const shouldStartPolling = pollingState?.pollingEnabled ?? false; // 기본값: false

      if (!shouldStartPolling) {
        this.log.debug('📋 DB 설정에 따라 폴링을 시작하지 않습니다.');
        this.updateInitStatus('ddcPolling', true);
        this.log.debug('✅ 폴링 중지 상태로 초기화 완료');
        return;
      }

      // 🎯 3단계: 통합 폴링 시스템 사용
      // Data 컬렉션 상태 확인
      const { Data } = await import('../models/schemas/DataSchema');
      const deviceCount = await Data.countDocuments({});

      if (deviceCount === 0) {
        this.log.debug('📋 Data 컬렉션이 비어있습니다. 필수 폴링만 시작합니다.');
        await unifiedModbusPollerService.startBasicPolling();
        this.updateInitStatus('ddcPolling', true);
        this.log.debug('✅ 필수 폴링 시작 완료');
      } else {
        this.log.info(`📋 Data 컬렉션에 ${deviceCount}개 장비가 등록되어 있습니다. 통합 폴링을 시작합니다.`);
        await unifiedModbusPollerService.startAllSNGILPolling();
        this.updateInitStatus('ddcPolling', true);
        this.log.info('✅ 통합 폴링 시작 완료');
      }
    } catch (error) {
      this.log.error(`❌ DDC 폴링 시작 실패: ${error}`);
      this.updateInitStatus('ddcPolling', false);
    }
  }

  /**
   * 🎯 DDC 시간 동기화 서비스 시작
   */
  private async startDdcTimeSync(): Promise<void> {
    try {
      this.log.debug('🕐 DDC 시간 동기화 서비스 시작 중...');

      const ddcTimeSyncService = this.serviceContainer.getDdcTimeSyncService();

      // 첫 동기화와 스케줄링을 모두 startScheduledSync에서 처리
      await ddcTimeSyncService.startScheduledSync();

      this.log.debug('✅ DDC 시간 동기화 서비스 시작 완료');
      this.updateInitStatus('ddcTimeSync', true);
    } catch (error) {
      this.log.error(`❌ DDC 시간 동기화 서비스 시작 실패: ${error}`);
      this.updateInitStatus('ddcTimeSync', false);
    }
  }

  /**
   * 🔄 폴링 자동 복구 서비스 시작
   */
  private async startPollingRecovery(): Promise<void> {
    try {
      this.log.debug('🔄 폴링 자동 복구 서비스 시작 중...');

      const pollingAutoRecoveryService = this.serviceContainer.getPollingAutoRecoveryService();
      await pollingAutoRecoveryService.startAutoRecovery();

      this.log.debug('✅ 폴링 자동 복구 서비스 시작 완료');
      this.updateInitStatus('pollingRecovery', true);
    } catch (error) {
      this.log.error(`❌ 폴링 자동 복구 서비스 시작 실패: ${error}`);
      this.updateInitStatus('pollingRecovery', false);
    }
  }

  private async startPeopleCounterResetScheduler(): Promise<void> {
    try {
      this.log.debug('🕛 피플카운터 00:00 KST 자동 리셋 스케줄러 시작 중...');
      const scheduler = this.serviceContainer.getPeopleCounterResetSchedulerService?.();
      scheduler?.start?.();
      this.log.debug('✅ 피플카운터 자동 리셋 스케줄러 시작 완료');
    } catch (error) {
      this.log.warn(`⚠️ 피플카운터 자동 리셋 스케줄러 시작 실패: ${error}`);
    }
  }

  private async fallbackToMemoryMode(): Promise<void> {
    this.log.warn('⚠️ MongoDB 연결 실패, 서버 종료...');
    throw new Error('MongoDB 연결 실패로 서버를 시작할 수 없습니다.');
  }

  public async initialize(app: any): Promise<void> {
    try {
      this.log.info('🚀 서버 시작 중...');

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

      // 6단계: 접점 포트 할당 시드/캐시 로드
      await this.seedUnitDoAssignments();

      // 7단계: API 키 메모리 로드
      await this.loadApiKeys();

      this.log.info('🎉 ServerInitializer.initialize() 완료!');
    } catch (error) {
      this.log.error(`❌ 서버 초기화 실패: ${error}`);

      if (error instanceof Error && error.message.includes('MongoDB')) {
        await this.fallbackToMemoryMode();
      } else {
        this.log.error('❌ 치명적인 오류로 서버를 시작할 수 없습니다.');
        throw error;
      }
    }
  }

  public async initializeServices(app: any): Promise<void> {
    // 7단계: WebSocket 서비스 초기화
    await this.initializeWebSocket(app);

    // 8단계: 로그 스케줄러 시작
    await this.startLogScheduler();

    // 8.5단계: 스냅샷 스케줄러 시작
    await this.startSnapshotScheduler();

    // 9단계: SNGIL DDC 폴링 시작
    await this.startDDCPolling();

    // 🎯 10단계: UnifiedModbusService 연결 시도 (순서 변경)
    await this.initializeModbusServices();

    // 🎯 11단계: DDC 시간 동기화 서비스 시작 (Modbus 연결 후)
    await this.startDdcTimeSync();

    // 🔄 12단계: 폴링 자동 복구 서비스 시작
    await this.startPollingRecovery();

    // 🕛 12.5단계: 피플카운터 00:00 KST 자동 리셋 스케줄러 시작
    await this.startPeopleCounterResetScheduler();

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
      this.log.warn('[SHUTDOWN] shutdown() 중복 호출 — 무시');
      return;
    }
    this.isShuttingDown = true;

    this.log.debug('[SHUTDOWN] ServerInitializer: graceful shutdown 파이프라인 시작');

    const sc = this.serviceContainer;
    if (!sc) {
      this.log.warn('[SHUTDOWN] ServiceContainer 없음 — 서비스 단계 생략');
    }

    // 1) 폴링/스케줄러부터 먼저 중지
    this.log.debug('[SHUTDOWN] ① PeopleCounterPoller stop…');
    try {
      sc?.getPeopleCounterPoller?.()?.stop?.();
      this.log.debug('[SHUTDOWN] ① PeopleCounterPoller stop 완료');
    } catch (e) {
      this.log.warn(`[SHUTDOWN] ① PeopleCounterPoller stop 실패: ${e}`);
    }

    this.log.debug('[SHUTDOWN] ①.5 PeopleCounterResetScheduler stop…');
    try {
      sc?.getPeopleCounterResetSchedulerService?.()?.stop?.();
      this.log.debug('[SHUTDOWN] ①.5 PeopleCounterResetScheduler stop 완료');
    } catch (e) {
      this.log.warn(`[SHUTDOWN] ①.5 PeopleCounterResetScheduler stop 실패: ${e}`);
    }

    this.log.debug('[SHUTDOWN] ② PollingAutoRecovery stop…');
    try {
      sc?.getPollingAutoRecoveryService?.()?.stopAutoRecovery?.();
      this.log.debug('[SHUTDOWN] ② PollingAutoRecovery stop 완료');
    } catch (e) {
      this.log.warn(`[SHUTDOWN] ② PollingAutoRecovery stop 실패: ${e}`);
    }

    this.log.debug('[SHUTDOWN] ③ DdcTimeSync stopScheduledSync…');
    try {
      sc?.getDdcTimeSyncService?.()?.stopScheduledSync?.();
      this.log.debug('[SHUTDOWN] ③ DdcTimeSync stop 완료');
    } catch (e) {
      this.log.warn(`[SHUTDOWN] ③ DdcTimeSync stop 실패: ${e}`);
    }

    this.log.debug('[SHUTDOWN] ④ UnifiedModbusPoller stopAllPolling…');
    try {
      sc?.getUnifiedModbusPollerService?.()?.stopAllPolling?.();
      this.log.debug('[SHUTDOWN] ④ UnifiedModbusPoller stopAllPolling 완료');
    } catch (e) {
      this.log.warn(`[SHUTDOWN] ④ UnifiedModbusPoller stopAllPolling 실패: ${e}`);
    }

    // 2) 나머지 스케줄러/로깅 중지
    this.log.debug('[SHUTDOWN] ⑤ SnapshotScheduler stop…');
    try {
      SnapshotScheduler.getInstance().stop();
      this.log.debug('[SHUTDOWN] ⑤ SnapshotScheduler stop 완료');
    } catch (e) {
      this.log.warn(`[SHUTDOWN] ⑤ SnapshotScheduler stop 실패: ${e}`);
    }

    this.log.debug('[SHUTDOWN] ⑤.5 LogScheduler stop…');
    try {
      sc?.getLogSchedulerService?.()?.stop?.();
      this.log.debug('[SHUTDOWN] ⑤.5 LogScheduler stop 완료');
    } catch (e) {
      this.log.warn(`[SHUTDOWN] ⑤.5 LogScheduler stop 실패: ${e}`);
    }

    // 3) WebSocket 종료 (클라이언트 정리)
    this.log.debug('[SHUTDOWN] ⑥ WebSocket close…');
    try {
      sc?.getWebSocketService?.()?.close?.();
      this.log.debug('[SHUTDOWN] ⑥ WebSocket close 완료');
    } catch (e) {
      this.log.warn(`[SHUTDOWN] ⑥ WebSocket close 실패: ${e}`);
    }

    // 4) Modbus 통신 연결 해제
    this.log.debug('[SHUTDOWN] ⑦ UnifiedModbusService disconnect…');
    try {
      const unifiedModbusService = sc?.getUnifiedModbusService?.();
      if (unifiedModbusService?.disconnect) {
        await unifiedModbusService.disconnect();
        this.log.debug('[SHUTDOWN] ⑦ UnifiedModbusService disconnect 완료');
      } else {
        this.log.debug('[SHUTDOWN] ⑦ UnifiedModbusService disconnect 생략 (서비스 없음)');
      }
    } catch (e) {
      this.log.warn(`[SHUTDOWN] ⑦ UnifiedModbusService disconnect 실패: ${e}`);
    }

    // 5) Mongo 연결/모니터링 정리
    this.log.debug('[SHUTDOWN] ⑧ Mongo 연결 모니터링 중지…');
    try {
      mongoConnectionManager.stopConnectionMonitoring?.();
      this.log.debug('[SHUTDOWN] ⑧ Mongo 연결 모니터링 중지 완료');
    } catch (e) {
      this.log.warn(`[SHUTDOWN] ⑧ mongoConnectionManager stop 실패: ${e}`);
    }

    this.log.debug('[SHUTDOWN] ⑨ Mongoose disconnect…');
    try {
      await disconnectFromDatabase();
      this.log.debug('[SHUTDOWN] ⑨ Mongoose disconnect 완료');
    } catch (e) {
      this.log.warn(`[SHUTDOWN] ⑨ disconnectFromDatabase 실패: ${e}`);
    }

    this.log.debug('[SHUTDOWN] ServerInitializer: graceful shutdown 파이프라인 끝');
  }

  private async startPeopleCounterPoller(): Promise<void> {
    try {
      const poller = this.serviceContainer.getPeopleCounterPoller();
      if (poller) {
        await poller.start();
        this.log.debug('✅ 피플카운터 폴러 시작 (pollingEnabled ON일 때 시리얼 폴링)');
      }
    } catch (error) {
      this.log.warn(`⚠️ 피플카운터 폴러 시작 건너뜀: ${error}`);
    }
  }

  private async initializeModbusServices(): Promise<void> {
    try {
      this.log.debug('🔧 Modbus 서비스 연결 시도 중...');

      const unifiedModbusService = this.serviceContainer.getUnifiedModbusService();
      if (unifiedModbusService) {
        const connected = await unifiedModbusService.connect();
        if (connected) {
          const serviceInfo = unifiedModbusService.getActiveServiceInfo();
          this.log.info(`✅ Modbus 서비스 연결 성공: ${serviceInfo.service} 모드`);

          // 🆕 Mock 모드 상태 로깅
          const config = getModbusConfig();
          if (serviceInfo.service === 'mock') {
            this.log.info(`🟡 Mock 모드로 동작 중 (${config.mockStatus.reason})`);
          } else {
            this.log.info(`🟢 실제 하드웨어 모드로 동작 중 (포트: ${config.port}, 보드레이트: ${config.baudRate}bps)`);
          }

          this.updateInitStatus('modbusService', true);
        } else {
          this.log.warn('⚠️ Modbus 서비스 연결 실패');
        }
      } else {
        this.log.warn('⚠️ UnifiedModbusService를 찾을 수 없음');
      }
    } catch (error) {
      this.log.error(`❌ Modbus 서비스 초기화 실패: ${formatInitError(error)}`);

      // Docker Compose 재시작 정책을 위해 서버 종료 (Mock 모드가 아닌 경우)
      const isMockEnabled = process.env.MODBUS_MOCK_ENABLED === 'true';
      if (!isMockEnabled) {
        this.log.error('💥 Modbus 하드웨어 연결 실패로 서버를 종료합니다. (Docker 재시작 유도)');
        this.log.error('🔧 해결 방법:');
        this.log.error('   1. Windows: 관리자 권한으로 실행');
        this.log.error('   2. Linux: sudo usermod -a -G dialout $USER');
        this.log.error('   3. 또는 MODBUS_MOCK_ENABLED=true로 설정');
        throw new Error(
          'Modbus 포트 접근 권한이 없습니다. 관리자 권한으로 실행하거나 MODBUS_MOCK_ENABLED=true로 설정하세요.',
        );
      }

      this.log.warn('⚠️ Mock 모드가 활성화되어 있어 서버를 계속 실행합니다.');
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

    this.log.info('='.repeat(60));
    this.log.info(`🎯 서버 초기화 완료: ${finalCompleted}/${finalTotal} 서비스`);
    this.log.info(`📊 성공률: ${Math.round((finalCompleted / finalTotal) * 100)}%`);

    if (finalCompleted < finalTotal) {
      const failedServices = Object.entries(this.initStatus)
        .filter(([_, success]) => !success)
        .map(([service]) => service);
      this.log.warn(`⚠️ 실패한 서비스: ${failedServices.join(', ')}`);
    }
    this.log.info('='.repeat(60));
  }
}
