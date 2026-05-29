import { describe, expect, it } from 'vitest';

import { bench } from '../../src/data/clientPortMappings/c0101/bench';
import {
  BENCH_HOLDING_ACTION_NAMES,
  extractBenchHoldingFromUnitMapping,
  mergeBenchUnitMappingWithDo,
} from '../../src/data/portMapping/benchHoldingMapping';
import { getPollableGetActionNames } from '../../src/shared/utils/modbusCycleGlobalBulk';

describe('benchHoldingMapping', () => {
  it('bench.ts 원본에서 홀딩 GET 명령을 추출한다', () => {
    const holding = extractBenchHoldingFromUnitMapping(bench.u001);
    expect(holding.GET_CONT_TEMP).toBeDefined();
    expect(holding.GET_CUR_TEMP).toBeDefined();
    expect(holding.SET_CONT_TEMP).toBeDefined();
    expect(holding.GET_AUTO).toBeUndefined();
  });

  it('DO 병합 후에도 폴링 가능한 온도 GET이 남는다', () => {
    const merged = mergeBenchUnitMappingWithDo(bench.u001, 'DO9');
    const pollable = getPollableGetActionNames(merged as Record<string, unknown>);

    for (const name of ['GET_CONT_TEMP', 'GET_CUR_TEMP', 'GET_TEMP_OFFSET', 'GET_TEMP_CHECK_INTERVAL']) {
      expect(pollable).toContain(name);
    }
    expect(pollable).toContain('GET_AUTO');
    expect(pollable).not.toContain('SET_CONT_TEMP');
  });

  it('BENCH_HOLDING_ACTION_NAMES는 SET 포함', () => {
    expect(BENCH_HOLDING_ACTION_NAMES.has('SET_CONT_TEMP')).toBe(true);
    expect(BENCH_HOLDING_ACTION_NAMES.has('GET_POWER')).toBe(false);
  });
});
