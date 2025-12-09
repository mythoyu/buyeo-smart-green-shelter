/**
 * PollingAutoRecoveryService
 * 폴링 자동 복구 서비스
 *
 * 주요 기능:
 * 1. 30분마다 runtime.pollingEnabled 상태 체크
 * 2. false인 경우 true로 자동 변경
 * 3. 복구 실행 로그 및 통계 관리
 */

import { ILogger } from '../interfaces/ILogger';
import { ISystemService } from './interfaces/ISystemService';
import { IPollingAutoRecoveryService } from './interfaces/IPollingAutoRecoveryService';
import { ServiceContainer } from '../container/ServiceContainer';

export class PollingAutoRecoveryService implements IPollingAutoRecoveryService {
  private logger: ILogger | undefined;
  private systemService: ISystemService | null = null;

  private checkInterval: NodeJS.Timeout | null = null;
  private isServiceRunning = false;

  // 복구 관련 통계
  private lastRecoveryTime: Date | null = null;
  private recoveryCount = 0;

  // 설정
  private readonly CHECK_INTERVAL = 30 * 60 * 1000; // 30분
  // private readonly CHECK_INTERVAL = 1 * 1000; // 1초 테스트
  private readonly SERVICE_NAME = 'PollingAutoRecoveryService';

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  /**
   * 폴링 자동 복구 서비스 시작
   */
  async startAutoRecovery(): Promise<void> {
    try {
      if (this.isServiceRunning) {
        this.logger?.warn(`[${this.SERVICE_NAME}] 서비스가 이미 실행 중입니다.`);
        return;
      }

      this.logger?.info(`[${this.SERVICE_NAME}] 폴링 자동 복구 서비스 시작 중...`);

      // SystemService 초기화
      this.systemService = ServiceContainer.getInstance().getSystemService();

      // 즉시 첫 번째 체크 실행
      await this.checkAndRecoverPolling();

      // 30분마다 반복 체크 설정
      this.checkInterval = setInterval(async () => {
        await this.checkAndRecoverPolling();
      }, this.CHECK_INTERVAL);

      this.isServiceRunning = true;
      this.logger?.info(`[${this.SERVICE_NAME}] 폴링 자동 복구 서비스 시작 완료 (체크 간격: 30분)`);
    } catch (error) {
      this.logger?.error(`[${this.SERVICE_NAME}] 서비스 시작 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 폴링 자동 복구 서비스 중지
   */
  stopAutoRecovery(): void {
    try {
      if (!this.isServiceRunning) {
        this.logger?.warn(`[${this.SERVICE_NAME}] 서비스가 실행 중이 아닙니다.`);
        return;
      }

      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }

      this.isServiceRunning = false;
      this.logger?.info(`[${this.SERVICE_NAME}] 폴링 자동 복구 서비스 중지 완료`);
    } catch (error) {
      this.logger?.error(`[${this.SERVICE_NAME}] 서비스 중지 실패: ${error}`);
    }
  }

  /**
   * 현재 복구 서비스 실행 상태 조회
   */
  isRunning(): boolean {
    return this.isServiceRunning;
  }

  /**
   * 마지막 복구 실행 시간 조회
   */
  getLastRecoveryTime(): Date | null {
    return this.lastRecoveryTime;
  }

  /**
   * 복구 실행 횟수 조회
   */
  getRecoveryCount(): number {
    return this.recoveryCount;
  }

  /**
   * 폴링 상태 체크 및 복구 실행
   */
  private async checkAndRecoverPolling(): Promise<void> {
    try {
      if (!this.systemService) {
        this.logger?.error(`[${this.SERVICE_NAME}] SystemService가 초기화되지 않았습니다.`);
        return;
      }

      this.logger?.debug(`[${this.SERVICE_NAME}] 폴링 상태 체크 시작`);

      // 현재 폴링 상태 조회
      const pollingState = await this.systemService.getPollingState();

      if (!pollingState) {
        this.logger?.warn(`[${this.SERVICE_NAME}] 폴링 상태를 조회할 수 없습니다.`);
        return;
      }

      // 폴링이 비활성화된 경우 복구 실행
      if (!pollingState.pollingEnabled) {
        this.logger?.info(`[${this.SERVICE_NAME}] 폴링이 비활성화됨 감지, 자동 복구 실행 중...`);

        await this.systemService.updatePollingState(true);

        // 복구 통계 업데이트
        this.lastRecoveryTime = new Date();
        this.recoveryCount++;

        this.logger?.info(
          `[${this.SERVICE_NAME}] 폴링 자동 복구 완료: false → true (복구 횟수: ${this.recoveryCount})`,
        );
      } else {
        this.logger?.debug(`[${this.SERVICE_NAME}] 폴링 상태 정상: 복구 불필요`);
      }
    } catch (error) {
      this.logger?.error(`[${this.SERVICE_NAME}] 폴링 상태 체크 및 복구 실패: ${error}`);
    }
  }
}
