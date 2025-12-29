export const SYSTEM_CONFIG = {
  name: process.env.SYSTEM_NAME || '부여 스마트그린쉼터 스마트시티 관리 시스템',
  version: process.env.SYSTEM_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
};

export const INIT_STEPS = {
  MONGODB: 'mongodb',
  SERVICE_CONTAINER: 'serviceContainer',
  SYSTEM_SETTINGS: 'systemSettings',
  BASIC_DATA: 'basicData',
  DATABASE_STATUS: 'databaseStatus',
  API_KEYS: 'apiKeys',
  WEBSOCKET: 'webSocket',
  LOG_SCHEDULER: 'logScheduler',
  DDC_POLLING: 'ddcPolling',
} as const;

export type InitStep = (typeof INIT_STEPS)[keyof typeof INIT_STEPS];
