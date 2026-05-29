import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import hardwareRoutes from '../../src/api/v1/routes/hardware';
import type { ModbusCommand } from '../../src/core/services/ModbusCommandQueue';
import { HW_PORTS, MODBUS_FC } from '../../src/meta/hardware/ports';

/** BENCH 홀딩 레지스터 in-memory (하드웨어 API 통합 테스트용) */
const benchRegisters = new Map<number, number>();

const BENCH_ADDR = {
  CUR_TEMP: HW_PORTS.BENCH.CUR_TEMP.get!.address,
  CUR_TEMP_2: HW_PORTS.BENCH.CUR_TEMP_2.get!.address,
  CONT_TEMP: HW_PORTS.BENCH.CONT_TEMP.get!.address,
  CONT_TEMP_2: HW_PORTS.BENCH.CONT_TEMP_2.get!.address,
  TEMP_OFFSET: HW_PORTS.BENCH.TEMP_OFFSET.get!.address,
  TEMP_CHECK_INTERVAL: HW_PORTS.BENCH.TEMP_CHECK_INTERVAL.get!.address,
} as const;

function seedBenchRegisters(): void {
  benchRegisters.clear();
  benchRegisters.set(BENCH_ADDR.CUR_TEMP, 2000);
  benchRegisters.set(BENCH_ADDR.CUR_TEMP_2, 2000);
  benchRegisters.set(BENCH_ADDR.CONT_TEMP, 2000);
  benchRegisters.set(BENCH_ADDR.CONT_TEMP_2, 2000);
  benchRegisters.set(BENCH_ADDR.TEMP_OFFSET, 0);
  benchRegisters.set(BENCH_ADDR.TEMP_CHECK_INTERVAL, 0);
}

const mockExecuteCommand = vi.fn(async (cmd: ModbusCommand) => {
  if (cmd.type === 'write') {
    benchRegisters.set(cmd.address, Number(cmd.lengthOrValue));
    return { success: true, data: [Number(cmd.lengthOrValue)] };
  }
  if (cmd.type === 'read') {
    const raw = benchRegisters.get(cmd.address);
    if (raw === undefined) {
      return { success: false, error: 'missing register' };
    }
    return { success: true, data: [raw] };
  }
  return { success: false, error: 'unsupported command type' };
});

const mockIsPollingActive = vi.fn(() => false);

vi.mock('../../src/core/container/ServiceContainer', () => ({
  ServiceContainer: {
    getInstance: vi.fn(() => ({
      getUnifiedModbusService: () => ({
        executeCommand: mockExecuteCommand,
      }),
      getUnifiedModbusPollerService: () => ({
        isPollingActive: mockIsPollingActive,
      }),
    })),
  },
}));

vi.mock('../../src/shared/utils/benchModbus', async importOriginal => {
  const mod = await importOriginal<typeof import('../../src/shared/utils/benchModbus')>();
  return {
    ...mod,
    delayMs: vi.fn(async () => undefined),
  };
});

const BENCH_PATH = '/api/v1/internal/hardware/system/bench';

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(hardwareRoutes, { prefix: '/api/v1/internal' });
  await app.ready();
  return app;
}

describe('POST /api/v1/internal/hardware/system/bench (통합)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    seedBenchRegisters();
    mockExecuteCommand.mockClear();
    mockIsPollingActive.mockReturnValue(false);
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('set cont_temp -20°C → wire 1800 기록, read_after_set raw/value 일치', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BENCH_PATH,
      payload: { action: 'set', cont_temp: -20 },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data?: {
        written: Array<{ command: string; register: number }>;
        read_after_set?: {
          cont_temp: { raw: number; value: number };
        };
      };
    };

    expect(body.success).toBe(true);
    expect(body.data?.written).toEqual([{ command: 'CONT_TEMP', register: 1800 }]);
    expect(body.data?.read_after_set?.cont_temp).toEqual({ raw: 1800, value: -20 });
    expect(benchRegisters.get(BENCH_ADDR.CONT_TEMP)).toBe(1800);

    const contTempWrite = mockExecuteCommand.mock.calls.find(
      ([cmd]) =>
        cmd.type === 'write' &&
        cmd.functionCode === MODBUS_FC.WR_SNGL_REG &&
        cmd.address === BENCH_ADDR.CONT_TEMP,
    )?.[0] as ModbusCommand | undefined;

    expect(contTempWrite).toBeDefined();
    expect(contTempWrite!.lengthOrValue).toBe(1800);
    expect(contTempWrite!.valueIsRawRegister).toBe(true);
  });

  it('read action — cont_temp raw 1800 / value -20°C', async () => {
    benchRegisters.set(BENCH_ADDR.CONT_TEMP, 1800);

    const res = await app.inject({
      method: 'POST',
      url: BENCH_PATH,
      payload: { action: 'read' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data?: { cont_temp: { raw: number; value: number } };
    };
    expect(body.data?.cont_temp).toEqual({ raw: 1800, value: -20 });
  });

  it('폴링 활성 시 409', async () => {
    mockIsPollingActive.mockReturnValue(true);

    const res = await app.inject({
      method: 'POST',
      url: BENCH_PATH,
      payload: { action: 'set', cont_temp: -20 },
    });

    expect(res.statusCode).toBe(409);
    expect(mockExecuteCommand).not.toHaveBeenCalled();
  });
});
