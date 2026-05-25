import { WebSocket } from 'ws';

// 공통 메시지 인터페이스
export interface BaseMessage {
  type: 'log' | 'command-status' | 'polling-recovery-prompt' | 'polling-recovery-resolved';
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
  timestamp: string;
}

export interface LogMessage extends BaseMessage {
  type: 'log';
  data?: any;
}

export interface CommandStatusMessage extends BaseMessage {
  type: 'command-status';
  level: 'info'; // command-status는 항상 info 레벨
  deviceId: string;
  unitId: string;
  action: string;
  status: 'pending' | 'success' | 'fail';
  value?: any; // value 속성 추가
  error?: string; // error 속성 추가
}

export interface PollingRecoveryPromptMessage extends BaseMessage {
  type: 'polling-recovery-prompt';
  level: 'info';
  data: {
    promptId: string;
    autoDismissSec: number;
    expiresAt: string;
  };
}

export interface PollingRecoveryResolvedMessage extends BaseMessage {
  type: 'polling-recovery-resolved';
  level: 'info';
  data: {
    promptId: string;
    reason: 'accepted' | 'dismissed' | 'expired';
  };
}

export type BroadcastMessage =
  | LogMessage
  | CommandStatusMessage
  | PollingRecoveryPromptMessage
  | PollingRecoveryResolvedMessage;

export interface IWebSocketService {
  initialize(server: any): void;
  handleConnection(ws: WebSocket, req?: any): void;
  broadcast(message: BroadcastMessage): void;
  broadcastLog(level: 'info' | 'warn' | 'error' | 'debug', service: string, message: string, data?: any): void;
  broadcastCommandStatus(
    deviceId: string,
    unitId: string,
    action: string,
    status: 'pending' | 'success' | 'fail',
    value?: any, // value 매개변수 추가
    error?: string, // error 매개변수 추가
  ): void;
  broadcastPollingRecoveryPrompt(promptId: string, expiresAt: string, autoDismissSec: number): void;
  broadcastPollingRecoveryResolved(
    promptId: string,
    reason: 'accepted' | 'dismissed' | 'expired',
  ): void;
  getConnectedClientsCount(): number;
  close(): void;
}
