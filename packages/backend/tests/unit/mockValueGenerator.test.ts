import { MODBUS_FC } from '../../src/meta/hardware/ports';
import {
  buildReverseIndex,
  generateWireValuesForAddressRange,
  makeLegacyReverseIndexKey,
  type ReverseIndexSpec,
} from '../../src/meta/protocols/mockValueGenerator';

describe('mockValueGenerator bulk range', () => {
  const originalDefaults = process.env.MODBUS_MOCK_USE_DEFAULTS;

  afterEach(() => {
    if (originalDefaults === undefined) {
      delete process.env.MODBUS_MOCK_USE_DEFAULTS;
    } else {
      process.env.MODBUS_MOCK_USE_DEFAULTS = originalDefaults;
    }
  });

  it('generates per-address wire values (not one spec repeated)', async () => {
    process.env.MODBUS_MOCK_USE_DEFAULTS = 'true';
    const index = new Map<string, ReverseIndexSpec>();
    const hour: ReverseIndexSpec = {
      functionCode: MODBUS_FC.RD_HLD_REG,
      address: 41,
      field: 'start_time_1_hour',
      type: 'number',
      deviceType: 'lighting',
      clientId: 'c0101',
      unitId: 'u001',
    };
    const minute: ReverseIndexSpec = {
      functionCode: MODBUS_FC.RD_HLD_REG,
      address: 57,
      field: 'start_time_1_minute',
      type: 'number',
      deviceType: 'lighting',
      clientId: 'c0101',
      unitId: 'u001',
    };
    for (const spec of [hour, minute]) {
      index.set(makeLegacyReverseIndexKey(spec.functionCode, spec.address), spec);
    }

    const values = await generateWireValuesForAddressRange(index, MODBUS_FC.RD_HLD_REG, 41, 17);

    expect(values[0]).toBe(6);
    expect(values[57 - 41]).toBe(30);
    expect(values[0]).not.toBe(values[57 - 41]);
  });

  it('built index: cooler mode and summer temp differ in same FC3 span', async () => {
    process.env.MODBUS_MOCK_USE_DEFAULTS = 'true';
    const index = buildReverseIndex();
    const modeAddr = 115;
    const summerAddr = 125;
    const start = Math.min(modeAddr, summerAddr);
    const len = summerAddr - start + 1;
    const values = await generateWireValuesForAddressRange(
      index,
      MODBUS_FC.RD_HLD_REG,
      start,
      len,
    );
    const modeWire = values[modeAddr - start];
    const summerWire = values[summerAddr - start];
    expect(modeWire).toBeLessThanOrEqual(3);
    expect(summerWire).toBeGreaterThanOrEqual(160);
    expect(modeWire).not.toBe(summerWire);
  });
});
