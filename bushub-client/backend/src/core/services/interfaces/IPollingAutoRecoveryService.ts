/**
 * PollingAutoRecoveryService Interface
 * 폴링 자동 복구 서비스 인터페이스
 *
 * 주요 기능:
 * 1. 30분마다 runtime.pollingEnabled 상태 체크
 * 2. false인 경우 true로 자동 변경
 * 3. 서비스 시작/중지 관리
 */

export interface IPollingAutoRecoveryService {
  /**
   * 폴링 자동 복구 서비스 시작
   * 30분마다 pollingEnabled 상태를 체크하고 필요시 복구
   */
  startAutoRecovery(): Promise<void>;

  /**
   * 폴링 자동 복구 서비스 중지
   */
  stopAutoRecovery(): void;

  /**
   * 현재 복구 서비스 실행 상태 조회
   */
  isRunning(): boolean;

  /**
   * 마지막 복구 실행 시간 조회
   */
  getLastRecoveryTime(): Date | null;

  /**
   * 복구 실행 횟수 조회
   */
  getRecoveryCount(): number;
}
