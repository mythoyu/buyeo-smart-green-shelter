/**
 * API 등에서 같은 프로세스의 우아한 종료 루틴을 호출할 때 사용합니다.
 * Windows에서는 process.kill(SELF, SIGTERM)이 핸들러를 타지 않는 경우가 있어
 * 반드시 이 경로로 직접 호출합니다.
 */
import { logInfo, logWarn } from '../logger';

type GracefulShutdownFn = (reason: string) => Promise<void>;

let handler: GracefulShutdownFn | null = null;

export function setGracefulShutdownHandler(fn: GracefulShutdownFn): void {
  handler = fn;
}

/** 응답을 보낸 뒤 setTimeout 등에서 void triggerGracefulShutdown('...') 형태로 호출 */
export function triggerGracefulShutdown(reason: string): void {
  if (handler) {
    logInfo(`[SHUTDOWN] 외부 요청으로 우아한 종료 시작 (${reason})`);
    void handler(reason);
    return;
  }
  logWarn(`[SHUTDOWN] 종료 핸들러 미등록 — SIGTERM 폴백 (${reason})`);
  try {
    process.kill(process.pid, 'SIGTERM');
  } catch {
    process.exit(0);
  }
}
