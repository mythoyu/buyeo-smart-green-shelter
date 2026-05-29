import { describe, expect, it } from 'vitest';

import {
  coerceIntegratedTimeString,
  decodeCoilWireToBoolean,
  isIntegratedTimeCommandKey,
  toModbusLogical,
  toModbusLogicalFromCommand,
  toModbusWire,
} from '../../src/shared/utils/deviceFieldMapper';

describe('deviceFieldMapper TIME_INTEGRATED', () => {
  it('SET_START_TIME_1은 통합 시간 commandKey', () => {
    expect(isIntegratedTimeCommandKey('SET_START_TIME_1')).toBe(true);
    expect(isIntegratedTimeCommandKey('SET_START_TIME_1_HOUR')).toBe(false);
  });

  it('coerceIntegratedTimeString HH:mm', () => {
    expect(coerceIntegratedTimeString('8:0')).toBe('08:00');
    expect(coerceIntegratedTimeString('08:00')).toBe('08:00');
    expect(coerceIntegratedTimeString(800)).toBe('08:00');
  });

  it('잘못된 시간은 null', () => {
    expect(coerceIntegratedTimeString(null)).toBeNull();
    expect(coerceIntegratedTimeString('invalid')).toBeNull();
  });
});

describe('deviceFieldMapper bench', () => {
  it('wire 1800 → −20°C', () => {
    expect(toModbusLogical('bench', 'cont_temp', 1800)).toBe(-20);
  });

  it('−20°C → wire 1800', () => {
    expect(toModbusWire('bench', 'cont_temp', -20)).toBe(1800);
  });

  it('GET_CONT_TEMP command', () => {
    expect(toModbusLogicalFromCommand('bench', 'GET_CONT_TEMP', 1800)).toBe(-20);
  });
});

describe('deviceFieldMapper 삼성 cooler', () => {
  it('MODE wire 1 → REST 0', () => {
    expect(toModbusLogical('cooler', 'mode', 1, { clientId: 'c0101' })).toBe(0);
  });

  it('MODE REST 0 → wire 1', () => {
    expect(toModbusWire('cooler', 'mode', 0, { clientId: 'c0101' })).toBe(1);
  });
});

describe('deviceFieldMapper cooler cur_temp', () => {
  it('GET_CUR_TEMP', () => {
    expect(toModbusLogicalFromCommand('cooler', 'GET_CUR_TEMP', 2200)).toBe(20);
  });
});

describe('deviceFieldMapper coil power/auto', () => {
  it('decodeCoilWireToBoolean', () => {
    expect(decodeCoilWireToBoolean(1)).toBe(true);
    expect(decodeCoilWireToBoolean(0)).toBe(false);
  });

  it('field power/auto wire → boolean', () => {
    expect(toModbusLogical('bench', 'power', 1)).toBe(true);
    expect(toModbusLogical('lighting', 'auto', 0)).toBe(false);
  });

  it('GET_POWER / SET_POWER command → boolean', () => {
    expect(toModbusLogicalFromCommand('bench', 'GET_POWER', 1)).toBe(true);
    expect(toModbusLogicalFromCommand('bench', 'GET_POWER', 0)).toBe(false);
    expect(toModbusLogicalFromCommand('door', 'SET_POWER', 1)).toBe(true);
    expect(toModbusLogicalFromCommand('cooler', 'SET_AUTO', 0)).toBe(false);
  });

  it('boolean logical → wire 1/0', () => {
    expect(toModbusWire('bench', 'power', 1, { fieldType: 'boolean' })).toBe(1);
    expect(toModbusWire('bench', 'power', 0, { fieldType: 'boolean' })).toBe(0);
    expect(toModbusWire('lighting', 'auto', 1)).toBe(1);
  });
});

describe('deviceFieldMapper exchanger', () => {
  it('GET_MODE — wire 그대로 논리', () => {
    expect(toModbusLogicalFromCommand('exchanger', 'GET_MODE', 2)).toBe(2);
  });

  it('GET_SPEED', () => {
    expect(toModbusLogicalFromCommand('exchanger', 'GET_SPEED', 3)).toBe(3);
  });

  it('mode 2 → wire 2', () => {
    expect(toModbusWire('exchanger', 'mode', 2)).toBe(2);
  });

  it('speed 4 → wire 4', () => {
    expect(toModbusWire('exchanger', 'speed', 4)).toBe(4);
  });
});
