/**
 * API 계약: 시각 문자열은 KST(Asia/Seoul) 벽시계 `YYYY-MM-DDTHH:mm:ss` (오프셋/Z 없음).
 * DB Date(instant) ↔ 직렬화 시 이 모듈 사용.
 */
import { DateTime } from 'luxon';

export const KST_ZONE = 'Asia/Seoul';

const KST_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";

/** instant → API 응답용 KST 벽시계 문자열 */
export function formatKstLocal(d: Date): string {
  return DateTime.fromJSDate(d).setZone(KST_ZONE).toFormat(KST_LOCAL_FORMAT);
}

/** Mongo 등에서 온 값을 KST 문자열로 (Date | string 허용) */
export function formatKstLocalMaybe(value: Date | string | undefined | null): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return formatKstLocal(value);
  if (typeof value === 'string') {
    const dt = DateTime.fromISO(value, { setZone: true });
    if (dt.isValid) return formatKstLocal(dt.toJSDate());
  }
  return undefined;
}

function hasExplicitTimeZone(s: string): boolean {
  if (s.endsWith('Z') || s.endsWith('z')) return true;
  // +09:00, +0900, -05:00 at end
  return /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{4}$/.test(s);
}

/**
 * API 수신: `Z`/오프셋 있으면 ISO로 instant 파싱.
 * 없으면 KST 벽시계로 간주.
 */
export function parseApiDateTimeToUtc(input: string): Date {
  const s = input.trim();
  if (!s) throw new Error('empty datetime');
  if (hasExplicitTimeZone(s)) {
    const dt = DateTime.fromISO(s, { setZone: true });
    if (!dt.isValid) throw new Error(`invalid datetime: ${s}`);
    return dt.toUTC().toJSDate();
  }
  const dt = DateTime.fromISO(s, { zone: KST_ZONE });
  if (!dt.isValid) throw new Error(`invalid datetime: ${s}`);
  return dt.toUTC().toJSDate();
}

/** KST 달력일 `YYYY-MM-DD` → 해당일 00:00:00 KST의 instant */
export function startOfKstDayFromYmd(ymd: string): Date {
  const dt = DateTime.fromFormat(ymd.trim(), 'yyyy-MM-dd', { zone: KST_ZONE }).startOf('day');
  if (!dt.isValid) throw new Error(`invalid date: ${ymd}`);
  return dt.toUTC().toJSDate();
}

/** KST 달력일 `YYYY-MM-DD` 다음날 00:00:00 KST instant — 하루 구간 [start, end) 의 end */
export function exclusiveEndOfKstDayFromYmd(ymd: string): Date {
  const start = startOfKstDayFromYmd(ymd);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/** 현재 시각 KST 문자열 */
export function nowKstFormatted(): string {
  return DateTime.now().setZone(KST_ZONE).toFormat(KST_LOCAL_FORMAT);
}

/** KST 기준 연-월-일-시-분 (폴러 분 경계 등) */
export function getKstCalendarParts(now: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const z = DateTime.fromJSDate(now).setZone(KST_ZONE);
  return {
    year: z.year,
    month: z.month,
    day: z.day,
    hour: z.hour,
    minute: z.minute,
  };
}

/** KST 달력 분의 시작 instant (해당 분 0초) */
export function startOfKstMinute(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const dt = DateTime.fromObject({ year, month, day, hour, minute, second: 0, millisecond: 0 }, { zone: KST_ZONE });
  if (!dt.isValid) throw new Error('invalid kst minute');
  return dt.toUTC().toJSDate();
}

/** hourly 집계: 버킷 인덱스 0..23 (KST 시각 기준) */
export function getKstHourOfDay(ts: Date): number {
  return DateTime.fromJSDate(ts).setZone(KST_ZONE).hour;
}

/**
 * DTO/라우트 응답용: Date·ISO 문자열 등을 API 계약 KST 문자열로 통일.
 * 파싱 실패 시 원문 문자열 유지. null/undefined는 undefined 반환.
 */
export function toApiDateTimeString(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  if (value instanceof Date) return formatKstLocal(value);
  if (typeof value === 'string') {
    try {
      return formatKstLocal(parseApiDateTimeToUtc(value));
    } catch {
      return value;
    }
  }
  return undefined;
}

export function toApiDateTimeStringOrNow(value: unknown): string {
  return toApiDateTimeString(value) ?? nowKstFormatted();
}

/**
 * `Schema.Types.Mixed` 등 평면 레코드에서 값이 `Date`인 키만 KST API 문자열로 치환 (직렬화 시 `Z` 방지).
 */
export function formatDatesInShallowRecord(data: unknown): unknown {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }
  const o = data as Record<string, unknown>;
  const out: Record<string, unknown> = { ...o };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (v instanceof Date) {
      out[key] = formatKstLocal(v);
    }
  }
  return out;
}
