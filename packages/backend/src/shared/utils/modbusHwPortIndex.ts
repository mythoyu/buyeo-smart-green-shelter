import { HW_PORTS, HardwarePortCommand, PortCommand } from '../../meta/hardware/ports';

export interface HwPortGetLookup {
  hwPort: string;
  hwCommand: string;
}

const HW_PORT_BLOCK_KEYS = new Set([
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
  'COOLER',
  'EXCHANGER',
  'INTEGRATED_SENSOR',
]);

let getIndexCache: Map<string, HwPortGetLookup> | null = null;

function makeLookupKey(functionCode: number, address: number): string {
  return `${functionCode}:${address}`;
}

function registerGet(
  index: Map<string, HwPortGetLookup>,
  spec: HardwarePortCommand,
  hwPort: string,
  hwCommand: string,
): void {
  index.set(makeLookupKey(spec.functionCode, spec.address), { hwPort, hwCommand });
}

function indexPortCommands(
  index: Map<string, HwPortGetLookup>,
  hwPort: string,
  commands: Record<string, PortCommand>,
): void {
  for (const [hwCommand, portCommand] of Object.entries(commands)) {
    if (portCommand?.get) {
      registerGet(index, portCommand.get, hwPort, hwCommand);
    }
  }
}

/** HW_PORTS GET 스펙 → fc:address 역인덱스 (폴링 bulk 그룹핑용) */
export function buildHwPortGetIndex(): Map<string, HwPortGetLookup> {
  if (getIndexCache) {
    return getIndexCache;
  }

  const index = new Map<string, HwPortGetLookup>();
  const hw = HW_PORTS as Record<string, unknown>;

  for (const [portKey, portBlock] of Object.entries(hw)) {
    if (!portBlock || typeof portBlock !== 'object') {
      continue;
    }

    if (portKey === 'DI_STATUS') {
      const diStatus = portBlock as Record<string, { get?: HardwarePortCommand }>;
      for (const [diKey, diBlock] of Object.entries(diStatus)) {
        if (diBlock?.get) {
          registerGet(index, diBlock.get, 'DI_STATUS', diKey);
        }
      }
      continue;
    }

    if (!HW_PORT_BLOCK_KEYS.has(portKey)) {
      continue;
    }

    indexPortCommands(index, portKey, portBlock as Record<string, PortCommand>);
  }

  getIndexCache = index;
  return index;
}

export function lookupHwPortGet(functionCode: number, address: number): HwPortGetLookup | undefined {
  return buildHwPortGetIndex().get(makeLookupKey(functionCode, address));
}

export function clearHwPortGetIndexCache(): void {
  getIndexCache = null;
}
