import { ModbusCommand } from './integratedSensorSpec';

// d011 전등 (Lighting) - SNGIL_DDC_COMMANDS.md 기반
export const LIGHTING_COMMAND_MAP: { [key: string]: ModbusCommand } = {
  // 출력설정
  SET_POWER: { name: 'Set Power', description: '수동출력제어', functionCode: 6, address: 368 },
  GET_POWER: { name: 'Get Power', description: '출력상태취득', functionCode: 3, address: 821, length: 1 },

  // 모드설정
  SET_AUTO: { name: 'Set Auto Mode', description: '모드(수동/스케줄)', functionCode: 6, address: 352 },
  GET_AUTO: { name: 'Get Auto Mode', description: '모드(수동/스케줄)상태', functionCode: 3, address: 475, length: 1 },

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

  // 스케줄2 설정 (DO1~DO4)
  // 통합된 시간 설정 명령어 (프론트엔드에서 사용)
  SET_START_TIME_2: { name: 'Set Start Time 2', description: '시작스케줄설정2(통합)', functionCode: 6, address: 106 },
  GET_START_TIME_2: {
    name: 'Get Start Time 2',
    description: '시작스케줄설정2(통합)',
    functionCode: 3,
    address: 106,
    length: 2,
  },
  SET_END_TIME_2: { name: 'Set End Time 2', description: '종료스케줄설정2(통합)', functionCode: 6, address: 138 },
  GET_END_TIME_2: {
    name: 'Get End Time 2',
    description: '종료스케줄설정2(통합)',
    functionCode: 3,
    address: 138,
    length: 2,
  },

  // 분리된 시간 설정 명령어 (기존 호환성 유지)
  // 시작 시간2 - 시
  SET_START_TIME_2_HOUR: {
    name: 'Set Start Time 2 Hour',
    description: '시작스케줄설정2(시)',
    functionCode: 6,
    address: 106,
  },
  GET_START_TIME_2_HOUR: {
    name: 'Get Start Time 2 Hour',
    description: '시작스케줄설정2(시)',
    functionCode: 3,
    address: 106,
    length: 1,
  },
  // 시작 시간2 - 분
  SET_START_TIME_2_MINUTE: {
    name: 'Set Start Time 2 Minute',
    description: '시작스케줄설정2(분)',
    functionCode: 6,
    address: 122,
  },
  GET_START_TIME_2_MINUTE: {
    name: 'Get Start Time 2 Minute',
    description: '시작스케줄설정2(분)',
    functionCode: 3,
    address: 122,
    length: 1,
  },
  // 종료 시간2 - 시
  SET_END_TIME_2_HOUR: {
    name: 'Set End Time 2 Hour',
    description: '종료스케줄설정2(시)',
    functionCode: 6,
    address: 138,
  },
  GET_END_TIME_2_HOUR: {
    name: 'Get End Time 2 Hour',
    description: '종료스케줄설정2(시)',
    functionCode: 3,
    address: 138,
    length: 1,
  },
  // 종료 시간2 - 분
  SET_END_TIME_2_MINUTE: {
    name: 'Set End Time 2 Minute',
    description: '종료스케줄설정2(분)',
    functionCode: 6,
    address: 154,
  },
  GET_END_TIME_2_MINUTE: {
    name: 'Get End Time 2 Minute',
    description: '종료스케줄설정2(분)',
    functionCode: 3,
    address: 154,
    length: 1,
  },
};
