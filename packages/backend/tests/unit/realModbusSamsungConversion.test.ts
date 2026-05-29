import { describe, expect, it } from 'vitest';

import { toModbusLogical } from '../../src/shared/utils/deviceFieldMapper';

describe('deviceFieldMapper 삼성 cooler MODE (구 realModbusSamsungConversion)', () => {
  it('requestClientId c0101이면 spec.clientId와 무관하게 삼성 맵 적용', () => {
    expect(toModbusLogical('cooler', 'mode', 1, { clientId: 'c0101' })).toBe(0);
    expect(toModbusLogical('cooler', 'mode', 0, { clientId: 'c0101' })).toBe(3);
  });

  it('c0111 clientId면 raw 유지', () => {
    expect(toModbusLogical('cooler', 'mode', 1, { clientId: 'c0111' })).toBe(1);
  });
});
