/** 폴링 사이클 종료 후 다음 사이클 시작까지 대기(ms) */
export const ALLOWED_POLLING_CYCLE_GAP_MS = [500, 1000, 2000, 3000, 5000, 10000] as const;

export type PollingCycleGapMs = (typeof ALLOWED_POLLING_CYCLE_GAP_MS)[number];

export const DEFAULT_POLLING_CYCLE_GAP_MS = 1000;

/** @deprecated 사이클 간격 의미로 DEFAULT_POLLING_CYCLE_GAP_MS 사용 */
export const DEFAULT_POLLING_INTERVAL_MS = DEFAULT_POLLING_CYCLE_GAP_MS;

export function isAllowedPollingCycleGap(ms: number): boolean {
  return (ALLOWED_POLLING_CYCLE_GAP_MS as readonly number[]).includes(ms);
}

/** DB/요청 값을 허용 목록으로 정규화 (레거시 값은 기본값) */
export function normalizePollingCycleGap(ms: number | undefined | null): number {
  if (ms != null && isAllowedPollingCycleGap(ms)) {
    return ms;
  }
  return DEFAULT_POLLING_CYCLE_GAP_MS;
}

export function formatPollingCycleGapText(ms: number): string {
  return `${ms}ms`;
}
