import { HW_PORTS } from '../../../meta/hardware/ports';

export const cooler = {
  u001: {
    SET_AUTO: {
      port: HW_PORTS.COOLER.AUTO.set,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    GET_AUTO: {
      port: HW_PORTS.COOLER.AUTO.get,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    SET_POWER: {
      port: HW_PORTS.POWER_SAMSUNG.set,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    GET_POWER: {
      port: HW_PORTS.POWER_SAMSUNG.get,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    SET_MODE: {
      port: HW_PORTS.COOLER.MODE.set,
      collection: 'data',
      field: 'mode',
      type: 'number',
    },
    GET_MODE: {
      port: HW_PORTS.COOLER.MODE.get,
      collection: 'data',
      field: 'mode',
      type: 'number',
    },
    SET_SPEED: {
      port: HW_PORTS.COOLER.SPEED.set,
      collection: 'data',
      field: 'speed',
      type: 'number',
    },
    GET_SPEED: {
      port: HW_PORTS.COOLER.SPEED.get,
      collection: 'data',
      field: 'speed',
      type: 'number',
    },
    SET_SUMMER_CONT_TEMP: {
      port: HW_PORTS.COOLER.SUMMER_CONT_TEMP.set,
      collection: 'data',
      field: 'summer_cont_temp',
      type: 'number',
    },
    GET_SUMMER_CONT_TEMP: {
      port: HW_PORTS.COOLER.SUMMER_CONT_TEMP.get,
      collection: 'data',
      field: 'summer_cont_temp',
      type: 'number',
    },
    SET_WINTER_CONT_TEMP: {
      port: HW_PORTS.COOLER.WINTER_CONT_TEMP.set,
      collection: 'data',
      field: 'winter_cont_temp',
      type: 'number',
    },
    GET_WINTER_CONT_TEMP: {
      port: HW_PORTS.COOLER.WINTER_CONT_TEMP.get,
      collection: 'data',
      field: 'winter_cont_temp',
      type: 'number',
    },
    GET_CUR_TEMP: {
      port: HW_PORTS.COOLER.CUR_TEMP.get,
      collection: 'data',
      field: 'cur_temp',
      type: 'number',
    },

    // 🎯 통합된 시간 명령어 (외부 API용)
    SET_START_TIME_1: 'TIME_INTEGRATED',
    GET_START_TIME_1: 'TIME_INTEGRATED',
    SET_END_TIME_1: 'TIME_INTEGRATED',
    GET_END_TIME_1: 'TIME_INTEGRATED',

    // 🎯 스케줄1 - HOUR 명시 (내부 Modbus용)
    SET_START_TIME_1_HOUR: {
      port: HW_PORTS.COOLER.SCHED1_START_HOUR.set,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    GET_START_TIME_1_HOUR: {
      port: HW_PORTS.COOLER.SCHED1_START_HOUR.get,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    SET_END_TIME_1_HOUR: {
      port: HW_PORTS.COOLER.SCHED1_END_HOUR.set,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    GET_END_TIME_1_HOUR: {
      port: HW_PORTS.COOLER.SCHED1_END_HOUR.get,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    // 🎯 스케줄1 - MINUTE 명시
    SET_START_TIME_1_MINUTE: {
      port: HW_PORTS.COOLER.SCHED1_START_MIN.set,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    GET_START_TIME_1_MINUTE: {
      port: HW_PORTS.COOLER.SCHED1_START_MIN.get,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    SET_END_TIME_1_MINUTE: {
      port: HW_PORTS.COOLER.SCHED1_END_MIN.set,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    GET_END_TIME_1_MINUTE: {
      port: HW_PORTS.COOLER.SCHED1_END_MIN.get,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    GET_ALARM: {
      port: HW_PORTS.COOLER.ALARM.get,
      collection: 'data',
      field: 'alarm',
      type: 'number',
    },
  },
};
