import { ModbusCommand } from './integratedSensorSpec';

// 승일DDC (SHDDC) 컨트롤러 통신프로토콜
export const SNGIL_DDC_COMMAND_MAP: { [key: string]: ModbusCommand } = {
  // DO 상태 읽기 (1x Registers)
  GET_DO_STATUS: { name: 'Get DO Status', description: 'DO 출력 상태 확인', functionCode: 1, address: 821, length: 16 },

  // DO 모드 상태 읽기 (1x Registers)
  GET_DO_MODE_STATUS: {
    name: 'Get DO Mode Status',
    description: 'DO 모드 상태 확인',
    functionCode: 1,
    address: 470,
    length: 21,
  },

  // DO 수동 제어 상태 읽기 (1x Registers)
  GET_DO_MANUAL_STATUS: {
    name: 'Get DO Manual Status',
    description: 'DO 수동 제어 상태 확인',
    functionCode: 1,
    address: 368,
    length: 12,
  },

  // DI 기능 설정 읽기 (1x Registers)
  GET_DI_FUNCTION_STATUS: {
    name: 'Get DI Function Status',
    description: 'DI 기능 설정 확인',
    functionCode: 1,
    address: 404,
    length: 16,
  },

  // DI 접점 상태 읽기 (1x Registers)
  GET_DI_CONTACT_STATUS: {
    name: 'Get DI Contact Status',
    description: 'DI 접점 상태 확인',
    functionCode: 1,
    address: 449,
    length: 3,
  },

  // 계절 상태 읽기 (1x Registers)
  GET_SEASON_STATUS: {
    name: 'Get Season Status',
    description: '현재 계절 상태 확인',
    functionCode: 1,
    address: 327,
    length: 1,
  },

  // 월별 절기 설정 읽기 (1x Registers)
  GET_MONTHLY_SEASON_STATUS: {
    name: 'Get Monthly Season Status',
    description: '월별 절기 설정 확인',
    functionCode: 1,
    address: 328,
    length: 12,
  },

  // 월별 계절 상태 읽기 (1x Registers)
  GET_MONTHLY_SEASON_CONDITION: {
    name: 'Get Monthly Season Condition',
    description: '월별 계절 조건 확인',
    functionCode: 1,
    address: 340,
    length: 12,
  },

  // 냉난방기 상태 읽기 (4x Registers)
  GET_COOLER_OPERATION_MODE: {
    name: 'Get Cooler Operation Mode',
    description: '냉난방기 운전 모드 확인',
    functionCode: 3,
    address: 116,
    length: 1,
  },
  GET_COOLER_FAN_SPEED: {
    name: 'Get Cooler Fan Speed',
    description: '냉난방기 바람 세기 확인',
    functionCode: 3,
    address: 117,
    length: 1,
  },
  GET_COOLER_SET_TEMP: {
    name: 'Get Cooler Set Temperature',
    description: '냉난방기 설정 온도 확인',
    functionCode: 3,
    address: 118,
    length: 1,
  },
  GET_COOLER_ERROR_CODE: {
    name: 'Get Cooler Error Code',
    description: '냉난방기 에러 코드 확인',
    functionCode: 3,
    address: 119,
    length: 1,
  },
  GET_COOLER_CURRENT_TEMP: {
    name: 'Get Cooler Current Temperature',
    description: '냉난방기 현재 온도 확인',
    functionCode: 3,
    address: 120,
    length: 1,
  },

  // 전열교환기 상태 읽기 (4x Registers)
  GET_EXCHANGER_FAN_SPEED: {
    name: 'Get Exchanger Fan Speed',
    description: '전열교환기 바람 세기 확인',
    functionCode: 3,
    address: 107,
    length: 1,
  },
  GET_EXCHANGER_OPERATION_MODE: {
    name: 'Get Exchanger Operation Mode',
    description: '전열교환기 운전 모드 확인',
    functionCode: 3,
    address: 108,
    length: 1,
  },
  GET_EXCHANGER_FILTER_ALARM: {
    name: 'Get Exchanger Filter Alarm',
    description: '전열교환기 필터 알람 확인',
    functionCode: 3,
    address: 109,
    length: 1,
  },

  // 통합센서 데이터 읽기 (4x Registers)
  GET_SENSOR_PM1: {
    name: 'Get Sensor PM1.0',
    description: '초초미세먼지 PM1.0 농도 확인',
    functionCode: 3,
    address: 134,
    length: 1,
  },
  GET_SENSOR_PM25: {
    name: 'Get Sensor PM2.5',
    description: '초미세먼지 PM2.5 농도 확인',
    functionCode: 3,
    address: 135,
    length: 1,
  },
  GET_SENSOR_PM10: {
    name: 'Get Sensor PM10',
    description: '미세먼지 PM10 농도 확인',
    functionCode: 3,
    address: 136,
    length: 1,
  },
  GET_SENSOR_CO2: { name: 'Get Sensor CO2', description: 'CO2 농도 확인', functionCode: 3, address: 137, length: 1 },
  GET_SENSOR_TVOC: {
    name: 'Get Sensor TVOC',
    description: '유기화합물 농도 확인',
    functionCode: 3,
    address: 138,
    length: 1,
  },
  GET_SENSOR_TEMPERATURE: {
    name: 'Get Sensor Temperature',
    description: '온도 확인',
    functionCode: 3,
    address: 139,
    length: 1,
  },
  GET_SENSOR_HUMIDITY: {
    name: 'Get Sensor Humidity',
    description: '습도 확인',
    functionCode: 3,
    address: 140,
    length: 1,
  },
  GET_SENSOR_COMM_ALARM: {
    name: 'Get Sensor Communication Alarm',
    description: '통신 알람 확인',
    functionCode: 3,
    address: 141,
    length: 1,
  },

  // 스케줄 설정 읽기 (4x Registers) - 주요 스케줄만
  GET_SCHEDULE_DO1_1: {
    name: 'Get Schedule DO1-1',
    description: 'DO1-1 스케줄 설정 확인',
    functionCode: 3,
    address: 42,
    length: 4,
  },
  GET_SCHEDULE_DO2_1: {
    name: 'Get Schedule DO2-1',
    description: 'DO2-1 스케줄 설정 확인',
    functionCode: 3,
    address: 43,
    length: 4,
  },
  GET_SCHEDULE_DO3_1: {
    name: 'Get Schedule DO3-1',
    description: 'DO3-1 스케줄 설정 확인',
    functionCode: 3,
    address: 44,
    length: 4,
  },
  GET_SCHEDULE_DO4_1: {
    name: 'Get Schedule DO4-1',
    description: 'DO4-1 스케줄 설정 확인',
    functionCode: 3,
    address: 45,
    length: 4,
  },

  // 알람 상태 읽기 (1x Registers)
  GET_COOLER_ALARM: {
    name: 'Get Cooler Alarm',
    description: '냉난방기 알람 상태 확인',
    functionCode: 1,
    address: 454,
    length: 1,
  },
  GET_EXCHANGER_ALARM: {
    name: 'Get Exchanger Alarm',
    description: '전열교환기 알람 상태 확인',
    functionCode: 1,
    address: 455,
    length: 1,
  },
  GET_SENSOR_ALARM: {
    name: 'Get Sensor Alarm',
    description: '통합센서 알람 상태 확인',
    functionCode: 1,
    address: 460,
    length: 2,
  },

  // 통신 상태 읽기 (1x Registers)
  GET_COMMUNICATION_STATUS: {
    name: 'Get Communication Status',
    description: 'SHDDC 통신 상태 확인',
    functionCode: 1,
    address: 462,
    length: 1,
  },
};
