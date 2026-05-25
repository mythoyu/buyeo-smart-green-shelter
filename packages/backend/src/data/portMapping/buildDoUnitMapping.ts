import { HW_PORTS } from '../../meta/hardware/ports';
import type { CommandConfig } from '../clientPortMappings/types';

import type { DoAssignableDeviceType, DoPortKey } from './doPortTypes';

type DoHwBlock = (typeof HW_PORTS)[DoPortKey];
type UnitCommandMapping = Record<string, CommandConfig | 'TIME_INTEGRATED'>;

function cmd(
  port: { functionCode: number; address: number; description?: string },
  field: string,
  type: string,
  collection = 'data',
): CommandConfig {
  return { port, collection, field, type };
}

function buildAutoPower(doBlock: DoHwBlock): UnitCommandMapping {
  return {
    SET_AUTO: cmd(doBlock.AUTO.set!, 'auto', 'boolean'),
    GET_AUTO: cmd(doBlock.AUTO.get!, 'auto', 'boolean'),
    SET_POWER: cmd(doBlock.POWER.set!, 'power', 'boolean'),
    GET_POWER: cmd(doBlock.POWER.get!, 'power', 'boolean'),
  };
}

function buildSched1(doBlock: DoHwBlock): UnitCommandMapping {
  return {
    SET_START_TIME_1: 'TIME_INTEGRATED',
    GET_START_TIME_1: 'TIME_INTEGRATED',
    SET_END_TIME_1: 'TIME_INTEGRATED',
    GET_END_TIME_1: 'TIME_INTEGRATED',
    SET_START_TIME_1_HOUR: cmd(doBlock.SCHED1_START_HOUR.set!, 'start_time_1_hour', 'number'),
    GET_START_TIME_1_HOUR: cmd(doBlock.SCHED1_START_HOUR.get!, 'start_time_1_hour', 'number'),
    SET_END_TIME_1_HOUR: cmd(doBlock.SCHED1_END_HOUR.set!, 'end_time_1_hour', 'number'),
    GET_END_TIME_1_HOUR: cmd(doBlock.SCHED1_END_HOUR.get!, 'end_time_1_hour', 'number'),
    SET_START_TIME_1_MINUTE: cmd(doBlock.SCHED1_START_MIN.set!, 'start_time_1_minute', 'number'),
    GET_START_TIME_1_MINUTE: cmd(doBlock.SCHED1_START_MIN.get!, 'start_time_1_minute', 'number'),
    SET_END_TIME_1_MINUTE: cmd(doBlock.SCHED1_END_MIN.set!, 'end_time_1_minute', 'number'),
    GET_END_TIME_1_MINUTE: cmd(doBlock.SCHED1_END_MIN.get!, 'end_time_1_minute', 'number'),
  };
}

function buildSched2(doBlock: DoHwBlock): UnitCommandMapping {
  if (!('SCHED2_START_HOUR' in doBlock)) {
    return {};
  }

  const d = doBlock as DoHwBlock & {
    SCHED2_START_HOUR: {
      set: { functionCode: number; address: number };
      get: { functionCode: number; address: number };
    };
    SCHED2_START_MIN: {
      set: { functionCode: number; address: number };
      get: { functionCode: number; address: number };
    };
    SCHED2_END_HOUR: {
      set: { functionCode: number; address: number };
      get: { functionCode: number; address: number };
    };
    SCHED2_END_MIN: {
      set: { functionCode: number; address: number };
      get: { functionCode: number; address: number };
    };
  };

  return {
    SET_START_TIME_2: 'TIME_INTEGRATED',
    GET_START_TIME_2: 'TIME_INTEGRATED',
    SET_END_TIME_2: 'TIME_INTEGRATED',
    GET_END_TIME_2: 'TIME_INTEGRATED',
    SET_START_TIME_2_HOUR: cmd(d.SCHED2_START_HOUR.set, 'start_time_2_hour', 'number'),
    GET_START_TIME_2_HOUR: cmd(d.SCHED2_START_HOUR.get, 'start_time_2_hour', 'number'),
    SET_END_TIME_2_HOUR: cmd(d.SCHED2_END_HOUR.set, 'end_time_2_hour', 'number'),
    GET_END_TIME_2_HOUR: cmd(d.SCHED2_END_HOUR.get, 'end_time_2_hour', 'number'),
    SET_START_TIME_2_MINUTE: cmd(d.SCHED2_START_MIN.set, 'start_time_2_minute', 'number'),
    GET_START_TIME_2_MINUTE: cmd(d.SCHED2_START_MIN.get, 'start_time_2_minute', 'number'),
    SET_END_TIME_2_MINUTE: cmd(d.SCHED2_END_MIN.set, 'end_time_2_minute', 'number'),
    GET_END_TIME_2_MINUTE: cmd(d.SCHED2_END_MIN.get, 'end_time_2_minute', 'number'),
  };
}

function buildAutoOnly(doBlock: DoHwBlock): UnitCommandMapping {
  return {
    SET_AUTO: cmd(doBlock.AUTO.set!, 'auto', 'boolean'),
    GET_AUTO: cmd(doBlock.AUTO.get!, 'auto', 'boolean'),
  };
}

/**
 * deviceType + DO 번호로 CLIENT_PORT_MAPPINGS 유닛 블록과 동형의 명령 맵 생성
 */
export function buildDoUnitMapping(deviceType: DoAssignableDeviceType, doPort: DoPortKey): UnitCommandMapping {
  const doBlock = HW_PORTS[doPort];

  switch (deviceType) {
    case 'lighting':
      return {
        ...buildAutoPower(doBlock),
        ...buildSched1(doBlock),
        ...buildSched2(doBlock),
      };
    case 'bench':
    case 'door':
      return {
        ...buildAutoPower(doBlock),
        ...buildSched1(doBlock),
      };
    case 'externalsw':
      return {
        ...buildAutoOnly(doBlock),
        ...buildSched1(doBlock),
      };
    default:
      throw new Error(`Unsupported DO-assignable device type: ${deviceType}`);
  }
}

