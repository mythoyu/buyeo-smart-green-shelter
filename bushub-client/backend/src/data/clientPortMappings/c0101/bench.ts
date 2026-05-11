import { HW_PORTS } from '../../../meta/hardware/ports';

export const bench = {
  // internal_bench_1
  u001: {
    SET_AUTO: {
      port: HW_PORTS.DO6.AUTO.set,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    GET_AUTO: {
      port: HW_PORTS.DO6.AUTO.get,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    SET_POWER: {
      port: HW_PORTS.DO6.POWER.set,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    GET_POWER: {
      port: HW_PORTS.DO6.POWER.get,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },

    GET_CUR_TEMP: {
      port: HW_PORTS.BENCH.CUR_TEMP.get,
      collection: 'data',
      field: 'cur_temp',
      type: 'number',
    },
    GET_CONT_TEMP: {
      port: HW_PORTS.BENCH.CONT_TEMP.get,
      collection: 'data',
      field: 'cont_temp',
      type: 'number',
    },
    SET_CONT_TEMP: {
      port: HW_PORTS.BENCH.CONT_TEMP.set,
      collection: 'data',
      field: 'cont_temp',
      type: 'number',
    },
    GET_TEMP_OFFSET: {
      port: HW_PORTS.BENCH.TEMP_OFFSET.get,
      collection: 'data',
      field: 'temp_offset',
      type: 'number',
    },
    SET_TEMP_OFFSET: {
      port: HW_PORTS.BENCH.TEMP_OFFSET.set,
      collection: 'data',
      field: 'temp_offset',
      type: 'number',
    },
    GET_TEMP_CHECK_INTERVAL: {
      port: HW_PORTS.BENCH.TEMP_CHECK_INTERVAL.get,
      collection: 'data',
      field: 'temp_check_interval',
      type: 'number',
    },
    SET_TEMP_CHECK_INTERVAL: {
      port: HW_PORTS.BENCH.TEMP_CHECK_INTERVAL.set,
      collection: 'data',
      field: 'temp_check_interval',
      type: 'number',
    },

    // 🎯 통합된 시간 명령어 (외부 API용)
    SET_START_TIME_1: 'TIME_INTEGRATED',
    GET_START_TIME_1: 'TIME_INTEGRATED',
    SET_END_TIME_1: 'TIME_INTEGRATED',
    GET_END_TIME_1: 'TIME_INTEGRATED',

    // 🎯 스케줄1 - HOUR 명시 (내부 Modbus용)
    SET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO6.SCHED1_START_HOUR.set,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    GET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO6.SCHED1_START_HOUR.get,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    SET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO6.SCHED1_END_HOUR.set,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    GET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO6.SCHED1_END_HOUR.get,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    // 🎯 스케줄1 - MINUTE 명시
    SET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO6.SCHED1_START_MIN.set,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    GET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO6.SCHED1_START_MIN.get,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    SET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO6.SCHED1_END_MIN.set,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    GET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO6.SCHED1_END_MIN.get,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
  },
};
