/**
 * 삼성 냉난방기 프로토콜 매핑
 * cooler 명령 이름과 동일하게 사용
 * 참고: docs/SAMSUNG_HVAC_MODBUS_PROTOCOL.md
 */

/**
 * 삼성 프로토콜 명령 매핑
 * 주소는 Modbus PDU 주소 사용 (hex 값)
 * 예: 40053 → 0x0034 (52 decimal)
 */
export const samsungHvacProtocol = {
  u001: {
    // ✅ 지원되는 명령
    SET_POWER: {
      port: {
        functionCode: 0x06, // Write Single Register
        address: 0x0034, // 52 decimal, 40053
        description: '에어컨 운전 ON/OFF',
      },
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    GET_POWER: {
      port: {
        functionCode: 0x03, // Read Holding Registers
        address: 0x0034, // 52 decimal, 40053
        description: '에어컨 운전 상태 읽기',
      },
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    SET_MODE: {
      port: {
        functionCode: 0x06,
        address: 0x0035, // 53 decimal, 40054
        description: '운전 모드 설정 (0:자동, 1:냉방, 2:제습, 3:송풍, 4:난방)',
      },
      collection: 'data',
      field: 'mode',
      type: 'number',
    },
    GET_MODE: {
      port: {
        functionCode: 0x03,
        address: 0x0035,
        description: '운전 모드 읽기',
      },
      collection: 'data',
      field: 'mode',
      type: 'number',
    },
    SET_SPEED: {
      port: {
        functionCode: 0x06,
        address: 0x0036, // 54 decimal, 40055
        description: '팬 풍량 설정 (0:자동, 1:미용, 2:약풍, 3:강풍)',
      },
      collection: 'data',
      field: 'speed',
      type: 'number',
    },
    GET_SPEED: {
      port: {
        functionCode: 0x03,
        address: 0x0036,
        description: '팬 풍량 읽기',
      },
      collection: 'data',
      field: 'speed',
      type: 'number',
    },
    SET_SUMMER_CONT_TEMP: {
      port: {
        functionCode: 0x06,
        address: 0x003d, // 61 decimal, 40062
        description: '냉방 토출 설정온도 (8~18℃, ×10)',
      },
      collection: 'data',
      field: 'summer_cont_temp',
      type: 'number',
    },
    GET_SUMMER_CONT_TEMP: {
      port: {
        functionCode: 0x03,
        address: 0x003d,
        description: '냉방 토출 설정온도 읽기',
      },
      collection: 'data',
      field: 'summer_cont_temp',
      type: 'number',
    },
    SET_WINTER_CONT_TEMP: {
      port: {
        functionCode: 0x06,
        address: 0x003e, // 62 decimal, 40063
        description: '난방 토출 설정온도 (30~43℃, ×10)',
      },
      collection: 'data',
      field: 'winter_cont_temp',
      type: 'number',
    },
    GET_WINTER_CONT_TEMP: {
      port: {
        functionCode: 0x03,
        address: 0x003e,
        description: '난방 토출 설정온도 읽기',
      },
      collection: 'data',
      field: 'winter_cont_temp',
      type: 'number',
    },
    GET_CUR_TEMP: {
      port: {
        functionCode: 0x04, // Read Input Registers
        address: 0x003b, // 59 decimal, 30060
        description: '실내 온도 읽기 (×10)',
      },
      collection: 'data',
      field: 'cur_temp',
      type: 'number',
    },
    GET_ALARM: {
      port: {
        functionCode: 0x04,
        address: 0x003f, // 63 decimal, 30064
        description: '실내기 통합 에러 코드 읽기',
      },
      collection: 'data',
      field: 'alarm',
      type: 'number',
    },

    // ❌ 하드웨어에서 지원하지 않는 명령 (SOFTWARE_VIRTUAL로 처리)
    SET_AUTO: 'SOFTWARE_VIRTUAL',
    GET_AUTO: 'SOFTWARE_VIRTUAL',
    SET_START_TIME_1: 'SOFTWARE_VIRTUAL',
    GET_START_TIME_1: 'SOFTWARE_VIRTUAL',
    SET_END_TIME_1: 'SOFTWARE_VIRTUAL',
    GET_END_TIME_1: 'SOFTWARE_VIRTUAL',
  },
};

/**
 * 삼성 프로토콜 지원 명령 목록
 */
export const SAMSUNG_SUPPORTED_COMMANDS = [
  'SET_POWER',
  'GET_POWER',
  'SET_MODE',
  'GET_MODE',
  'SET_SPEED',
  'GET_SPEED',
  'SET_SUMMER_CONT_TEMP',
  'GET_SUMMER_CONT_TEMP',
  'SET_WINTER_CONT_TEMP',
  'GET_WINTER_CONT_TEMP',
  'GET_CUR_TEMP',
  'GET_ALARM',
] as const;

