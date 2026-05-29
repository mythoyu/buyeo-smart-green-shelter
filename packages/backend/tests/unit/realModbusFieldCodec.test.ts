import { describe, expect, it } from 'vitest';

import {
  convertLogicalToModbusWire,
  convertModbusWireToLogical,
} from '../../src/core/services/realModbusFieldCodec';
import { toModbusWire } from '../../src/shared/utils/deviceFieldMapper';
import type { ReverseIndexSpec } from '../../src/meta/protocols/modbusReverseIndex';

const benchContTempSpec: ReverseIndexSpec = {
  functionCode: 6,
  address: 16,
  deviceType: 'bench',
  field: 'cont_temp',
  clientId: 'c0101',
};

describe('realModbusFieldCodec (Real read = wire only)', () => {
  it('읽기는 wire 그대로', () => {
    expect(convertModbusWireToLogical(1800, benchContTempSpec, 'c0101')).toBe(1800);
  });
});

describe('realModbusFieldCodec 쓰기', () => {
  it('논리 −20 → wire 1800 (mapper 위임)', () => {
    expect(convertLogicalToModbusWire(-20, benchContTempSpec, 'c0101')).toBe(1800);
    expect(toModbusWire('bench', 'cont_temp', -20)).toBe(1800);
  });

  it('valueIsRawRegister면 wire 그대로', () => {
    expect(
      convertLogicalToModbusWire(1800, benchContTempSpec, 'c0101', { valueIsRawRegister: true }),
    ).toBe(1800);
  });
});
