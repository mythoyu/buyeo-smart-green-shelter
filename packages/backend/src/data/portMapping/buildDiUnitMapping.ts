import { HW_PORTS } from '../../meta/hardware/ports';
import type { CommandConfig } from '../clientPortMappings/types';

import type { DiPortKey } from './diPortTypes';

type UnitCommandMapping = Record<string, CommandConfig>;

function cmd(
  port: { functionCode: number; address: number; description?: string },
  field: string,
  type: string,
  collection = 'data',
): CommandConfig {
  return { port, collection, field, type };
}

/**
 * DI 번호로 외부스위치 유닛에 붙는 DI 명령 블록 생성 (기존 DO 매핑 위에 merge)
 */
export function buildDiUnitMapping(diPort: DiPortKey): UnitCommandMapping {
  const diBlock = HW_PORTS[diPort];
  const mapping: UnitCommandMapping = {};

  if (diBlock.ENABLE?.set && diBlock.ENABLE?.get) {
    mapping.SET_DI_ENABLE = cmd(diBlock.ENABLE.set, 'di_enable', 'boolean');
    mapping.GET_DI_ENABLE = cmd(diBlock.ENABLE.get, 'di_enable', 'boolean');
  }

  if ('STATUS' in diBlock && diBlock.STATUS?.get) {
    mapping.GET_CONTACT = cmd(diBlock.STATUS.get, 'contact', 'boolean');
  }

  return mapping;
}

