export interface IModbusService {
  connect(deviceId: string, unitId: string): Promise<boolean>;
  disconnect(deviceId: string, unitId: string): Promise<void>;
  isConnected(deviceId: string, unitId: string): boolean;
  read(deviceId: string, unitId: string, address: number, length: number): Promise<any>;
  write(deviceId: string, unitId: string, address: number, value: any): Promise<boolean>;
}
