import { ModbusCommand } from '../ModbusCommandQueue';

export interface ModbusResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp?: Date;
}

export interface IUnifiedModbusCommunicationService {
  executeDirect(command: ModbusCommand): Promise<ModbusResponse>;
  setActiveService(service: 'real' | 'mock'): void;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
