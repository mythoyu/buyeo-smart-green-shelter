/**
 * CLIENT_PORT_MAPPINGS 구조 변경에 따른 새로운 타입 정의
 *
 * 이전: SET_AUTO: HW_PORTS.DO1.AUTO.set (직접 포트 객체)
 * 현재: SET_AUTO: { port: HW_PORTS.DO1.AUTO.set, collection: 'data', field: 'auto', type: 'boolean' }
 */

export interface CommandConfig {
  port: {
    functionCode: number;
    address: number;
    description?: string;
  };
  collection: string;
  field: string;
  type: string;
}

export interface TimeIntegratedCommand {
  [key: string]: 'TIME_INTEGRATED';
}

export interface CommonSystemPorts {
  ddc_time: Record<string, CommandConfig>;
  seasonal: Record<string, CommandConfig>;
}

export interface DeviceMapping {
  [unitId: string]: Record<string, CommandConfig | 'TIME_INTEGRATED'>;
}

export interface ClientMapping {
  lighting?: DeviceMapping;
  cooler?: DeviceMapping;
  exchanger?: DeviceMapping;
  door?: DeviceMapping;
  integrated_sensor?: DeviceMapping;
  externalsw?: DeviceMapping;
  ddc_time: Record<string, CommandConfig>;
  seasonal: Record<string, CommandConfig>;
}

export interface ModbusInfo {
  functionCode: number;
  address: number;
  description?: string;
}

export interface CommandMetadata {
  collection: string;
  field: string;
  type: string;
}
