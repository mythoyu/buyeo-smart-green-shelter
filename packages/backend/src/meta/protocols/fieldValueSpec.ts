/**
 * Mock·Real 공통 필드 논리값 ↔ Modbus wire 인코딩 (CommandResultHandler 디코드 규칙과 정합)
 */

import {
  encodeBenchContTemp,
  encodeBenchTempCheckInterval,
  encodeBenchTempOffset,
} from '../../shared/utils/benchModbus';
import { encodeCoolerBenchIntegratedSensorTemp } from '../../shared/utils/modbusTemperatureScale';
import { getDeviceDefaultValues, getFallbackDeviceValues } from '../../data/clientDefaultDataMapping';

export type WireKind =
  | 'boolean_01'
  | 'hour_0_23'
  | 'minute_0_59'
  | 'alarm_0_255'
  | 'cooler_mode_0_3'
  | 'cooler_speed_1_4'
  | 'exchanger_mode_1_2'
  | 'exchanger_speed_1_4'
  | 'summer_winter_tenths'
  | 'cur_temp_wire'
  | 'sensor_temp_wire'
  | 'bench_cont_temp'
  | 'bench_temp_offset'
  | 'bench_temp_check_interval'
  | 'pm_0_1000'
  | 'co2_400_10000'
  | 'voc_0_60000'
  | 'hum_tenths'
  | 'generic_int_0_65535';

export function resolveWireKind(deviceType: string, field: string, type: string): WireKind {
  const f = field || '';
  const dt = deviceType || '';

  if (type === 'boolean' || f === 'auto' || f === 'power') return 'boolean_01';
  if (f.includes('hour')) return 'hour_0_23';
  if (f.includes('minute')) return 'minute_0_59';
  if (f === 'alarm') return 'alarm_0_255';

  if (dt === 'cooler') {
    if (f === 'mode') return 'cooler_mode_0_3';
    if (f === 'speed') return 'cooler_speed_1_4';
  }
  if (dt === 'exchanger') {
    if (f === 'mode') return 'exchanger_mode_1_2';
    if (f === 'speed') return 'exchanger_speed_1_4';
  }

  if (f === 'summer_cont_temp' || f === 'winter_cont_temp') return 'summer_winter_tenths';
  if (f === 'cur_temp') return 'cur_temp_wire';
  if (f === 'cont_temp' || f === 'cont_temp_2') return 'bench_cont_temp';
  if (f === 'temp_offset') return 'bench_temp_offset';
  if (f === 'temp_check_interval') return 'bench_temp_check_interval';

  if (dt === 'integrated_sensor' || dt === 'sensor') {
    if (f === 'pm100' || f === 'pm25' || f === 'pm10') return 'pm_0_1000';
    if (f === 'co2') return 'co2_400_10000';
    if (f === 'voc') return 'voc_0_60000';
    if (f === 'hum') return 'hum_tenths';
    if (f === 'temp') return 'sensor_temp_wire';
  }

  if (f === 'temp' && dt === 'bench') return 'cur_temp_wire';

  return 'generic_int_0_65535';
}

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** 논리값(또는 UI 단위) 생성 — 스펙 범위 내 */
export function randomLogicalInKind(kind: WireKind): number {
  switch (kind) {
    case 'boolean_01':
      return Math.random() > 0.5 ? 1 : 0;
    case 'hour_0_23':
      return randomInt(0, 23);
    case 'minute_0_59':
      return randomInt(0, 59);
    case 'alarm_0_255':
      return 0;
    case 'cooler_mode_0_3':
      return randomInt(0, 3);
    case 'cooler_speed_1_4':
      return randomInt(1, 4);
    case 'exchanger_mode_1_2':
      return randomInt(1, 2);
    case 'exchanger_speed_1_4':
      return randomInt(1, 4);
    case 'summer_winter_tenths':
      return randomInt(16, 30);
    case 'cur_temp_wire':
    case 'sensor_temp_wire':
      return randomInt(-99, 99);
    case 'bench_cont_temp':
      return randomInt(-20, 80);
    case 'bench_temp_offset':
      return randomInt(0, 20);
    case 'bench_temp_check_interval':
      return randomInt(0, 600);
    case 'pm_0_1000':
      return randomInt(0, 1000);
    case 'co2_400_10000':
      return randomInt(400, 10000);
    case 'voc_0_60000':
      return randomInt(0, 60000);
    case 'hum_tenths':
      return randomInt(0, 100);
    default:
      return randomInt(0, 100);
  }
}

/** 폴링 GET 후 CommandResultHandler와 동일한 wire 값 */
export function encodeLogicalToWire(kind: WireKind, logical: number): number {
  const n = Number(logical);
  switch (kind) {
    case 'boolean_01':
      return n ? 1 : 0;
    case 'hour_0_23':
      return Math.max(0, Math.min(23, Math.round(n)));
    case 'minute_0_59':
      return Math.max(0, Math.min(59, Math.round(n)));
    case 'alarm_0_255':
      return Math.max(0, Math.min(255, Math.round(n)));
    case 'cooler_mode_0_3':
      return Math.max(0, Math.min(3, Math.round(n)));
    case 'cooler_speed_1_4':
      return Math.max(1, Math.min(4, Math.round(n)));
    case 'exchanger_mode_1_2':
      return Math.max(1, Math.min(2, Math.round(n)));
    case 'exchanger_speed_1_4':
      return Math.max(1, Math.min(4, Math.round(n)));
    case 'summer_winter_tenths':
      return Math.max(160, Math.min(300, Math.round(n * 10)));
    case 'cur_temp_wire':
    case 'sensor_temp_wire':
      return encodeCoolerBenchIntegratedSensorTemp(Math.max(-99, Math.min(125, n)));
    case 'bench_cont_temp':
      return encodeBenchContTemp(Math.max(-20, Math.min(80, n)));
    case 'bench_temp_offset':
      return encodeBenchTempOffset(Math.max(0, Math.min(20, n)));
    case 'bench_temp_check_interval':
      return encodeBenchTempCheckInterval(Math.max(0, Math.min(600, n)));
    case 'hum_tenths':
      return Math.max(0, Math.min(1000, Math.round(Math.max(0, Math.min(100, n)) * 10)));
    case 'pm_0_1000':
      return Math.max(0, Math.min(1000, Math.round(n)));
    case 'co2_400_10000':
      return Math.max(400, Math.min(10000, Math.round(n)));
    case 'voc_0_60000':
      return Math.max(0, Math.min(60000, Math.round(n)));
    default:
      return Math.max(0, Math.min(65535, Math.round(n)));
  }
}

function coerceDefaultLogical(field: string, raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return undefined;
}

/** clientDefaultDataMapping / fallback 기반 논리값 */
export function getDefaultLogical(
  clientId: string | undefined,
  deviceType: string,
  unitId: string,
  field: string,
): number | undefined {
  const tryUnit = (cid: string, dt: string, uid: string) => {
    const row = getDeviceDefaultValues(cid, dt as keyof import('../../data/clientDefaultDataMapping').DeviceDefaultValues, uid);
    if (row && field in row) {
      return coerceDefaultLogical(field, (row as Record<string, unknown>)[field]);
    }
    return undefined;
  };

  if (clientId && unitId) {
    const v = tryUnit(clientId, deviceType, unitId);
    if (v !== undefined) return v;
  }
  if (unitId && clientId) {
    const v = tryUnit(clientId, deviceType, 'u001');
    if (v !== undefined) return v;
  }
  const fb = getFallbackDeviceValues(deviceType as keyof import('../../data/clientDefaultDataMapping').DeviceDefaultValues);
  if (fb && field in fb) {
    return coerceDefaultLogical(field, (fb as Record<string, unknown>)[field]);
  }
  return undefined;
}

export function useMockDefaultsOnly(): boolean {
  return process.env.MODBUS_MOCK_USE_DEFAULTS !== 'false';
}
