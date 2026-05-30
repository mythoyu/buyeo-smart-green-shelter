import { ServiceContainer } from '../../core/container/ServiceContainer';
import { logWarn } from '../../logger';
import { toModbusWire } from '../../shared/utils/deviceFieldMapper';
import {
  getDefaultLogical,
  randomLogicalInKind,
  resolveWireKind,
  useMockDefaultsOnly,
} from './fieldValueSpec';
import {
  lookupReverseIndex,
  type ReverseIndexSpec,
} from './modbusReverseIndex';

export type { PortSpec, ReverseIndexSpec } from './modbusReverseIndex';
export {
  buildReverseIndex,
  makeClientReverseIndexKey,
  makeLegacyReverseIndexKey,
  resolveReverseIndexSpec,
  lookupReverseIndex,
} from './modbusReverseIndex';

let serviceContainer: ServiceContainer | null = null;

export const initializeMockGenerator = (container: ServiceContainer): void => {
  serviceContainer = container;
};

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

  return toModbusWire(deviceType, field, logical, {
    ...(spec.clientId !== undefined && { clientId: spec.clientId }),
    fieldType: type,
  });
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
