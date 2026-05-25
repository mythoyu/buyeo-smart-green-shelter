import { MODBUS_FC } from '../../src/meta/hardware/ports';
import { clearModbusBulkProfileCache, refMatchesProfile, PROFILE_DO_COIL_MODE } from '../../src/shared/utils/modbusBulkProfiles';
import { clearHwPortGetIndexCache, lookupHwPortGet } from '../../src/shared/utils/modbusHwPortIndex';
import {
  enrichPollingRefsWithHwPort,
  executeFunctionalBulkReads,
  planFunctionalBulkReads,
} from '../../src/shared/utils/modbusFunctionalBulk';
import { ModbusRegisterReadRef } from '../../src/shared/utils/modbusBulkRead';
import {
  ModbusCycleProfileCache,
  warmCycleProfileCache,
} from '../../src/shared/utils/modbusCycleProfileCache';

describe('modbusHwPortIndex', () => {
  beforeEach(() => {
    clearHwPortGetIndexCache();
    clearModbusBulkProfileCache();
  });

  it('resolves DO5 AUTO get address', () => {
    const lookup = lookupHwPortGet(MODBUS_FC.RD_COILS, 355);
    expect(lookup).toEqual({ hwPort: 'DO5', hwCommand: 'AUTO' });
  });

  it('resolves DO5 SCHED1_START_HOUR', () => {
    const lookup = lookupHwPortGet(MODBUS_FC.RD_HLD_REG, 45);
    expect(lookup?.hwPort).toBe('DO5');
    expect(lookup?.hwCommand).toBe('SCHED1_START_HOUR');
  });
});

describe('modbusFunctionalBulk planning', () => {
  beforeEach(() => {
    clearHwPortGetIndexCache();
    clearModbusBulkProfileCache();
  });

  it('groups DO5 AUTO and POWER into coil profiles', () => {
    const refs: ModbusRegisterReadRef[] = [
      {
        key: 'GET_AUTO',
        port: 'GET_AUTO',
        command: 'GET_AUTO',
        functionCode: MODBUS_FC.RD_COILS,
        address: 355,
        length: 1,
      },
      {
        key: 'GET_POWER',
        port: 'GET_POWER',
        command: 'GET_POWER',
        functionCode: MODBUS_FC.RD_COILS,
        address: 824,
        length: 1,
      },
    ];

    const enriched = enrichPollingRefsWithHwPort(refs);
    const { plans, remaining } = planFunctionalBulkReads(enriched);

    expect(remaining).toHaveLength(0);
    expect(plans).toHaveLength(2);
    const profileIds = plans.map(p => p.profile.id).sort();
    expect(profileIds).toEqual(['DO_COIL_MODE', 'DO_COIL_STATUS']);
  });

  it('groups DO5 schedule registers into one SCHED profile', () => {
    const refs: ModbusRegisterReadRef[] = [
      {
        key: 'GET_START_TIME_1_HOUR',
        port: 'x',
        command: 'x',
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 45,
        length: 1,
      },
      {
        key: 'GET_START_TIME_1_MINUTE',
        port: 'x',
        command: 'x',
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 61,
        length: 1,
      },
      {
        key: 'GET_END_TIME_1_HOUR',
        port: 'x',
        command: 'x',
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 77,
        length: 1,
      },
      {
        key: 'GET_END_TIME_1_MINUTE',
        port: 'x',
        command: 'x',
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 93,
        length: 1,
      },
    ];

    const enriched = enrichPollingRefsWithHwPort(refs);
    const { plans, remaining } = planFunctionalBulkReads(enriched);

    expect(remaining).toHaveLength(0);
    expect(plans).toHaveLength(1);
    expect(plans[0].profile.id).toBe('DO5_SCHED_HR');
    expect(plans[0].profile.startAddress).toBe(45);
    expect(plans[0].profile.length).toBe(49);
    expect(plans[0].members).toHaveLength(4);
  });

  it('refMatchesProfile respects address window', () => {
    expect(
      refMatchesProfile(
        { functionCode: MODBUS_FC.RD_COILS, address: 355, hwPort: 'DO5' },
        PROFILE_DO_COIL_MODE,
      ),
    ).toBe(true);
    expect(
      refMatchesProfile(
        { functionCode: MODBUS_FC.RD_COILS, address: 824, hwPort: 'DO5' },
        PROFILE_DO_COIL_MODE,
      ),
    ).toBe(false);
  });
});

describe('executeFunctionalBulkReads', () => {
  beforeEach(() => {
    clearHwPortGetIndexCache();
    clearModbusBulkProfileCache();
  });

  it('uses one transaction per profile and slices offsets', async () => {
    const reads: Array<{ fc: number; start: number; len: number }> = [];

    const refs: ModbusRegisterReadRef[] = [
      {
        key: 'GET_AUTO',
        port: 'GET_AUTO',
        command: 'GET_AUTO',
        functionCode: MODBUS_FC.RD_COILS,
        address: 355,
        length: 1,
      },
      {
        key: 'GET_POWER',
        port: 'GET_POWER',
        command: 'GET_POWER',
        functionCode: MODBUS_FC.RD_COILS,
        address: 824,
        length: 1,
      },
    ];

    const { results, transactionCount, remainingRefs } = await executeFunctionalBulkReads(
      refs,
      async (fc, start, len) => {
        reads.push({ fc, start, len });
        const data = new Array(len).fill(0);
        if (fc === MODBUS_FC.RD_COILS && start === 351) {
          data[355 - 351] = 1;
        }
        if (fc === MODBUS_FC.RD_COILS && start === 820) {
          data[824 - 820] = 1;
        }
        return { success: true, data };
      },
    );

    expect(transactionCount).toBe(2);
    expect(remainingRefs).toHaveLength(0);
    expect(reads).toEqual([
      { fc: MODBUS_FC.RD_COILS, start: 351, len: 16 },
      { fc: MODBUS_FC.RD_COILS, start: 820, len: 16 },
    ]);
    expect(results.get('GET_AUTO')).toEqual([1]);
    expect(results.get('GET_POWER')).toEqual([1]);
  });

  it('uses cycle cache without additional profile transactions', async () => {
    const reads: Array<{ fc: number; start: number; len: number }> = [];

    const refs: ModbusRegisterReadRef[] = [
      {
        key: 'GET_AUTO',
        port: 'GET_AUTO',
        command: 'GET_AUTO',
        functionCode: MODBUS_FC.RD_COILS,
        address: 355,
        length: 1,
      },
      {
        key: 'GET_POWER',
        port: 'GET_POWER',
        command: 'GET_POWER',
        functionCode: MODBUS_FC.RD_COILS,
        address: 824,
        length: 1,
      },
    ];

    const cache = new ModbusCycleProfileCache();

    const warmCount = await warmCycleProfileCache(
      refs,
      async (fc, start, len) => {
        reads.push({ fc, start, len });
        const data = new Array(len).fill(0);
        if (start === 351) {
          data[4] = 7;
        }
        if (start === 820) {
          data[4] = 9;
        }
        return { success: true, data };
      },
      cache,
    );

    expect(warmCount).toBe(2);
    expect(reads).toHaveLength(2);

    const { results, transactionCount } = await executeFunctionalBulkReads(
      refs,
      async () => {
        throw new Error('should not read when cache is warm');
      },
      { cycleProfileCache: cache },
    );

    expect(transactionCount).toBe(0);
    expect(results.get('GET_AUTO')).toEqual([7]);
    expect(results.get('GET_POWER')).toEqual([9]);
  });
});
