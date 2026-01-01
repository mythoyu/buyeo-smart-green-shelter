/**
 * LG 냉난방기 프로토콜 매핑
 * cooler 명령 이름과 동일하게 사용
 * 참고: docs/LG_HVAC_MODBUS_PROTOCOL.md
 *
 * 주의: LG는 실내기 중앙제어 주소(N)를 기반으로 레지스터 주소를 계산합니다.
 * - Coil/Discrete: Register = N × 16 + ①
 * - Holding/Input: Register = N × 20 + ①
 * 여기서는 N=0 (실내기 주소 0)을 기준으로 합니다.
 */

/**
 * LG 프로토콜 명령 매핑
 * 주소는 실내기 주소 0 (N=0) 기준 PDU 주소 사용
 */
export const lgHvacProtocol = {
  u001: {
    // ✅ 지원되는 명령
    SET_POWER: {
      port: {
        functionCode: 0x05, // Write Single Coil
        address: 1, // N × 16 + 1 (N=0인 경우)
        description: '운전(On/Off)',
      },
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    GET_POWER: {
      port: {
        functionCode: 0x01, // Read Coils
        address: 1,
        description: '운전 상태 읽기',
      },
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    SET_MODE: {
      port: {
        functionCode: 0x06, // Write Single Register
        address: 1, // N × 20 + 1 (N=0인 경우, Holding 40001)
        description: '운전 모드 설정 (0:냉방, 1:제습, 2:송풍, 3:자동, 4:난방)',
      },
      collection: 'data',
      field: 'mode',
      type: 'number',
    },
    GET_MODE: {
      port: {
        functionCode: 0x03, // Read Holding Registers
        address: 1,
        description: '운전 모드 읽기',
      },
      collection: 'data',
      field: 'mode',
      type: 'number',
    },
    SET_SPEED: {
      port: {
        functionCode: 0x06,
        address: 2, // N × 20 + 2 (Holding 40002)
        description: '바람 세기 설정 (1:약, 2:중, 3:강, 4:자동)',
      },
      collection: 'data',
      field: 'speed',
      type: 'number',
    },
    GET_SPEED: {
      port: {
        functionCode: 0x03,
        address: 2,
        description: '바람 세기 읽기',
      },
      collection: 'data',
      field: 'speed',
      type: 'number',
    },
    // ⚠️ LG는 단일 설정온도만 지원 (여름/겨울 구분 없음)
    SET_TEMP: {
      port: {
        functionCode: 0x06,
        address: 3, // N × 20 + 3 (Holding 40003)
        description: '설정 온도 (16.0~30.0℃, ×10)',
      },
      collection: 'data',
      field: 'temp',
      type: 'number',
    },
    GET_TEMP: {
      port: {
        functionCode: 0x03,
        address: 3,
        description: '설정 온도 읽기',
      },
      collection: 'data',
      field: 'temp',
      type: 'number',
    },
    GET_CUR_TEMP: {
      port: {
        functionCode: 0x04, // Read Input Registers
        address: 2, // N × 20 + 2 (Input 30002)
        description: '실내 온도 읽기 (-99.0~99.0℃, ×10)',
      },
      collection: 'data',
      field: 'cur_temp',
      type: 'number',
    },
    GET_ALARM: {
      port: {
        functionCode: 0x04,
        address: 1, // N × 20 + 1 (Input 30001)
        description: 'Error 코드 읽기 (0-255)',
      },
      collection: 'data',
      field: 'alarm',
      type: 'number',
    },

    // ❌ 하드웨어에서 지원하지 않는 명령 (SOFTWARE_VIRTUAL로 처리)
    SET_AUTO: 'SOFTWARE_VIRTUAL',
    GET_AUTO: 'SOFTWARE_VIRTUAL',
    SET_SUMMER_CONT_TEMP: 'NOT_SUPPORTED',
    GET_SUMMER_CONT_TEMP: 'NOT_SUPPORTED',
    SET_WINTER_CONT_TEMP: 'NOT_SUPPORTED',
    GET_WINTER_CONT_TEMP: 'NOT_SUPPORTED',
    SET_START_TIME_1: 'SOFTWARE_VIRTUAL',
    GET_START_TIME_1: 'SOFTWARE_VIRTUAL',
    SET_END_TIME_1: 'SOFTWARE_VIRTUAL',
    GET_END_TIME_1: 'SOFTWARE_VIRTUAL',
  },
};

/**
 * LG 프로토콜 지원 명령 목록
 */
export const LG_SUPPORTED_COMMANDS = [
  'SET_POWER',
  'GET_POWER',
  'SET_MODE',
  'GET_MODE',
  'SET_SPEED',
  'GET_SPEED',
  'SET_TEMP',
  'GET_TEMP',
  'GET_CUR_TEMP',
  'GET_ALARM',
] as const;
