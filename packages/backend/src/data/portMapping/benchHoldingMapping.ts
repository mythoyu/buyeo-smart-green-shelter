import type { CommandConfig } from '../clientPortMappings/types';

import { buildDoUnitMapping } from './buildDoUnitMapping';
import type { DoPortKey } from './doPortTypes';

/** BENCH 홀딩 레지스터 — DO9 접점과 별도, 폴링 시 유지해야 함 */
export const BENCH_HOLDING_ACTION_NAMES = new Set([
  'GET_CUR_TEMP',
  'GET_CUR_TEMP_2',
  'GET_CONT_TEMP',
  'SET_CONT_TEMP',
  'GET_CONT_TEMP_2',
  'SET_CONT_TEMP_2',
  'GET_TEMP_OFFSET',
  'SET_TEMP_OFFSET',
  'GET_TEMP_CHECK_INTERVAL',
  'SET_TEMP_CHECK_INTERVAL',
]);

export type UnitCommandMapping = Record<string, CommandConfig | 'TIME_INTEGRATED'>;

/** clientPortMappings bench.ts 에서 홀딩(온도) 명령만 추출 */
export function extractBenchHoldingFromUnitMapping(
  unitMapping: Record<string, unknown> | undefined,
): UnitCommandMapping {
  if (!unitMapping) {
    return {};
  }

  const holding: UnitCommandMapping = {};
  for (const [action, config] of Object.entries(unitMapping)) {
    if (BENCH_HOLDING_ACTION_NAMES.has(action)) {
      holding[action] = config as CommandConfig | 'TIME_INTEGRATED';
    }
  }
  return holding;
}

/** DO9 접점·스케줄 + BENCH 홀딩 온도 명령 병합 (PortMappingService DO 할당용) */
export function mergeBenchUnitMappingWithDo(
  baseUnitMapping: Record<string, unknown> | undefined,
  doPort: DoPortKey,
): UnitCommandMapping {
  return {
    ...extractBenchHoldingFromUnitMapping(baseUnitMapping),
    ...buildDoUnitMapping('bench', doPort),
  };
}
