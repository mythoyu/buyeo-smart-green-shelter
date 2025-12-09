// 환경변수 확인 유틸리티

// 타입 정의
type AppEnvironment = 'development' | 'staging' | 'production';

// 동적 URL 생성 함수
const getDynamicUrl = (type: 'api' | 'ws'): string => {
  const { hostname } = window.location;
  const protocol = type === 'ws' ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') : 'http:';
  const port = '3000';
  const path = type === 'api' ? '/api/v1' : '/ws';

  return `${protocol}//${hostname}:${port}${path}`;
};

// 환경별 기본 URL 설정
const DEFAULT_URLS = {
  development: {
    api: getDynamicUrl('api'),
    ws: getDynamicUrl('ws'),
  },
  staging: {
    api: 'https://port-0-bushub-client-backend-me10tow29d7967b9.sel5.cloudtype.app/api/v1',
    ws: 'wss://port-0-bushub-client-backend-me10tow29d7967b9.sel5.cloudtype.app/ws',
  },
  production: {
    api: getDynamicUrl('api'),
    ws: getDynamicUrl('ws'),
  },
} as const;

// 현재 앱 환경 가져오기
export const getAppEnvironment = (): AppEnvironment => {
  const mode = import.meta.env.MODE;

  switch (mode) {
    case 'staging':
      return 'staging';
    case 'production':
      return 'production';
    case 'development':
    default:
      return 'development';
  }
};

// 로컬 개발 환경 확인
const isLocalDevelopment = (): boolean => {
  return import.meta.env.VITE_IS_LOCAL === 'true';
};

// 환경별 URL 가져오기 (환경변수 우선, fallback 사용)
const getUrlWithFallback = (envVar: string | undefined, fallbackUrl: string): string => {
  return envVar || fallbackUrl;
};

// 실제 사용할 환경 결정 (빌드 환경과 동일하게 유지)
const getEffectiveEnvironment = (): AppEnvironment => {
  return getAppEnvironment();
};

// 환경별 API URL 가져오기
export const getApiBaseUrl = (): string => {
  const currentEnv = getAppEnvironment();

  // VITE_IS_LOCAL이 true이면 development URL 사용
  const targetEnv = isLocalDevelopment() ? 'development' : currentEnv;
  const fallbackUrl = DEFAULT_URLS[targetEnv].api;

  return getUrlWithFallback(import.meta.env.VITE_API_BASE_URL, fallbackUrl);
};

// 환경별 WebSocket URL 가져오기
export const getWsUrl = (): string => {
  const currentEnv = getAppEnvironment();

  // VITE_IS_LOCAL이 true이면 development URL 사용
  const targetEnv = isLocalDevelopment() ? 'development' : currentEnv;
  const fallbackUrl = DEFAULT_URLS[targetEnv].ws;

  return getUrlWithFallback(import.meta.env.VITE_WS_URL, fallbackUrl);
};

// 환경 확인 함수들
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV === true;
};

export const isProduction = (): boolean => {
  return import.meta.env.PROD === true;
};

export const isStaging = (): boolean => {
  return getAppEnvironment() === 'staging';
};

// 디버그 로깅 (개발 시에만)
const logDebug = (label: string, value: any): void => {
  if (isDevelopment()) {
    console.log(`🔍 ${label} Debug:`, value);
  }
};

// 환경 정보 로깅 (모든 환경에서 실행)
export const logEnvironmentInfo = (): void => {
  const envInfo = {
    environment: getAppEnvironment(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isStaging: isStaging(),
    isLocalDevelopment: isLocalDevelopment(),
    apiBaseUrl: getApiBaseUrl(),
    wsUrl: getWsUrl(),
    env: {
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_WS_URL: import.meta.env.VITE_WS_URL,
      VITE_IS_LOCAL: import.meta.env.VITE_IS_LOCAL,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD,
      MODE: import.meta.env.MODE,
    },
  };

  console.log('🌍 Environment Info:', envInfo);
};

// 모든 환경변수 확인 함수
export const debugAllEnvironmentVariables = (): void => {
  const allEnvVars = {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
    VITE_USE_VERCEL: import.meta.env.VITE_USE_VERCEL,
    USE_VERCEL: import.meta.env.USE_VERCEL,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    MODE: import.meta.env.MODE,
    BASE_URL: import.meta.env.BASE_URL,
    // 기타 VITE_ 환경변수들
    ...Object.fromEntries(Object.entries(import.meta.env).filter(([key]) => key.startsWith('VITE_'))),
  };

  console.log('🔍 All Environment Variables:', allEnvVars);
};
