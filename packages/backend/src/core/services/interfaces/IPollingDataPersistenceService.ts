import { ModbusCommand } from '../ModbusCommandQueue';

export interface IPollingDataPersistenceService {
  savePollingData(slaveId: number, data: any): Promise<void>;
  saveModbusReadResult(deviceId: string, unitId: string, command: ModbusCommand, result: any): Promise<void>;
  getPollingData(slaveId: number, limit?: number): Promise<any[]>;
}
