import { describe, expect, it } from 'vitest';

import {
  decodeBenchGetCommand,
  decodeBenchHwCommand,
  encodeFieldWire,
  resolveBenchPortWriteWire,
  tryDecodeBenchFieldWire,
  tryEncodeBenchFieldWire,
} from '../../src/shared/utils/fieldWireCodec';

describe('fieldWireCodec bench', () => {
  it('cont_temp 논리 -20°C ↔ wire 1800', () => {
    expect(tryEncodeBenchFieldWire('cont_temp', -20)).toBe(1800);
    expect(tryDecodeBenchFieldWire('cont_temp', 1800)).toBe(-20);
  });

  it('temp_offset 1°C ↔ wire 10', () => {
    expect(tryEncodeBenchFieldWire('temp_offset', 1)).toBe(10);
    expect(tryDecodeBenchFieldWire('temp_offset', 10)).toBe(1);
  });

  it('encodeFieldWire는 bench 외는 입력 그대로', () => {
    expect(encodeFieldWire('cooler', 'mode', 3)).toBe(3);
  });

  it('decodeBenchGetCommand GET_CONT_TEMP', () => {
    expect(decodeBenchGetCommand('GET_CONT_TEMP', 1800)).toBe(-20);
  });

  it('decodeBenchHwCommand CONT_TEMP_2', () => {
    expect(decodeBenchHwCommand('CONT_TEMP', 1800)).toBe(-20);
  });

  it('resolveBenchPortWriteWire', () => {
    const r = resolveBenchPortWriteWire('CONT_TEMP', -20);
    expect(r?.wire).toBe(1800);
    expect(r?.valueIsRawRegister).toBe(true);
  });
});
