/**
 * 장비별 Action 정의 (프론트엔드)
 * 비즈니스 로직과 Modbus 레지스터를 연결하는 매핑 테이블
 */

export interface DeviceAction {
  name: string;
  description: string;
  minValue?: number;
  maxValue?: number;
  defaultValue?: any;
  unit?: string;
  businessLogic?: string;
}

export interface DeviceActionMap {
  [deviceType: string]: {
    [actionKey: string]: DeviceAction;
  };
}

// 냉난방기 (d021) Action 정의
export const COOLER_ACTIONS: { [key: string]: DeviceAction } = {
  SET_POWER: {
    name: '전원 제어',
    description: '냉난방기 전원 ON/OFF',
    minValue: 0,
    maxValue: 1,
    defaultValue: false,
    businessLogic: '전원 상태를 변경하여 장비를 켜거나 끕니다',
  },
  SET_MODE: {
    name: '운전 모드 설정',
    description: '냉방/난방/송풍/자동 모드 설정',
    minValue: 0,
    maxValue: 3,
    defaultValue: 0,
    businessLogic: '0:자동, 1:냉방, 2:난방, 3:송풍',
  },
  SET_SUMMER_CONT_TEMP: {
    name: '여름 목표 온도 설정',
    description: '냉방 목표 온도 설정',
    minValue: 16,
    maxValue: 30,
    defaultValue: 22,
    unit: '°C',
    businessLogic: '사용자가 설정한 여름 냉방 목표 온도로 제어합니다',
  },

  SET_WINTER_CONT_TEMP: {
    name: '겨울 목표 온도 설정',
    description: '난방 목표 온도 설정',
    minValue: 16,
    maxValue: 30,
    defaultValue: 22,
    unit: '°C',
    businessLogic: '사용자가 설정한 겨울 난방 목표 온도로 제어합니다',
  },
  SET_SPEED: {
    name: '풍량 설정',
    description: '팬 풍량 설정',
    minValue: 1,
    maxValue: 3,
    defaultValue: 2,
    businessLogic: '1:약, 2:중, 3:강',
  },
  SET_AUTO: {
    name: '자동 모드 설정',
    description: '스케줄/수동 모드 전환',
    minValue: 0,
    maxValue: 1,
    defaultValue: true,
    businessLogic: 'true:스케줄 모드, false:수동 모드',
  },
  GET_POWER: {
    name: '전원 상태 확인',
    description: '현재 전원 상태 확인',
    businessLogic: '현재 전원 상태를 읽어옵니다',
  },
  GET_MODE: {
    name: '운전 모드 확인',
    description: '현재 운전 모드 확인',
    businessLogic: '현재 운전 모드를 읽어옵니다',
  },
  GET_SUMMER_CONT_TEMP: {
    name: '여름 목표 온도 확인',
    description: '현재 설정된 여름 목표 온도 확인',
    businessLogic: '현재 설정된 여름 목표 온도를 읽어옵니다',
  },

  GET_WINTER_CONT_TEMP: {
    name: '겨울 목표 온도 확인',
    description: '현재 설정된 겨울 목표 온도 확인',
    businessLogic: '현재 설정된 겨울 목표 온도를 읽어옵니다',
  },
  GET_CUR_TEMP: {
    name: '현재 온도 확인',
    description: '현재 실내 온도 확인',
    unit: '°C',
    businessLogic: '현재 실내 온도를 읽어옵니다',
  },
};

// 전열교환기 (d022) Action 정의
export const HEAT_EXCHANGER_ACTIONS: { [key: string]: DeviceAction } = {
  SET_POWER: {
    name: '전원 제어',
    description: '전열교환기 전원 ON/OFF',
    minValue: 0,
    maxValue: 1,
    defaultValue: false,
    businessLogic: '전원 상태를 변경하여 장비를 켜거나 끕니다',
  },
  SET_MODE: {
    name: '운전 모드 설정',
    description: '전열교환 모드 설정',
    minValue: 0,
    maxValue: 2,
    defaultValue: 0,
    businessLogic: '0:자동, 1:전열교환, 2:바이패스',
  },
  GET_POWER: {
    name: '전원 상태 확인',
    description: '현재 전원 상태 확인',
    businessLogic: '현재 전원 상태를 읽어옵니다',
  },
  GET_MODE: {
    name: '운전 모드 확인',
    description: '현재 운전 모드 확인',
    businessLogic: '현재 운전 모드를 읽어옵니다',
  },
};

// 통합센서 (d061) Action 정의
export const INTEGRATED_SENSOR_ACTIONS: { [key: string]: DeviceAction } = {
  GET_PM100: {
    name: 'PM10 농도 확인',
    description: 'PM10 미세먼지 농도 확인',
    unit: 'µg/m³',
    businessLogic: 'PM10 미세먼지 농도를 읽어옵니다',
  },
  GET_PM25: {
    name: 'PM2.5 농도 확인',
    description: 'PM2.5 미세먼지 농도 확인',
    unit: 'µg/m³',
    businessLogic: 'PM2.5 미세먼지 농도를 읽어옵니다',
  },
  GET_PM10: {
    name: 'PM1.0 농도 확인',
    description: 'PM1.0 미세먼지 농도 확인',
    unit: 'µg/m³',
    businessLogic: 'PM1.0 미세먼지 농도를 읽어옵니다',
  },
  GET_CO2: {
    name: 'CO2 농도 확인',
    description: '이산화탄소 농도 확인',
    unit: 'ppm',
    businessLogic: '이산화탄소 농도를 읽어옵니다',
  },
  GET_VOC: {
    name: 'VOC 농도 확인',
    description: '유기화합물 농도 확인',
    unit: 'ppb',
    businessLogic: '유기화합물 농도를 읽어옵니다',
  },
  GET_HUM: {
    name: '습도 확인',
    description: '현재 습도 확인',
    unit: '%',
    businessLogic: '현재 습도를 읽어옵니다',
  },
  GET_TEMP: {
    name: '온도 확인',
    description: '현재 온도 확인',
    unit: '°C',
    businessLogic: '현재 온도를 읽어옵니다',
  },
};

// 조명 (d031) Action 정의
export const LIGHTING_ACTIONS: { [key: string]: DeviceAction } = {
  SET_POWER: {
    name: '전원 제어',
    description: '조명 전원 ON/OFF',
    minValue: 0,
    maxValue: 1,
    defaultValue: false,
    businessLogic: '조명을 켜거나 끕니다',
  },
  SET_BRIGHTNESS: {
    name: '밝기 설정',
    description: '조명 밝기 설정 (0-100%)',
    minValue: 0,
    maxValue: 100,
    defaultValue: 100,
    unit: '%',
    businessLogic: '조명 밝기를 0-100% 범위로 설정합니다',
  },
  GET_POWER: {
    name: '전원 상태 확인',
    description: '현재 전원 상태 확인',
    businessLogic: '현재 조명 상태를 읽어옵니다',
  },
  GET_BRIGHTNESS: {
    name: '밝기 확인',
    description: '현재 밝기 확인',
    businessLogic: '현재 설정된 밝기를 읽어옵니다',
  },
};

// 에어커튼 (d023) Action 정의
export const AIR_CURTAIN_ACTIONS: { [key: string]: DeviceAction } = {
  SET_POWER: {
    name: '전원 제어',
    description: '에어커튼 전원 ON/OFF',
    minValue: 0,
    maxValue: 1,
    defaultValue: false,
    businessLogic: '에어커튼을 켜거나 끕니다',
  },
  SET_SPEED: {
    name: '풍량 설정',
    description: '에어커튼 풍량 설정',
    minValue: 1,
    maxValue: 3,
    defaultValue: 2,
    businessLogic: '1:약, 2:중, 3:강',
  },
  GET_POWER: {
    name: '전원 상태 확인',
    description: '현재 전원 상태 확인',
    businessLogic: '현재 에어커튼 상태를 읽어옵니다',
  },
  GET_SPEED: {
    name: '풍량 확인',
    description: '현재 풍량 확인',
    businessLogic: '현재 설정된 풍량을 읽어옵니다',
  },
};

// 온열벤치 (d041) Action 정의
export const HEATED_BENCH_ACTIONS: { [key: string]: DeviceAction } = {
  SET_POWER: {
    name: '전원 제어',
    description: '온열벤치 전원 ON/OFF',
    minValue: 0,
    maxValue: 1,
    defaultValue: false,
    businessLogic: '온열벤치를 켜거나 끕니다',
  },
  SET_TEMP: {
    name: '온도 설정',
    description: '온열벤치 온도 설정',
    minValue: 20,
    maxValue: 40,
    defaultValue: 30,
    unit: '°C',
    businessLogic: '온열벤치 온도를 20~40°C 범위로 설정합니다',
  },
  GET_POWER: {
    name: '전원 상태 확인',
    description: '현재 전원 상태 확인',
    businessLogic: '현재 온열벤치 상태를 읽어옵니다',
  },
  GET_TEMP: {
    name: '온도 확인',
    description: '현재 온도 확인',
    businessLogic: '현재 설정된 온도를 읽어옵니다',
  },
  GET_CUR_TEMP: {
    name: '현재 온도 확인',
    description: '현재 벤치 온도 확인',
    unit: '°C',
    businessLogic: '현재 벤치 온도를 읽어옵니다',
  },
};

// 자동문 (d051) Action 정의
export const AUTOMATIC_DOOR_ACTIONS: { [key: string]: DeviceAction } = {
  SET_POWER: {
    name: '전원 제어',
    description: '자동문 전원 ON/OFF',
    minValue: 0,
    maxValue: 1,
    defaultValue: false,
    businessLogic: '자동문을 켜거나 끕니다',
  },
  SET_AUTO: {
    name: '자동 모드 설정',
    description: '자동/수동 모드 전환',
    minValue: 0,
    maxValue: 1,
    defaultValue: true,
    businessLogic: 'true:자동 모드, false:수동 모드',
  },
  SET_OPEN: {
    name: '문 열기',
    description: '자동문 열기 명령',
    minValue: 0,
    maxValue: 1,
    defaultValue: false,
    businessLogic: '자동문을 엽니다',
  },
  SET_CLOSE: {
    name: '문 닫기',
    description: '자동문 닫기 명령',
    minValue: 0,
    maxValue: 1,
    defaultValue: false,
    businessLogic: '자동문을 닫습니다',
  },
  GET_POWER: {
    name: '전원 상태 확인',
    description: '현재 전원 상태 확인',
    businessLogic: '현재 자동문 상태를 읽어옵니다',
  },
  GET_AUTO: {
    name: '자동 모드 확인',
    description: '현재 모드 확인',
    businessLogic: '현재 자동/수동 모드를 읽어옵니다',
  },
  GET_STATUS: {
    name: '문 상태 확인',
    description: '문 열림/닫힘 상태 확인',
    minValue: 0,
    maxValue: 2,
    businessLogic: '0:닫힘, 1:열림, 2:움직임',
  },
};

// 외부 스위치 (d081) Action 정의
export const EXTERNAL_SWITCH_ACTIONS: { [key: string]: DeviceAction } = {
  GET_STATUS: {
    name: '스위치 상태 확인',
    description: '외부 스위치 상태 확인',
    businessLogic: '외부 스위치 상태를 읽어옵니다',
  },
  GET_POWER: {
    name: '전원 상태 확인',
    description: '현재 전원 상태 확인',
    businessLogic: '현재 전원 상태를 읽어옵니다',
  },
};

// 전체 Action 맵
export const DEVICE_ACTIONS: DeviceActionMap = {
  cooler: COOLER_ACTIONS,
  exchanger: HEAT_EXCHANGER_ACTIONS,
  integrated_sensor: INTEGRATED_SENSOR_ACTIONS,
  lighting: LIGHTING_ACTIONS,
  aircurtain: AIR_CURTAIN_ACTIONS,
  bench: HEATED_BENCH_ACTIONS,
  door: AUTOMATIC_DOOR_ACTIONS,
  externalsw: EXTERNAL_SWITCH_ACTIONS,
};

// Action 키 상수
export const ACTION_KEYS = {
  // 전원 제어
  SET_POWER: 'SET_POWER',
  GET_POWER: 'GET_POWER',

  // 모드 설정
  SET_MODE: 'SET_MODE',
  GET_MODE: 'GET_MODE',

  // 온도 제어
  SET_SUMMER_CONT_TEMP: 'SET_SUMMER_CONT_TEMP',
  SET_WINTER_CONT_TEMP: 'SET_WINTER_CONT_TEMP',
  GET_SUMMER_CONT_TEMP: 'GET_SUMMER_CONT_TEMP',
  GET_WINTER_CONT_TEMP: 'GET_WINTER_CONT_TEMP',
  GET_CUR_TEMP: 'GET_CUR_TEMP',
  SET_TEMP: 'SET_TEMP',
  GET_TEMP: 'GET_TEMP',

  // 풍량 제어
  SET_SPEED: 'SET_SPEED',
  GET_SPEED: 'GET_SPEED',

  // 자동 모드
  SET_AUTO: 'SET_AUTO',
  GET_AUTO: 'GET_AUTO',

  // 센서 데이터
  GET_PM100: 'GET_PM100',
  GET_PM25: 'GET_PM25',
  GET_PM10: 'GET_PM10',
  GET_CO2: 'GET_CO2',
  GET_VOC: 'GET_VOC',
  GET_HUM: 'GET_HUM',

  // 조명 제어
  SET_BRIGHTNESS: 'SET_BRIGHTNESS',
  GET_BRIGHTNESS: 'GET_BRIGHTNESS',

  // 에어커튼 제어
  SET_OPEN: 'SET_OPEN',
  SET_CLOSE: 'SET_CLOSE',

  // 자동문 제어
  GET_STATUS: 'GET_STATUS',
  GET_DOOR_STATUS: 'GET_DOOR_STATUS',

  // 외부 스위치
  GET_SWITCH_STATUS: 'GET_SWITCH_STATUS',
} as const;

// Action 타입
export type ActionKey = (typeof ACTION_KEYS)[keyof typeof ACTION_KEYS];

// 장비 타입별 Action 가져오기
export const getDeviceActions = (deviceType: string): { [key: string]: DeviceAction } => {
  return DEVICE_ACTIONS[deviceType] || {};
};

// 특정 Action 정보 가져오기
export const getActionInfo = (deviceType: string, actionKey: string): DeviceAction | null => {
  const deviceActions = getDeviceActions(deviceType);
  return deviceActions[actionKey] || null;
};
