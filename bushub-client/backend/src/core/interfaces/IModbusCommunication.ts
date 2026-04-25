import { IUnit } from '../../models/schemas/UnitSchema';

// Modbus 통신 설정
export interface ModbusConnectionConfig {
  port: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
  timeout: number;
}

/**
 * Modbus 읽기 요청.
 * REST/API·DB에 노출되는 cooler `mode`/`speed` 등은 LG 계약(현장 순서)이며,
 * 삼성 와이어 값 ↔ 계약값 매핑은 RealModbusService에서 c0101·c0102에 한해 수행한다.
 */
export interface ModbusReadRequest {
  slaveId: number;
  functionCode: number;
  address: number;
  length: number;
  /** 통신 대상 스마트시티 클라이언트 ID (역색인·삼성 cooler 변환용). 없으면 레거시 단일 키 조회. */
  clientId?: string;
  context?: 'emergency' | 'control' | 'schedule' | 'polling' | 'maintenance';
}

/** Modbus 쓰기 요청. cooler 계약·삼성 변환 규칙은 {@link ModbusReadRequest}와 동일. */
export interface ModbusWriteRequest {
  slaveId: number;
  functionCode: number;
  address: number;
  value: number;
  /** 통신 대상 스마트시티 클라이언트 ID (역색인·삼성 cooler 변환용). 없으면 레거시 단일 키 조회. */
  clientId?: string;
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

// 기본 Modbus 통신 인터페이스
export interface IModbusCommunication {
  // 연결 관리
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // 기본 Modbus 통신
  readRegisters(request: ModbusReadRequest): Promise<ModbusResponse>;
  writeRegister(request: ModbusWriteRequest): Promise<ModbusResponse>;

  // 🆕 중앙큐를 통한 명령 실행
  executeCommand(command: any): Promise<any>;

  // 큐 관리
  getQueueStatus(): QueueStatus;
  getUnitQueueStatus(unitId: string): UnitQueueStatus;
  clearQueue(): void;

  // 서비스 생명주기
  destroy(): void;
  isMockMode(): boolean;
}

// 통합된 Modbus 통신 인터페이스 (하이브리드 지원)
export interface IUnifiedModbusCommunication extends IModbusCommunication {
  // 🆕 중앙 큐를 통한 명령 실행
  executeCommand(command: any): Promise<any>;

  isUnitConnected(unit: IUnit): boolean;
}
