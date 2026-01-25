import { logDebug, logInfo } from '../../logger';
import { ILogger } from '../../shared/interfaces/ILogger';
import { Logger } from '../../shared/services/Logger';
import { IUnifiedModbusCommunication } from '../interfaces/IModbusCommunication';
import { FileUserConfigRepository } from '../repositories/FileUserConfigRepository';
import { IApiKeyRepository } from '../repositories/interfaces/IApiKeyRepository';
import { IClientRepository } from '../repositories/interfaces/IClientRepository';
import { ICommandLogRepository } from '../repositories/interfaces/ICommandLogRepository';
import { IControlRepository } from '../repositories/interfaces/IControlRepository';
import { IErrorRepository } from '../repositories/interfaces/IErrorRepository';
import { IModbusRepository } from '../repositories/interfaces/IModbusRepository';
import { IStatusRepository } from '../repositories/interfaces/IStatusRepository';
import { ISystemRepository } from '../repositories/interfaces/ISystemRepository';
import { IUserConfigRepository } from '../repositories/interfaces/IUserConfigRepository';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { IWebSocketRepository } from '../repositories/interfaces/IWebSocketRepository';
import { MemoryModbusRepository } from '../repositories/MemoryModbusRepository';
import { MemoryWebSocketRepository } from '../repositories/MemoryWebSocketRepository';
import { MongoApiKeyRepository } from '../repositories/MongoApiKeyRepository';
import { MongoClientRepository } from '../repositories/MongoClientRepository';
import { MongoCommandLogRepository } from '../repositories/MongoCommandLogRepository';
import { MongoControlRepository } from '../repositories/MongoControlRepository';
import { MongoErrorRepository } from '../repositories/MongoErrorRepository';
import { MongoStatusRepository } from '../repositories/MongoStatusRepository';
import { MongoSystemRepository } from '../repositories/MongoSystemRepository';
import { MongoUserRepository } from '../repositories/MongoUserRepository';
import { ApiKeyService } from '../services/ApiKeyService';
import { ClientService } from '../services/ClientService';
import { CommandLogService } from '../services/CommandLogService';
import { CommandResultHandler } from '../services/CommandResultHandler';
import { ControlService } from '../services/ControlService';
import { DataApplyService } from '../services/DataApplyService';
import { DataSyncService } from '../services/DataSyncService';
import { DdcTimeSyncService } from '../services/DdcTimeSyncService';
import { ErrorService } from '../services/ErrorService';
import { PollingAutoRecoveryService } from '../services/PollingAutoRecoveryService';
import { IApiKeyService } from '../services/interfaces/IApiKeyService';
import { IClientService } from '../services/interfaces/IClientService';
import { ICommandLogService } from '../services/interfaces/ICommandLogService';
import { IControlService } from '../services/interfaces/IControlService';
import { IErrorService } from '../services/interfaces/IErrorService';
import { ILinuxSystemService } from '../services/interfaces/ILinuxSystemService';
import { ILogSchedulerService } from '../services/interfaces/ILogSchedulerService';
import { IModbusService } from '../services/interfaces/IModbusService';
import { ISecurityService } from '../services/interfaces/ISecurityService';
import { IStatusService } from '../services/interfaces/IStatusService';
import { ISystemService } from '../services/interfaces/ISystemService';
import { IUnifiedLogService } from '../services/interfaces/IUnifiedLogService';
import { IUserConfigService } from '../services/interfaces/IUserConfigService';
import { IUserService } from '../services/interfaces/IUserService';
import { IWebSocketService } from '../services/interfaces/IWebSocketService';
import { IPollingAutoRecoveryService } from '../services/interfaces/IPollingAutoRecoveryService';
import { LinuxSystemService } from '../services/LinuxSystemService';
import { LogSchedulerService } from '../services/LogSchedulerService';
import { ModbusCommandQueue } from '../services/ModbusCommandQueue';
import { ModbusService } from '../services/ModbusService';
import { PeopleCounterPollerService } from '../services/PeopleCounterPollerService';
import { PeopleCounterQueueService } from '../services/PeopleCounterQueueService';
import { PollingDataPersistenceService } from '../services/PollingDataPersistenceService';
import { SecurityService } from '../services/SecurityService';
import { StatusService } from '../services/StatusService';
import { SystemService } from '../services/SystemService';
import { UnifiedLogService } from '../services/UnifiedLogService';
import { UnifiedModbusCommunicationService } from '../services/UnifiedModbusCommunicationService';
import { UnifiedModbusPollerService } from '../services/UnifiedModbusPollerService';
import { UnifiedModbusService } from '../services/UnifiedModbusService';
import { UserConfigService } from '../services/UserConfigService';
import { UserService } from '../services/UserService';
import { WebSocketService } from '../services/WebSocketService';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  private initialized = false; // 🆕 초기화 상태 추적
  private initializationTime: Date | null = null; // 🆕 Phase 2: 초기화 시간 추적

  private constructor() {
    // 🚨 생성자에서 자동 초기화 제거
    // this.initializeServices();
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  // 🆕 Phase 2: 초기화 상태 확인 메서드
  public isInitialized(): boolean {
    return this.initialized;
  }

  // 🆕 Phase 2: 초기화 시간 확인 메서드
  public getInitializationTime(): Date | null {
    return this.initializationTime;
  }

  // 🆕 Phase 2: 서비스 생명주기 상태 확인
  public getLifecycleStatus(): {
    initialized: boolean;
    initializationTime: Date | null;
    serviceCount: number;
    uptime: number | null;
  } {
    const uptime = this.initializationTime ? Date.now() - this.initializationTime.getTime() : null;

    return {
      initialized: this.initialized,
      initializationTime: this.initializationTime,
      serviceCount: this.services.size,
      uptime,
    };
  }

  public initializeServices(): void {
    if (this.initialized) {
      logDebug('[ServiceContainer] 이미 초기화됨 - 중복 초기화 방지');
      return; // 🆕 중복 초기화 방지
    }

    logInfo('[ServiceContainer] 서비스 초기화 시작...');

    // 🆕 Phase 2: 초기화 시작 시간 기록
    this.initializationTime = new Date();

    // Logger 인스턴스 생성
    const logger: ILogger = new Logger();

    // Logger 서비스 등록
    this.services.set('logger', logger);

    // Repository 인스턴스 생성
    let userRepository: IUserRepository;
    let clientRepository: IClientRepository;
    let systemRepository: ISystemRepository;

    // MongoDB 전용 모드 (기본)
    userRepository = new MongoUserRepository();
    clientRepository = new MongoClientRepository();
    systemRepository = new MongoSystemRepository();

    // 나머지 Repository들은 기존대로 유지
    const apiKeyRepository: IApiKeyRepository = new MongoApiKeyRepository();
    const controlRepository: IControlRepository = new MongoControlRepository();
    const commandLogRepository: ICommandLogRepository = new MongoCommandLogRepository();
    const statusRepository: IStatusRepository = new MongoStatusRepository();
    const errorRepository: IErrorRepository = new MongoErrorRepository();
    const webSocketRepository: IWebSocketRepository = new MemoryWebSocketRepository();
    const modbusRepository: IModbusRepository = new MemoryModbusRepository();
    const userConfigRepository: IUserConfigRepository = new FileUserConfigRepository();

    // 🆕 새로운 중앙 큐 시스템 서비스들 생성
    const modbusCommandQueue = new ModbusCommandQueue(logger);
    const unifiedModbusCommunicationService = new UnifiedModbusCommunicationService(logger);
    const pollingDataPersistenceService = new PollingDataPersistenceService(logger);

    // 🆕 ModbusCommandQueue에 통신 서비스 주입
    modbusCommandQueue.setModbusCommunicationService(unifiedModbusCommunicationService);

    // 🆕 UnifiedModbusCommunicationService 초기화 (ServiceContainer 주입)
    unifiedModbusCommunicationService.initialize(this);

    // 🆕 새로운 중앙 큐 시스템을 사용하는 UnifiedModbusService 생성
    const unifiedModbusService: IUnifiedModbusCommunication = new UnifiedModbusService(
      modbusCommandQueue,
      unifiedModbusCommunicationService,
      pollingDataPersistenceService,
      logger,
    );

    // 통합 Modbus 폴링 서비스 생성
    const unifiedModbusPollerService = new UnifiedModbusPollerService(unifiedModbusService, logger);

    // 🆕 DataSyncService 생성
    const dataSyncService = new DataSyncService(logger);
    dataSyncService.initialize(this);

    // 🆕 UnifiedModbusPollerService에 DataSyncService 주입
    unifiedModbusPollerService.setDataSyncService(dataSyncService);

    // Service 인스턴스 생성 (의존성 주입)
    const webSocketService: IWebSocketService = new WebSocketService(webSocketRepository, logger);
    const userService: IUserService = new UserService(userRepository, webSocketService, logger);
    const clientService: IClientService = new ClientService(clientRepository, webSocketService, logger);
    const apiKeyService: IApiKeyService = new ApiKeyService(apiKeyRepository, webSocketService, logger);
    const modbusService: IModbusService = new ModbusService(modbusRepository, webSocketService, logger);
    const userConfigService: IUserConfigService = new UserConfigService(
      userConfigRepository,
      webSocketService,
      logger,
      apiKeyService,
    );

    const commandLogService: ICommandLogService = new CommandLogService(commandLogRepository, webSocketService, logger);
    const unifiedLogService: IUnifiedLogService = new UnifiedLogService(commandLogRepository, webSocketService, logger);
    const logSchedulerService: ILogSchedulerService = new LogSchedulerService(
      unifiedLogService,
      webSocketService,
      logger,
    );
    // ModbusPoller 서비스는 unifiedModbusPollerService로 대체됨

    // �� 새로운 중앙 큐 시스템 서비스들 등록
    this.services.set('modbusCommandQueue', modbusCommandQueue);
    this.services.set('unifiedModbusCommunicationService', unifiedModbusCommunicationService);
    this.services.set('pollingDataPersistenceService', pollingDataPersistenceService);

    // 🆕 StatusService, ErrorService 생성 (controlService보다 먼저)
    const statusService: IStatusService = new StatusService(statusRepository, logger);
    const errorService: IErrorService = new ErrorService(errorRepository, logger);

    // 🆕 controlService와 systemService 생성
    const controlService: IControlService = new ControlService(
      controlRepository,
      webSocketService,
      unifiedModbusService, // UnifiedModbusService 사용
      logger,
      errorService, // 🆕 ErrorService 주입
    );

    const systemService: ISystemService = new SystemService(systemRepository, webSocketService, logger);

    // 🆕 SecurityService 생성 및 등록
    const securityService: ISecurityService = new SecurityService(logger);

    // 🆕 LinuxSystemService 생성 및 등록 (SecurityService 주입)
    const linuxSystemService: ILinuxSystemService = new LinuxSystemService(logger, securityService);

    // 🆕 나머지 서비스들 등록
    this.services.set('userRepository', userRepository);
    this.services.set('clientRepository', clientRepository);
    this.services.set('apiKeyRepository', apiKeyRepository);
    this.services.set('systemRepository', systemRepository);
    this.services.set('controlRepository', controlRepository);

    this.services.set('commandLogRepository', commandLogRepository);
    this.services.set('statusRepository', statusRepository);
    this.services.set('errorRepository', errorRepository);
    this.services.set('webSocketRepository', webSocketRepository);
    this.services.set('modbusRepository', modbusRepository);
    this.services.set('userConfigRepository', userConfigRepository);
    this.services.set('userService', userService);
    this.services.set('clientService', clientService);
    this.services.set('apiKeyService', apiKeyService);
    this.services.set('systemService', systemService);
    this.services.set('statusService', statusService);
    this.services.set('errorService', errorService);
    this.services.set('securityService', securityService);
    this.services.set('linuxSystemService', linuxSystemService);
    this.services.set('controlService', controlService);
    this.services.set('webSocketService', webSocketService);
    this.services.set('modbusService', modbusService);

    // 🔥 CommandResultHandler 생성 (services 등록 후)
    const commandResultHandler = new CommandResultHandler(
      this.services.get('controlRepository'),
      this.services.get('webSocketService'),
      this.services.get('errorService'), // 🆕 ErrorService 주입
    );

    // DataSyncService에 CommandResultHandler 주입
    dataSyncService.setCommandResultHandler(commandResultHandler);

    // DataApplyService 생성
    const dataApplyService = new DataApplyService(logger);
    dataApplyService.initialize(this);
    dataApplyService.setCommandResultHandler(commandResultHandler);

    this.services.set('dataApplyService', dataApplyService);
    // modbusCommunicationService 키 제거 - unifiedModbusService로 통일
    this.services.set('userConfigService', userConfigService);

    this.services.set('commandLogService', commandLogService);
    this.services.set('unifiedLogService', unifiedLogService);
    this.services.set('logSchedulerService', logSchedulerService);

    // modbusPollerService는 unifiedModbusPollerService로 대체됨
    this.services.set('unifiedModbusService', unifiedModbusService);
    this.services.set('unifiedModbusPollerService', unifiedModbusPollerService);

    // 🎯 DDC 시간 동기화 서비스 등록
    const ddcTimeSyncService = new DdcTimeSyncService(this);
    this.services.set('ddcTimeSyncService', ddcTimeSyncService);

    // 🔄 폴링 자동 복구 서비스 등록
    const pollingAutoRecoveryService = new PollingAutoRecoveryService(this.services.get('logger'));
    this.services.set('pollingAutoRecoveryService', pollingAutoRecoveryService);

    // 피플카운터 큐 서비스 (ttyS1 직렬화)
    const peopleCounterQueueService = new PeopleCounterQueueService(logger);
    this.services.set('peopleCounterQueueService', peopleCounterQueueService);

    // 피플카운터 폴러 (ttyS1, APC100)
    const peopleCounterPoller = new PeopleCounterPollerService(logger);
    peopleCounterPoller.initialize(this);
    this.services.set('peopleCounterPoller', peopleCounterPoller);

    // 🎯 DDC 설정 서비스 등록

    // CommandResultHandler 서비스 등록 (이미 생성된 인스턴스 사용)
    this.services.set('commandResultHandler', commandResultHandler);

    // DataSyncService 서비스 등록
    this.services.set('dataSyncService', dataSyncService);

    // 🆕 Phase 2: 초기화 완료 및 상세 로깅
    this.initialized = true;
    const initializationDuration = Date.now() - this.initializationTime!.getTime();

    logInfo('[ServiceContainer] 서비스 초기화 완료');
    logDebug(`[ServiceContainer] 초기화 통계: ${this.services.size}개 서비스, ${initializationDuration}ms`);
    logDebug(
      `[ServiceContainer] 도메인별 서비스: Device(${Object.keys(this.getDeviceDomainServices()).length}), System(${
        Object.keys(this.getSystemDomainServices()).length
      }), User(${Object.keys(this.getUserDomainServices()).length})`,
    );
  }

  public getUserService(): IUserService {
    return this.services.get('userService');
  }

  public getClientService(): IClientService {
    return this.services.get('clientService');
  }

  public getApiKeyService(): IApiKeyService {
    return this.services.get('apiKeyService');
  }

  public getSystemService(): ISystemService {
    return this.services.get('systemService');
  }

  public getDataApplyService(): DataApplyService {
    return this.services.get('dataApplyService');
  }

  public getPeopleCounterQueueService(): PeopleCounterQueueService {
    return this.services.get('peopleCounterQueueService');
  }

  public getPeopleCounterPoller(): PeopleCounterPollerService {
    return this.services.get('peopleCounterPoller');
  }

  public getControlService(): IControlService {
    return this.services.get('controlService');
  }

  public getUserRepository(): IUserRepository {
    return this.services.get('userRepository');
  }

  public getClientRepository(): IClientRepository {
    return this.services.get('clientRepository');
  }

  public getApiKeyRepository(): IApiKeyRepository {
    return this.services.get('apiKeyRepository');
  }

  public getSystemRepository(): ISystemRepository {
    return this.services.get('systemRepository');
  }

  public getControlRepository(): IControlRepository {
    return this.services.get('controlRepository');
  }

  public getWebSocketService(): IWebSocketService {
    return this.services.get('webSocketService');
  }

  public getWebSocketRepository(): IWebSocketRepository {
    return this.services.get('webSocketRepository');
  }

  public getModbusService(): IModbusService {
    return this.services.get('modbusService');
  }

  public getModbusRepository(): IModbusRepository {
    return this.services.get('modbusRepository');
  }

  // getModbusCommunicationService() 제거 - getUnifiedModbusService()로 통일

  public getUnifiedModbusCommunicationService(): UnifiedModbusCommunicationService {
    return this.services.get('unifiedModbusCommunicationService');
  }

  public getUnifiedModbusService(): IUnifiedModbusCommunication {
    return this.services.get('unifiedModbusService');
  }

  public getUnifiedModbusPollerService(): UnifiedModbusPollerService {
    return this.services.get('unifiedModbusPollerService');
  }

  public getLinuxSystemService(): ILinuxSystemService {
    return this.services.get('linuxSystemService');
  }

  public getUserConfigService(): IUserConfigService {
    return this.services.get('userConfigService');
  }

  public getUserConfigRepository(): IUserConfigRepository {
    return this.services.get('userConfigRepository');
  }

  public getCommandLogService(): ICommandLogService {
    return this.services.get('commandLogService');
  }

  public getCommandLogRepository(): ICommandLogRepository {
    return this.services.get('commandLogRepository');
  }

  public getUnifiedLogService(): IUnifiedLogService {
    return this.services.get('unifiedLogService');
  }

  public getLogSchedulerService(): ILogSchedulerService {
    return this.services.get('logSchedulerService');
  }

  public getDdcTimeSyncService(): DdcTimeSyncService {
    return this.services.get('ddcTimeSyncService');
  }

  public getPollingAutoRecoveryService(): IPollingAutoRecoveryService {
    return this.services.get('pollingAutoRecoveryService');
  }

  public getErrorService(): IErrorService {
    return this.services.get('errorService');
  }

  public getLogger(): ILogger {
    return this.services.get('logger');
  }

  // getModbusPollerService는 getUnifiedModbusPollerService로 대체됨

  public getCommandResultHandler(): any {
    return this.services.get('commandResultHandler');
  }

  public getDataSyncService(): DataSyncService {
    return this.services.get('dataSyncService');
  }

  public getPollingDataPersistenceService(): PollingDataPersistenceService {
    return this.services.get('pollingDataPersistenceService');
  }

  public getModbusCommandQueue(): ModbusCommandQueue {
    return this.services.get('modbusCommandQueue');
  }

  public getService<T>(serviceName: string): T {
    return this.services.get(serviceName);
  }

  // 도메인별 서비스 그룹화 메서드들
  getDeviceDomainServices(): any {
    return {
      controlService: this.getControlService(),
      commandResultHandler: this.getCommandResultHandler(),
      modbusService: this.getModbusService(),
      // modbusPollerService는 unifiedModbusPollerService로 대체됨
      // modbusCommunicationService 제거 - unifiedModbusService로 통일
      unifiedModbusCommunicationService: this.getUnifiedModbusCommunicationService(),
      unifiedModbusService: this.getUnifiedModbusService(),
      unifiedModbusPollerService: this.getUnifiedModbusPollerService(),
      pollingDataPersistenceService: this.getPollingDataPersistenceService(),
      dataSyncService: this.getDataSyncService(),
    };
  }

  getSystemDomainServices(): any {
    return {
      systemService: this.getSystemService(),

      logSchedulerService: this.getLogSchedulerService(),
      webSocketService: this.getWebSocketService(),
      unifiedLogService: this.getUnifiedLogService(),
      ddcTimeSyncService: this.getDdcTimeSyncService(),
      pollingAutoRecoveryService: this.getPollingAutoRecoveryService(),
    };
  }

  getUserDomainServices(): any {
    return {
      userService: this.getUserService(),
      userConfigService: this.getUserConfigService(),
      apiKeyService: this.getApiKeyService(),
      clientService: this.getClientService(),
    };
  }

  getAllDomainStatus(): any {
    return {
      deviceDomain: this.getDeviceDomainServices(),
      systemDomain: this.getSystemDomainServices(),
      userDomain: this.getUserDomainServices(),
      timestamp: new Date().toISOString(),
    };
  }
}
