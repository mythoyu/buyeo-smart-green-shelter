/**
 * Mock 설정 중앙 관리
 * 모든 Mock 관련 설정을 한 곳에서 관리
 */

export interface MockConfig {
  modbus: boolean;
  database: boolean;
  websocket: boolean;
  hardware: boolean;
  usbTest: boolean; // USB 테스트 모드 추가
}

// 🆕 동적 Mock 설정 로딩 함수
export const getMockConfig = (): MockConfig => {
  return {
    modbus: process.env.MODBUS_MOCK_ENABLED === 'true',
    database: process.env.DATABASE_MOCK_ENABLED === 'true',
    websocket: process.env.WEBSOCKET_MOCK_ENABLED === 'true',
    hardware: process.env.HARDWARE_MOCK_ENABLED === 'true',
    usbTest: process.env.MODBUS_USB_TEST_MODE === 'true', // USB 테스트 모드
  };
};

// 🆕 실시간 환경변수 확인 함수들
export const isModbusMockEnabled = (): boolean => process.env.MODBUS_MOCK_ENABLED === 'true';

// 🆕 Mock 설정 상태 로깅 함수
export const logMockStatus = (logger: any): void => {
  const config = getMockConfig();
  logger.info(`🔧 Mock 모드 설정: { modbus: ${config.modbus ? '🟡 MOCK' : '🟢 REAL'} }`);
};

// 🆕 Mock 설정 변경 감지 함수
export const getModbusMockStatus = (): { enabled: boolean; reason: string } => {
  const enabled = isModbusMockEnabled();
  const reason = enabled ? '환경변수 MODBUS_MOCK_ENABLED=true' : '환경변수 MODBUS_MOCK_ENABLED=false 또는 미설정';

  return { enabled, reason };
};

// 🆕 환경변수에서 Mock 설정 로드 (런타임에 호출 가능)
export const loadMockConfigFromEnv = (): void => {
  // 이 함수는 이제 getMockConfig()를 사용하므로 불필요
  // 하지만 하위 호환성을 위해 유지
  console.log('🔧 Mock 설정을 실시간으로 확인합니다. getMockConfig() 또는 isModbusMockEnabled() 함수를 사용하세요.');
};
