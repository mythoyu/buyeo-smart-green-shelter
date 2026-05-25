import { writeLegacy } from '../logging/createLogger';
import { UnitValue } from '../../types';
import { ILogger } from '../interfaces/ILogger';

/** 클래스명 그대로 태그 (예: ControlService) */
export function loggerFor(ctor: { name: string }): Logger {
  return new Logger(ctor.name);
}

export class Logger implements ILogger {
  constructor(private readonly service = 'app') {}

  info(message: string, meta?: Record<string, UnitValue>): void {
    writeLegacy('info', this.service, message, undefined, meta);
  }

  warn(message: string, meta?: Record<string, UnitValue>): void {
    writeLegacy('warn', this.service, message, undefined, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, UnitValue>): void {
    writeLegacy('error', this.service, message, error, meta);
  }

  debug(message: string, meta?: Record<string, UnitValue>): void {
    writeLegacy('debug', this.service, message, undefined, meta);
  }
}
