import { MODBUS_FC } from '../../src/meta/hardware/ports';
import { ModbusRegisterReadRef } from '../../src/shared/utils/modbusBulkRead';
import { ModbusCycleProfileCache, warmCycleProfileCache } from '../../src/shared/utils/modbusCycleProfileCache';
import { buildBulkResultsFromCycleCache } from '../../src/shared/utils/modbusCyclePolling';
import {
  dedupeRefsByRegister,
  ModbusCycleRegisterCache,
  registerCacheKey,
  warmCycleRemainingRegisterCache,
} from '../../src/shared/utils/modbusCycleRemainingBulk';
import { clearHwPortGetIndexCache } from '../../src/shared/utils/modbusHwPortIndex';
import { clearModbusBulkProfileCache } from '../../src/shared/utils/modbusBulkProfiles';

describe('modbusCycleRemainingBulk', () => {
  beforeEach(() => {
    clearHwPortGetIndexCache();
    clearModbusBulkProfileCache();
  });

  it('dedupeRefsByRegister keeps one ref per fc+address', () => {
    const refs: ModbusRegisterReadRef[] = [
      {
        key: 'u1:GET_X',
        port: 'GET_X',
        command: 'GET_X',
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 500,
        length: 1,
      },
      {
        key: 'u2:GET_Y',
        port: 'GET_Y',
        command: 'GET_Y',
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 500,
        length: 1,
      },
    ];

    const deduped = dedupeRefsByRegister(refs);
    expect(deduped).toHaveLength(1);
    expect(registerCacheKey(deduped[0].functionCode, deduped[0].address)).toBe('3:500');
  });

  it('warmCycleRemainingRegisterCache merges adjacent registers across units into one transaction', async () => {
    const refs: ModbusRegisterReadRef[] = [
      {
        key: 'GET_A',
        port: 'GET_A',
        command: 'GET_A',
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 900,
        length: 1,
      },
      {
        key: 'GET_B',
        port: 'GET_B',
        command: 'GET_B',
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 905,
        length: 1,
      },
    ];

    const profileCache = new ModbusCycleProfileCache();
    await warmCycleProfileCache(refs, async () => ({ success: true, data: [] }), profileCache);

    let readCount = 0;
    const { cache, transactionCount, registerCount } = await warmCycleRemainingRegisterCache(
      refs,
      profileCache,
      async (_fc, start, len) => {
        readCount++;
        const data = new Array(len).fill(0);
        data[0] = 11;
        data[5] = 22;
        return { success: true, data };
      },
    );

    expect(registerCount).toBe(2);
    expect(transactionCount).toBe(1);
    expect(readCount).toBe(1);
    expect(cache.get({ functionCode: MODBUS_FC.RD_HLD_REG, address: 900 })).toEqual([11]);
    expect(cache.get({ functionCode: MODBUS_FC.RD_HLD_REG, address: 905 })).toEqual([22]);
  });

  it('buildBulkResultsFromCycleCache resolves from register cache without profile', () => {
    const registerCache = new ModbusCycleRegisterCache();
    registerCache.setRegister(MODBUS_FC.RD_HLD_REG, 900, [99]);

    const mapping = {
      GET_A: { functionCode: MODBUS_FC.RD_HLD_REG, address: 900, length: 1 },
    };
    const profileCache = new ModbusCycleProfileCache();
    const results = buildBulkResultsFromCycleCache(mapping, ['GET_A'], profileCache, registerCache);

    expect(results.get('GET_A')?.success).toBe(true);
    expect(results.get('GET_A')?.data).toEqual([99]);
  });
});
