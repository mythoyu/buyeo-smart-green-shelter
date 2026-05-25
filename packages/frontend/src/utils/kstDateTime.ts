/**
 * 서버 API 계약: 시각은 KST 벽시계 `YYYY-MM-DDTHH:mm:ss` (오프셋/Z 없음).
 * `Z`/`+09:00` 등이 붙은 문자열은 수신 호환으로 instant로 해석한다.
 */
import { DateTime } from 'luxon';

export const KST_ZONE = 'Asia/Seoul';

const KST_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";

function hasExplicitTimeZone(s: string): boolean {
  if (s.endsWith('Z') || s.endsWith('z')) return true;
  return /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{4}$/.test(s);
}

/** API 문자열 → JS Date (instant) */
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

/** 안전 파싱: 실패 시 현재 시각 */
export function parseApiDateTimeSafe(input: string, fallback: Date = new Date()): Date {
  try {
    return parseApiDateTimeToUtc(input);
  } catch {
    return fallback;
  }
}

export function formatKstLocal(d: Date): string {
  return DateTime.fromJSDate(d).setZone(KST_ZONE).toFormat(KST_LOCAL_FORMAT);
}

export function nowKstFormatted(): string {
  return DateTime.now().setZone(KST_ZONE).toFormat(KST_LOCAL_FORMAT);
}

/** KST 달력 오늘 `YYYY-MM-DD` */
export function todayYmdKst(): string {
  return DateTime.now().setZone(KST_ZONE).toFormat('yyyy-MM-dd');
}

/** KST 달력일 하루 구간 [start, end) — usage-10min 등 API 쿼리용 */
export function kstDayExclusiveEndRange(ymd: string): { start: string; end: string } {
  const day = DateTime.fromFormat(ymd.trim(), 'yyyy-MM-dd', { zone: KST_ZONE }).startOf('day');
  if (!day.isValid) throw new Error(`invalid date: ${ymd}`);
  const next = day.plus({ days: 1 });
  return {
    start: day.toFormat(KST_LOCAL_FORMAT),
    end: next.toFormat(KST_LOCAL_FORMAT),
  };
}

/** instant → KST 벽시계 DateTime (표시·시/분 추출용, 브라우저 로컬 타임존 무관) */
export function toKstDateTime(d: Date): DateTime {
  return DateTime.fromJSDate(d).setZone(KST_ZONE);
}

export function getKstHour(d: Date): number {
  return toKstDateTime(d).hour;
}

export function getKstMinute(d: Date): number {
  return toKstDateTime(d).minute;
}

/** `Date#getMonth`와 동일 0~11 (KST 달력 기준) */
export function getKstMonth0(d: Date): number {
  return toKstDateTime(d).month - 1;
}

/** KST 달력 일(1~31) */
export function getKstDayOfMonth(d: Date): number {
  return toKstDateTime(d).day;
}

/** `Date#getDay`와 동일 0=일요일 … 6=토요일 (KST 달력 기준) */
export function getKstDayOfWeekSun0(d: Date): number {
  const w = toKstDateTime(d).weekday; // Luxon 1=월 … 7=일
  return w === 7 ? 0 : w;
}

/** KST 기준 시:분 `HH:mm` */
export function formatKstHm(d: Date): string {
  return toKstDateTime(d).toFormat('HH:mm');
}

/** KST 기준 시:분:초 */
export function formatKstHms(d: Date): string {
  return toKstDateTime(d).toFormat('HH:mm:ss');
}

/** 지금 이 순간의 KST 달력 부분 (DDC 시간 등 현지 장비 기준) */
export function nowKstCalendarParts(): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const z = DateTime.now().setZone(KST_ZONE);
  return {
    year: z.year,
    month: z.month,
    day: z.day,
    hour: z.hour,
    minute: z.minute,
    second: z.second,
  };
}
