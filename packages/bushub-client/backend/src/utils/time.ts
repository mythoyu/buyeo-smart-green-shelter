// 공용 시간 유틸리티 - KST(Asia/Seoul) 기준 현재 시간 분해

export interface KstTimeParts {
  year: number;
  month: number;
  day: number;
  dow: number; // 0=일요일, 6=토요일
  hour: number;
  minute: number;
  second: number;
}

/**
 * KST(Asia/Seoul) 기준 현재 시각을 연/월/일/요일/시/분/초로 분해해서 반환
 *
 * - 서버 OS 타임존(UTC 등)과 무관하게 항상 Asia/Seoul 기준으로 계산
 * - DDC 시간 동기화 및 기본값 생성에 사용
 */
export const getKstNowParts = (): KstTimeParts => {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });

  const parts = Object.fromEntries(dtf.formatToParts(new Date()).map((p) => [p.type, p.value])) as Record<
    string,
    string
  >;

  const dowMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    dow: dowMap[parts.weekday] ?? 0,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
};


