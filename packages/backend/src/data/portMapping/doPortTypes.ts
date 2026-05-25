/** DO 접점 할당 UI/API 대상 장비 타입 */
export const DO_ASSIGNABLE_DEVICE_TYPES = ['lighting', 'bench', 'door', 'externalsw'] as const;

export type DoAssignableDeviceType = (typeof DO_ASSIGNABLE_DEVICE_TYPES)[number];

export const DO_PORT_KEYS = [
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
] as const;

export type DoPortKey = (typeof DO_PORT_KEYS)[number];

export function isDoPortKey(value: string): value is DoPortKey {
  return (DO_PORT_KEYS as readonly string[]).includes(value);
}

export function isDoAssignableDeviceType(value: string): value is DoAssignableDeviceType {
  return (DO_ASSIGNABLE_DEVICE_TYPES as readonly string[]).includes(value);
}

