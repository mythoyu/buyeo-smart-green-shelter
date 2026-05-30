import { describe, expect, it } from 'vitest';

import {
  evaluateUnitCommunicationFromPolling,
  isModbusPolledDeviceType,
} from '../../src/shared/utils/pollingCommunicationStatus';

describe('isModbusPolledDeviceType', () => {
  it('people_counter는 Modbus 폴링 대상이 아니다', () => {
    expect(isModbusPolledDeviceType('people_counter')).toBe(false);
  });

  it('Modbus 장비 타입은 폴링 대상이다', () => {
    expect(isModbusPolledDeviceType('lighting')).toBe(true);
    expect(isModbusPolledDeviceType('cooler')).toBe(true);
  });
});

describe('evaluateUnitCommunicationFromPolling', () => {
  it('결과 없이 success=false면 error', () => {
    expect(evaluateUnitCommunicationFromPolling('people_counter', { success: false })).toBe('error');
  });
});
