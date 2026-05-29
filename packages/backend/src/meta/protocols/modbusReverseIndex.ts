/**
 * Modbus FC+address → clientPortMappings 필드 역색인 (Real·Mock 공통)
 */
import { getEffectiveClientMappings } from '../../core/services/PortMappingService';
import { logWarn } from '../../logger';

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

export const buildReverseIndex = (): Map<string, ReverseIndexSpec> => {
  const index = new Map<string, ReverseIndexSpec>();
  try {
    const clients = getEffectiveClientMappings() as Record<
      string,
      Record<string, Record<string, Record<string, unknown>>>
    >;
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
    logWarn(`[modbusReverseIndex] 역색인 구축 실패: ${String(error)}`);
  }
  return index;
};

/** clientId 우선, 없으면 legacy 키 */
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

export function resolveReverseIndexSpec(
  index: Map<string, ReverseIndexSpec> | undefined,
  clientId: string | undefined,
  functionCode: number,
  address: number,
): ReverseIndexSpec | undefined {
  return lookupReverseIndex(index, functionCode, address, clientId);
}
