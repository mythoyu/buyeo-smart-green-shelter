import { HW_PORTS, HardwarePortCommand } from '../../meta/hardware/ports';

import { ModbusRegisterReadRef } from './modbusBulkRead';

const DO_PORTS = [
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

const DI_PORTS = [
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

const HVAC_PORTS = ['COOLER', 'EXCHANGER'] as const;

const SENSOR_READ_COMMANDS = new Set(['PM10', 'PM25', 'PM100', 'CO2', 'VOC', 'TEMP', 'HUM']);

/** DO 전용 (COOLER/EXCHANGER에는 SCHED2 없음) */
const DO_ONLY_READ_COMMANDS = new Set([
  'SCHED2_START_HOUR',
  'SCHED2_START_MIN',
  'SCHED2_END_HOUR',
  'SCHED2_END_MIN',
]);

/** AUTO/POWER/SCHED1은 DO·HVAC 공통 — HVAC는 전용 명령으로만 분기 */
const HVAC_ONLY_READ_COMMANDS = new Set([
  'MODE',
  'SPEED',
  'SUMMER_CONT_TEMP',
  'WINTER_CONT_TEMP',
  'SUMMER_TEMP',
  'WINTER_TEMP',
  'CUR_TEMP',
  'ALARM',
  'FILTER_ALARM',
  'POWER_SAMSUNG',
]);

const DI_READ_COMMANDS = new Set(['ENABLE', 'DI_STATUS']);

function makeRefKey(port: string, command: string): string {
  return `${port}:${command}`;
}

/**
 * HW_PORTS에서 GET 스펙 조회
 */
export function resolveHardwareGetSpec(port: string, command: string): HardwarePortCommand | null {
  const hw = HW_PORTS as Record<string, unknown>;

  if (command === 'DI_STATUS' && /^DI\d{1,2}$/i.test(port)) {
    const diStatus = hw.DI_STATUS as Record<string, { get?: HardwarePortCommand }> | undefined;
    return diStatus?.[port]?.get ?? null;
  }

  if (port === 'INTEGRATED_SENSOR' || SENSOR_READ_COMMANDS.has(command)) {
    const sensor = hw.INTEGRATED_SENSOR as Record<string, { get?: HardwarePortCommand }> | undefined;
    return sensor?.[command]?.get ?? null;
  }

  const portBlock = hw[port] as Record<string, { get?: HardwarePortCommand }> | undefined;
  return portBlock?.[command]?.get ?? null;
}

/**
 * read-all-status 요청 명령에 따른 대상 HW_PORTS 키 목록
 */
export function resolveHardwareTargetPorts(commands: string[]): string[] {
  if (commands.some((c) => SENSOR_READ_COMMANDS.has(c))) {
    return ['INTEGRATED_SENSOR'];
  }

  if (commands.some((c) => DI_READ_COMMANDS.has(c))) {
    return [...DI_PORTS];
  }

  if (commands.some((c) => DO_ONLY_READ_COMMANDS.has(c))) {
    return [...DO_PORTS];
  }

  if (commands.some((c) => HVAC_ONLY_READ_COMMANDS.has(c))) {
    return [...HVAC_PORTS];
  }

  return [...DO_PORTS];
}

/**
 * 포트 × 명령 조합으로 bulk read용 ref 수집
 */
export function collectHardwareReadRefs(commands: string[], targetPorts: string[]): ModbusRegisterReadRef[] {
  const refs: ModbusRegisterReadRef[] = [];
  const seen = new Set<string>();

  for (const port of targetPorts) {
    for (const command of commands) {
      const key = makeRefKey(port, command);
      if (seen.has(key)) {
        continue;
      }

      const spec = resolveHardwareGetSpec(port, command);
      if (!spec) {
        continue;
      }

      seen.add(key);
      refs.push({
        key,
        port,
        command,
        functionCode: spec.functionCode,
        address: spec.address,
        length: spec.length ?? 1,
      });
    }
  }

  return refs;
}

/**
 * ref 수집 + 누락된 (port, command)는 빈 배열로 채울 목록
 */
export function buildHardwareReadPlan(commands: string[]): {
  targetPorts: string[];
  refs: ModbusRegisterReadRef[];
  emptySlots: Array<{ port: string; command: string }>;
} {
  const targetPorts = resolveHardwareTargetPorts(commands);
  const refs = collectHardwareReadRefs(commands, targetPorts);
  const refKeys = new Set(refs.map((r) => r.key));
  const emptySlots: Array<{ port: string; command: string }> = [];

  for (const port of targetPorts) {
    for (const command of commands) {
      if (!refKeys.has(makeRefKey(port, command))) {
        emptySlots.push({ port, command });
      }
    }
  }

  return { targetPorts, refs, emptySlots };
}
