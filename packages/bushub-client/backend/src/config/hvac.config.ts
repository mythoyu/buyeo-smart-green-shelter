/**
 * 냉난방기 외부제어 설정 파일
 * 하이브리드 설정 시스템: Unit.data > System.hvac > 환경변수
 */

import { ServiceContainer } from '../core/container/ServiceContainer';
import { ISystem } from '../models/schemas/SystemSchema';
import { IUnit } from '../models/schemas/UnitSchema';

export interface HvacConfig {
  externalControlEnabled: boolean;
  manufacturer?: 'SAMSUNG' | 'LG' | null;
  modbus: {
    port: string;
    baudRate: number;
    parity: 'none' | 'even' | 'odd';
  };
}

// System 설정 캐시 (TTL: 1분)
interface SystemHvacCache {
  settings: ISystem['hvac'] | null;
  timestamp: number;
}

let systemHvacCache: SystemHvacCache | null = null;
const CACHE_TTL = 60 * 1000; // 1분

/**
 * System 설정에서 HVAC 설정 가져오기 (캐시 사용)
 */
async function getSystemHvacSettings(): Promise<ISystem['hvac'] | null> {
  const now = Date.now();

  // 캐시가 유효한 경우 반환
  if (systemHvacCache && now - systemHvacCache.timestamp < CACHE_TTL) {
    return systemHvacCache.settings;
  }

  try {
    const serviceContainer = ServiceContainer.getInstance();
    const systemService = serviceContainer.getSystemService();
    const systemSettings = await systemService.getSettings();

    const hvacSettings = systemSettings?.hvac || null;

    // 캐시 업데이트
    systemHvacCache = {
      settings: hvacSettings,
      timestamp: now,
    };

    return hvacSettings;
  } catch (error) {
    // 에러 발생 시 캐시된 값 반환 (없으면 null)
    return systemHvacCache?.settings || null;
  }
}

/**
 * 환경변수에서 HVAC 설정 가져오기 (기본값)
 */
function getEnvHvacConfig(): Partial<HvacConfig> {
  const envManufacturer = process.env.HVAC_MANUFACTURER;
  let manufacturer: 'SAMSUNG' | 'LG' | null | undefined = undefined;
  if (envManufacturer === 'SAMSUNG' || envManufacturer === 'samsung') {
    manufacturer = 'SAMSUNG';
  } else if (envManufacturer === 'LG' || envManufacturer === 'lg') {
    manufacturer = 'LG';
  }
  // undefined는 반환하지 않음 (Partial이므로)

  const result: Partial<HvacConfig> = {
    externalControlEnabled: process.env.HVAC_EXTERNAL_CONTROL_ENABLED === 'true',
    modbus: {
      port: process.env.HVAC_MODBUS_PORT || '/dev/ttyS1',
      baudRate: parseInt(process.env.HVAC_MODBUS_BAUD_RATE || '9600', 10),
      parity: (process.env.HVAC_MODBUS_PARITY || 'even') as 'none' | 'even' | 'odd',
    },
  };

  if (manufacturer !== undefined) {
    result.manufacturer = manufacturer;
  }

  return result;
}

/**
 * Unit.data에서 HVAC 설정 가져오기 (우선순위 1)
 */
function getUnitHvacConfig(unit: IUnit): Partial<HvacConfig> | null {
  if (!unit.data || typeof unit.data !== 'object' || Array.isArray(unit.data)) {
    return null;
  }

  const hvacData = (unit.data as Record<string, any>).hvac;
  if (!hvacData || typeof hvacData !== 'object' || Array.isArray(hvacData)) {
    return null;
  }

  const hvacRecord = hvacData as Record<string, any>;

  // manufacturer 변환 (소문자 -> 대문자)
  let manufacturer: 'SAMSUNG' | 'LG' | null | undefined = undefined;
  if (hvacRecord.manufacturer === 'SAMSUNG' || hvacRecord.manufacturer === 'samsung') {
    manufacturer = 'SAMSUNG';
  } else if (hvacRecord.manufacturer === 'LG' || hvacRecord.manufacturer === 'lg') {
    manufacturer = 'LG';
  } else if (hvacRecord.manufacturer === null) {
    manufacturer = null;
  }

  // modbus 구조 처리 (평면 구조 또는 중첩 구조 모두 지원)
  let modbus: { port?: string; baudRate?: number; parity?: 'none' | 'even' | 'odd' } | undefined = undefined;
  if (hvacRecord.modbus && typeof hvacRecord.modbus === 'object' && !Array.isArray(hvacRecord.modbus)) {
    // 중첩 구조
    const modbusRecord = hvacRecord.modbus as Record<string, any>;
    const modbusResult: { port?: string; baudRate?: number; parity?: 'none' | 'even' | 'odd' } = {};
    if (modbusRecord.port !== undefined) modbusResult.port = modbusRecord.port;
    if (modbusRecord.baudRate !== undefined) modbusResult.baudRate = Number(modbusRecord.baudRate);
    if (modbusRecord.parity !== undefined) modbusResult.parity = modbusRecord.parity;
    if (Object.keys(modbusResult).length > 0) {
      modbus = modbusResult;
    }
  } else if (hvacRecord.modbusPort || hvacRecord.modbusBaudRate !== undefined || hvacRecord.modbusParity) {
    // 평면 구조 (하위 호환성)
    const modbusResult: { port?: string; baudRate?: number; parity?: 'none' | 'even' | 'odd' } = {};
    if (hvacRecord.modbusPort !== undefined) modbusResult.port = hvacRecord.modbusPort;
    if (hvacRecord.modbusBaudRate !== undefined) modbusResult.baudRate = Number(hvacRecord.modbusBaudRate);
    if (hvacRecord.modbusParity !== undefined) modbusResult.parity = hvacRecord.modbusParity;
    if (Object.keys(modbusResult).length > 0) {
      modbus = modbusResult;
    }
  }

  const result: Partial<HvacConfig> = {};

  if (hvacRecord.externalControlEnabled !== undefined) {
    result.externalControlEnabled = Boolean(hvacRecord.externalControlEnabled);
  }

  if (manufacturer !== undefined) {
    result.manufacturer = manufacturer;
  }

  // modbus는 모든 필드가 있는 경우에만 추가
  if (modbus && modbus.port !== undefined && modbus.baudRate !== undefined && modbus.parity !== undefined) {
    result.modbus = {
      port: modbus.port,
      baudRate: modbus.baudRate,
      parity: modbus.parity,
    };
  } else if (modbus) {
    // 부분적으로만 있는 경우도 허용 (우선순위 병합 시 사용)
    if (modbus.port !== undefined || modbus.baudRate !== undefined || modbus.parity !== undefined) {
      result.modbus = {
        port: modbus.port || '/dev/ttyS1',
        baudRate: modbus.baudRate ?? 9600,
        parity: modbus.parity || 'even',
      };
    }
  }

  return result;
}

/**
 * 하이브리드 설정 시스템: Unit.data > System.hvac > 환경변수
 * @param unit 냉난방기 유닛
 * @returns HVAC 설정 (우선순위에 따라 병합)
 */
export async function getHvacConfigForUnit(unit: IUnit): Promise<HvacConfig> {
  // 1. 환경변수 기본값
  const envConfig = getEnvHvacConfig();

  // 2. System 설정 (캐시 사용)
  const systemHvac = await getSystemHvacSettings();

  // 3. Unit.data 설정
  const unitHvac = getUnitHvacConfig(unit);

  // 우선순위: Unit.data > System.hvac > 환경변수
  const port =
    unitHvac?.modbus?.port ??
    systemHvac?.modbus?.port ??
    envConfig.modbus?.port ??
    '/dev/ttyS1';
  const baudRate =
    unitHvac?.modbus?.baudRate ??
    systemHvac?.modbus?.baudRate ??
    envConfig.modbus?.baudRate ??
    9600;
  const parity =
    (unitHvac?.modbus?.parity ??
      systemHvac?.modbus?.parity ??
      envConfig.modbus?.parity ??
      'even') as 'none' | 'even' | 'odd';

  return {
    externalControlEnabled:
      unitHvac?.externalControlEnabled ??
      systemHvac?.externalControlEnabled ??
      envConfig.externalControlEnabled ??
      false,
    manufacturer:
      unitHvac?.manufacturer !== undefined
        ? unitHvac.manufacturer
        : systemHvac?.manufacturer !== undefined
          ? systemHvac.manufacturer
          : envConfig.manufacturer !== undefined
            ? envConfig.manufacturer
            : null,
    modbus: {
      port,
      baudRate,
      parity,
    },
  };
}

/**
 * System HVAC 설정 캐시 무효화
 */
export function invalidateSystemHvacCache(): void {
  systemHvacCache = null;
}

/**
 * HVAC Modbus 설정 가져오기 (외부제어 전용 포트/설정)
 */
export function getHvacModbusConfig(port: string): {
  port: string;
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  timeout?: number;
  retries?: number;
  rtscts?: boolean;
} {
  const envConfig = getEnvHvacConfig();

  return {
    port: port || envConfig.modbus?.port || '/dev/ttyS1',
    baudRate: envConfig.modbus?.baudRate || 9600,
    dataBits: 8,
    stopBits: 1,
    parity: (envConfig.modbus?.parity || 'even') as 'none' | 'even' | 'odd',
    timeout: 1000,
    retries: 1,
    rtscts: false,
  };
}

/**
 * HvacConfig를 System 스키마 형식으로 변환하는 헬퍼
 */
export interface IHvacConfig {
  externalControlEnabled: boolean;
  manufacturer: 'SAMSUNG' | 'LG' | null;
  modbus: {
    port: string;
    baudRate: number;
    parity: 'none' | 'even' | 'odd';
  };
}
