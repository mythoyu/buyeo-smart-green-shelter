import { HW_PORTS } from '../../meta/hardware/ports';

import type { CommandConfig } from '../clientPortMappings/types';
import { DO_PORT_KEYS, type DoPortKey } from './doPortTypes';

type UnitMappingValue = CommandConfig | 'TIME_INTEGRATED' | Record<string, unknown>;

function getReferenceAddress(unitMapping: Record<string, UnitMappingValue>): number | null {
  const keys = ['GET_POWER', 'GET_AUTO', 'SET_POWER', 'SET_AUTO'] as const;
  for (const key of keys) {
    const entry = unitMapping[key];
    if (!entry || entry === 'TIME_INTEGRATED') {
      continue;
    }
    const spec = entry as CommandConfig;
    const addr = spec.port?.address;
    if (typeof addr === 'number') {
      return addr;
    }
  }
  return null;
}

/**
 * TS 유닛 매핑에서 DO1~DO16 키 역추출 (시드·검증용)
 */
export function resolveDoPortFromUnitMapping(unitMapping: Record<string, UnitMappingValue>): DoPortKey | null {
  const address = getReferenceAddress(unitMapping);
  if (address == null) {
    return null;
  }

  for (const doKey of DO_PORT_KEYS) {
    const block = HW_PORTS[doKey];
    const candidates = [block.POWER?.get?.address, block.AUTO?.get?.address, block.AUTO?.set?.address];
    if (candidates.some((a) => a === address)) {
      return doKey;
    }
  }

  return null;
}

