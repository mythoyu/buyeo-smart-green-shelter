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
  const date = new Date(errorAt);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getTimeAgo(errorAt: string) {
  const now = new Date();
  const errorTime = new Date(errorAt);
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
 * UTC+0 ISO 문자열을 한국 시간으로 변환하여 표시용 문자열 반환
 * @param isoString UTC+0 ISO 문자열 (예: "2024-01-01T09:00:00.000Z")
 * @param options 표시 옵션
 * @returns 한국 시간 문자열
 */
export function formatToKoreanTime(
  isoString: string,
  options: {
    showDate?: boolean;
    showSeconds?: boolean;
    showMilliseconds?: boolean;
  } = {}
): string {
  const { showDate = false, showSeconds = true, showMilliseconds = false } = options;

  const date = new Date(isoString);

  // 날짜 표시 옵션
  if (showDate) {
    const dateString = date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const timeString = date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
    });

    if (showMilliseconds) {
      const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
      return `${dateString} ${timeString}.${milliseconds}`;
    }

    return `${dateString} ${timeString}`;
  }

  // 시간만 표시
  const timeString = date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
  });

  if (showMilliseconds) {
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeString}.${milliseconds}`;
  }

  return timeString;
}

/**
 * 현재 시간을 UTC+0 ISO 문자열로 반환
 * @returns UTC+0 ISO 문자열
 */
export function getCurrentUTCTime(): string {
  return new Date().toISOString();
}

/**
 * 한국 시간을 UTC+0으로 변환하여 ISO 문자열 반환
 * @param koreanTime 한국 시간 문자열 (HH:mm 형식)
 * @returns UTC+0 ISO 문자열
 */
export function convertKoreanTimeToUTC(koreanTime: string): string {
  const [hours, minutes] = koreanTime.split(':').map(Number);
  const now = new Date();
  const koreanDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

  // 한국 시간대(UTC+9)를 UTC로 변환
  const utcDate = new Date(koreanDate.getTime() - 9 * 60 * 60 * 1000);
  return utcDate.toISOString();
}
