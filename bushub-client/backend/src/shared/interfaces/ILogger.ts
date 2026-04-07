import { UnitValue } from '../../types';

export interface ILogger {
  info(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  debug(message: string): void;
}

export interface LogParams {
  service: string;
  message: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  error?: Error;
  meta?: Record<string, UnitValue>;
}
