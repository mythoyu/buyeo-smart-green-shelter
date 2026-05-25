import { UnitValue } from '../../types';

import { combineLogParts, formatConsoleLine, koreanTimestamp, legacyMessageEvent } from './format';
import type { LogEvent, LogLevel } from './types';

export type AppLogger = {
  info: (action: string, msg: string, meta?: Record<string, UnitValue>) => void;
  warn: (action: string, msg: string, meta?: Record<string, UnitValue>) => void;
  error: (action: string, msg: string, err?: unknown, meta?: Record<string, UnitValue>) => void;
  debug: (action: string, msg: string, meta?: Record<string, UnitValue>) => void;
};

let writeLogImpl: ((level: LogLevel, event: LogEvent) => void) | null = null;

/** logger.ts 초기화 후 등록 */
export function registerLogWriter(writer: (level: LogLevel, event: LogEvent) => void): void {
  writeLogImpl = writer;
}

function toEvent(service: string, action: string, msg: string, meta?: Record<string, UnitValue>): LogEvent {
  const event: LogEvent = { service, msg: combineLogParts(action, msg) };
  if (meta !== undefined) {
    event.meta = meta;
  }
  return event;
}

function write(level: LogLevel, event: LogEvent): void {
  if (!writeLogImpl) {
    const line = formatConsoleLine(level, event, koreanTimestamp());
    if (level === 'error') {
      console.error(line, event.err ?? '');
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
    return;
  }
  writeLogImpl(level, event);
}

export function createLogger(service: string): AppLogger {
  return {
    info: (action, msg, meta) => write('info', toEvent(service, action, msg, meta)),
    warn: (action, msg, meta) => write('warn', toEvent(service, action, msg, meta)),
    error: (action, msg, err, meta) => {
      const event = toEvent(service, action, msg, meta);
      if (err !== undefined) {
        event.err = err;
      }
      write('error', event);
    },
    debug: (action, msg, meta) => write('debug', toEvent(service, action, msg, meta)),
  };
}

/** ILogger.info(message) 호환용 단일 문자열 */
export function writeLegacy(
  level: LogLevel,
  service: string,
  message: string,
  err?: unknown,
  meta?: Record<string, UnitValue>,
): void {
  const event = legacyMessageEvent(service, message, meta as Record<string, unknown> | undefined);
  if (err !== undefined) {
    event.err = err;
  }
  write(level, event);
}
