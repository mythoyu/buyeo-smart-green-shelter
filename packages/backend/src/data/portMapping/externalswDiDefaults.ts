import type { DiPortKey } from './diPortTypes';

/**
 * DEVICE_UNIT_SPEC 기준 외부스위치 유닛별 기본 DI (TS CLIENT_PORT_MAPPINGS에는 DI 미정의)
 * u001 → DI13, u002 → DI14
 */
const UNIT_TO_DI: Record<string, DiPortKey> = {
  u001: 'DI13',
  u002: 'DI14',
};

export function inferDefaultDiPort(
  _clientId: string,
  deviceType: string,
  unitId: string,
): DiPortKey | null {
  if (deviceType !== 'externalsw') {
    return null;
  }
  return UNIT_TO_DI[unitId] ?? null;
}

