/** DI 접점 할당 대상 장비 타입 */
export const DI_ASSIGNABLE_DEVICE_TYPES = ['externalsw'] as const;

export type DiAssignableDeviceType = (typeof DI_ASSIGNABLE_DEVICE_TYPES)[number];

export const DI_PORT_KEYS = [
  'DI1',
  'DI2',
  'DI3',
  'DI4',
  'DI5',
  'DI6',
  'DI7',
  'DI8',
  'DI9',
  'DI10',
  'DI11',
  'DI12',
  'DI13',
  'DI14',
  'DI15',
  'DI16',
] as const;

export type DiPortKey = (typeof DI_PORT_KEYS)[number];

export function isDiPortKey(value: string): value is DiPortKey {
  return (DI_PORT_KEYS as readonly string[]).includes(value);
}

export function isDiAssignableDeviceType(value: string): value is DiAssignableDeviceType {
  return (DI_ASSIGNABLE_DEVICE_TYPES as readonly string[]).includes(value);
}

