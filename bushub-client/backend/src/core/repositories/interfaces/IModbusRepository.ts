export interface ModbusConnection {
  unitId: string;
  port: string;
  baudRate: number;
  slaveId: number;
  isConnected: boolean;
  lastConnected?: Date;
  lastError?: string;
}

export interface ModbusReadResult {
  value: number;
  timestamp: Date;
  unitId: string;
  functionCode: number;
  address: number;
  length: number;
}

export interface ModbusWriteResult {
  success: boolean;
  timestamp: Date;
  unitId: string;
  functionCode: number;
  address: number;
  value: any;
}

export interface IModbusRepository {
  getConnection(unitId: string): ModbusConnection | null;
  saveConnection(connection: ModbusConnection): void;
  removeConnection(unitId: string): boolean;
  getAllConnections(): ModbusConnection[];
  saveReadResult(result: ModbusReadResult): void;
  saveWriteResult(result: ModbusWriteResult): void;
  getReadHistory(unitId: string, limit?: number): ModbusReadResult[];
  getWriteHistory(unitId: string, limit?: number): ModbusWriteResult[];
}
