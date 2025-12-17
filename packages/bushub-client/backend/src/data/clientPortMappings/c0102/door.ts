import { HW_PORTS } from '../../../meta/hardware/ports';

export const door = {
  // automatic_door_1
  u001: {
    SET_AUTO: {
      port: HW_PORTS.DO5.AUTO.set,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    GET_AUTO: {
      port: HW_PORTS.DO5.AUTO.get,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    SET_POWER: {
      port: HW_PORTS.DO5.POWER.set,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    GET_POWER: {
      port: HW_PORTS.DO5.POWER.get,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },

    // 🎯 통합된 시간 명령어 (외부 API용)
    SET_START_TIME_1: 'TIME_INTEGRATED',
    GET_START_TIME_1: 'TIME_INTEGRATED',
    SET_END_TIME_1: 'TIME_INTEGRATED',
    GET_END_TIME_1: 'TIME_INTEGRATED',

    // 🎯 스케줄1 - HOUR 명시 (내부 Modbus용)
    SET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO5.SCHED1_START_HOUR.set,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    GET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO5.SCHED1_START_HOUR.get,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    SET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO5.SCHED1_END_HOUR.set,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    GET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO5.SCHED1_END_HOUR.get,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    // 🎯 스케줄1 - MINUTE 명시
    SET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO5.SCHED1_START_MIN.set,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    GET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO5.SCHED1_START_MIN.get,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    SET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO5.SCHED1_END_MIN.set,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    GET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO5.SCHED1_END_MIN.get,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
  },
};
