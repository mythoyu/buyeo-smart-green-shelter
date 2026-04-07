import { ModbusCommand } from './integratedSensorSpec';

export const EXCHANGER_COMMAND_MAP: { [key: string]: ModbusCommand } = {
  // 기본 제어
  SET_POWER: { name: 'Set Power', description: '전원제어', functionCode: 6, address: 400 },
  GET_POWER: { name: 'Get Power', description: '전원상태', functionCode: 3, address: 400, length: 1 },

  // 모드 제어
  SET_AUTO: { name: 'Set Auto Mode', description: '모드(수동/스케줄)', functionCode: 6, address: 401 },
  GET_AUTO: { name: 'Get Auto Mode', description: '모드(수동/스케줄)상태', functionCode: 3, address: 401, length: 1 },

  // 운전 제어
  SET_MODE: { name: 'Set Operation Mode', description: '전열교환기 운전 모드 설정', functionCode: 6, address: 121 },
  GET_MODE: {
    name: 'Get Operation Mode',
    description: '전열교환기 운전 모드 상태',
    functionCode: 3,
    address: 121,
    length: 1,
  },

  // 풍량 제어
  SET_SPEED: { name: 'Set Fan Speed', description: '전열교환기 팬 풍량 설정', functionCode: 6, address: 122 },
  GET_SPEED: {
    name: 'Get Fan Speed',
    description: '전열교환기 팬 풍량 상태',
    functionCode: 3,
    address: 122,
    length: 1,
  },

  // 스케줄1 설정 (DO1~DO13, DO16)
  // 통합된 시간 설정 명령어 (프론트엔드에서 사용)
  SET_START_TIME_1: { name: 'Set Start Time 1', description: '시작스케줄설정(통합)', functionCode: 6, address: 42 },
  GET_START_TIME_1: {
    name: 'Get Start Time 1',
    description: '시작스케줄설정(통합)',
    functionCode: 3,
    address: 42,
    length: 2,
  },
  SET_END_TIME_1: { name: 'Set End Time 1', description: '종료스케줄설정(통합)', functionCode: 6, address: 74 },
  GET_END_TIME_1: {
    name: 'Get End Time 1',
    description: '종료스케줄설정(통합)',
    functionCode: 3,
    address: 74,
    length: 2,
  },

  // 분리된 시간 설정 명령어 (기존 호환성 유지)
  // 시작 시간 - 시
  SET_START_TIME_1_HOUR: {
    name: 'Set Start Time 1 Hour',
    description: '시작스케줄설정(시)',
    functionCode: 6,
    address: 42,
  },
  GET_START_TIME_1_HOUR: {
    name: 'Get Start Time 1 Hour',
    description: '시작스케줄설정(시)',
    functionCode: 3,
    address: 42,
    length: 1,
  },
  // 시작 시간 - 분
  SET_START_TIME_1_MINUTE: {
    name: 'Set Start Time 1 Minute',
    description: '시작스케줄설정(분)',
    functionCode: 6,
    address: 58,
  },
  GET_START_TIME_1_MINUTE: {
    name: 'Get Start Time 1 Minute',
    description: '시작스케줄설정(분)',
    functionCode: 3,
    address: 58,
    length: 1,
  },
  // 종료 시간 - 시
  SET_END_TIME_1_HOUR: { name: 'Set End Time 1 Hour', description: '종료스케줄설정(시)', functionCode: 6, address: 74 },
  GET_END_TIME_1_HOUR: {
    name: 'Get End Time 1 Hour',
    description: '종료스케줄설정(시)',
    functionCode: 3,
    address: 74,
    length: 1,
  },
  // 종료 시간 - 분
  SET_END_TIME_1_MINUTE: {
    name: 'Set End Time 1 Minute',
    description: '종료스케줄설정(분)',
    functionCode: 6,
    address: 90,
  },
  GET_END_TIME_1_MINUTE: {
    name: 'Get End Time 1 Minute',
    description: '종료스케줄설정(분)',
    functionCode: 3,
    address: 90,
    length: 1,
  },
};
