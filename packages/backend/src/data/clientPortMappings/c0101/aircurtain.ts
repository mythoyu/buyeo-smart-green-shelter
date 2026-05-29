import { HW_PORTS } from '../../../meta/hardware/ports';

/**
 * 에어커튼 접점 — SNGIL DDC 물리 DO7·DO8 (`SNGIL_DDC_MODBUS_PACKETS.md`)
 * 클라이언트에 aircurtain 디바이스를 넣을 때 index.ts에 export 추가
 */
export const aircurtain = {
  u001: {
    SET_AUTO: {
      port: HW_PORTS.DO7.AUTO.set,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    GET_AUTO: {
      port: HW_PORTS.DO7.AUTO.get,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    SET_POWER: {
      port: HW_PORTS.DO7.POWER.set,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    GET_POWER: {
      port: HW_PORTS.DO7.POWER.get,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    SET_START_TIME_1: 'TIME_INTEGRATED',
    GET_START_TIME_1: 'TIME_INTEGRATED',
    SET_END_TIME_1: 'TIME_INTEGRATED',
    GET_END_TIME_1: 'TIME_INTEGRATED',
    SET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO7.SCHED1_START_HOUR.set,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    GET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO7.SCHED1_START_HOUR.get,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    SET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO7.SCHED1_END_HOUR.set,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    GET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO7.SCHED1_END_HOUR.get,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    SET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO7.SCHED1_START_MIN.set,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    GET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO7.SCHED1_START_MIN.get,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    SET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO7.SCHED1_END_MIN.set,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    GET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO7.SCHED1_END_MIN.get,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
  },
  u002: {
    SET_AUTO: {
      port: HW_PORTS.DO8.AUTO.set,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    GET_AUTO: {
      port: HW_PORTS.DO8.AUTO.get,
      collection: 'data',
      field: 'auto',
      type: 'boolean',
    },
    SET_POWER: {
      port: HW_PORTS.DO8.POWER.set,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    GET_POWER: {
      port: HW_PORTS.DO8.POWER.get,
      collection: 'data',
      field: 'power',
      type: 'boolean',
    },
    SET_START_TIME_1: 'TIME_INTEGRATED',
    GET_START_TIME_1: 'TIME_INTEGRATED',
    SET_END_TIME_1: 'TIME_INTEGRATED',
    GET_END_TIME_1: 'TIME_INTEGRATED',
    SET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO8.SCHED1_START_HOUR.set,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    GET_START_TIME_1_HOUR: {
      port: HW_PORTS.DO8.SCHED1_START_HOUR.get,
      collection: 'data',
      field: 'start_time_1_hour',
      type: 'number',
    },
    SET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO8.SCHED1_END_HOUR.set,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    GET_END_TIME_1_HOUR: {
      port: HW_PORTS.DO8.SCHED1_END_HOUR.get,
      collection: 'data',
      field: 'end_time_1_hour',
      type: 'number',
    },
    SET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO8.SCHED1_START_MIN.set,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    GET_START_TIME_1_MINUTE: {
      port: HW_PORTS.DO8.SCHED1_START_MIN.get,
      collection: 'data',
      field: 'start_time_1_minute',
      type: 'number',
    },
    SET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO8.SCHED1_END_MIN.set,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
    GET_END_TIME_1_MINUTE: {
      port: HW_PORTS.DO8.SCHED1_END_MIN.get,
      collection: 'data',
      field: 'end_time_1_minute',
      type: 'number',
    },
  },
};
