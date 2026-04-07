import { DateTime } from 'luxon';

import { KST_ZONE, formatKstLocal, nowKstFormatted, parseApiDateTimeSafe } from './kstDateTime';

/**
 * 필드 라벨에 단위를 추가하는 함수
 * @param label 원본 라벨
 * @param unit 단위 (선택사항)
 * @returns 단위가 있으면 "라벨 (단위)" 형태로 반환, 없으면 원본 라벨 반환
 */
export const formatFieldLabel = (label: string, unit?: string): string => {
  if (!unit) return label;
  return `${label} (${unit})`;
};

/**
 * DeviceFieldSpec에서 포맷된 라벨을 가져오는 함수
 * @param fieldSpec DeviceFieldSpec 객체
 * @returns 단위가 포함된 라벨
 */
export const getFormattedLabel = (fieldSpec: { label: string; unit?: string }): string => {
  return formatFieldLabel(fieldSpec.label, fieldSpec.unit);
};

// 날짜/시간 포맷팅 유틸

export function formatErrorTime(errorAt: string) {
  const z = DateTime.fromJSDate(parseApiDateTimeSafe(errorAt)).setZone(KST_ZONE);
  return z.toLocaleString(
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    },
    { locale: 'ko-KR' }
  );
}

export function getTimeAgo(errorAt: string) {
  const now = new Date();
  const errorTime = parseApiDateTimeSafe(errorAt);
  const diffMs = now.getTime() - errorTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays > 0) return `${diffDays}일 전`;
  if (diffHours > 0) return `${diffHours}시간 전`;
  if (diffMins > 0) return `${diffMins}분 전`;
  return '방금 전';
}

/**
 * API 시각 문자열(KST 무오프셋 또는 기존 `Z` 호환)을 표시용 한국어 로캘 문자열로 변환
 */
export function formatToKoreanTime(
  apiDateTime: string,
  options: {
    showDate?: boolean;
    showSeconds?: boolean;
    showMilliseconds?: boolean;
  } = {}
): string {
  const { showDate = false, showSeconds = true, showMilliseconds = false } = options;

  const instant = parseApiDateTimeSafe(apiDateTime);
  const z = DateTime.fromJSDate(instant).setZone(KST_ZONE);

  if (showDate) {
    const dateString = z.toLocaleString(
      { year: 'numeric', month: '2-digit', day: '2-digit' },
      { locale: 'ko-KR' }
    );
    const timeString = z.toLocaleString(
      {
        hour: '2-digit',
        minute: '2-digit',
        second: showSeconds ? '2-digit' : undefined,
      },
      { locale: 'ko-KR', hour12: false }
    );
    if (showMilliseconds) {
      const milliseconds = z.millisecond.toString().padStart(3, '0');
      return `${dateString} ${timeString}.${milliseconds}`;
    }
    return `${dateString} ${timeString}`;
  }

  const timeString = z.toLocaleString(
    {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
    },
    { locale: 'ko-KR', hour12: false }
  );

  if (showMilliseconds) {
    const milliseconds = z.millisecond.toString().padStart(3, '0');
    return `${timeString}.${milliseconds}`;
  }

  return timeString;
}

/**
 * 현재 시각을 API 계약 문자열(KST `YYYY-MM-DDTHH:mm:ss`)로 반환
 */
export function getCurrentUTCTime(): string {
  return nowKstFormatted();
}

/** @deprecated 이름 유지. `getCurrentUTCTime`과 동일. */
export function getCurrentApiDateTime(): string {
  return nowKstFormatted();
}

/**
 * 오늘 날짜 기준 KST 벽시계 `HH:mm` → API 시각 문자열(같은 달력일)
 */
export function convertKoreanTimeToUTC(koreanTime: string): string {
  const [hours, minutes] = koreanTime.split(':').map(Number);
  const z = DateTime.now().setZone(KST_ZONE).set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  return formatKstLocal(z.toJSDate());
}

export {
  formatKstHm,
  formatKstLocal,
  getKstHour,
  nowKstCalendarParts,
  nowKstFormatted,
  parseApiDateTimeSafe,
  parseApiDateTimeToUtc,
  todayYmdKst,
  toKstDateTime,
} from './kstDateTime';
