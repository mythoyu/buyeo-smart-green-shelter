import { IUnifiedModbusCommunication } from '../../core/interfaces/IModbusCommunication';
import { ModbusCommand } from '../../core/services/ModbusCommandQueue';
import { HW_PORTS } from '../../meta/hardware/ports';

import { BENCH_READ_COMMANDS, BenchReadCommand } from './benchModbus';
import {
  bulkResultsToPortCommandMap,
  executeBulkRegisterReads,
  ModbusBulkReadExecutor,
  ModbusRegisterReadRef,
} from './modbusBulkRead';
import { buildHardwareReadPlan, resolveHardwareGetSpec } from './hardwarePortRead';

const SEASONAL_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

const DDC_TIME_READ_COMMANDS = ['YEAR', 'MONTH', 'DAY', 'DOW', 'HOUR', 'MIN', 'SECOND'] as const;

export type HardwareQueuedModbusCommand = Pick<
  ModbusCommand,
  'type' | 'functionCode' | 'address' | 'lengthOrValue' | 'priority' | 'valueIsRawRegister' | 'skipPersistence'
>;

/** 하드웨어 API용 Modbus 접근 (중앙 큐 경유) */
export type HardwareModbusReader = {
  executeQueuedCommand: (
    partial: HardwareQueuedModbusCommand,
  ) => Promise<{ success?: boolean; data?: unknown; error?: string }>;
};

export function createHardwareModbusReader(
  unifiedModbus: IUnifiedModbusCommunication,
): HardwareModbusReader {
  return {
    executeQueuedCommand: async (partial) => {
      const command: ModbusCommand = {
        id: `hw_${partial.type}_${partial.functionCode}_${partial.address}_${Date.now()}`,
        type: partial.type,
        unitId: '1',
        functionCode: partial.functionCode,
        address: partial.address,
        lengthOrValue: partial.lengthOrValue,
        priority: partial.priority ?? (partial.type === 'write' ? 'high' : 'high'),
        timestamp: new Date(),
        resolve: () => undefined,
        reject: () => undefined,
        skipPersistence: partial.skipPersistence ?? partial.type === 'read',
        ...(partial.valueIsRawRegister !== undefined ? { valueIsRawRegister: partial.valueIsRawRegister } : {}),
      };

      const result = await unifiedModbus.executeCommand(command);
      return {
        success: result?.success,
        data: result?.data,
        error: result?.error,
      };
    },
  };
}

function normalizeReadData(data: unknown): number[] | undefined {
  if (!Array.isArray(data)) {
    if (data === undefined || data === null) {
      return undefined;
    }
    return [typeof data === 'boolean' ? (data ? 1 : 0) : Number(data)];
  }
  return data.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : Number(v)));
}

function createModbusBulkExecutor(reader: HardwareModbusReader): ModbusBulkReadExecutor {
  return async (functionCode, startAddress, length) => {
    const result = await reader.executeQueuedCommand({
      type: 'read',
      functionCode,
      address: startAddress,
      lengthOrValue: length,
      priority: 'high',
      skipPersistence: true,
    });

    const normalized = normalizeReadData(result?.data);
    const response: { success: boolean; data?: number[]; error?: string } = {
      success: !!result?.success,
    };
    if (normalized !== undefined) {
      response.data = normalized;
    }
    if (result?.error) {
      response.error = result.error;
    }
    return response;
  };
}

export async function executeHardwareModbusBulkRead(
  modbusReader: HardwareModbusReader,
  refs: ModbusRegisterReadRef[],
): Promise<{ results: Record<string, Record<string, number[]>>; transactionCount: number }> {
  if (refs.length === 0) {
    return { results: {}, transactionCount: 0 };
  }

  const { results, transactionCount } = await executeBulkRegisterReads(refs, createModbusBulkExecutor(modbusReader));

  return { results: bulkResultsToPortCommandMap(results), transactionCount };
}

export async function executeHardwareReadAllStatus(
  modbusReader: HardwareModbusReader,
  commands: string[],
): Promise<{ results: Record<string, Record<string, number[]>>; transactionCount: number }> {
  const { refs, emptySlots } = buildHardwareReadPlan(commands);
  const bulk = await executeHardwareModbusBulkRead(modbusReader, refs);

  for (const slot of emptySlots) {
    if (!bulk.results[slot.port]) {
      bulk.results[slot.port] = {};
    }
    if (!bulk.results[slot.port][slot.command]) {
      bulk.results[slot.port][slot.command] = [];
    }
  }

  return bulk;
}

export function collectSeasonalReadRefs(): ModbusRegisterReadRef[] {
  const refs: ModbusRegisterReadRef[] = [];
  const seasonSpec = resolveHardwareGetSpec('SEASONAL', 'SEASON');
  if (seasonSpec) {
    refs.push({
      key: 'SEASONAL:SEASON',
      port: 'SEASONAL',
      command: 'SEASON',
      functionCode: seasonSpec.functionCode,
      address: seasonSpec.address,
      length: seasonSpec.length ?? 1,
    });
  }

  const seasonal = (HW_PORTS as Record<string, unknown>).SEASONAL as Record<string, unknown> | undefined;
  const monthly = seasonal?.MONTHLY_SUMMER as Record<string, { get?: { functionCode: number; address: number; length?: number } }> | undefined;

  for (const month of SEASONAL_MONTHS) {
    const hw = monthly?.[month]?.get;
    if (!hw) {
      continue;
    }
    const command = `MONTHLY_SUMMER_${month}`;
    refs.push({
      key: `SEASONAL:${command}`,
      port: 'SEASONAL',
      command,
      functionCode: hw.functionCode,
      address: hw.address,
      length: hw.length ?? 1,
    });
  }

  return refs;
}

export function collectBenchReadRefs(): ModbusRegisterReadRef[] {
  const refs: ModbusRegisterReadRef[] = [];

  for (const command of BENCH_READ_COMMANDS) {
    const spec = resolveHardwareGetSpec('BENCH', command);
    if (!spec) {
      continue;
    }
    refs.push({
      key: `BENCH:${command}`,
      port: 'BENCH',
      command,
      functionCode: spec.functionCode,
      address: spec.address,
      length: spec.length ?? 1,
    });
  }

  return refs;
}

export function collectDdcTimeReadRefs(): ModbusRegisterReadRef[] {
  const refs: ModbusRegisterReadRef[] = [];

  for (const command of DDC_TIME_READ_COMMANDS) {
    const spec = resolveHardwareGetSpec('DDC_TIME', command);
    if (!spec) {
      continue;
    }
    refs.push({
      key: `DDC_TIME:${command}`,
      port: 'DDC_TIME',
      command,
      functionCode: spec.functionCode,
      address: spec.address,
      length: spec.length ?? 1,
    });
  }

  return refs;
}

export function readFirstValue(results: Record<string, Record<string, number[]>>, port: string, command: string): number | null {
  const values = results[port]?.[command];
  if (!values || values.length === 0) {
    return null;
  }
  return values[0] ?? null;
}
