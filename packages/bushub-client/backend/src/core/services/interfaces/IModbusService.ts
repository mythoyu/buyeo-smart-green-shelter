import { IUnit } from '../../../models/schemas/UnitSchema';

// Modbus 통신 설정
export interface ModbusConnectionConfig {
  port: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
  timeout: number;
}

// Modbus 읽기 요청
export interface ModbusReadRequest {
  slaveId: number;
  functionCode: number;
  address: number;
  length: number;
  context?: 'emergency' | 'control' | 'schedule' | 'polling' | 'maintenance';
}

// Modbus 쓰기 요청
export interface ModbusWriteRequest {
  slaveId: number;
  functionCode: number;
  address: number;
  value: number;
  context?: 'emergency' | 'control' | 'schedule' | 'polling' | 'maintenance';
}

// Modbus 응답
export interface ModbusResponse {
  success: boolean;
  data?: number[];
  error?: string | undefined;
  commandId?: string;
  processingTime?: number;
}

// 큐 상태
export interface QueueStatus {
  highPriority: number;
  normalPriority: number;
  lowPriority: number;
  isProcessing: boolean;
  totalCommands: number;
}

// 유닛별 큐 상태
export interface UnitQueueStatus {
  highPriority: number;
  normalPriority: number;
  lowPriority: number;
  totalCommands: number;
}

// 통합된 Modbus 서비스 인터페이스
export interface IModbusService {
  // ==================== 기존 IModbusService 메서드 ====================

  // Unit 기반 읽기/쓰기 (레거시 호환성)
  read(unit: IUnit, functionCode: number, address: number, length: number): Promise<any>;
  write(unit: IUnit, functionCode: number, address: number, value: any): Promise<any>;

  // Unit 기반 연결 관리 (레거시 호환성)
  connect(unit: IUnit): Promise<void>;
  disconnect(unit: IUnit): Promise<void>;
  isConnected(unit: IUnit): boolean;

  // ==================== 큐 관리 ====================

  // 큐 상태 조회 메서드들
  getQueueStatus(): QueueStatus;
  getUnitQueueStatus(unitId: string): UnitQueueStatus;
  clearQueue(): void;
}
