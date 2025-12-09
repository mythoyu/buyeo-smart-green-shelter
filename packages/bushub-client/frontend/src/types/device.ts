export interface Unit {
  id: string;
  name: string;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  units: Unit[];
}

export type DeviceFieldSpec = {
  key: string;
  label: string;
  type: 'boolean' | 'string' | 'int' | 'float' | 'time' | 'number';
  min: number | string | null;
  max: number | string | null;
  options?: string[];
  description?: string;
  readOnly?: boolean;
  render?: 'toggle' | 'select' | 'time' | 'input' | 'readonly' | 'button';
  unit?: string; // 단위 (예: '°C', 'ppm', '㎍/㎥' 등)
};

export type DeviceSpecMap = Record<string, DeviceFieldSpec[]>;

export type DeviceUnitData = {
  id: string;
  name: string;
  type: string;
  fields: Record<string, any>;
};

export type DeviceWithSpec = {
  id: string;
  name: string;
  type: string;
  spec: DeviceFieldSpec[];
  units: DeviceUnitData[];
};
