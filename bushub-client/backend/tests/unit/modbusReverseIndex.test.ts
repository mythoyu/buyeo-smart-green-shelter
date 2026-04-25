import { describe, expect, it } from 'vitest';

import { MODBUS_FC } from '../../src/meta/hardware/ports';
import {
  buildReverseIndex,
  makeLegacyReverseIndexKey,
  makeReverseIndexKey,
  resolveReverseIndexSpec,
  type ReverseIndexSpec,
} from '../../src/meta/protocols/mockValueGenerator';

describe('resolveReverseIndexSpec', () => {
  it('동일 (fc,address)에 대해 clientId별로 서로 다른 스펙을 반환한다', () => {
    const fc = 3;
    const addr = 40001;
    const specA: ReverseIndexSpec = {
      functionCode: fc,
      address: addr,
      clientId: 'c0101',
      deviceType: 'cooler',
      field: 'mode',
    };
    const specB: ReverseIndexSpec = {
      functionCode: fc,
      address: addr,
      clientId: 'c0111',
      deviceType: 'cooler',
      field: 'mode',
    };
    const index = new Map<string, ReverseIndexSpec>([
      [makeReverseIndexKey('c0101', fc, addr), specA],
      [makeReverseIndexKey('c0111', fc, addr), specB],
    ]);

    expect(resolveReverseIndexSpec(index, 'c0101', fc, addr)).toBe(specA);
    expect(resolveReverseIndexSpec(index, 'c0111', fc, addr)).toBe(specB);
  });

  it('clientId 없이 조회 시 레거시 키가 있으면 그 엔트리를 반환한다', () => {
    const fc = 4;
    const addr = 1;
    const legacyKey = makeLegacyReverseIndexKey(fc, addr);
    const spec: ReverseIndexSpec = {
      functionCode: fc,
      address: addr,
      clientId: 'only',
      deviceType: 'cooler',
      field: 'power',
    };
    const index = new Map<string, ReverseIndexSpec>([[legacyKey, spec]]);

    expect(resolveReverseIndexSpec(index, undefined, fc, addr)).toBe(spec);
  });

  it('복합 키가 없고 레거시도 없으면 undefined', () => {
    const index = new Map<string, ReverseIndexSpec>();
    expect(resolveReverseIndexSpec(index, 'c0101', 3, 99999)).toBeUndefined();
  });
});

describe('buildReverseIndex', () => {
  it('cooler MODE 읽기(동일 fc·address)에 c0101·c0103 복합 키가 각각 존재한다', () => {
    const index = buildReverseIndex();
    const fc = MODBUS_FC.RD_HLD_REG;
    const addr = 115; // HW_PORTS.COOLER.MODE.get (삼성·LG 공통 주소)
    expect(index.get(makeReverseIndexKey('c0101', fc, addr))?.clientId).toBe('c0101');
    expect(index.get(makeReverseIndexKey('c0103', fc, addr))?.clientId).toBe('c0103');
  });
});
