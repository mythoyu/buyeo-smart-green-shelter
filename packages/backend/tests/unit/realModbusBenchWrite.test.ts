import { describe, expect, it } from 'vitest';

import { RealModbusService } from '../../src/core/services/RealModbusService';
import { encodeFieldWire } from '../../src/shared/utils/fieldWireCodec';
import type { ReverseIndexSpec } from '../../src/meta/protocols/modbusReverseIndex';
import { MODBUS_FC } from '../../src/meta/hardware/ports';

const benchContTempSpec: ReverseIndexSpec = {
  functionCode: MODBUS_FC.WR_SNGL_REG,
  address: 16,
  deviceType: 'bench',
  field: 'cont_temp',
  clientId: 'c0101',
};

function resolveWriteWire(svc: RealModbusService, userValue: number, valueIsRawRegister?: boolean): number {
  const resolve = (
    svc as unknown as {
      resolveWriteWireValue: (
        v: number,
        s?: ReverseIndexSpec,
        c?: string,
        raw?: boolean,
      ) => number;
    }
  ).resolveWriteWireValue;
  return resolve.call(svc, userValue, benchContTempSpec, 'c0101', valueIsRawRegister);
}

describe('RealModbusService bench 쓰기 wire 해석', () => {
  it('valueIsRawRegister=true이면 역변환 없이 wire(1800)를 그대로 쓴다', () => {
    const svc = new RealModbusService();
    expect(resolveWriteWire(svc, 1800, true)).toBe(1800);
  });

  it('valueIsRawRegister=false이면 논리 °C(-20)를 wire(1800)로 역변환한다', () => {
    const svc = new RealModbusService();
    expect(resolveWriteWire(svc, -20, false)).toBe(1800);
    expect(encodeFieldWire('bench', 'cont_temp', -20)).toBe(1800);
  });

  it('valueIsRawRegister 없이 wire(1800)를 논리로 넣으면 이중 환산(20000) 대신 codec 클램프 — Control은 °C 사용', () => {
    const svc = new RealModbusService();
    expect(resolveWriteWire(svc, 1800, false)).toBe(2800);
    expect(encodeFieldWire('bench', 'cont_temp', -20)).toBe(1800);
  });
});
