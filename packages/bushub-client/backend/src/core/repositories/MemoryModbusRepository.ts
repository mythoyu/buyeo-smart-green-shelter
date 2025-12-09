import {
  IModbusRepository,
  ModbusConnection,
  ModbusReadResult,
  ModbusWriteResult,
} from './interfaces/IModbusRepository';

export class MemoryModbusRepository implements IModbusRepository {
  private connections: Map<string, ModbusConnection> = new Map();
  private readHistory: ModbusReadResult[] = [];
  private writeHistory: ModbusWriteResult[] = [];

  getConnection(unitId: string): ModbusConnection | null {
    return this.connections.get(unitId) || null;
  }

  saveConnection(connection: ModbusConnection): void {
    this.connections.set(connection.unitId, connection);
  }

  removeConnection(unitId: string): boolean {
    return this.connections.delete(unitId);
  }

  getAllConnections(): ModbusConnection[] {
    return Array.from(this.connections.values());
  }

  saveReadResult(result: ModbusReadResult): void {
    this.readHistory.push(result);
    // 최대 1000개까지만 유지
    if (this.readHistory.length > 1000) {
      this.readHistory = this.readHistory.slice(-1000);
    }
  }

  saveWriteResult(result: ModbusWriteResult): void {
    this.writeHistory.push(result);
    // 최대 1000개까지만 유지
    if (this.writeHistory.length > 1000) {
      this.writeHistory = this.writeHistory.slice(-1000);
    }
  }

  getReadHistory(unitId: string, limit = 100): ModbusReadResult[] {
    const filtered = this.readHistory.filter((result) => result.unitId === unitId);
    return filtered.slice(-limit);
  }

  getWriteHistory(unitId: string, limit = 100): ModbusWriteResult[] {
    const filtered = this.writeHistory.filter((result) => result.unitId === unitId);
    return filtered.slice(-limit);
  }
}
