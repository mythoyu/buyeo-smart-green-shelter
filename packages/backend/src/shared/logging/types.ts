import { UnitValue } from '../../types';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEvent {
  service: string;
  msg: string;
  meta?: Record<string, UnitValue>;
  err?: unknown;
}

export interface StructuredLogRecord extends LogEvent {
  level: LogLevel;
  ts: string;
  /** LogAnalysis / legacy 호환 */
  message: string;
  stack?: string;
}
