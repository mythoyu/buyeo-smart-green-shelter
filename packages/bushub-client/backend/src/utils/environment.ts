// 환경변수 확인 유틸리티
import dotenv from 'dotenv';

import { isModbusMockEnabled as isModbusMockEnabledFromConfig, getModbusMockStatus } from '../config/mock.config';
import { logInfo } from '../logger';

// .env 파일 로드 (환경별 파일 우선)
const loadEnvFile = () => {
  let appMode = process.env.APP_MODE;

  // APP_MODE가 없으면 development로 설정
  if (!appMode) {
    appMode = 'development';
    process.env.APP_MODE = 'development';
  }

  // 기본 .env 파일 먼저 로드 (fallback)
  dotenv.config({ path: '.env' });

  // 환경별 .env 파일 로드 (우선순위가 높음)
  const envFile = `.env.${appMode}`;
  dotenv.config({ path: envFile });

  // 환경 설정 로드 (console.log 사용 - 순환 참조 방지)
  console.log(`🔧 Loading environment: ${appMode} (${envFile})`);
};

// 모듈 로드 시점에 즉시 환경변수 로드
loadEnvFile();

// 타입 정의
type AppEnvironment = 'development' | 'staging' | 'production';

// 환경별 기본 설정
const DEFAULT_CONFIGS = {
  development: {
    port: 3000,
    host: '0.0.0.0',
    mongoUrl: 'mongodb://localhost:27017/bushub-client',
    logLevel: 'info',
    corsOrigin: true,
    jwtSecret: 'sinwoo-secret-key-2024',
  },
  staging: {
    port: 3000,
    host: '0.0.0.0',
    mongoUrl: 'mongodb+srv://sinwitdev:1357913579@bushub-client.kcojcax.mongodb.net/bushub-client',
    logLevel: 'info',
    corsOrigin: ['https://smartcity-frontend-uzjw.vercel.app'] as string[],
    jwtSecret: 'sinwoo-secret-key-2024',
  },
  production: {
    port: 3000,
    host: '0.0.0.0',
    mongoUrl: 'mongodb://localhost:27017/bushub-client',
    logLevel: 'info',
    corsOrigin: true,
    jwtSecret: 'sinwoo-secret-key-2024',
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

// 환경별 MongoDB URL 가져오기
export const getMongoUrl = (): string => {
  const config = getEnvironmentConfig();
  // MongoDB URI 로깅 (보안상 민감한 정보는 마스킹)
  const maskedUri = process.env.MONGODB_URI
    ? process.env.MONGODB_URI.replace(/(mongodb:\/\/[^:]+:)[^@]+@/, '$1***@')
    : 'undefined';
  logInfo(`🔧 MONGODB_URI: ${maskedUri}`);
  return process.env.MONGODB_URI || config.mongoUrl;
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
  const config = getEnvironmentConfig();
  return process.env.JWT_SECRET || config.jwtSecret;
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
    baudRate: Number(process.env.MODBUS_BAUD_RATE) || 38400,
    dataBits: Number(process.env.MODBUS_DATA_BITS) || 8,
    stopBits: Number(process.env.MODBUS_STOP_BITS) || 1,
    parity: process.env.MODBUS_PARITY || 'none',
    timeout: Number(process.env.MODBUS_TIMEOUT) || 1000,
    retries: Number(process.env.MODBUS_RETRIES) || 1,
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

  // 환경 정보 로깅
  logInfo('🌍 Backend Environment Info');
};
