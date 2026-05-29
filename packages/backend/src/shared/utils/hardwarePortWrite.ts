import { HW_PORTS, HardwarePortCommand } from '../../meta/hardware/ports';

import type { IUnifiedModbusCommunication } from '../../core/interfaces/IModbusCommunication';
import { resolveBenchPortWriteWire } from './fieldWireCodec';

export const HARDWARE_DO_PORTS = [
  'DO1',
  'DO2',
  'DO3',
  'DO4',
  'DO5',
  'DO6',
  'DO7',
  'DO8',
  'DO9',
  'DO10',
  'DO11',
  'DO12',
  'DO13',
  'DO14',
  'DO15',
  'DO16',
] as const;

export type HardwareDoPort = (typeof HARDWARE_DO_PORTS)[number];

export const HARDWARE_DI_PORTS = [
  'DI1',
  'DI2',
  'DI3',
  'DI4',
  'DI5',
  'DI6',
  'DI7',
  'DI8',
  'DI9',
  'DI10',
  'DI11',
  'DI12',
  'DI13',
  'DI14',
  'DI15',
  'DI16',
] as const;

export type HardwareDiPort = (typeof HARDWARE_DI_PORTS)[number];

export function resolveBulkDefaultPorts(command: string): readonly string[] {
  if (command === 'ENABLE') {
    return HARDWARE_DI_PORTS;
  }
  return HARDWARE_DO_PORTS;
}

export function resolveHardwareSetSpec(port: string, command: string): HardwarePortCommand | null {
  const hw = HW_PORTS as Record<string, unknown>;
  const portBlock = hw[port] as Record<string, { set?: HardwarePortCommand }> | undefined;
  return portBlock?.[command]?.set ?? null;
}

export function toHardwareNumericValue(
  value: boolean | number | string,
): { ok: true; value: number } | { ok: false; error: string } {
  if (typeof value === 'boolean') {
    return { ok: true, value: value ? 1 : 0 };
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return { ok: false, error: `value가 숫자가 아닙니다: ${String(value)}` };
    }
    return { ok: true, value: parsed };
  }
  return { ok: true, value: value };
}

export async function executeHardwarePortWrite(
  modbusService: IUnifiedModbusCommunication,
  port: string,
  command: string,
  value: boolean | number,
  commandId: string,
): Promise<{ success: true; commandId: string; numericValue: number } | { success: false; error: string }> {
  const hwPort = resolveHardwareSetSpec(port, command);
  if (!hwPort) {
    return { success: false, error: `지원하지 않는 포트/명령 조합입니다: ${port}/${command}` };
  }

  const parsed = toHardwareNumericValue(value);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  let lengthOrValue = parsed.value;
  let valueIsRawRegister: boolean | undefined;
  if (port === 'BENCH') {
    const benchWire = resolveBenchPortWriteWire(command, parsed.value);
    if (benchWire) {
      lengthOrValue = benchWire.wire;
      valueIsRawRegister = benchWire.valueIsRawRegister;
    }
  }

  const modbusCommand = {
    id: commandId,
    type: 'write' as const,
    unitId: '1',
    functionCode: hwPort.functionCode,
    address: hwPort.address,
    lengthOrValue,
    priority: 'high' as const,
    timestamp: new Date(),
    resolve: () => {},
    reject: () => {},
    ...(valueIsRawRegister !== undefined ? { valueIsRawRegister } : {}),
  };

  const result = await modbusService.executeCommand(modbusCommand);
  if (!result || result.success !== true) {
    return { success: false, error: result?.error ?? 'Unknown error' };
  }

  return { success: true, commandId, numericValue: lengthOrValue };
}
