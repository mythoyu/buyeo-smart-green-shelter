/**
 * 하드웨어 직접 제어 관련 타입 정의
 */

// DO 포트 타입
export type DOPort =
  | 'DO1'
  | 'DO2'
  | 'DO3'
  | 'DO4'
  | 'DO5'
  | 'DO6'
  | 'DO7'
  | 'DO8'
  | 'DO9'
  | 'DO10'
  | 'DO11'
  | 'DO12'
  | 'DO13'
  | 'DO14'
  | 'DO15'
  | 'DO16';

// DI 포트 타입
export type DIPort =
  | 'DI1'
  | 'DI2'
  | 'DI3'
  | 'DI4'
  | 'DI5'
  | 'DI6'
  | 'DI7'
  | 'DI8'
  | 'DI9'
  | 'DI10'
  | 'DI11'
  | 'DI12'
  | 'DI13'
  | 'DI14'
  | 'DI15'
  | 'DI16';

// HVAC 포트 타입
export type HVACPort = 'COOLER' | 'EXCHANGER';

// 센서 포트 타입
export type SensorPort = 'INTEGRATED_SENSOR';

// 시스템 포트 타입
export type SystemPort = 'SEASONAL' | 'DDC_TIME';

// 전체 하드웨어 포트 타입
export type HardwarePort = DOPort | DIPort | HVACPort | SensorPort | SystemPort;

// 스케줄2를 지원하는 DO 포트 목록 (HW_PORTS에서 SCHED2 명령어가 정의된 포트만)
export const SCHEDULE2_SUPPORTED_PORTS: readonly DOPort[] = ['DO1', 'DO2', 'DO3', 'DO4'] as const;

// DO 명령어 타입
export type DOCommand =
  | 'POWER'
  | 'AUTO'
  | 'SCHED1_START_HOUR'
  | 'SCHED1_START_MIN'
  | 'SCHED1_END_HOUR'
  | 'SCHED1_END_MIN'
  | 'SCHED2_START_HOUR'
  | 'SCHED2_START_MIN'
  | 'SCHED2_END_HOUR'
  | 'SCHED2_END_MIN';

// DI 명령어 타입
export type DICommand = 'ENABLE' | 'STATUS';

// HVAC 명령어 타입
export type HVACCommand =
  | 'AUTO'
  | 'POWER'
  | 'MODE'
  | 'SPEED'
  | 'SUMMER_CONT_TEMP'
  | 'WINTER_CONT_TEMP'
  | 'CUR_TEMP'
  | 'ALARM'
  | 'SCHED1_START_HOUR'
  | 'SCHED1_START_MIN'
  | 'SCHED1_END_HOUR'
  | 'SCHED1_END_MIN';

// 센서 명령어 타입 (읽기 전용)
export type SensorCommand = 'PM10' | 'PM25' | 'PM100' | 'CO2' | 'VOC' | 'TEMP' | 'HUM';

// 시스템 명령어 타입
export type SystemCommand =
  | 'SEASON'
  | 'MONTHLY_SUMMER_JAN'
  | 'MONTHLY_SUMMER_FEB'
  | 'MONTHLY_SUMMER_MAR'
  | 'MONTHLY_SUMMER_APR'
  | 'MONTHLY_SUMMER_MAY'
  | 'MONTHLY_SUMMER_JUN'
  | 'MONTHLY_SUMMER_JUL'
  | 'MONTHLY_SUMMER_AUG'
  | 'MONTHLY_SUMMER_SEP'
  | 'MONTHLY_SUMMER_OCT'
  | 'MONTHLY_SUMMER_NOV'
  | 'MONTHLY_SUMMER_DEC'
  | 'YEAR'
  | 'MONTH'
  | 'DAY'
  | 'HOUR'
  | 'MIN'
  | 'SECOND';

// 전체 하드웨어 명령어 타입
export type HardwareCommand = DOCommand | DICommand | HVACCommand | SensorCommand | SystemCommand;

// 하드웨어 제어 값 타입
export type HardwareValue = boolean | number;

// 하드웨어 직접 제어 요청 타입
export interface HardwareDirectCommandRequest {
  clientId: string;
  port: DOPort;
  command: HardwareCommand;
  value: HardwareValue;
}

// 하드웨어 직접 제어 응답 타입
export interface HardwareDirectCommandResponse {
  success: boolean;
  data?: number[];
  commandId?: string;
  error?: string;
}

// DO 포트 상태 타입
export interface DOPortState {
  port: DOPort;
  power: boolean;
  auto: boolean;
  schedule1Start: TimeValue;
  schedule1End: TimeValue;
  schedule2Start?: TimeValue;
  schedule2End?: TimeValue;
  status: 'active' | 'inactive' | 'error' | 'unknown';
}

// DI 포트 상태 타입
export interface DIPortState {
  port: DIPort;
  enabled: boolean;
  status: boolean; // 접점 상태
  lastUpdated: string;
}

// HVAC 상태 타입
export interface HVACState {
  port: HVACPort;
  auto: boolean;
  power: boolean;
  mode: number;
  speed: number;
  summerTemp: number;
  winterTemp: number;
  currentTemp: number;
  alarm: number;
  schedule1Start: TimeValue;
  schedule1End: TimeValue;
  status: 'active' | 'inactive' | 'error' | 'unknown';
}

// 센서 데이터 타입
export interface SensorData {
  port: SensorPort;
  pm10: number;
  pm25: number;
  pm100: number;
  co2: number;
  voc: number;
  temperature: number;
  humidity: number;
  lastUpdated: string;
}

// 시스템 설정 타입
export interface SystemSettings {
  season: boolean;
  monthlySummer: Record<string, boolean>; // JAN~DEC
  ddcTime: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
}

// 시간 값 타입 (시:분)
export interface TimeValue {
  hour: number;
  minute: number;
}

// 포트 설명 정보 타입
export interface PortDescription {
  port: DOPort;
  name: string;
  description: string;
  deviceType?: string;
  unitId?: string;
}

// 하드웨어 제어 테이블 컬럼 타입
export interface HardwareControlColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

// 하드웨어 제어 에러 타입
export interface HardwareControlError {
  type: 'permission' | 'polling_active' | 'hardware_error' | 'network_error' | 'unknown';
  message: string;
  details?: string;
}

// 폴링 상태 타입
export interface PollingStatus {
  enabled: boolean;
  interval?: number;
  lastPoll?: string;
  status?: 'running' | 'stopped' | 'error';
}

// 하드웨어 제어 페이지 상태 타입
export interface HardwareControlPageState {
  isLoading: boolean;
  error: HardwareControlError | null;
  pollingStatus: PollingStatus | null;
  portStates: Map<DOPort, DOPortState>;
  selectedClientId: string;
}

// 하드웨어 제어 액션 타입
export type HardwareControlAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: HardwareControlError | null }
  | { type: 'SET_POLLING_STATUS'; payload: PollingStatus }
  | { type: 'UPDATE_PORT_STATE'; payload: { port: DOPort; state: Partial<DOPortState> } }
  | { type: 'SET_CLIENT_ID'; payload: string }
  | { type: 'RESET_STATE' };
