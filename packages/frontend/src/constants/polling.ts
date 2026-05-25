/** 폴링 사이클 종료 후 다음 사이클까지 대기(ms) — 백엔드 ALLOWED_POLLING_CYCLE_GAP_MS 와 동일 */
export const ALLOWED_POLLING_CYCLE_GAP_MS = [500, 1000, 2000, 3000, 5000, 10000] as const;

export const DEFAULT_POLLING_CYCLE_GAP_MS = 1000;

export function normalizePollingCycleGap(ms: number | undefined | null): number {
  if (ms != null && (ALLOWED_POLLING_CYCLE_GAP_MS as readonly number[]).includes(ms)) {
    return ms;
  }
  return DEFAULT_POLLING_CYCLE_GAP_MS;
}

export function formatPollingCycleGapLabel(ms: number): string {
  return `${ms}ms`;
}
