import { describe, expect, it } from 'vitest';

import { encodeLogicalToWire, wireKindToDeviceField } from '../../src/meta/protocols/fieldValueSpec';
import { toModbusWire } from '../../src/shared/utils/deviceFieldMapper';

describe('encodeLogicalToWire → deviceFieldMapper 위임', () => {
  it('bench cont_temp −20°C', () => {
    expect(encodeLogicalToWire('bench_cont_temp', -20)).toBe(1800);
    expect(toModbusWire('bench', 'cont_temp', -20)).toBe(1800);
  });

  it('exchanger mode', () => {
    expect(encodeLogicalToWire('exchanger_mode_1_2', 2)).toBe(2);
    expect(toModbusWire('exchanger', 'mode', 2)).toBe(2);
  });

  it('cooler summer_cont_temp 25°C', () => {
    expect(encodeLogicalToWire('summer_winter_tenths', 25)).toBe(250);
    expect(toModbusWire('cooler', 'summer_cont_temp', 25)).toBe(250);
  });

  it('deviceType·field override', () => {
    const { deviceType, field } = wireKindToDeviceField('exchanger_speed_1_4');
    expect(deviceType).toBe('exchanger');
    expect(field).toBe('speed');
    expect(encodeLogicalToWire('exchanger_speed_1_4', 3, { deviceType, field })).toBe(3);
  });
});
