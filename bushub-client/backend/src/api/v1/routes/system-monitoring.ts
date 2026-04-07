import os from 'os';

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import { ServiceContainer } from '../../../core/container/ServiceContainer';
// import { UpstreamHealthScheduler } from '../../../core/services/UpstreamHealthScheduler'; // 제거됨 - 수동 확인으로 대체
import { ExternalHttpClient } from '../../../core/services/ExternalHttpClient';
import { isConnectedToDb, getConnection } from '../../../database/mongoose';
import { logInfo } from '../../../logger';
import { createSuccessResponse, createErrorResponse, handleRouteError } from '../../../shared/utils/responseHelper';
import { formatKstLocal, nowKstFormatted } from '../../../shared/utils/kstDateTime';

// 🆕 새로운 모니터링 데이터 타입 정의
interface PollingStatus {
  enabled: boolean;
  interval: number;
  applyInProgress: boolean;
  isCycleRunning: boolean;
  stats: {
    totalCalls: number;
    successfulPolls: number;
    failedPolls: number;
    averageResponseTime: number;
    lastCleanup: string;
  };
  error?: string;
  timestamp: string;
}

interface PollingRecoveryStatus {
  isRunning: boolean;
  lastRecoveryTime: string | null;
  recoveryCount: number;
  error?: string;
  timestamp: string;
}

interface DdcTimeSyncStatus {
  isRunning: boolean;
  lastSyncTime: string | null;
  syncCount: number;
  error?: string;
  timestamp: string;
}

// API 엔드포인트 상수
const SYSTEM_MONITORING_ENDPOINTS = {
  SYSTEM_MONITORING: '/system/monitoring',
  DATABASE_COLLECTIONS: '/database/collections',
  DATABASE_COLLECTION_DATA: '/database/collection/:name',
  EXTERNAL_CHECK: '/system/external-check',
} as const;

// 실제 서버 상태 수집
function getServerStatus() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  // Windows 환경에서 실제 물리적 RAM 확인
  const getPhysicalMemory = () => {
    if (process.platform === 'win32') {
      // Windows에서는 os.totalmem()이 가상 메모리를 포함할 수 있음
      // 실제 물리적 RAM은 보통 8GB, 16GB, 32GB 등으로 표준화됨
      const totalMemGB = Math.round(os.totalmem() / 1024 / 1024 / 1024);

      // 일반적인 RAM 크기로 반올림 (가장 가까운 표준 크기)
      const standardSizes = [4, 8, 16, 32, 64, 128];
      const closestSize = standardSizes.reduce((prev, curr) =>
        Math.abs(curr - totalMemGB) < Math.abs(prev - totalMemGB) ? curr : prev,
      );

      return {
        totalMemory: closestSize,
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024),
        usedMemory: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024),
        rawTotalMemory: totalMemGB, // 원시 값 (디버깅용)
      };
    }
    // Linux/Mac에서는 os.totalmem()이 정확함
    return {
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024),
      usedMemory: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024),
      rawTotalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    };
  };

  const memoryInfo = getPhysicalMemory();

  return {
    status: 'healthy',
    uptime: process.uptime(),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      usagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      // 힙 메모리 최대값 (Node.js 기본값 또는 설정값)
      maxHeap: Math.round(
        process.env.NODE_OPTIONS?.includes('--max-old-space-size=')
          ? parseInt(process.env.NODE_OPTIONS.match(/--max-old-space-size=(\d+)/)?.[1] || '0')
          : 2048,
      ), // 기본값 2GB
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000), // ms
      system: Math.round(cpuUsage.system / 1000), // ms
    },
    system: {
      totalMemory: memoryInfo.totalMemory, // GB
      freeMemory: memoryInfo.freeMemory, // GB
      usedMemory: memoryInfo.usedMemory, // GB
      rawTotalMemory: memoryInfo.rawTotalMemory, // 원시 값 (디버깅용)
      loadAverage: os.loadavg(),
      cpuCount: os.cpus().length,
    },
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    timestamp: nowKstFormatted(),
  };
}

// 실제 데이터베이스 상태 수집
async function getDatabaseStatus() {
  const connection = getConnection();
  const isConnected = isConnectedToDb();

  if (!isConnected || !connection.db) {
    return {
      status: 'disconnected',
      readyState: connection.readyState,
      readyStateText: getReadyStateText(connection.readyState),
      timestamp: nowKstFormatted(),
    };
  }

  try {
    const stats = await connection.db.stats();
    const collections = await connection.db.listCollections().toArray();

    return {
      status: 'connected',
      readyState: connection.readyState,
      readyStateText: getReadyStateText(connection.readyState),
      collections: collections.length,
      size: Math.round(stats.dataSize / 1024 / 1024), // MB
      indexes: stats.indexes,
      objects: stats.objects,
      avgObjSize: Math.round(stats.avgObjSize / 1024), // KB
      timestamp: nowKstFormatted(),
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      readyState: connection.readyState,
      readyStateText: getReadyStateText(connection.readyState),
      timestamp: nowKstFormatted(),
    };
  }
}

// MongoDB 연결 상태 텍스트 변환
function getReadyStateText(readyState: number): string {
  switch (readyState) {
    case 0:
      return 'disconnected';
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'unknown';
  }
}

// 실제 하드웨어 상태 수집
async function getHardwareStatus() {
  try {
    const serviceContainer = ServiceContainer.getInstance();
    const modbusService = serviceContainer.getUnifiedModbusService();

    // DDC 상태는 직접 서비스에서 가져오기
    const ddcServices = {
      unifiedModbusService: !!serviceContainer.getUnifiedModbusService(),
      controlService: !!serviceContainer.getControlService(),
      modbusCommandQueue: !!serviceContainer.getModbusCommandQueue(),
      // modbusCommunicationService 제거 - unifiedModbusService로 통일
      unifiedModbusPollerService: !!serviceContainer.getUnifiedModbusPollerService(),
    };

    const isAllServicesHealthy = Object.values(ddcServices).every((service) => service);

    // 안전한 객체로 변환 (순환 참조 방지)
    const safeServices: Record<string, { status: string }> = {};
    Object.entries(ddcServices).forEach(([name, available]) => {
      safeServices[name] = { status: available ? 'active' : 'inactive' };
    });

    // 실제 Modbus 서비스 상태 확인
    const modbusServiceStatus = (modbusService as any).getServiceStatus?.() || {
      mockMode: false,
      activeService: 'real',
    };
    const modbusModeInfo = (modbusService as any).getCurrentModeInfo?.() || {
      connectionStatus: { retryCount: 0, maxRetries: 0 },
    };

    return {
      ddc: {
        connected: isAllServicesHealthy,
        services: safeServices,
        summary: isAllServicesHealthy ? '모두정상' : '일부문제',
        timestamp: nowKstFormatted(),
      },
      modbus: {
        isConnected: modbusService.isConnected(),
        connectionStatus: {
          isConnected: modbusService.isConnected(),
          retryCount: modbusModeInfo.connectionStatus?.retryCount || 0,
          maxRetries: modbusModeInfo.connectionStatus?.maxRetries || 0,
        },
        serviceStatus: {
          mockMode: modbusServiceStatus.mockMode,
          activeService: modbusServiceStatus.activeService,
        },
        timestamp: nowKstFormatted(),
      },
      timestamp: nowKstFormatted(),
    };
  } catch (error) {
    // 에러 발생 시에도 실제 서비스 상태 확인 시도
    try {
      const serviceContainer = ServiceContainer.getInstance();
      const modbusService = serviceContainer.getUnifiedModbusService();
      const modbusServiceStatus = (modbusService as any).getServiceStatus?.() || {
        mockMode: true,
        activeService: 'mock',
      };

      return {
        ddc: {
          connected: false,
          services: {},
          summary: 'DDC 상태 확인 실패',
          error: error instanceof Error ? error.message : String(error),
          timestamp: nowKstFormatted(),
        },
        modbus: {
          isConnected: false,
          connectionStatus: { isConnected: false, retryCount: 0, maxRetries: 0 },
          serviceStatus: {
            mockMode: modbusServiceStatus.mockMode,
            activeService: modbusServiceStatus.activeService,
          },
          error: error instanceof Error ? error.message : String(error),
          timestamp: nowKstFormatted(),
        },
        timestamp: nowKstFormatted(),
      };
    } catch (fallbackError) {
      // 완전 실패 시 기본값 사용
      return {
        ddc: {
          connected: false,
          services: {},
          summary: 'DDC 상태 확인 실패',
          error: error instanceof Error ? error.message : String(error),
          timestamp: nowKstFormatted(),
        },
        modbus: {
          isConnected: false,
          connectionStatus: { isConnected: false, retryCount: 0, maxRetries: 0 },
          serviceStatus: { mockMode: true, activeService: 'mock' },
          error: error instanceof Error ? error.message : String(error),
          timestamp: nowKstFormatted(),
        },
        timestamp: nowKstFormatted(),
      };
    }
  }
}

// 실제 메모리 메트릭 수집 (현재 사용되지 않음)
function getMemoryMetrics() {
  // 현재 시스템에서는 메모리 Repository를 사용하지 않으므로 빈 객체 반환
  return {
    metrics: {},
    timestamp: nowKstFormatted(),
  };
}

// 🆕 폴링 상태 조회
async function getPollingStatus(): Promise<PollingStatus> {
  try {
    const serviceContainer = ServiceContainer.getInstance();
    const systemService = serviceContainer.getSystemService();
    const pollerService = serviceContainer.getUnifiedModbusPollerService();

    const pollingState = await systemService.getSettings();
    const performanceMetrics = pollerService.getPerformanceMetrics();
    const isPollingCycleRunning = pollerService.getIsPollingCycleRunning();

    return {
      enabled: pollingState?.runtime?.pollingEnabled || false,
      interval: pollingState?.runtime?.pollingInterval || 20000,
      applyInProgress: pollingState?.runtime?.applyInProgress || false,
      isCycleRunning: isPollingCycleRunning,
      stats: {
        totalCalls: performanceMetrics.totalPollingCalls,
        successfulPolls: performanceMetrics.successfulPolls,
        failedPolls: performanceMetrics.failedPolls,
        averageResponseTime: performanceMetrics.averageResponseTime,
        lastCleanup: formatKstLocal(performanceMetrics.lastCleanup),
      },
      timestamp: nowKstFormatted(),
    };
  } catch (error) {
    logInfo(`[getPollingStatus] 폴링 상태 조회 실패: ${error}`);
    return {
      enabled: false,
      interval: 20000,
      applyInProgress: false,
      isCycleRunning: false,
      stats: {
        totalCalls: 0,
        successfulPolls: 0,
        failedPolls: 0,
        averageResponseTime: 0,
        lastCleanup: nowKstFormatted(),
      },
      error: error instanceof Error ? error.message : String(error),
      timestamp: nowKstFormatted(),
    };
  }
}

// 🆕 폴링 자동 복구 상태 조회
async function getPollingRecoveryStatus(): Promise<PollingRecoveryStatus> {
  try {
    const serviceContainer = ServiceContainer.getInstance();
    const recoveryService = serviceContainer.getPollingAutoRecoveryService();

    const lastRec = recoveryService.getLastRecoveryTime();
    return {
      isRunning: recoveryService.isRunning(),
      lastRecoveryTime: lastRec ? formatKstLocal(lastRec) : null,
      recoveryCount: recoveryService.getRecoveryCount(),
      timestamp: nowKstFormatted(),
    };
  } catch (error) {
    logInfo(`[getPollingRecoveryStatus] 폴링 복구 상태 조회 실패: ${error}`);
    return {
      isRunning: false,
      lastRecoveryTime: null,
      recoveryCount: 0,
      error: error instanceof Error ? error.message : String(error),
      timestamp: nowKstFormatted(),
    };
  }
}

// 🆕 DDC 시간 동기화 상태 조회
async function getDdcTimeSyncStatus(): Promise<DdcTimeSyncStatus> {
  try {
    const serviceContainer = ServiceContainer.getInstance();
    const ddcTimeSyncService = serviceContainer.getDdcTimeSyncService();

    // DdcTimeSyncService의 실제 상태 정보 가져오기
    const lastSyncTime = ddcTimeSyncService.getLastSyncTime();
    const syncStatus = ddcTimeSyncService.getSyncStatus();
    const isRunning = syncStatus === 'syncing' || syncStatus === 'success';
    const syncCount = ddcTimeSyncService.getSyncCount(); // 실제 동기화 횟수

    return {
      isRunning,
      lastSyncTime: lastSyncTime ? formatKstLocal(lastSyncTime) : null,
      syncCount,
      timestamp: nowKstFormatted(),
    };
  } catch (error) {
    logInfo(`[getDdcTimeSyncStatus] DDC 시간 동기화 상태 조회 실패: ${error}`);
    return {
      isRunning: false,
      lastSyncTime: null,
      syncCount: 0,
      error: error instanceof Error ? error.message : String(error),
      timestamp: nowKstFormatted(),
    };
  }
}

// 데이터베이스 컬렉션 목록 조회
async function getDatabaseCollections() {
  try {
    const connection = getConnection();
    if (!connection.db) {
      throw new Error('데이터베이스 연결이 없습니다.');
    }

    const collections = await connection.db.listCollections().toArray();
    return collections.map((collection) => ({
      name: collection.name,
      type: collection.type,
    }));
  } catch (error) {
    throw new Error(`컬렉션 목록 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 특정 컬렉션 데이터 조회
async function getCollectionData(collectionName: string, page = 1, limit = 20) {
  try {
    const connection = getConnection();
    if (!connection.db) {
      throw new Error('데이터베이스 연결이 없습니다.');
    }

    const collection = connection.db.collection(collectionName);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      collection.find({}).skip(skip).limit(limit).toArray(),
      collection.countDocuments({}),
    ]);

    // 민감한 데이터 마스킹
    const maskedData = data.map((doc) => maskSensitiveData(collectionName, doc));

    return {
      data: maskedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new Error(`컬렉션 데이터 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 민감한 데이터 마스킹
function maskSensitiveData(collectionName: string, doc: any): any {
  const masked = { ...doc };

  switch (collectionName) {
    case 'users':
      // 비밀번호 제거
      delete masked.password;
      break;
    case 'apikeys':
      // API 키 마스킹
      if (masked.key) {
        const keyParts = masked.key.split('_');
        if (keyParts.length >= 3) {
          masked.key = `${keyParts[0]}_***_${keyParts[keyParts.length - 1]}`;
        } else {
          masked.key = '***';
        }
      }
      break;
    case 'logs':
      // 로그 메시지 길이 제한
      if (masked.message && masked.message.length > 200) {
        masked.message = masked.message.substring(0, 200) + '...';
      }
      break;
  }

  return masked;
}

// URL 검증 함수 (보안)
function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);

    // 프로토콜 검증 (http/https만 허용)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'HTTP 또는 HTTPS 프로토콜만 허용됩니다.' };
    }

    // 포트 번호 검증 (일반적인 포트만 허용)
    const allowedPorts = [
      80, 443, 3000, 3001, 4173, 8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089, 8090, 9202,
    ];
    if (urlObj.port && !allowedPorts.includes(parseInt(urlObj.port))) {
      return { isValid: false, error: '허용되지 않는 포트 번호입니다.' };
    }

    // 위험한 프로토콜 및 경로 차단
    const hostname = urlObj.hostname;

    // 위험한 프로토콜 차단
    if (urlObj.protocol === 'file:' || urlObj.protocol === 'ftp:' || urlObj.protocol === 'data:') {
      return { isValid: false, error: '허용되지 않는 프로토콜입니다.' };
    }

    // 내부 시스템 접근 차단 (로컬 파일 시스템 등)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // localhost는 허용하되 위험한 포트는 차단
      const port = parseInt(urlObj.port || '80');
      if (
        port < 1000 &&
        port !== 80 &&
        port !== 443 &&
        port !== 3000 &&
        port !== 3001 &&
        port !== 4173 &&
        port !== 8080 &&
        port !== 8081 &&
        port !== 9202
      ) {
        return { isValid: false, error: 'localhost의 위험한 포트는 허용되지 않습니다.' };
      }
    }

    // 내부 네트워크 IP 대역 허용
    const isInternalIP = hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.');

    // 외부 공개 API도 허용 (내부 IP가 아닌 경우)
    // 추가 보안 검증은 위험한 경로 차단으로 처리

    // 위험한 경로 차단
    if (urlObj.pathname.includes('..') || urlObj.pathname.includes('//')) {
      return { isValid: false, error: '위험한 경로가 포함되어 있습니다.' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: '유효하지 않은 URL 형식입니다.' };
  }
}

// 외부 서버 상태 확인
async function checkExternalServer(url: string) {
  const http = new ExternalHttpClient();
  const start = Date.now();

  try {
    const result = await http.getJson<any>(url, {
      timeoutMs: 5000, // 5초 타임아웃
      retries: 1, // 1회 재시도
      backoffMs: 300,
    });

    const responseTime = Date.now() - start;

    // 디버깅 로그
    logInfo(`[checkExternalServer] ExternalHttpClient 결과: ok=${result.ok}, status=${result.status}`);

    // ExternalHttpClient의 ok 상태 확인
    if (result.ok) {
      return {
        success: true,
        status: result.status,
        responseTime,
        data: result.data,
        timestamp: nowKstFormatted(),
      };
    } else {
      // 실제 에러 메시지 사용 (없으면 기본 메시지)
      const errorMessage = result.error || `HTTP ${result.status} - 연결 실패`;
      return {
        success: false,
        status: result.status,
        responseTime,
        error: errorMessage,
        timestamp: nowKstFormatted(),
      };
    }
  } catch (error) {
    const responseTime = Date.now() - start;

    return {
      success: false,
      status: 0,
      responseTime,
      error: error instanceof Error ? error.message : String(error),
      timestamp: nowKstFormatted(),
    };
  }
}

async function systemMonitoringRoutes(app: FastifyInstance) {
  const serviceContainer = ServiceContainer.getInstance();

  // GET /system/monitoring
  app.get(
    SYSTEM_MONITORING_ENDPOINTS.SYSTEM_MONITORING,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // 실제 데이터 수집
        const serverStatus = getServerStatus();
        const dbStatus = await getDatabaseStatus();

        // 서비스 도메인 상태를 안전하게 수집
        let domainStatus;
        try {
          const rawDomainStatus = serviceContainer.getAllDomainStatus();
          // 순환 참조를 방지하기 위해 필요한 속성만 추출
          domainStatus = {
            deviceDomain: {
              controlService: { available: !!rawDomainStatus.deviceDomain?.controlService, status: 'active' },
              commandResultHandler: {
                available: !!rawDomainStatus.deviceDomain?.commandResultHandler,
                status: 'active',
              },
              modbusService: { available: !!rawDomainStatus.deviceDomain?.modbusService, status: 'active' },
              unifiedModbusCommunicationService: {
                available: !!rawDomainStatus.deviceDomain?.unifiedModbusCommunicationService,
                status: 'active',
              },
              unifiedModbusService: {
                available: !!rawDomainStatus.deviceDomain?.unifiedModbusService,
                status: 'active',
              },
              unifiedModbusPollerService: {
                available: !!rawDomainStatus.deviceDomain?.unifiedModbusPollerService,
                status: 'active',
              },
              pollingDataPersistenceService: {
                available: !!rawDomainStatus.deviceDomain?.pollingDataPersistenceService,
                status: 'active',
              },
              dataSyncService: {
                available: !!rawDomainStatus.deviceDomain?.dataSyncService,
                status: 'active',
              },
            },
            systemDomain: {
              systemService: { available: !!rawDomainStatus.systemDomain?.systemService, status: 'active' },
              logSchedulerService: { available: !!rawDomainStatus.systemDomain?.logSchedulerService, status: 'active' },
              webSocketService: { available: !!rawDomainStatus.systemDomain?.webSocketService, status: 'active' },
              unifiedLogService: { available: !!rawDomainStatus.systemDomain?.unifiedLogService, status: 'active' },
              ddcTimeSyncService: { available: !!rawDomainStatus.systemDomain?.ddcTimeSyncService, status: 'active' },
              pollingAutoRecoveryService: {
                available: !!rawDomainStatus.systemDomain?.pollingAutoRecoveryService,
                status: 'active',
              },
            },
            userDomain: {
              userService: { available: !!rawDomainStatus.userDomain?.userService, status: 'active' },
              userConfigService: { available: !!rawDomainStatus.userDomain?.userConfigService, status: 'active' },
              apiKeyService: { available: !!rawDomainStatus.userDomain?.apiKeyService, status: 'active' },
              clientService: { available: !!rawDomainStatus.userDomain?.clientService, status: 'active' },
            },
            timestamp: nowKstFormatted(),
          };
        } catch (error) {
          logInfo(`[GET /system/monitoring] 서비스 도메인 상태 수집 실패: ${error}`);
          domainStatus = {
            deviceDomain: {},
            systemDomain: {},
            userDomain: {},
            timestamp: nowKstFormatted(),
          };
        }

        const hardwareStatus = await getHardwareStatus();
        const memoryMetrics = getMemoryMetrics();

        // 🆕 새로운 모니터링 데이터 수집
        const pollingStatus = await getPollingStatus();
        const pollingRecoveryStatus = await getPollingRecoveryStatus();
        const ddcTimeSyncStatus = await getDdcTimeSyncStatus();

        // 상위서버(도시정보센터) 상태 - 자동 폴링 제거됨
        const superiorServer = {
          name: '도시정보센터',
          status: 'manual_check_required',
          message: '수동 확인이 필요합니다. 외부 서버 상태 확인 기능을 사용하세요.',
          timestamp: nowKstFormatted(),
        };

        // 전체 시스템 상태 계산 (polling, pollingRecovery, ddcTimeSync 포함)
        const overallStatus = calculateOverallStatus(
          serverStatus,
          dbStatus,
          domainStatus,
          hardwareStatus,
          pollingStatus,
          pollingRecoveryStatus,
          ddcTimeSyncStatus,
        );

        const monitoringData = {
          server: serverStatus,
          database: dbStatus,
          services: domainStatus,
          hardware: hardwareStatus,
          memory: memoryMetrics,
          superiorServer,
          // 🆕 새로운 모니터링 항목들 추가
          polling: pollingStatus,
          pollingRecovery: pollingRecoveryStatus,
          ddcTimeSync: ddcTimeSyncStatus,
          overall: {
            status: overallStatus,
            timestamp: nowKstFormatted(),
          },
          timestamp: nowKstFormatted(),
        };

        reply.send(
          createSuccessResponse('시스템 모니터링 데이터 조회 성공', {
            data: monitoringData,
            description: '실시간 시스템 모니터링 데이터입니다.',
            usage: '/api/v1/internal/system/monitoring',
          }),
        );
      } catch (error) {
        return handleRouteError(
          error,
          reply,
          'system-monitoring',
          '시스템 모니터링 데이터 조회 중 오류가 발생했습니다.',
        );
      }
    },
  );

  // GET /database/collections (데이터베이스 컬렉션 목록)
  app.get(
    SYSTEM_MONITORING_ENDPOINTS.DATABASE_COLLECTIONS,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logInfo('[GET /database/collections] 데이터베이스 컬렉션 목록 요청');

        const collections = await getDatabaseCollections();

        reply.send(
          createSuccessResponse('데이터베이스 컬렉션 목록 조회 성공', {
            data: collections,
            description: '데이터베이스 컬렉션 목록입니다.',
            usage: '/api/v1/internal/database/collections',
          }),
        );
      } catch (error) {
        return handleRouteError(
          error,
          reply,
          'database-collections',
          '데이터베이스 컬렉션 목록 조회 중 오류가 발생했습니다.',
        );
      }
    },
  );

  // GET /database/collection/:name (특정 컬렉션 데이터)
  app.get(
    SYSTEM_MONITORING_ENDPOINTS.DATABASE_COLLECTION_DATA,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { name } = request.params as { name: string };
        const { page, limit } = request.query as { page?: string; limit?: string };
        const pageNum = parseInt(page || '1');
        const limitNum = parseInt(limit || '20');

        logInfo(`[GET /database/collection/${name}] 컬렉션 데이터 요청 (페이지: ${pageNum}, 제한: ${limitNum})`);

        const collectionData = await getCollectionData(name, pageNum, limitNum);

        reply.send(
          createSuccessResponse('컬렉션 데이터 조회 성공', {
            data: collectionData,
            description: `${name} 컬렉션의 데이터입니다.`,
            usage: `/api/v1/internal/database/collection/${name}`,
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'database-collection', '컬렉션 데이터 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // POST /system/external-check (외부 서버 상태 확인)
  app.post(
    SYSTEM_MONITORING_ENDPOINTS.EXTERNAL_CHECK,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { url } = request.body as { url: string };

        if (!url || typeof url !== 'string') {
          return reply.send(createErrorResponse('URL이 필요합니다.', 'INVALID_URL'));
        }

        // URL 검증
        const validation = validateUrl(url);
        if (!validation.isValid) {
          return reply.send(createErrorResponse('INVALID_URL', validation.error!));
        }

        logInfo(`[POST /system/external-check] 외부 서버 상태 확인 요청: ${url}`);

        // 외부 서버 상태 확인
        const result = await checkExternalServer(url);

        if (result.success) {
          reply.send(
            createSuccessResponse('외부 서버 상태 확인 성공', {
              url,
              status: result.status,
              responseTime: result.responseTime,
              data: result.data,
              timestamp: result.timestamp,
            }),
          );
        } else {
          reply.send({
            success: false,
            message: `외부 서버 연결 실패: ${result.error}`,
            error: {
              code: 'EXTERNAL_CONNECTION_FAILED',
              message: `외부 서버 연결 실패: ${result.error}`,
            },
            data: {
              url,
              status: result.status,
              responseTime: result.responseTime,
              error: result.error,
              timestamp: result.timestamp,
            },
          });
        }
      } catch (error) {
        return handleRouteError(error, reply, 'external-check', '외부 서버 상태 확인 중 오류가 발생했습니다.');
      }
    },
  );
}

// 전체 시스템 상태 계산 (polling, pollingRecovery, ddcTimeSync 반영)
function calculateOverallStatus(
  serverStatus: any,
  dbStatus: any,
  domainStatus: any,
  hardwareStatus: any,
  pollingStatus?: { error?: string },
  pollingRecoveryStatus?: { error?: string },
  ddcTimeSyncStatus?: { error?: string },
): string {
  const serverHealthy = serverStatus.status === 'healthy';
  const dbHealthy = dbStatus.status === 'connected';
  const servicesHealthy = Object.values(domainStatus).every((domain: any) =>
    Object.values(domain).every((service: any) => service && service.available !== false),
  );
  const hardwareHealthy = hardwareStatus.ddc.connected && hardwareStatus.modbus.isConnected;
  const pollingHealthy = !pollingStatus?.error;
  const pollingRecoveryHealthy = !pollingRecoveryStatus?.error;
  const ddcTimeSyncHealthy = !ddcTimeSyncStatus?.error;

  if (
    serverHealthy &&
    dbHealthy &&
    servicesHealthy &&
    hardwareHealthy &&
    pollingHealthy &&
    pollingRecoveryHealthy &&
    ddcTimeSyncHealthy
  ) {
    return 'healthy';
  }
  if (serverHealthy && dbHealthy) {
    return 'degraded';
  }
  return 'critical';
}

export default fp(systemMonitoringRoutes);
