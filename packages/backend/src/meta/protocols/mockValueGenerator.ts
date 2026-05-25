import { ServiceContainer } from '../../core/container/ServiceContainer';
import { getEffectiveClientMappings } from '../../core/services/PortMappingService';
import { logWarn } from '../../logger';
import {
  encodeLogicalToWire,
  getDefaultLogical,
  randomLogicalInKind,
  resolveWireKind,
  useMockDefaultsOnly,
} from './fieldValueSpec';

export interface PortSpec {
  field?: string;
  type?: 'boolean' | 'number' | 'string' | 'float' | string;
  deviceType?: string;
}

export interface ReverseIndexSpec extends PortSpec {
  functionCode: number;
  address: number;
  clientId?: string;
  unitId?: string;
}

export const makeLegacyReverseIndexKey = (functionCode: number, address: number): string =>
  `${functionCode}:${address}`;

export const makeClientReverseIndexKey = (
  clientId: string,
  functionCode: number,
  address: number,
): string => `${clientId}:${functionCode}:${address}`;

let serviceContainer: ServiceContainer | null = null;

export const initializeMockGenerator = (container: ServiceContainer): void => {
  serviceContainer = container;
};

export const buildReverseIndex = (): Map<string, ReverseIndexSpec> => {
  const index = new Map<string, ReverseIndexSpec>();
  try {
    const clients = getEffectiveClientMappings() as Record<string, Record<string, Record<string, Record<string, unknown>>>>;
    for (const [clientId, clientMapping] of Object.entries(clients)) {
      if (!clientMapping || typeof clientMapping !== 'object') continue;
      for (const [deviceType, deviceMapping] of Object.entries(clientMapping)) {
        if (!deviceMapping || typeof deviceMapping !== 'object') continue;
        for (const [unitId, unitMapping] of Object.entries(deviceMapping)) {
          if (!unitMapping || typeof unitMapping !== 'object') continue;
          for (const [, actionSpec] of Object.entries(unitMapping)) {
            if (typeof actionSpec !== 'object' || actionSpec === null) continue;
            const spec = actionSpec as {
              port?: { functionCode: number; address: number };
              field?: string;
              type?: string;
            };
            if (
              spec.port &&
              typeof spec.port.functionCode === 'number' &&
              typeof spec.port.address === 'number'
            ) {
              const entry: ReverseIndexSpec = {
                functionCode: spec.port.functionCode,
                address: spec.port.address,
                deviceType,
                clientId,
                unitId,
              };
              if (spec.field !== undefined) entry.field = spec.field;
              if (spec.type !== undefined) entry.type = spec.type;
              index.set(
                makeClientReverseIndexKey(clientId, spec.port.functionCode, spec.port.address),
                entry,
              );
              index.set(makeLegacyReverseIndexKey(spec.port.functionCode, spec.port.address), entry);
            }
          }
        }
      }
    }
  } catch (error) {
    logWarn(`[mockValueGenerator] Failed to build reverse index: ${String(error)}`);
  }
  return index;
};

/** Real·Mock 공통 — clientId 우선, 없으면 legacy 키 */
export function lookupReverseIndex(
  index: Map<string, ReverseIndexSpec> | undefined,
  functionCode: number,
  address: number,
  clientId?: string,
): ReverseIndexSpec | undefined {
  if (!index) return undefined;
  if (clientId) {
    const hit = index.get(makeClientReverseIndexKey(clientId, functionCode, address));
    if (hit) return hit;
  }
  return index.get(makeLegacyReverseIndexKey(functionCode, address));
}

/** packages 레거시 시그니처 (clientId, functionCode, address) */
export function resolveReverseIndexSpec(
  index: Map<string, ReverseIndexSpec> | undefined,
  clientId: string | undefined,
  functionCode: number,
  address: number,
): ReverseIndexSpec | undefined {
  return lookupReverseIndex(index, functionCode, address, clientId);
}

/** bulk read: 시작 주소부터 offset마다 역인덱스 lookup 후 wire 생성 */
export async function generateWireValuesForAddressRange(
  index: Map<string, ReverseIndexSpec> | undefined,
  functionCode: number,
  startAddress: number,
  length: number,
  clientId?: string,
): Promise<number[]> {
  const n = Math.max(1, length);
  const results: number[] = [];
  for (let offset = 0; offset < n; offset += 1) {
    const spec = lookupReverseIndex(index, functionCode, startAddress + offset, clientId);
    results.push(await generateSingle(spec));
  }
  return results;
}

/** @deprecated 단일 주소·length>1은 generateWireValuesForAddressRange 사용 */
export const generateBySpec = async (
  spec: ReverseIndexSpec | undefined,
  length: number,
  index?: Map<string, ReverseIndexSpec>,
): Promise<number[]> => {
  if (
    index &&
    spec &&
    typeof spec.functionCode === 'number' &&
    typeof spec.address === 'number' &&
    length > 1
  ) {
    return generateWireValuesForAddressRange(
      index,
      spec.functionCode,
      spec.address,
      length,
      spec.clientId,
    );
  }
  const results: number[] = [];
  for (let i = 0; i < Math.max(1, length); i += 1) {
    results.push(await generateSingle(spec));
  }
  return results;
};

const generateSingle = async (spec?: ReverseIndexSpec): Promise<number> => {
  if (!spec?.field && !spec?.deviceType) {
    logWarn('[mockValueGenerator] spec 없음 — wire 0 반환');
    return 0;
  }

  const field = spec.field || '';
  const type = (spec.type || '').toString();
  const deviceType = (spec.deviceType || '').toString();
  const kind = resolveWireKind(deviceType, field, type);

  if (field === 'alarm') {
    return await generateAlarmErrorValue(deviceType, field);
  }

  let logical: number;
  if (useMockDefaultsOnly()) {
    const def = getDefaultLogical(spec.clientId, deviceType, spec.unitId || 'u001', field);
    logical = def !== undefined ? def : randomLogicalInKind(kind);
  } else {
    logical = randomLogicalInKind(kind);
  }

  return encodeLogicalToWire(kind, logical);
};

const generateAlarmErrorValue = async (deviceType: string, field: string): Promise<number> => {
  try {
    if (!serviceContainer) return 0;

    const unifiedModbusService = serviceContainer.getUnifiedModbusService();
    const communicationService = (
      unifiedModbusService as {
        communicationService?: {
          mockService?: {
            getAlarmErrorTestStatus: () => { enabled: boolean; deviceType: string; value: number };
          };
        };
      }
    ).communicationService;
    const mockModbusService = communicationService?.mockService;
    if (!mockModbusService) return 0;

    const alarmTestStatus = mockModbusService.getAlarmErrorTestStatus();
    if (!alarmTestStatus.enabled) return 0;

    const targetDeviceType = alarmTestStatus.deviceType;
    if (targetDeviceType !== 'all' && targetDeviceType !== deviceType) return 0;

    return alarmTestStatus.value;
  } catch (error) {
    logWarn(`[mockValueGenerator] Alarm 에러 값 생성 실패: ${error}`);
    return 0;
  }
};
