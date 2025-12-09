/**
 * Modbus 설정 파일
 * 시스템별 Modbus 통신 설정을 중앙에서 관리
 */

export interface ModbusConfig {
  port: string;
  baudRate: number;
  slaveId: number;
  timeout: number;
}

// 기본 Modbus 설정
export const MODBUS_CONFIG: ModbusConfig = {
  port: '/dev/ttyS0', // Linux 기본 RS485 포트
  baudRate: 38400, // 기본 보드레이트
  slaveId: 1, // 기본 슬레이브 ID
  timeout: 1000, // 기본 타임아웃 (300ms) - 개발/테스트용으로 단축
};

/**
 * 환경별 Modbus 설정 가져오기
 * 환경변수 우선, 없으면 기본값 사용
 */
export const getModbusConfig = (): ModbusConfig => {
  // 🆕 Mock 모드에 따른 타임아웃 조정 (개발 환경에서는 기본적으로 Mock 모드 사용)
  const defaultTimeout = 1000; // Mock 모드나 개발 환경에서는 매우 짧은 타임아웃

  return {
    port: process.env.MODBUS_PORT || MODBUS_CONFIG.port,
    baudRate: parseInt(process.env.MODBUS_BAUDRATE || MODBUS_CONFIG.baudRate.toString()),
    slaveId: parseInt(process.env.MODBUS_SLAVE_ID || MODBUS_CONFIG.slaveId.toString()),
    timeout: parseInt(process.env.MODBUS_TIMEOUT || defaultTimeout.toString()),
  };
};

/**
 * 특정 클라이언트/유닛별 Modbus 설정 가져오기
 * 향후 확장 가능
 */
export const getModbusConfigForUnit = (unitId: string): ModbusConfig => {
  const baseConfig = getModbusConfig();

  // 유닛별 특별 설정이 필요한 경우 여기서 처리
  // 예: 특정 유닛은 다른 포트나 보드레이트 사용

  return baseConfig;
};
