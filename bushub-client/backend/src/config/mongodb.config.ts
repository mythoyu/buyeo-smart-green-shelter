// MongoDB 연결 재시도 및 모니터링 설정
// 환경변수 기반으로 설정 가능

export const MONGODB_CONFIG = {
  // 초기 연결 재시도 설정
  MAX_RETRIES: parseInt(process.env.MONGODB_MAX_RETRIES || '5'),
  BASE_DELAY_MS: parseInt(process.env.MONGODB_BASE_DELAY_MS || '2000'),
  MAX_DELAY_MS: parseInt(process.env.MONGODB_MAX_DELAY_MS || '30000'),

  // 백그라운드 모니터링 설정
  MONITORING_INTERVAL_MS: parseInt(process.env.MONGODB_MONITORING_INTERVAL_MS || '10000'),
  MAX_RECONNECT_ATTEMPTS: parseInt(process.env.MONGODB_MAX_RECONNECT_ATTEMPTS || '10'),
  RECONNECT_DELAY_MS: parseInt(process.env.MONGODB_RECONNECT_DELAY_MS || '5000'),

  // MongoDB 연결 옵션
  SERVER_SELECTION_TIMEOUT_MS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000'),
  SOCKET_TIMEOUT_MS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '45000'),
  MAX_POOL_SIZE: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '50'),
} as const;

export type MongoDBConfig = typeof MONGODB_CONFIG;

// 설정값 검증
export function validateMongoDBConfig(): void {
  const config = MONGODB_CONFIG;

  if (config.MAX_RETRIES < 1 || config.MAX_RETRIES > 10) {
    throw new Error('MONGODB_MAX_RETRIES must be between 1 and 10');
  }

  if (config.BASE_DELAY_MS < 1000 || config.BASE_DELAY_MS > 10000) {
    throw new Error('MONGODB_BASE_DELAY_MS must be between 1000 and 10000');
  }

  if (config.MONITORING_INTERVAL_MS < 5000 || config.MONITORING_INTERVAL_MS > 60000) {
    throw new Error('MONGODB_MONITORING_INTERVAL_MS must be between 5000 and 60000');
  }

  if (config.MAX_RECONNECT_ATTEMPTS < 1 || config.MAX_RECONNECT_ATTEMPTS > 20) {
    throw new Error('MONGODB_MAX_RECONNECT_ATTEMPTS must be between 1 and 20');
  }
}

// 설정값 로깅 (민감한 정보 제외)
export function logMongoDBConfig(): void {
  const config = MONGODB_CONFIG;

  // MongoDB 설정 상세 로그는 DEBUG 레벨로 이동
  // console.log('🔧 MongoDB Configuration:');
  // console.log(`  - MAX_RETRIES: ${config.MAX_RETRIES}`);
  // console.log(`  - BASE_DELAY_MS: ${config.BASE_DELAY_MS}`);
  // console.log(`  - MAX_DELAY_MS: ${config.MAX_DELAY_MS}`);
  // console.log(`  - MONITORING_INTERVAL_MS: ${config.MONITORING_INTERVAL_MS}`);
  // console.log(`  - MAX_RECONNECT_ATTEMPTS: ${config.MAX_RECONNECT_ATTEMPTS}`);
  // console.log(`  - RECONNECT_DELAY_MS: ${config.RECONNECT_DELAY_MS}`);
  // console.log(`  - SERVER_SELECTION_TIMEOUT_MS: ${config.SERVER_SELECTION_TIMEOUT_MS}`);
  // console.log(`  - SOCKET_TIMEOUT_MS: ${config.SOCKET_TIMEOUT_MS}`);
  // console.log(`  - MAX_POOL_SIZE: ${config.MAX_POOL_SIZE}`);
}
