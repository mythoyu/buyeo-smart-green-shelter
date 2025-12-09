export interface CommandData {
  key: string;
  label: string;
  type: string;
  get: boolean;
  set: boolean;
  action: {
    get: string;
    set?: string;
  };
  min?: string | number;
  max?: string | number;
  unit?: string;
  options?: (string | number | boolean)[];
  optionLabels?: Record<string, string | undefined>;
  defaultValue: any;
}

export interface UnitData {
  id: string;
  name: string;
}

export interface DeviceData {
  id: string;
  name: string;
  type: string;
  units: UnitData[];
  commands?: CommandData[];
}

export interface ClientData {
  id: string;
  name: string;
  location: string;
  region: string;
  city: string;
  type: string;
  latitude: number;
  longitude: number;
  devices: DeviceData[];
}

// 하드웨어 매핑 관련 타입들
export interface HardwarePortCommand {
  functionCode: number;
  address: number;
  description: string;
  length?: number;
}

export interface PortCommand {
  set?: HardwarePortCommand;
  get?: HardwarePortCommand;
}

export interface UnitHardwareMapping {
  unitId: string;
  deviceType: string;
  doMapping: Record<string, HardwarePortCommand>;
  diMapping?: Record<string, HardwarePortCommand>;
  hvacMapping?: Record<string, HardwarePortCommand>;
  scheduleMapping?: Record<string, HardwarePortCommand>;
}

export interface ClientPortMapping {
  [deviceType: string]: {
    [unitId: string]: Record<string, HardwarePortCommand>;
  };
}
