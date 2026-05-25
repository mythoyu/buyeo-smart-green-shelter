import fs from 'fs';
import path from 'path';

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { registerLogWriter } from './shared/logging/createLogger';
import {
  formatConsoleLine,
  koreanTimestamp,
  legacyMessageEvent,
  parseLegacyLogMessage,
  toStructuredRecord,
} from './shared/logging/format';
import type { LogEvent, LogLevel } from './shared/logging/types';

const getLogDir = () => {
  if (process.env.LOG_DIR) {
    return process.env.LOG_DIR;
  }
  return path.join(process.cwd(), 'logs');
};

const ensureLogDir = () => {
  const logDir = getLogDir();
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
};

const logDir = ensureLogDir();

const writeStructuredLog = (level: LogLevel, event: LogEvent): void => {
  winstonLogger.log(level, event.msg, toStructuredRecord(level, event, koreanTimestamp()));
};

registerLogWriter(writeStructuredLog);

const createWinstonLogger = () => {
  const isDev = process.env.NODE_ENV !== 'production';

  const dailyRotateFileTransport = new DailyRotateFile({
    filename: path.join(logDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp({ format: () => koreanTimestamp() }),
      winston.format.errors({ stack: true }),
      winston.format.printf(info => {
        const { level, message, stack, service, msg, meta, ts, ...rest } = info;
        const svc = (service as string) ?? 'app';
        const body = (msg as string) ?? String(message);
        const record = {
          ts: ts || info.timestamp || koreanTimestamp(),
          level,
          service: svc,
          msg: body,
          message: (message as string) ?? `[${svc}] ${body}`,
          ...(meta && typeof meta === 'object' ? { meta } : {}),
          ...(stack ? { stack } : {}),
          ...rest,
        };
        return JSON.stringify(record);
      }),
    ),
  });

  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.printf(info => {
        const level = (info.level as LogLevel) || 'info';
        const event: LogEvent = {
          service: (info.service as string) ?? 'app',
          msg: (info.msg as string) ?? String(info.message),
        };
        const meta = info.meta as LogEvent['meta'];
        if (meta !== undefined) {
          event.meta = meta;
        }
        if (info.stack) {
          event.err = { message: String(info.message), stack: String(info.stack) };
        }
        const ts = (info.ts as string) || koreanTimestamp();
        let line = formatConsoleLine(level, event, ts, { includeMeta: isDev });
        if (info.stack) {
          line += `\n${info.stack}`;
        }
        if (isDev) {
          if (level === 'error') return `\x1b[31m${line}\x1b[0m`;
          if (level === 'warn') return `\x1b[33m${line}\x1b[0m`;
          if (level === 'info') return `\x1b[32m${line}\x1b[0m`;
          if (level === 'debug') return `\x1b[36m${line}\x1b[0m`;
        }
        return line;
      }),
    ),
  });

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [consoleTransport, dailyRotateFileTransport],
  });
};

const winstonLogger = createWinstonLogger();

export const logInfo = (message: string, meta?: Record<string, unknown>) =>
  writeStructuredLog('info', parseLegacyLogMessage(message, meta, 'app'));

export const logWarn = (message: string, meta?: Record<string, unknown> | unknown) =>
  writeStructuredLog('warn', parseLegacyLogMessage(message, meta as Record<string, unknown> | undefined, 'app'));

export const logError = (message: string, meta?: unknown) => {
  if (meta instanceof Error) {
    const event = parseLegacyLogMessage(message, undefined, 'app');
    event.err = meta;
    writeStructuredLog('error', event);
    return;
  }
  writeStructuredLog('error', parseLegacyLogMessage(message, meta as Record<string, unknown> | undefined, 'app'));
};

export const logDebug = (message: string | Record<string, unknown>, meta?: Record<string, unknown> | unknown) => {
  if (typeof message === 'string') {
    writeStructuredLog(
      'debug',
      parseLegacyLogMessage(message, meta as Record<string, unknown> | undefined, 'app'),
    );
  } else {
    const messageText = (message.message as string) || 'No message';
    writeStructuredLog(
      'debug',
      parseLegacyLogMessage(messageText, meta as Record<string, unknown> | undefined, 'app'),
    );
  }
};

export { legacyMessageEvent, parseLegacyLogMessage, writeStructuredLog };
export default winstonLogger;

// Fastify용 로거 설정 (최소한의 로깅만, Pino 호환)
export const createFastifyLogger = () => {
  return {
    level: 'info',
    serializers: {
      req: (req: any) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
      }),
    },
    info: (message: string) => {
      console.log(`[Fastify] ${message}`);
    },
    warn: (message: string) => {
      console.log(`[Fastify] ${message}`);
    },
    error: (message: string) => {
      console.log(`[Fastify] ${message}`);
    },
    debug: (message: string) => {
      console.log(`[Fastify] ${message}`);
    },
    fatal: (message: string) => {
      console.log(`[Fastify] ${message}`);
    },
    trace: (message: string) => {
      console.log(`[Fastify] ${message}`);
    },
    child: (bindings: any) => {
      return {
        info: (message: string) => {
          const bindingsStr = Object.keys(bindings).length > 0 ? ` [${JSON.stringify(bindings)}]` : '';
          console.log(`[Fastify] ${message}${bindingsStr}`);
        },
        warn: (message: string) => {
          const bindingsStr = Object.keys(bindings).length > 0 ? ` [${JSON.stringify(bindings)}]` : '';
          console.log(`[Fastify] ${message}${bindingsStr}`);
        },
        error: (message: string) => {
          const bindingsStr = Object.keys(bindings).length > 0 ? ` [${JSON.stringify(bindings)}]` : '';
          console.log(`[Fastify] ${message}${bindingsStr}`);
        },
        debug: (message: string) => {
          const bindingsStr = Object.keys(bindings).length > 0 ? ` [${JSON.stringify(bindings)}]` : '';
          console.log(`[Fastify] ${message}${bindingsStr}`);
        },
        fatal: (message: string) => {
          const bindingsStr = Object.keys(bindings).length > 0 ? ` [${JSON.stringify(bindings)}]` : '';
          console.log(`[Fastify] ${message}${bindingsStr}`);
        },
        trace: (message: string) => {
          const bindingsStr = Object.keys(bindings).length > 0 ? ` [${JSON.stringify(bindings)}]` : '';
          console.log(`[Fastify] ${message}${bindingsStr}`);
        },
        child: (newBindings: any) => {
          return createFastifyLogger().child({ ...bindings, ...newBindings });
        },
      };
    },
  };
};
