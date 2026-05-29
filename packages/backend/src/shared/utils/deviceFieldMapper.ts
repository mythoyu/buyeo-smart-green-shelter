/**
 * Modbus wire ↔ 애플리케이션 논리값 — 단일 변환층
 * Real/Mock는 wire만 주고받고, DB·REST·Handler는 여기서만 decode/encode 한다.
 */
import { decodeFieldWire, encodeFieldWire, getBenchFieldFromGetCommand } from './fieldWireCodec';
import { encodeCoolerBenchIntegratedSensorTemp } from './modbusTemperatureScale';

export type DeviceFieldMapperContext = {
  clientId?: string;
  /** coil/레지스터 type 힌트 (boolean 등) */
  fieldType?: string;
};

/** DB·API에 저장되는 논리값 (온도·모드는 number, coil은 boolean, 스케줄은 HH:mm 문자열) */
export type ModbusLogicalValue = number | boolean | string;

/** TIME_INTEGRATED 매핑 commandKey (Modbus는 _HOUR/_MINUTE) */
const INTEGRATED_TIME_COMMAND_KEYS = new Set([
  'GET_START_TIME_1',
  'SET_START_TIME_1',
  'GET_END_TIME_1',
  'SET_END_TIME_1',
  'GET_START_TIME_2',
  'SET_START_TIME_2',
  'GET_END_TIME_2',
  'SET_END_TIME_2',
]);

export function isIntegratedTimeCommandKey(commandKey: string): boolean {
  return INTEGRATED_TIME_COMMAND_KEYS.has(commandKey);
}

/** API·Handler용 통합 시간 문자열 (wire 숫자 변환 없음) */
export function coerceIntegratedTimeString(value: unknown): string | null {
  if (typeof value === 'string') {
    if (value.includes(':')) {
      const [hourStr, minuteStr] = value.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      if (!isNaN(hour) && !isNaN(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
      return null;
    }
    const timeValue = parseInt(value, 10);
    if (!isNaN(timeValue) && timeValue >= 0 && timeValue <= 2359) {
      const hour = Math.floor(timeValue / 100);
      const minute = timeValue % 100;
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
    }
    return null;
  }
  if (typeof value === 'number' && value >= 0 && value <= 2359) {
    const hour = Math.floor(value / 100);
    const minute = value % 100;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
  }
  return null;
}

const SAMSUNG_COOLER_CLIENTS = new Set(['c0101', 'c0102']);

const COIL_COMMAND_RE = /^(GET|SET)_(POWER|AUTO)$/;

/** Modbus coil wire(0/1) → 논리 boolean */
export function decodeCoilWireToBoolean(wire: number): boolean {
  return Number(wire) === 1;
}

/** GET/SET_POWER|AUTO commandKey → data 필드 */
export function getCoilFieldFromCommand(commandKey: string): 'power' | 'auto' | undefined {
  const m = commandKey.match(COIL_COMMAND_RE);
  if (!m) return undefined;
  const field = m[2].toLowerCase();
  return field === 'power' || field === 'auto' ? field : undefined;
}

function resolveClientId(ctx: DeviceFieldMapperContext | undefined, fallback?: string): string {
  return (ctx?.clientId ?? fallback ?? '').toString();
}

/** 삼성 cooler MODE wire → REST */
function decodeSamsungCoolerModeWire(wire: number): number {
  const modeMap: Record<number, number> = { 0: 3, 1: 0, 2: 1, 3: 2, 4: 4 };
  const hit = modeMap[Number(wire)];
  return hit !== undefined ? hit : Number(wire);
}

/** 삼성 cooler SPEED wire → REST */
function decodeSamsungCoolerSpeedWire(wire: number): number {
  const speedMap: Record<number, number> = { 0: 4, 1: 1, 2: 2, 3: 3 };
  const hit = speedMap[Number(wire)];
  return hit !== undefined ? hit : 1;
}

/** REST → 삼성 cooler MODE wire */
function encodeSamsungCoolerModeLogical(logical: number): number {
  const modeMap: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 0, 4: 4 };
  const hit = modeMap[Number(logical)];
  return hit !== undefined ? hit : Number(logical);
}

/** REST → 삼성 cooler SPEED wire */
function encodeSamsungCoolerSpeedLogical(logical: number): number {
  const speedMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 0 };
  const hit = speedMap[Number(logical)];
  return hit !== undefined ? hit : 1;
}

/**
 * Modbus wire → 논리값 (폴링·GET 결과 저장용)
 */
export function toModbusLogical(
  deviceType: string,
  field: string,
  wire: number,
  ctx?: DeviceFieldMapperContext,
): ModbusLogicalValue {
  const dt = deviceType || '';
  const f = field || '';
  const clientId = resolveClientId(ctx);
  const raw = Number(wire);

  if (SAMSUNG_COOLER_CLIENTS.has(clientId) && dt === 'cooler') {
    if (f === 'mode') return decodeSamsungCoolerModeWire(raw);
    if (f === 'speed') return decodeSamsungCoolerSpeedWire(raw);
  }

  if (f === 'power' || f === 'auto') {
    return decodeCoilWireToBoolean(raw);
  }

  if (dt === 'bench') {
    return decodeFieldWire('bench', f, raw);
  }

  if (dt === 'exchanger' && (f === 'mode' || f === 'speed')) {
    return raw;
  }

  if (dt === 'cooler' && (f === 'mode' || f === 'speed') && !SAMSUNG_COOLER_CLIENTS.has(clientId)) {
    return raw;
  }

  if (f === 'summer_cont_temp' || f === 'winter_cont_temp') {
    return raw / 10;
  }

  if (f === 'cur_temp' || f === 'temp') {
    return (raw - 2000) / 10;
  }

  if (f === 'hum') {
    return raw / 10;
  }

  return raw;
}

/**
 * GET commandKey 기준 wire → 논리 (Handler 전용 — field 추론 포함)
 */
export function toModbusLogicalFromCommand(
  deviceType: string,
  commandKey: string,
  wire: number,
  ctx?: DeviceFieldMapperContext,
): ModbusLogicalValue {
  const raw = Number(wire);
  const dt = deviceType || '';

  const coilField = getCoilFieldFromCommand(commandKey);
  if (coilField) {
    return toModbusLogical(dt, coilField, raw, ctx);
  }

  if (dt === 'bench') {
    const benchField = getBenchFieldFromGetCommand(commandKey);
    if (benchField) {
      return toModbusLogical('bench', benchField, raw, ctx);
    }
  }

  if (commandKey === 'GET_MODE') {
    return toModbusLogical(dt, 'mode', raw, ctx);
  }
  if (commandKey === 'GET_SPEED') {
    return toModbusLogical(dt, 'speed', raw, ctx);
  }
  if (commandKey === 'GET_SUMMER_CONT_TEMP' || commandKey === 'GET_WINTER_CONT_TEMP') {
    return raw / 10;
  }
  if (commandKey === 'GET_CUR_TEMP') {
    return (raw - 2000) / 10;
  }
  if (commandKey === 'GET_TEMP') {
    return (raw - 2000) / 10;
  }
  if (commandKey === 'GET_HUM') {
    return raw / 10;
  }

  return raw;
}

/**
 * 논리값 → Modbus wire (쓰기·검증용)
 */
export function toModbusWire(
  deviceType: string,
  field: string,
  logical: number,
  ctx?: DeviceFieldMapperContext,
): number {
  const dt = deviceType || '';
  const f = field || '';
  const clientId = resolveClientId(ctx);
  const type = (ctx?.fieldType || '').toString();
  const val = Number(logical);

  if (SAMSUNG_COOLER_CLIENTS.has(clientId) && dt === 'cooler') {
    if (f === 'mode') return encodeSamsungCoolerModeLogical(val);
    if (f === 'speed') return encodeSamsungCoolerSpeedLogical(val);
  }

  if (dt === 'bench') {
    return encodeFieldWire('bench', f, val);
  }

  if (dt === 'exchanger') {
    if (f === 'mode') return Math.max(1, Math.min(2, Math.round(val)));
    if (f === 'speed') return Math.max(1, Math.min(4, Math.round(val)));
  }

  if (dt === 'cooler') {
    if (f === 'mode') return Math.max(0, Math.min(3, Math.round(val)));
    if (f === 'speed') return Math.max(1, Math.min(4, Math.round(val)));
  }

  if (f === 'summer_cont_temp' || f === 'winter_cont_temp') {
    return Math.max(160, Math.min(300, Math.round(val * 10)));
  }

  if (f === 'temp' || f === 'cur_temp') {
    const celsius = Math.max(-99, Math.min(125, val));
    return encodeCoolerBenchIntegratedSensorTemp(celsius);
  }

  if (f === 'hum') {
    return Math.max(0, Math.min(1000, Math.round(Math.max(0, Math.min(100, val)) * 10)));
  }

  if (type === 'boolean' || f === 'auto' || f === 'power') {
    return Boolean(logical) ? 1 : 0;
  }

  if (f === 'alarm') {
    return Math.max(0, Math.min(255, Math.round(val)));
  }

  if (f.includes('hour')) {
    return Math.max(0, Math.min(23, Math.round(val)));
  }

  if (f.includes('minute')) {
    return Math.max(0, Math.min(59, Math.round(val)));
  }

  if (dt === 'integrated_sensor' || dt === 'sensor') {
    if (f === 'pm100' || f === 'pm25' || f === 'pm10') {
      return Math.max(0, Math.min(1000, Math.round(val)));
    }
    if (f === 'co2') {
      return Math.max(400, Math.min(10000, Math.round(val)));
    }
    if (f === 'voc') {
      return Math.max(0, Math.min(60000, Math.round(val)));
    }
    return val;
  }

  return val;
}
