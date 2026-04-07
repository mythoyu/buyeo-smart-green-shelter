module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts', '!src/testApp.ts'],
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // 단위 테스트에서는 DB 연결 없이 실행
  testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
};
