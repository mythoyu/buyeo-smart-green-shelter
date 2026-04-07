import dotenv from 'dotenv';
dotenv.config();
import fastifyCors from '@fastify/cors';
import Fastify, { FastifyReply } from 'fastify';

import { authenticateApiKey } from './api/middleware/auth';
import { requirePermission } from './api/middleware/permission';
import { securityMiddleware } from './api/middleware/security';
import { healthCheckHandler } from './api/routes';
// import { EXTERNAL_SERVICES_CONFIG } from './config/external-services.config'; // 제거됨 - 수동 확인으로 대체
import { logMockStatus } from './config/mock.config';
import { ServiceContainer } from './core/container/ServiceContainer';
import { RouterManager } from './core/RouterManager';
import { ServerInitializer } from './core/ServerInitializer';
// import { UpstreamHealthScheduler } from './core/services/UpstreamHealthScheduler'; // 제거됨 - 수동 확인으로 대체
import { logInfo, logError, logWarn } from './logger';
import { BushubOperationManager } from './operationManager';
import { setGracefulShutdownHandler } from './shutdown/gracefulShutdownRegistry';
import { getAppEnvironment, getPort, getHost, getCorsOrigin, logEnvironmentInfo } from './utils/environment';

import path from 'path';

// 날짜 형식으로 로그 파일명 생성
const getLogFileName = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `app-${year}-${month}-${day}.log`;
};

const _unused_logPath = path.join(__dirname, '../logs', getLogFileName());

// Fastify 인스턴스 타입 확장 (app 생성 전에 선언해야 함)
declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (permission: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    serviceContainer: ServiceContainer; // ServiceContainer 인스턴스 - any 제거
  }

  interface FastifyRequest {
    user?: {
      username: string;
      permissions?: string[];
    };
  }
}

// 에러 핸들러 설정
// setupErrorHandlers();

const currentEnv = getAppEnvironment();
const isDev = currentEnv === 'development';

const app = Fastify({
  logger: {
    level: 'warn', // warn 레벨 이상만 로깅 (info 레벨의 HTTP 요청/응답 로그 제거)
  },
  bodyLimit: 1048576, // 1MB
  keepAliveTimeout: 5000, // 연결 유지 시간
  maxParamLength: 200, // 파라미터 길이 제한
  requestTimeout: 120000, // 2분 (프론트엔드와 일치)
});

// CORS 설정
const corsOrigin = getCorsOrigin();
logInfo(`🔧 CORS Origin 설정: ${corsOrigin}`);

app.register(fastifyCors, {
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
});

// 보안 미들웨어 적용 (모든 요청에 대해)
app.addHook('preHandler', securityMiddleware);

// WebSocket 서버는 나중에 초기화

// API 키 인증 미들웨어는 별도 파일로 분리됨

// 권한 검증 미들웨어는 별도 파일로 분리됨

// API 키 인증이 필요한 라우트에 적용할 데코레이터
app.decorate('requireAuth', authenticateApiKey);
app.decorate('requirePermission', requirePermission);

// ServiceContainer를 Fastify에 등록하여 의존성 주입 지원
// 🆕 Phase 2: ServiceContainer 인스턴스 생성만, 초기화는 ServerInitializer에서 담당
const serviceContainer = ServiceContainer.getInstance();
app.decorate('serviceContainer', serviceContainer);

// 🆕 Phase 2: ServiceContainer 초기화 상태 로깅
logInfo('[INIT] 🔧 ServiceContainer 인스턴스 생성 완료 (초기화는 ServerInitializer에서 진행)');

// 에러 핸들러 등록
// app.setErrorHandler(errorHandler);

// 라우터 매니저 인스턴스
const routerManager = RouterManager.getInstance();

// 라우터 등록 함수 (서버 시작 전)
const registerRoutes = async () => {
  await routerManager.registerAllRoutes(app);
};

// 시뮬레이터 인스턴스
const simulator = BushubOperationManager.getInstance();

// 클라이언트 정보조회/등록/수정, 시스템설정, softap 등 직접 선언된 라우트 전체 삭제

// 헬스체크 엔드포인트
app.get('/health', healthCheckHandler);

// WebSocket 서버는 서버 시작 후 초기화

let serverInitializerRef: ServerInitializer | undefined;
let shutdownInProgress = false;

const gracefulShutdown = async (signal: string) => {
  if (shutdownInProgress) {
    logWarn(`[SHUTDOWN] 이미 종료 진행 중입니다. 신호 무시: ${signal}`);
    return;
  }
  shutdownInProgress = true;

  logInfo(`[SHUTDOWN] 신호 수신: ${signal} — 우아한 종료 시작`);

  // Fastify 종료: 새 요청을 받지 않게 하고 기존 요청을 종료
  logInfo('[SHUTDOWN] Fastify app.close() 호출…');
  try {
    await app.close();
    logInfo('[SHUTDOWN] Fastify app.close() 완료');
  } catch (e) {
    logWarn(`[SHUTDOWN] app.close() 실패: ${e}`);
  }

  // 백그라운드 서비스/리소스 정리
  logInfo('[SHUTDOWN] ServerInitializer.shutdown() 호출…');
  try {
    await serverInitializerRef?.shutdown();
    logInfo('[SHUTDOWN] ServerInitializer.shutdown() 완료');
  } catch (e) {
    logWarn(`[SHUTDOWN] ServerInitializer.shutdown() 실패: ${e}`);
  }

  // Docker restart 정책을 이용해 컨테이너가 다시 떠야 하므로 프로세스 종료
  logInfo('[SHUTDOWN] process.exit(0) — 프로세스 종료 (Compose restart 정책에 따름)');
  process.exit(0);
};

setGracefulShutdownHandler(gracefulShutdown);

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

// 장비/외부 장비 라우트만 등록
(async () => {
  let serverInitializer: ServerInitializer;

  try {
    // ServerInitializer를 사용한 깔끔한 초기화
    serverInitializer = new ServerInitializer();
    serverInitializerRef = serverInitializer;

    // 1-6단계: 기본 초기화
    logInfo('[INIT] 🔍 ServerInitializer.initialize() 시작...');
    await serverInitializer.initialize(app);
    logInfo('[INIT] ✅ ServerInitializer.initialize() 완료!');

    try {
      await registerRoutes();
      logInfo('[INIT] ✅ 라우터 등록 완료!');
    } catch (error) {
      logError(`❌ 라우터 등록 실패: ${error}`);
      throw error;
    }
  } catch (error) {
    logError(`❌ 서버 초기화 실패: ${error}`);
    throw error;
  }

  // 환경 정보 로깅
  logEnvironmentInfo();

  // Fastify 서버 시작
  const PORT = getPort();
  const HOST = getHost();

  logInfo(`🔍 Fastify 서버 시작 시도: ${HOST}:${PORT}`);

  try {
    // 타임아웃과 함께 app.listen 호출 (Promise.race 버그 수정)
    const timeoutMs = 30000;
    const timeoutError = new Error(`app.listen() 타임아웃 (${timeoutMs}ms)`);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const listenPromise = app.listen({ port: PORT, host: HOST }); // 실제 Promise 생성
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(timeoutError), timeoutMs);
      });

      await Promise.race([listenPromise, timeoutPromise]);
    } catch (error) {
      // 에러 원인별 구분 처리
      if (error instanceof Error) {
        if (error.message.includes('EADDRINUSE')) {
          throw new Error(`포트(${PORT})가 이미 사용 중입니다.`);
        }
        if (error === timeoutError || error.message.includes('타임아웃')) {
          throw timeoutError;
        }
      }
      throw error;
    } finally {
      // 타이머 정리 (메모리 누수 방지)
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
    logInfo('[INIT] ✅ 서버 초기화 완료 - app.listen() 성공!');

    // Modbus mode status log
    const isModbusMock = process.env.MODBUS_MOCK_ENABLED === 'true';
    if (isModbusMock) {
      logInfo('[INIT] Modbus 서비스가 MOCK 모드로 동작합니다.');
      logInfo('[INIT] 실제 하드웨어 통신이 시도되지 않습니다.');
    } else {
      logInfo('[INIT] Modbus 서비스가 REAL 모드로 동작합니다.');
    }

    // Mock 모드 상태 로깅
    logMockStatus({
      info: (msg: string) => logInfo(msg),
      warn: (msg: string) => logWarn(msg),
      error: (msg: string) => logError(msg),
    });

    logInfo('='.repeat(60));

    // 7-9단계: 서비스 초기화 (ServerInitializer 사용)
    try {
      await serverInitializer.initializeServices(app);
    } catch (error) {
      logError(`❌ 서비스 초기화 실패: ${error}`);
      logWarn('⚠️ 일부 서비스 없이 계속 진행합니다.');
    }

    // 최종 초기화 상태 요약
    serverInitializer.printFinalStatus();

    // UpstreamHealthScheduler 제거됨 - 수동 확인으로 대체
    // 외부 서버 상태는 사용자가 직접 확인할 수 있습니다.
  } catch (err) {
    app.log.error(err);
    throw err;
  }
})();
