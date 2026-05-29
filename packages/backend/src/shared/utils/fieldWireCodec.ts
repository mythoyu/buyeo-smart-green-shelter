/**
 * bench 필드 wire ↔ 논리 — bench 전용 공식
 * - 앱 경계 변환은 deviceFieldMapper가 통합; bench는 여기서 encode/decode
 */

import {
  decodeBenchContTemp,
  decodeBenchTempCheckInterval,
  decodeBenchTempOffset,
  encodeBenchContTemp,
  encodeBenchTempCheckInterval,
  encodeBenchTempOffset,
  toModbusRegisterWord,
} from './benchModbus';
import {
  decodeCoolerBenchIntegratedSensorTemp,
  encodeCoolerBenchIntegratedSensorTemp,
} from './modbusTemperatureScale';

const BENCH_GET_COMMAND_TO_FIELD: Record<string, string> = {
  GET_CUR_TEMP: 'cur_temp',
  GET_CUR_TEMP_2: 'cur_temp_2',
  GET_CONT_TEMP: 'cont_temp',
  GET_CONT_TEMP_2: 'cont_temp_2',
  GET_TEMP_OFFSET: 'temp_offset',
  GET_TEMP_CHECK_INTERVAL: 'temp_check_interval',
  GET_TEMP: 'temp',
};

/** HW_PORTS.BENCH set/read 명령 키 → data 필드 */
const BENCH_HW_COMMAND_TO_FIELD: Record<string, string> = {
  CUR_TEMP: 'cur_temp',
  CUR_TEMP_2: 'cur_temp_2',
  CONT_TEMP: 'cont_temp',
  CONT_TEMP_2: 'cont_temp_2',
  TEMP_OFFSET: 'temp_offset',
  TEMP_CHECK_INTERVAL: 'temp_check_interval',
};

function normalizeBenchField(field: string): string {
  if (field === 'cur_temp_2') return 'cur_temp_2';
  if (field === 'cont_temp_2') return 'cont_temp_2';
  return field;
}

/** bench 필드 wire 인코딩 (논리 → 레지스터 스케일). 미지원 필드는 null */
export function tryEncodeBenchFieldWire(field: string, logical: number): number | null {
  const f = normalizeBenchField(field);
  switch (f) {
    case 'cont_temp':
    case 'cont_temp_2':
    case 'cur_temp':
    case 'cur_temp_2':
    case 'temp':
      return encodeBenchContTemp(logical);
    case 'temp_offset':
      return encodeBenchTempOffset(logical);
    case 'temp_check_interval':
      return encodeBenchTempCheckInterval(logical);
    default:
      return null;
  }
}

/** bench 필드 wire 디코딩 (레지스터 raw → 논리). 미지원 필드는 null */
export function tryDecodeBenchFieldWire(field: string, raw: number): number | null {
  const f = normalizeBenchField(field);
  switch (f) {
    case 'cont_temp':
    case 'cont_temp_2':
      return decodeBenchContTemp(raw);
    case 'cur_temp':
    case 'cur_temp_2':
    case 'temp':
      return decodeCoolerBenchIntegratedSensorTemp(raw);
    case 'temp_offset':
      return decodeBenchTempOffset(raw);
    case 'temp_check_interval':
      return decodeBenchTempCheckInterval(raw);
    default:
      return null;
  }
}

export function getBenchFieldFromGetCommand(commandKey: string): string | undefined {
  return BENCH_GET_COMMAND_TO_FIELD[commandKey];
}

/** 폴링/GET commandKey → 논리값 (bench 전용) */
export function decodeBenchGetCommand(commandKey: string, raw: number): number | null {
  const field = BENCH_GET_COMMAND_TO_FIELD[commandKey];
  if (!field) return null;
  return tryDecodeBenchFieldWire(field, raw);
}

/** HW_PORTS bench 명령 키 → 논리값 (하드웨어 read decode) */
export function decodeBenchHwCommand(command: string, raw: number): number | null {
  const field = BENCH_HW_COMMAND_TO_FIELD[command];
  if (!field) return null;
  return tryDecodeBenchFieldWire(field, raw);
}

/** BENCH 포트 직접 쓰기: 논리값 → wire + valueIsRawRegister */
export function resolveBenchPortWriteWire(
  command: string,
  logical: number,
): { wire: number; valueIsRawRegister: true } | null {
  const field = BENCH_HW_COMMAND_TO_FIELD[command];
  if (!field) return null;
  const scaled = encodeFieldWire('bench', field, logical);
  return { wire: toModbusRegisterWord(scaled), valueIsRawRegister: true };
}

/** deviceType + field 논리 → wire (bench만 위임, 그 외는 입력 그대로) */
export function encodeFieldWire(deviceType: string, field: string, logical: number): number {
  if (deviceType === 'bench') {
    const wire = tryEncodeBenchFieldWire(field, logical);
    if (wire !== null) return wire;
  }
  return Number(logical);
}

/** deviceType + field wire → 논리 (bench만 위임, 그 외는 raw 그대로) */
export function decodeFieldWire(deviceType: string, field: string, raw: number): number {
  if (deviceType === 'bench') {
    const logical = tryDecodeBenchFieldWire(field, raw);
    if (logical !== null) return logical;
  }
  return raw;
}
