export const BENCH_READ_GAP_MS = 150;

export const BENCH_READ_COMMANDS = [
  'CUR_TEMP',
  'CUR_TEMP_2',
  'CONT_TEMP',
  'CONT_TEMP_2',
  'TEMP_OFFSET',
  'TEMP_CHECK_INTERVAL',
] as const;

export type BenchReadCommand = (typeof BENCH_READ_COMMANDS)[number];

import {
  decodeCoolerBenchIntegratedSensorTemp,
  encodeCoolerBenchIntegratedSensorTemp,
} from './modbusTemperatureScale';

export const BENCH_LIMITS = {
  /** 설정온도: (raw−2000)/10 — 80°C→2800, -20°C→1800 */
  contTemp: { regMin: 1800, regMax: 2800, min: -20, max: 80 },
  tempOffset: { regMin: 0, regMax: 200, min: 0, max: 20 },
  tempCheckInterval: { regMin: 0, regMax: 6000, min: 0, max: 600 },
} as const;

/** 스케일 레지스터 uint16 → signed (예: 65336 → -200) */
export function fromModbusRegisterWord(wire: number): number {
  const n = Math.round(wire) & 0xffff;
  return n > 0x7fff ? n - 0x10000 : n;
}

/** 설정 온도 (R/W): (raw−2000)/10 — CUR_TEMP와 동일 스케일 */
export function decodeBenchContTemp(raw: number): number {
  return decodeCoolerBenchIntegratedSensorTemp(fromModbusRegisterWord(raw));
}

export function encodeBenchContTemp(celsius: number): number {
  const reg = encodeCoolerBenchIntegratedSensorTemp(celsius);
  return Math.min(BENCH_LIMITS.contTemp.regMax, Math.max(BENCH_LIMITS.contTemp.regMin, reg));
}

/** FC6/FC16 전송용: 스케일 레지스터(음수 가능, 예: -20°C→-200) → Modbus uint16 */
export function toModbusRegisterWord(scaledReg: number): number {
  const n = Math.round(scaledReg);
  if (n < 0) {
    return (n + 65536) % 65536;
  }
  if (n > 65535) {
    return n % 65536;
  }
  return n;
}

/** 편차값 (R/W): raw / 10 */
export function decodeBenchTempOffset(raw: number): number {
  return fromModbusRegisterWord(raw) / 10;
}

export function encodeBenchTempOffset(value: number): number {
  const reg = Math.round(value * 10);
  return Math.min(BENCH_LIMITS.tempOffset.regMax, Math.max(BENCH_LIMITS.tempOffset.regMin, reg));
}

/** 기동 체크시간 (R/W): raw / 10 (초) */
export function decodeBenchTempCheckInterval(raw: number): number {
  return fromModbusRegisterWord(raw) / 10;
}

export function encodeBenchTempCheckInterval(seconds: number): number {
  const reg = Math.round(seconds * 10);
  return Math.min(BENCH_LIMITS.tempCheckInterval.regMax, Math.max(BENCH_LIMITS.tempCheckInterval.regMin, reg));
}

export function decodeBenchReadCommand(command: BenchReadCommand, raw: number): number {
  switch (command) {
    case 'CUR_TEMP':
    case 'CUR_TEMP_2':
      return decodeCoolerBenchIntegratedSensorTemp(raw);
    case 'CONT_TEMP':
    case 'CONT_TEMP_2':
      return decodeBenchContTemp(raw);
    case 'TEMP_OFFSET':
      return decodeBenchTempOffset(raw);
    case 'TEMP_CHECK_INTERVAL':
      return decodeBenchTempCheckInterval(raw);
    default:
      return raw;
  }
}

export function delayMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Modbus 레지스터 원값 + 환산값 (하드웨어 설정 UI 표시용) */
export interface BenchFieldReading {
  raw: number;
  value: number;
}

export interface BenchModbusData {
  cur_temp: BenchFieldReading;
  cur_temp_2: BenchFieldReading;
  cont_temp: BenchFieldReading;
  cont_temp_2: BenchFieldReading;
  temp_offset: BenchFieldReading;
  temp_check_interval: BenchFieldReading;
}

export function buildBenchFieldReading(command: BenchReadCommand, raw: number): BenchFieldReading {
  return { raw, value: decodeBenchReadCommand(command, raw) };
}

/** 환산 전·후를 둘 다 보여줄지 (원값과 환산값이 동일하면 단일 표시) */
export function shouldShowBenchRawPair(command: BenchReadCommand, raw: number, value: number): boolean {
  if (
    command === 'CUR_TEMP' ||
    command === 'CUR_TEMP_2' ||
    command === 'CONT_TEMP' ||
    command === 'CONT_TEMP_2'
  ) {
    return true;
  }
  return Math.abs(value - raw) > 1e-6;
}
