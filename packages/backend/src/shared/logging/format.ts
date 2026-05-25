import type { UnitValue } from '../../types';
import { LogEvent, LogLevel, StructuredLogRecord } from './types';

const MAX_META_KEYS_CONSOLE = 6;

/** 콘솔 한 글자 레벨 태그 (파일 JSON level 필드는 info/debug 그대로) */
export const LEVEL_CONSOLE_TAG: Record<LogLevel, string> = {
  info: 'I',
  debug: 'D',
  warn: 'W',
  error: 'E',
};

export function koreanTimestamp(date = new Date()): string {
  const koreanTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = koreanTime.getUTCFullYear();
  const month = String(koreanTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(koreanTime.getUTCDate()).padStart(2, '0');
  const hours = String(koreanTime.getUTCHours()).padStart(2, '0');
  const minutes = String(koreanTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(koreanTime.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function serializeMetaValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'string') return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Error) return value.message;
  try {
    const s = JSON.stringify(value);
    return s.length > 120 ? `${s.slice(0, 117)}...` : s;
  } catch {
    return '[object]';
  }
}

export function formatMetaInline(meta?: Record<string, unknown>, maxKeys = MAX_META_KEYS_CONSOLE): string {
  if (!meta || Object.keys(meta).length === 0) return '';
  const parts = Object.entries(meta)
    .slice(0, maxKeys)
    .map(([k, v]) => `${k}=${serializeMetaValue(v)}`);
  return parts.length ? ` ${parts.join(' ')}` : '';
}

/** createLogger: action + msg → 단일 표시 문자열 */
export function combineLogParts(action: string | undefined, msg: string): string {
  const trimmedAction = action?.trim();
  if (!trimmedAction) return msg;
  return `${trimmedAction} ${msg}`;
}

/** 콘솔: [ts] [I] [ControlService] msg */
export function formatConsoleLine(
  level: LogLevel,
  event: LogEvent,
  ts: string,
  options?: { includeMeta?: boolean },
): string {
  const includeMeta = options?.includeMeta ?? true;
  const levelTag = LEVEL_CONSOLE_TAG[level] ?? level.toUpperCase().charAt(0);
  const metaPart = includeMeta ? formatMetaInline(event.meta as Record<string, unknown> | undefined) : '';
  return `[${ts}] [${levelTag}] [${event.service}] ${event.msg}${metaPart}`;
}

export function formatStructuredMessage(event: LogEvent): string {
  return `[${event.service}] ${event.msg}`;
}

export function normalizeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      message: err.message,
      ...(err.stack ? { stack: err.stack } : {}),
    };
  }
  if (typeof err === 'string') {
    return { message: err };
  }
  return { message: String(err) };
}

export function toStructuredRecord(level: LogLevel, event: LogEvent, ts: string): StructuredLogRecord {
  const message = formatStructuredMessage(event);
  const record: StructuredLogRecord = {
    level,
    ts,
    service: event.service,
    msg: event.msg,
    message,
  };

  if (event.meta && Object.keys(event.meta).length > 0) {
    record.meta = event.meta;
  }

  if (event.err !== undefined) {
    const normalized = normalizeError(event.err);
    record.meta = { ...record.meta, err: normalized.message };
    if (normalized.stack) {
      record.stack = normalized.stack;
    }
  }

  return record;
}

const LEADING_DECORATION = /^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}\u2600-\u27BF]+/u;

function stripDecorations(text: string): string {
  return text.replace(LEADING_DECORATION, '').trim();
}

function slugifyService(name: string): string {
  const slug = name
    .replace(/Service$/i, '')
    .replace(/Repository$/i, '')
    .replace(/Manager$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug.slice(0, 48) || 'app';
}

function legacyEvent(service: string, msg: string, meta?: Record<string, unknown>): LogEvent {
  const event: LogEvent = { service, msg };
  if (meta !== undefined) {
    event.meta = meta as Record<string, UnitValue>;
  }
  return event;
}

/**
 * logInfo('[FooService] ...') / 이모지 접두 레거시 문자열 → service · msg (action 없음)
 */
export function parseLegacyLogMessage(
  message: string,
  meta?: Record<string, unknown>,
  defaultService = 'app',
): LogEvent {
  const raw = message;
  const firstLine = (raw.split(/\r?\n/)[0] ?? raw).trim();
  const text = stripDecorations(firstLine);
  const mergedMeta = raw.includes('\n') ? ({ ...meta, multiline: true } as Record<string, unknown>) : meta;

  const initMatch = text.match(/^\[INIT\]\s*(.*)$/i);
  if (initMatch) {
    const rest = stripDecorations(initMatch[1] ?? '');
    return legacyEvent('init', rest || 'init', mergedMeta);
  }

  const bracketMatch = text.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (bracketMatch) {
    const service = bracketMatch[1].trim();
    const rest = stripDecorations(bracketMatch[2] ?? '').trim();
    return legacyEvent(service, rest || service, mergedMeta);
  }

  const lower = text.toLowerCase();
  const keywordService: Array<[string, string]> = [
    ['loading environment', 'env'],
    ['backend environment', 'env'],
    ['mongoose', 'mongo'],
    ['mongodb uri', 'mongo'],
    ['mongodb', 'mongo'],
    ['device routes', 'device'],
    ['device 도메인', 'device'],
    ['api 키', 'api_key'],
    ['api key', 'api_key'],
    ['ddc 시간', 'ddc_time'],
    ['ddc time', 'ddc_time'],
    ['mock 모드', 'modbus'],
    ['log scheduler', 'scheduler'],
    ['bushuboperationmanager', 'operation'],
    ['users.json', 'seed'],
    ['데이터베이스 상태', 'seed'],
    ['라우터 등록', 'router'],
    ['내부 라우터', 'router'],
    ['외부 라우터', 'router'],
    ['servicecontainer', 'service_container'],
    ['통합 폴링', 'modbus_poller'],
    ['폴링 자동 복구', 'polling_recovery'],
    ['시스템 설정', 'system'],
    ['hardwaredirectcommand', 'hardware'],
    ['hardwarebench', 'hardware'],
    ['hardwareseasonal', 'hardware'],
    ['hardwareddctime', 'hardware'],
    ['shutdown', 'shutdown'],
    ['cors origin', 'backend'],
  ];
  for (const [key, svc] of keywordService) {
    if (lower.includes(key)) {
      return legacyEvent(svc, text, mergedMeta);
    }
  }

  const classMatch = text.match(/^([A-Z][a-zA-Z0-9]+)\s+(.+)$/);
  if (classMatch) {
    return legacyEvent(slugifyService(classMatch[1]), classMatch[2].trim(), mergedMeta);
  }

  return legacyEvent(defaultService, text || raw, mergedMeta);
}

/** Logger(service) · logInfo 호환 — 전용 service가 있으면 괄호 접두보다 우선 */
export function legacyMessageEvent(service: string, message: string, meta?: Record<string, unknown>): LogEvent {
  const parsed = parseLegacyLogMessage(message, meta, service);
  if (service !== 'app') {
    parsed.service = service;
    const bracketMatch = message.trim().match(/^\[([^\]]+)\]\s*(.*)$/s);
    if (bracketMatch?.[2]?.trim()) {
      parsed.msg = stripDecorations(bracketMatch[2]);
    }
  } else if (!/^\s*(\[|INIT)/i.test(message)) {
    parsed.service = service;
  }
  return parsed;
}

/** logger.ts 로드 전(environment 등) — 동일 콘솔 포맷 */
export function bootstrapConsoleLog(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const line = formatConsoleLine(level, parseLegacyLogMessage(message, meta), koreanTimestamp());
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
