import { MODBUS_FC } from '../../src/meta/hardware/ports';
import {
  executeGlobalBulkPollingForClient,
  getPollableGetActionNames,
  isPollableGetAction,
  unitResultKey,
} from '../../src/shared/utils/modbusCycleGlobalBulk';

describe('modbusCycleGlobalBulk', () => {
  it('excludes TIME_INTEGRATED and string action configs from pollable GET actions', () => {
    const mapping = {
      GET_POWER: { port: { functionCode: MODBUS_FC.RD_COILS, address: 100 }, length: 1 },
      GET_HOUR_MINUTE: 'TIME_INTEGRATED',
      GET_LABEL: 'some-string-config',
    };

    expect(isPollableGetAction('GET_POWER', mapping.GET_POWER)).toBe(true);
    expect(isPollableGetAction('GET_HOUR_MINUTE', mapping.GET_HOUR_MINUTE)).toBe(false);
    expect(isPollableGetAction('GET_LABEL', mapping.GET_LABEL)).toBe(false);
    expect(getPollableGetActionNames(mapping)).toEqual(['GET_POWER']);
  });

  it('unitResultKey uses deviceId/unitId', () => {
    expect(unitResultKey('d001', 'u001')).toBe('d001/u001');
  });

  it('executeGlobalBulkPollingForClient merges reads and distributes per unit', async () => {
    const devices = [
      { deviceId: 'dev1', unitId: 'u001', deviceType: 'cooler' },
      { deviceId: 'dev2', unitId: 'u001', deviceType: 'lighting' },
    ];

    let readCalls = 0;
    const { unitResults, transactionCount, groupCount } = await executeGlobalBulkPollingForClient(
      'c0101',
      devices,
      async (_fc, start, len) => {
        readCalls++;
        return { success: true, data: new Array(len).fill(start) };
      },
    );

    expect(readCalls).toBeGreaterThan(0);
    expect(transactionCount).toBe(readCalls);
    expect(groupCount).toBeGreaterThan(0);

    const u1 = unitResults.get(unitResultKey('dev1', 'u001'));
    const u2 = unitResults.get(unitResultKey('dev2', 'u001'));
    expect(u1?.globalBulk).toBe(true);
    expect(u2?.globalBulk).toBe(true);
    expect(u1?.successfulActions).toBeGreaterThan(0);
    expect(u2?.successfulActions).toBeGreaterThan(0);
  });
});
