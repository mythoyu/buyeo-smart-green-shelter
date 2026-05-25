import { MODBUS_FC } from '../../meta/hardware/ports';
import type { IUnifiedModbusCommunication } from '../../core/interfaces/IModbusCommunication';

import {
  groupRegisterRefsForBulkRead,
  ModbusBulkReadGroup,
  ModbusRegisterReadRef,
} from './modbusBulkRead';
import {
  resolveBulkDefaultPorts,
  resolveHardwareSetSpec,
  toHardwareNumericValue,
} from './hardwarePortWrite';

function collectHardwareWriteRefs(ports: readonly string[], command: string): ModbusRegisterReadRef[] {
  const refs: ModbusRegisterReadRef[] = [];

  for (const port of ports) {
    const spec = resolveHardwareSetSpec(port, command);
    if (!spec) {
      continue;
    }
    refs.push({
      key: `${port}:${command}`,
      port,
      command,
      functionCode: spec.functionCode,
      address: spec.address,
      length: 1,
    });
  }

  return refs;
}

function resolveBulkWriteFunctionCode(group: ModbusBulkReadGroup): number {
  if (group.length <= 1) {
    return group.functionCode;
  }
  if (group.functionCode === MODBUS_FC.WR_SNGL_COIL || group.functionCode === MODBUS_FC.RD_COILS) {
    return MODBUS_FC.WR_MULTI_COILS;
  }
  if (group.functionCode === MODBUS_FC.WR_SNGL_REG || group.functionCode === MODBUS_FC.RD_HLD_REG) {
    return MODBUS_FC.WR_MULTI_REG;
  }
  return group.functionCode;
}

async function writeBulkGroup(
  modbusService: IUnifiedModbusCommunication,
  group: ModbusBulkReadGroup,
  coilValue: number,
): Promise<{ success: boolean; error?: string }> {
  const functionCode = resolveBulkWriteFunctionCode(group);
  const payload: number | number[] =
    group.length === 1 ? coilValue : new Array(group.length).fill(coilValue);

  const result = await modbusService.writeRegister({
    slaveId: 1,
    functionCode,
    address: group.startAddress,
    value: payload,
    context: 'control',
  });

  if (result.success) {
    return { success: true };
  }
  return { success: false, error: result.error ?? 'bulk write failed' };
}

async function writeSingleRef(
  modbusService: IUnifiedModbusCommunication,
  ref: ModbusRegisterReadRef,
  coilValue: number,
): Promise<boolean> {
  const result = await modbusService.writeRegister({
    slaveId: 1,
    functionCode: ref.functionCode,
    address: ref.address,
    value: coilValue,
    context: 'control',
  });
  return !!result.success;
}

/**
 * 동일 command·value를 여러 포트에 bulk write (인접 코일/레지스터는 FC15/16 1회)
 */
export async function executeHardwareBulkCommandWrite(
  modbusService: IUnifiedModbusCommunication,
  command: string,
  value: boolean | number,
  ports?: readonly string[],
): Promise<{
  success: boolean;
  transactionCount: number;
  portCount: number;
  failedPorts: string[];
  error?: string;
}> {
  const targetPorts = ports ?? resolveBulkDefaultPorts(command);
  const parsed = toHardwareNumericValue(value);
  if (!parsed.ok) {
    return { success: false, transactionCount: 0, portCount: 0, failedPorts: [], error: parsed.error };
  }

  const refs = collectHardwareWriteRefs(targetPorts, command);
  if (refs.length === 0) {
    return {
      success: false,
      transactionCount: 0,
      portCount: 0,
      failedPorts: [],
      error: `지원하지 않는 bulk 명령: ${command}`,
    };
  }

  const groups = groupRegisterRefsForBulkRead(refs);
  let transactionCount = 0;
  const failedPorts = new Set<string>();

  for (const group of groups) {
    const bulkResult = await writeBulkGroup(modbusService, group, parsed.value);
    transactionCount++;

    if (bulkResult.success) {
      continue;
    }

    for (const member of group.members) {
      const ref = refs.find(r => r.key === member.key);
      if (!ref) {
        failedPorts.add(member.port);
        continue;
      }
      transactionCount++;
      const ok = await writeSingleRef(modbusService, ref, parsed.value);
      if (!ok) {
        failedPorts.add(member.port);
      }
    }
  }

  const failed = [...failedPorts];
  return {
    success: failed.length === 0,
    transactionCount,
    portCount: refs.length,
    failedPorts: failed,
    ...(failed.length > 0 ? { error: `일부 포트 쓰기 실패: ${failed.join(', ')}` } : {}),
  };
}
