import { describe, expect, it } from 'vitest';

import { RealModbusService } from '../../src/core/services/RealModbusService';
import type { ReverseIndexSpec } from '../../src/meta/protocols/mockValueGenerator';

describe('RealModbusService 삼성 cooler MODE 변환', () => {
  const baseSpec: ReverseIndexSpec = {
    functionCode: 3,
    address: 1,
    deviceType: 'cooler',
    field: 'mode',
    clientId: 'c0111', // 역색인이 잘못 덮인 경우를 시뮬레이션
  };

  it('requestClientId가 c0101이면 spec.clientId와 무관하게 삼성 맵을 적용한다', () => {
    const svc = new RealModbusService();
    const apply = (svc as unknown as { applyFieldConversion: (r: number, s?: ReverseIndexSpec, c?: string) => number })
      .applyFieldConversion;

    // 삼성 Modbus 냉방(1) → REST 계약 냉방(0)
    expect(apply(1, baseSpec, 'c0101')).toBe(0);
    // 삼성 Modbus 자동(0) → REST 자동(3)
    expect(apply(0, baseSpec, 'c0101')).toBe(3);
  });

  it('requestClientId 없이 spec만 c0101이면 기존처럼 삼성 맵 적용', () => {
    const svc = new RealModbusService();
    const apply = (svc as unknown as { applyFieldConversion: (r: number, s?: ReverseIndexSpec, c?: string) => number })
      .applyFieldConversion;

    const spec: ReverseIndexSpec = { ...baseSpec, clientId: 'c0101' };
    expect(apply(1, spec, undefined)).toBe(0);
  });

  it('c0111만 있고 request에도 삼성 ID가 없으면 원시 값 유지', () => {
    const svc = new RealModbusService();
    const apply = (svc as unknown as { applyFieldConversion: (r: number, s?: ReverseIndexSpec, c?: string) => number })
      .applyFieldConversion;

    expect(apply(1, baseSpec, undefined)).toBe(1);
  });
});
