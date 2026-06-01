import type { DeviceDefaultValues } from './index';
import {
  BENCH_U001,
  COOLER_U001,
  DOOR_U001,
  LIGHTING_TWO_ZONE_UNIT,
  PEOPLE_COUNTER_UNIT,
} from './sharedScheduleDefaults';

export const c0101Defaults: DeviceDefaultValues = {
  lighting: {
    u001: { ...LIGHTING_TWO_ZONE_UNIT },
    u003: { ...LIGHTING_TWO_ZONE_UNIT },
    u004: { ...LIGHTING_TWO_ZONE_UNIT },
  },
  cooler: {
    u001: { ...COOLER_U001 },
  },
  bench: {
    u001: { ...BENCH_U001 },
  },
  door: {
    u001: { ...DOOR_U001 },
  },
  people_counter: {
    u001: { ...PEOPLE_COUNTER_UNIT },
    u002: { ...PEOPLE_COUNTER_UNIT },
  },
};
