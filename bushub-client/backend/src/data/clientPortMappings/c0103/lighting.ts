import { HW_PORTS } from '../../../meta/hardware/ports';

export const lighting = {
  // internal_lighting_1
  u001: {
    SET_AUTO: {
      port: HW_PORTS.DO1.AUTO.set,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    GET_AUTO: {
      port: HW_PORTS.DO1.AUTO.get,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    SET_POWER: {
      port: HW_PORTS.DO1.POWER.set,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    GET_POWER: {
      port: HW_PORTS.DO1.POWER.get,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    // 🎯 통합된 시간 명령어 (외부 API용)
    SET_START_TIME_1: 'TIME_INTEGRATED',
    GET_START_TIME_1: 'TIME_INTEGRATED',
    SET_END_TIME_1: 'TIME_INTEGRATED',
    GET_END_TIME_1: 'TIME_INTEGRATED',
    SET_START_TIME_2: 'TIME_INTEGRATED',
    GET_START_TIME_2: 'TIME_INTEGRATED',
    SET_END_TIME_2: 'TIME_INTEGRATED',
    GET_END_TIME_2: 'TIME_INTEGRATED',

    // 🎯 스케줄1 - HOUR 명시 (내부 Modbus용)
    SET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO1.SCHED1_START_HOUR.set,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    GET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO1.SCHED1_START_HOUR.get,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    SET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO1.SCHED1_END_HOUR.set,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    GET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO1.SCHED1_END_HOUR.get,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    // 🎯 스케줄1 - MINUTE 명시
    SET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO1.SCHED1_START_MIN.set,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    GET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO1.SCHED1_START_MIN.get,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    SET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO1.SCHED1_END_MIN.set,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    GET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO1.SCHED1_END_MIN.get,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    // 🎯 스케줄2 - HOUR 명시
    SET_START_TIME_2_HOUR: {
      port: HW_PORTS.DO1.SCHED2_START_HOUR.set,
      collection: 'data',
      field: 'start_time_2_hour',
      type: 'number',
    },
    GET_START_TIME_2_HOUR: {
      port: HW_PORTS.DO1.SCHED2_START_HOUR.get,
      collection: 'data',
      field: 'start_time_2_hour',
      type: 'number',
    },
    SET_END_TIME_2_HOUR: {
      port: HW_PORTS.DO1.SCHED2_END_HOUR.set,
      collection: 'data',
      field: 'end_time_2_hour',
      type: 'number',
    },
    GET_END_TIME_2_HOUR: {
      port: HW_PORTS.DO1.SCHED2_END_HOUR.get,
      collection: 'data',
      field: 'end_time_2_hour',
      type: 'number',
    },
    // 🎯 스케줄2 - MINUTE 명시
    SET_START_TIME_2_MINUTE: {
      port: HW_PORTS.DO1.SCHED2_START_MIN.set,
      collection: 'data',
      field: 'start_time_2_minute',
      type: 'number',
    },
    GET_START_TIME_2_MINUTE: {
      port: HW_PORTS.DO1.SCHED2_START_MIN.get,
      collection: 'data',
      field: 'start_time_2_minute',
      type: 'number',
    },
    SET_END_TIME_2_MINUTE: {
      port: HW_PORTS.DO1.SCHED2_END_MIN.set,
      collection: 'data',
      field: 'end_time_2_minute',
      type: 'number',
    },
    GET_END_TIME_2_MINUTE: {
      port: HW_PORTS.DO1.SCHED2_END_MIN.get,
      collection: 'data',
      field: 'end_time_2_minute',
      type: 'number',
    },
  },
  // internal_lighting_2
  u002: {
    SET_AUTO: {
      port: HW_PORTS.DO2.AUTO.set,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    GET_AUTO: {
      port: HW_PORTS.DO2.AUTO.get,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    SET_POWER: {
      port: HW_PORTS.DO2.POWER.set,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    GET_POWER: {
      port: HW_PORTS.DO2.POWER.get,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    // 🎯 통합된 시간 명령어 (외부 API용)
    SET_START_TIME_1: 'TIME_INTEGRATED',
    GET_START_TIME_1: 'TIME_INTEGRATED',
    SET_END_TIME_1: 'TIME_INTEGRATED',
    GET_END_TIME_1: 'TIME_INTEGRATED',
    SET_START_TIME_2: 'TIME_INTEGRATED',
    GET_START_TIME_2: 'TIME_INTEGRATED',
    SET_END_TIME_2: 'TIME_INTEGRATED',
    GET_END_TIME_2: 'TIME_INTEGRATED',

    // 🎯 스케줄1 - HOUR 명시 (내부 Modbus용)
    SET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO2.SCHED1_START_HOUR.set,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    GET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO2.SCHED1_START_HOUR.get,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    SET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO2.SCHED1_END_HOUR.set,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    GET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO2.SCHED1_END_HOUR.get,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    // 🎯 스케줄1 - MINUTE 명시
    SET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO2.SCHED1_START_MIN.set,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    GET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO2.SCHED1_START_MIN.get,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    SET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO2.SCHED1_END_MIN.set,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    GET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO2.SCHED1_END_MIN.get,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    // 🎯 스케줄2 - HOUR 명시
    SET_START_TIME_2_HOUR: {
      port: HW_PORTS.DO2.SCHED2_START_HOUR.set,
      collection: 'data',
      field: 'start_time_2_hour',
      type: 'number',
    },
    GET_START_TIME_2_HOUR: {
      port: HW_PORTS.DO2.SCHED2_START_HOUR.get,
      collection: 'data',
      field: 'start_time_2_hour',
      type: 'number',
    },
    SET_END_TIME_2_HOUR: {
      port: HW_PORTS.DO2.SCHED2_END_HOUR.set,
      collection: 'data',
      field: 'end_time_2_hour',
      type: 'number',
    },
    GET_END_TIME_2_HOUR: {
      port: HW_PORTS.DO2.SCHED2_END_HOUR.get,
      collection: 'data',
      field: 'end_time_2_hour',
      type: 'number',
    },
    // 🎯 스케줄2 - MINUTE 명시
    SET_START_TIME_2_MINUTE: {
      port: HW_PORTS.DO2.SCHED2_START_MIN.set,
      collection: 'data',
      field: 'start_time_2_minute',
      type: 'number',
    },
    GET_START_TIME_2_MINUTE: {
      port: HW_PORTS.DO2.SCHED2_START_MIN.get,
      collection: 'data',
      field: 'start_time_2_minute',
      type: 'number',
    },
    SET_END_TIME_2_MINUTE: {
      port: HW_PORTS.DO2.SCHED2_END_MIN.set,
      collection: 'data',
      field: 'end_time_2_minute',
      type: 'number',
    },
    GET_END_TIME_2_MINUTE: {
      port: HW_PORTS.DO2.SCHED2_END_MIN.get,
      collection: 'data',
      field: 'end_time_2_minute',
      type: 'number',
    },
  },
  // internal_lighting_2
  u003: {
    SET_AUTO: {
      port: HW_PORTS.DO3.AUTO.set,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    GET_AUTO: {
      port: HW_PORTS.DO3.AUTO.get,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    SET_POWER: {
      port: HW_PORTS.DO3.POWER.set,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    GET_POWER: {
      port: HW_PORTS.DO3.POWER.get,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    // 🎯 통합된 시간 명령어 (외부 API용)
    SET_START_TIME_1: 'TIME_INTEGRATED',
    GET_START_TIME_1: 'TIME_INTEGRATED',
    SET_END_TIME_1: 'TIME_INTEGRATED',
    GET_END_TIME_1: 'TIME_INTEGRATED',
    SET_START_TIME_2: 'TIME_INTEGRATED',
    GET_START_TIME_2: 'TIME_INTEGRATED',
    SET_END_TIME_2: 'TIME_INTEGRATED',
    GET_END_TIME_2: 'TIME_INTEGRATED',

    // 🎯 스케줄1 - HOUR 명시 (내부 Modbus용)
    SET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO3.SCHED1_START_HOUR.set,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    GET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO3.SCHED1_START_HOUR.get,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    SET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO3.SCHED1_END_HOUR.set,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    GET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO3.SCHED1_END_HOUR.get,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    // 🎯 스케줄1 - MINUTE 명시
    SET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO3.SCHED1_START_MIN.set,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    GET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO3.SCHED1_START_MIN.get,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    SET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO3.SCHED1_END_MIN.set,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    GET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO3.SCHED1_END_MIN.get,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    // 🎯 스케줄2 - HOUR 명시
    SET_START_TIME_2_HOUR: {
      port: HW_PORTS.DO3.SCHED2_START_HOUR.set,
      collection: 'data',
      field: 'start_time_2_hour',
      type: 'number',
    },
    GET_START_TIME_2_HOUR: {
      port: HW_PORTS.DO3.SCHED2_START_HOUR.get,
      collection: 'data',
      field: 'start_time_2_hour',
      type: 'number',
    },
    SET_END_TIME_2_HOUR: {
      port: HW_PORTS.DO3.SCHED2_END_HOUR.set,
      collection: 'data',
      field: 'end_time_2_hour',
      type: 'number',
    },
    GET_END_TIME_2_HOUR: {
      port: HW_PORTS.DO3.SCHED2_END_HOUR.get,
      collection: 'data',
      field: 'end_time_2_hour',
      type: 'number',
    },
    // 🎯 스케줄2 - MINUTE 명시
    SET_START_TIME_2_MINUTE: {
      port: HW_PORTS.DO3.SCHED2_START_MIN.set,
      collection: 'data',
      field: 'start_time_2_minute',
      type: 'number',
    },
    GET_START_TIME_2_MINUTE: {
      port: HW_PORTS.DO3.SCHED2_START_MIN.get,
      collection: 'data',
      field: 'start_time_2_minute',
      type: 'number',
    },
    SET_END_TIME_2_MINUTE: {
      port: HW_PORTS.DO3.SCHED2_END_MIN.set,
      collection: 'data',
      field: 'end_time_2_minute',
      type: 'number',
    },
    GET_END_TIME_2_MINUTE: {
      port: HW_PORTS.DO3.SCHED2_END_MIN.get,
      collection: 'data',
      field: 'end_time_2_minute',
      type: 'number',
    },
  },
  // internal_lighting_3
  u004: {
    SET_AUTO: {
      port: HW_PORTS.DO4.AUTO.set,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    GET_AUTO: {
      port: HW_PORTS.DO4.AUTO.get,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    SET_POWER: {
      port: HW_PORTS.DO4.POWER.set,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    GET_POWER: {
      port: HW_PORTS.DO4.POWER.get,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    // 🎯 통합된 시간 명령어 (외부 API용)
    SET_START_TIME_1: 'TIME_INTEGRATED',
    GET_START_TIME_1: 'TIME_INTEGRATED',
    SET_END_TIME_1: 'TIME_INTEGRATED',
    GET_END_TIME_1: 'TIME_INTEGRATED',
    SET_START_TIME_2: 'TIME_INTEGRATED',
    GET_START_TIME_2: 'TIME_INTEGRATED',
    SET_END_TIME_2: 'TIME_INTEGRATED',
    GET_END_TIME_2: 'TIME_INTEGRATED',

    // 🎯 스케줄1 - HOUR 명시 (내부 Modbus용)
    SET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO4.SCHED1_START_HOUR.set,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    GET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO4.SCHED1_START_HOUR.get,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    SET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO4.SCHED1_END_HOUR.set,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    GET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO4.SCHED1_END_HOUR.get,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    // 🎯 스케줄1 - MINUTE 명시
    SET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO4.SCHED1_START_MIN.set,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    GET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO4.SCHED1_START_MIN.get,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    SET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO4.SCHED1_END_MIN.set,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    GET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO4.SCHED1_END_MIN.get,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    // 🎯 스케줄2 - HOUR 명시
    SET_START_TIME_2_HOUR: {
      port: HW_PORTS.DO4.SCHED2_START_HOUR.set,
      collection: 'data',
      field: 'start_time_2_hour',
      type: 'number',
    },
    GET_START_TIME_2_HOUR: {
      port: HW_PORTS.DO4.SCHED2_START_HOUR.get,
      collection: 'data',
      field: 'start_time_2_hour',
      type: 'number',
    },
    SET_END_TIME_2_HOUR: {
      port: HW_PORTS.DO4.SCHED2_END_HOUR.set,
      collection: 'data',
      field: 'end_time_2_hour',
      type: 'number',
    },
    GET_END_TIME_2_HOUR: {
      port: HW_PORTS.DO4.SCHED2_END_HOUR.get,
      collection: 'data',
      field: 'end_time_2_hour',
      type: 'number',
    },
    // 🎯 스케줄2 - MINUTE 명시
    SET_START_TIME_2_MINUTE: {
      port: HW_PORTS.DO4.SCHED2_START_MIN.set,
      collection: 'data',
      field: 'start_time_2_minute',
      type: 'number',
    },
    GET_START_TIME_2_MINUTE: {
      port: HW_PORTS.DO4.SCHED2_START_MIN.get,
      collection: 'data',
      field: 'start_time_2_minute',
      type: 'number',
    },
    SET_END_TIME_2_MINUTE: {
      port: HW_PORTS.DO4.SCHED2_END_MIN.set,
      collection: 'data',
      field: 'end_time_2_minute',
      type: 'number',
    },
    GET_END_TIME_2_MINUTE: {
      port: HW_PORTS.DO4.SCHED2_END_MIN.get,
      collection: 'data',
      field: 'end_time_2_minute',
      type: 'number',
    },
  },
};
