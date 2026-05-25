// 환경변수 확인 유틸리티
import dotenv from 'dotenv';
import path from 'path';

import { isModbusMockEnabled as isModbusMockEnabledFromConfig, getModbusMockStatus } from '../config/mock.config';
import { bootstrapConsoleLog } from '../shared/logging/format';
import { Logger } from '../shared/services/Logger';

const envLog = new Logger('Environment');

/** 모노레포 루트 (packages/backend/src/utils → ../../../../) */
const REPO_ROOT = path.resolve(__dirname, '../../../..');

// .env 파일 로드 (환경별 파일 우선) — 모두 레포 루트
const loadEnvFile = () => {
  let appMode = process.env.APP_MODE;

  if (!appMode) {
    appMode = 'development';
    process.env.APP_MODE = 'development';
  }

  dotenv.config({ path: path.join(REPO_ROOT, '.env') });

  const envFile = path.join(REPO_ROOT, `.env.${appMode}`);
  dotenv.config({ path: envFile });

  // 패키지 로컬 fallback (루트 .env.development 없을 때)
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  dotenv.config({ path: path.join(__dirname, `../../.env.${appMode}`) });

  // Windows: COM 포트 등 Modbus 설정 (.env.windows 가 packages/backend/.env.development 보다 우선)
  if (process.platform === 'win32') {
    dotenv.config({ path: path.join(REPO_ROOT, '.env.windows'), override: true });
  }

  const mockLabel = process.env.MODBUS_MOCK_ENABLED === 'true' ? 'mock' : 'real';
  const modbusPort = process.env.MODBUS_PORT || '(default /dev/ttyS0)';
  bootstrapConsoleLog('info', `Loading environment: ${appMode}`, {
    envFile,
    modbus: mockLabel,
    port: modbusPort,
  });
};

// 모듈 로드 시점에 즉시 환경변수 로드
loadEnvFile();

// 타입 정의
type AppEnvironment = 'development' | 'staging' | 'production';

// 환경별 기본 설정 (민감 정보는 환경변수로만 — mongoUrl/jwtSecret은 development fallback 전용)
const DEFAULT_CONFIGS = {
  development: {
    port: 13031,
    host: '0.0.0.0',
    mongoUrl: 'mongodb://localhost:27017/bushub-client',
    logLevel: 'info',
    corsOrigin: true,
  },
  staging: {
    port: 3000,
    host: '0.0.0.0',
    mongoUrl: 'mongodb://localhost:27017/bushub-client',
    logLevel: 'info',
    corsOrigin: ['https://smartcity-frontend-uzjw.vercel.app'] as string[],
  },
  production: {
    port: 3000,
    host: '0.0.0.0',
    mongoUrl: 'mongodb://localhost:27017/bushub-client',
    logLevel: 'info',
    corsOrigin: true,
  },
} as const;

// 현재 앱 환경 가져오기
export const getAppEnvironment = (): AppEnvironment => {
  const mode = process.env.APP_MODE;
  const isLocal = process.env.IS_LOCAL === 'true';

  if (mode === 'staging') return 'staging';
  if (mode === 'production') return 'production';
  if (isLocal) return 'development'; // Local은 Development와 동일하게 처리

  return 'development';
};

// 환경별 설정 가져오기
export const getEnvironmentConfig = () => {
  const currentEnv = getAppEnvironment();
  return DEFAULT_CONFIGS[currentEnv];
};

// 환경 확인 함수들
export const isDevelopment = (): boolean => {
  return getAppEnvironment() === 'development';
};

export const isProduction = (): boolean => {
  return getAppEnvironment() === 'production';
};

export const isStaging = (): boolean => {
  return getAppEnvironment() === 'staging';
};

// 환경별 포트 가져오기
export const getPort = (): number => {
  const config = getEnvironmentConfig();
  return process.env.PORT ? Number(process.env.PORT) : config.port;
};

// 환경별 호스트 가져오기
export const getHost = (): string => {
  const config = getEnvironmentConfig();
  return process.env.HOST || config.host;
};

/** MONGODB_URI 또는 MONGO_ROOT_* 로 연결 문자열 구성 */
export const resolveMongoUri = (): string | undefined => {
  const explicit = process.env.MONGODB_URI?.trim();
  if (explicit) {
    return explicit;
  }

  const user = process.env.MONGO_ROOT_USER;
  const password = process.env.MONGO_ROOT_PASSWORD;
  if (user && password) {
    const host = process.env.MONGO_HOST || 'localhost';
    const port = process.env.MONGO_PORT || '27017';
    const db = process.env.DB_NAME || 'bushub_client';
    return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?authSource=admin`;
  }

  return undefined;
};

// 환경별 MongoDB URL 가져오기
export const getMongoUrl = (): string => {
  const resolved = resolveMongoUri();

  if (resolved) {
    const maskedUri = resolved.replace(/(mongodb(\+srv)?:\/\/[^:]+:)[^@]+@/, '$1***@');
    envLog.debug('MONGODB_URI resolved', { uri: maskedUri });
    return resolved;
  }

  if (isDevelopment()) {
    const config = getEnvironmentConfig();
    envLog.debug('MONGODB_URI default (development)', { uri: config.mongoUrl });
    return config.mongoUrl;
  }

  throw new Error(
    'MONGODB_URI or MONGO_ROOT_USER/MONGO_ROOT_PASSWORD is required for staging/production. ' +
      'Local dev: set MONGO_ROOT_* in .env.development or use default localhost.',
  );
};

// 환경별 로그 레벨 가져오기
export const getLogLevel = (): string => {
  const config = getEnvironmentConfig();
  return process.env.LOG_LEVEL || config.logLevel;
};

// 환경별 CORS Origin 가져오기
export const getCorsOrigin = () => {
  const config = getEnvironmentConfig();
  if (process.env.CORS_ORIGIN) {
    // 'true' 문자열인 경우 boolean true로 변환
    if (process.env.CORS_ORIGIN === 'true') {
      return true;
    }
    // 쉼표로 구분된 문자열인 경우 배열로 변환
    return process.env.CORS_ORIGIN.split(',');
  }
  return config.corsOrigin;
};

// 환경별 JWT Secret 가져오기
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (isDevelopment()) {
    envLog.warn(
      'JWT_SECRET not set — using development-only default. Set JWT_SECRET in repo root .env.development or .env.windows',
    );
    return 'dev-only-jwt-secret-minimum-32-characters-long';
  }

  throw new Error('JWT_SECRET environment variable is required for staging/production');
};

// ==================== Modbus 설정 ====================

// Modbus Mock 모드 활성화 여부 - 중앙화된 설정 사용
export const isModbusMockEnabled = (): boolean => {
  return isModbusMockEnabledFromConfig();
};

// Modbus 설정 가져오기
export const getModbusConfig = () => {
  // 🆕 실시간 Mock 상태 확인
  const mockStatus = getModbusMockStatus();

  return {
    mockEnabled: mockStatus.enabled,
    port: process.env.MODBUS_PORT || '/dev/ttyS0',
    baudRate: Number(process.env.MODBUS_BAUD_RATE) || 9600,
    dataBits: Number(process.env.MODBUS_DATA_BITS) || 8,
    stopBits: Number(process.env.MODBUS_STOP_BITS) || 1,
    parity: process.env.MODBUS_PARITY || 'none',
    timeout: Number(process.env.MODBUS_TIMEOUT) || 1000,
    retries: Number(process.env.MODBUS_RETRIES) || 1,
    rtscts: process.env.MODBUS_RTSCTS === 'true' || false, // RTS/CTS 흐름 제어
    // 🆕 Mock 상태 정보 추가
    mockStatus,
  };
};

// Modbus 주소 매핑 (SNGIL_DDC_COMMANDS.md 기준)
export const getModbusAddressMapping = () => {
  return {
    // DO(Digital Output) 제어 주소
    do: {
      mode: [352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 385, 386, 367], // DO1-DO16
      operation: [368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, null, null, null, 383], // DO1-DO13, DO16
      status: [821, 822, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 833, 834, 835, 836], // DO1-DO16
      schedule: [470, 471, 472, 473, 474, null, null, null, null, null, null, null, null, 475, 476, 477], // DO1-DO5, DO14-DO16
    },

    // 스케줄 설정 주소 (4x Registers)
    schedule: {
      // 스케줄1: 시작시, 시작분, 종료시, 종료분
      schedule1: {
        startHour: [42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, null, null, null], // DO1-DO13
        startMinute: [58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, null, null, null], // DO1-DO13
        endHour: [74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, null, null, null], // DO1-DO13
        endMinute: [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, null, null, null], // DO1-DO13
      },
      // 스케줄2: 시작시, 시작분, 종료시, 종료분 (DO1-DO4, DO14-DO15만)
      schedule2: {
        startHour: [146, 147, 148, 149, null, null, null, null, null, null, null, null, null, 150, 167, null], // DO1-DO4, DO14-DO15
        startMinute: [151, 152, 153, 154, null, null, null, null, null, null, null, null, null, 155, 168, null], // DO1-DO4, DO14-DO15
        endHour: [156, 157, 158, 159, null, null, null, null, null, null, null, null, null, 160, 169, null], // DO1-DO4, DO14-DO15
        endMinute: [161, 162, 163, 164, null, null, null, null, null, null, null, null, null, 165, 170, null], // DO1-DO4, DO14-DO15
      },
    },

    // DI(Digital Input) 제어 주소
    di: {
      enable: [404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419], // DI1-DI16
      status: [null, null, null, null, null, null, null, null, null, null, null, null, 449, 450, 451, null], // DI13-DI15만
    },

    // 냉난방기 주소
    hvac: {
      mode: 116, // 운전 모드 읽기
      speed: 117, // 바람세기 읽기
      contTemp: 118, // 설정온도 읽기
      errorCode: 119, // 에러코드 읽기
      curTemp: 120, // 현재 온도 읽기
      setMode: 122, // 운전 모드 통신 쓰기
      setSpeed: 123, // 바람세기 통신 쓰기
      setContTemp: 124, // 설정 온도 통신 쓰기
      summerTemp: 126, // 하절기 SHDDC설정온도
      winterTemp: 127, // 동절기 SHDDC설정온도
      finalTemp: 128, // 최종 SHDDC온도 전송
      shddcMode: 129, // 운전 모드 SHDDC설정값
      shddcSpeed: 130, // 바람 세기 SHDDC설정값
    },

    // 전열교환기 주소
    heatExchanger: {
      speed: 107, // 바람 세기 읽기
      mode: 108, // 운전 모드 읽기
      filterAlarm: 109, // 필터 알람 읽기
      setSpeed: 110, // 바람 세기 통신 쓰기
      setMode: 111, // 운전 모드 통신 쓰기
      shddcSpeed: 112, // 바람 세기 SHDDC설정값
      shddcMode: 113, // 운전 모드 SHDDC설정값
    },

    // 통합센서 주소
    sensor: {
      pm100: 134, // 초초미세먼지 PM1.0
      pm25: 135, // 초미세먼지 PM2.5
      pm10: 136, // 미세먼지PM10
      co2: 137, // CO2
      voc: 138, // 유기화합물
      temp: 139, // 온도
      hum: 140, // 습도
    },
  };
};

// 환경 정보 로깅
export const logEnvironmentInfo = (): void => {
  const envInfo = {
    environment: getAppEnvironment(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isStaging: isStaging(),
    config: {
      port: getPort(),
      host: getHost(),
      mongoUrl: getMongoUrl(),
      logLevel: getLogLevel(),
      corsOrigin: getCorsOrigin(),
    },
    modbus: {
      mockEnabled: isModbusMockEnabled(),
      config: getModbusConfig(),
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      APP_MODE: process.env.APP_MODE,
      PORT: process.env.PORT,
      HOST: process.env.HOST,
      MONGODB_URI: process.env.MONGODB_URI,
      LOG_LEVEL: process.env.LOG_LEVEL,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      JWT_SECRET: process.env.JWT_SECRET ? '[HIDDEN]' : undefined,
      MODBUS_MOCK_ENABLED: process.env.MODBUS_MOCK_ENABLED,
      MODBUS_BAUD_RATE: process.env.MODBUS_BAUD_RATE,
      MODBUS_PORT: process.env.MODBUS_PORT,
    },
  };

  envLog.debug('Backend environment', {
    environment: envInfo.environment,
    port: envInfo.config.port,
    host: envInfo.config.host,
    logLevel: envInfo.config.logLevel,
    modbusMock: envInfo.modbus.mockEnabled,
  });
};
