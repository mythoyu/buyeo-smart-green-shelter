import { MODBUS_FC } from '../../src/meta/hardware/ports';
import { ModbusCycleProfileCache, warmCycleProfileCache } from '../../src/shared/utils/modbusCycleProfileCache';
import { buildBulkResultsFromCycleCache } from '../../src/shared/utils/modbusCyclePolling';
import { ModbusRegisterReadRef } from '../../src/shared/utils/modbusBulkRead';
import { clearHwPortGetIndexCache } from '../../src/shared/utils/modbusHwPortIndex';
import { clearModbusBulkProfileCache } from '../../src/shared/utils/modbusBulkProfiles';

describe('modbusCyclePolling', () => {
  beforeEach(() => {
    clearHwPortGetIndexCache();
    clearModbusBulkProfileCache();
  });

  it('buildBulkResultsFromCycleCache resolves without Modbus', async () => {
    const refs: ModbusRegisterReadRef[] = [
      {
        key: 'GET_AUTO',
        port: 'GET_AUTO',
        command: 'GET_AUTO',
        functionCode: MODBUS_FC.RD_COILS,
        address: 355,
        length: 1,
      },
    ];

    const cache = new ModbusCycleProfileCache();
    await warmCycleProfileCache(
      refs,
      async (fc, start, len) => {
        const data = new Array(len).fill(0);
        if (start === 351) {
          data[4] = 42;
        }
        return { success: true, data };
      },
      cache,
    );

    const mapping = { GET_AUTO: { port: { functionCode: MODBUS_FC.RD_COILS, address: 355 }, length: 1 } };
    const results = buildBulkResultsFromCycleCache(mapping, ['GET_AUTO'], cache);

    expect(results.get('GET_AUTO')?.success).toBe(true);
    expect(results.get('GET_AUTO')?.data).toEqual([42]);
  });
});
