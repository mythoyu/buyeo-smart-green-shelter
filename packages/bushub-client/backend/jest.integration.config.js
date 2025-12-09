module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/tests/integration/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts', '!src/logger.ts', '!src/testApp.ts'],

  testTimeout: 30000, // 통합 테스트는 더 긴 타임아웃
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  // 통합 테스트는 실제 데이터베이스와 외부 서비스 사용
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    TEST_TYPE: 'integration',
  },
  // 통합 테스트는 병렬 실행하지 않음 (데이터베이스 충돌 방지)
  maxWorkers: 1,
  // 통합 테스트는 실제 서비스 사용
  setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts'],
};
