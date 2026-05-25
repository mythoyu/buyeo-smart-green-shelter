/**
 * PollingAutoRecoveryService
 * 30분마다 폴링 OFF 시 복구 제안(recoveryPrompt) + WS + 30초 서버 타임아웃
 */

import { randomUUID } from 'crypto';

import { ILogger } from '../interfaces/ILogger';
import { ServiceContainer } from '../container/ServiceContainer';
import {
  POLLING_RECOVERY_AUTO_DISMISS_SEC,
  PollingRecoveryPrompt,
} from '../../shared/types/pollingRecovery';

import { applyPollingEnabled } from './PollingControlService';
import { IPollingAutoRecoveryService } from './interfaces/IPollingAutoRecoveryService';
import { ISystemService } from './interfaces/ISystemService';

export class PollingAutoRecoveryService implements IPollingAutoRecoveryService {
  private logger: ILogger | undefined;
  private systemService: ISystemService | null = null;

  private checkInterval: NodeJS.Timeout | null = null;
  private isServiceRunning = false;
  private readonly expireTimers = new Map<string, NodeJS.Timeout>();

  private lastRecoveryTime: Date | null = null;
  private recoveryCount = 0;

  private readonly CHECK_INTERVAL = 30 * 60 * 1000; // 30분
  private readonly SERVICE_NAME = 'PollingAutoRecoveryService';

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  async startAutoRecovery(): Promise<void> {
    try {
      if (this.isServiceRunning) {
        this.logger?.warn(`[${this.SERVICE_NAME}] 서비스가 이미 실행 중입니다.`);
        return;
      }

      this.logger?.info(`[${this.SERVICE_NAME}] 폴링 자동 복구 서비스 시작 중...`);
      this.systemService = ServiceContainer.getInstance().getSystemService();

      await this.resumePendingPrompts();
      await this.checkAndIssueRecoveryPrompt();

      this.checkInterval = setInterval(async () => {
        await this.checkAndIssueRecoveryPrompt();
      }, this.CHECK_INTERVAL);

      this.isServiceRunning = true;
      this.logger?.info(`[${this.SERVICE_NAME}] 시작 완료 (체크 간격: 30분)`);
    } catch (error) {
      this.logger?.error(`[${this.SERVICE_NAME}] 서비스 시작 실패: ${error}`);
      throw error;
    }
  }

  stopAutoRecovery(): void {
    try {
      if (!this.isServiceRunning) {
        return;
      }

      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }

      for (const timer of this.expireTimers.values()) {
        clearTimeout(timer);
      }
      this.expireTimers.clear();

      this.isServiceRunning = false;
      this.logger?.info(`[${this.SERVICE_NAME}] 중지 완료`);
    } catch (error) {
      this.logger?.error(`[${this.SERVICE_NAME}] 중지 실패: ${error}`);
    }
  }

  isRunning(): boolean {
    return this.isServiceRunning;
  }

  getLastRecoveryTime(): Date | null {
    return this.lastRecoveryTime;
  }

  getRecoveryCount(): number {
    return this.recoveryCount;
  }

  async respondToRecoveryPrompt(
    promptId: string,
    action: 'accept' | 'dismiss',
  ): Promise<{ success: boolean; message?: string }> {
    if (!this.systemService) {
      return { success: false, message: 'SystemService not initialized' };
    }

    const state = await this.systemService.getPollingState(false);
    const prompt = state?.recoveryPrompt;
    if (!prompt || prompt.promptId !== promptId || prompt.status !== 'pending') {
      return { success: false, message: '유효하지 않거나 만료된 복구 제안입니다' };
    }

    this.clearExpireTimer(promptId);

    if (action === 'accept') {
      await this.applyAcceptedRecovery(promptId);
      return { success: true };
    }

    await this.applyDismissedRecovery(promptId);
    return { success: true };
  }

  private async resumePendingPrompts(): Promise<void> {
    if (!this.systemService) {
      return;
    }

    const state = await this.systemService.getPollingState(false);
    const prompt = state?.recoveryPrompt;
    if (!prompt || prompt.status !== 'pending') {
      return;
    }

    const expiresMs = new Date(prompt.expiresAt).getTime() - Date.now();
    if (expiresMs <= 0) {
      await this.handleExpiredPrompt(prompt.promptId);
      return;
    }

    this.scheduleExpire(prompt.promptId, expiresMs);
    this.logger?.info(`[${this.SERVICE_NAME}] pending 복구 제안 재개: ${prompt.promptId}`);
  }

  private async checkAndIssueRecoveryPrompt(): Promise<void> {
    try {
      if (!this.systemService) {
        return;
      }

      const state = await this.systemService.getPollingState(false);
      if (!state) {
        return;
      }

      if (state.pollingEnabled) {
        return;
      }

      const existing = state.recoveryPrompt;
      if (existing?.status === 'pending') {
        const expiresMs = new Date(existing.expiresAt).getTime() - Date.now();
        if (expiresMs <= 0) {
          await this.handleExpiredPrompt(existing.promptId);
        }
        return;
      }

      await this.issueRecoveryPrompt();
    } catch (error) {
      this.logger?.error(`[${this.SERVICE_NAME}] 체크 실패: ${error}`);
    }
  }

  private async issueRecoveryPrompt(): Promise<void> {
    if (!this.systemService) {
      return;
    }

    const promptId = randomUUID();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + POLLING_RECOVERY_AUTO_DISMISS_SEC * 1000);

    const prompt: PollingRecoveryPrompt = {
      promptId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
    };

    await this.systemService.setRecoveryPrompt(prompt);

    const ws = ServiceContainer.getInstance().getWebSocketService();
    ws?.broadcastPollingRecoveryPrompt(promptId, prompt.expiresAt, POLLING_RECOVERY_AUTO_DISMISS_SEC);

    this.scheduleExpire(promptId, POLLING_RECOVERY_AUTO_DISMISS_SEC * 1000);
    this.lastRecoveryTime = new Date();
    this.recoveryCount++;

    this.logger?.info(`[${this.SERVICE_NAME}] 복구 제안 발행: ${promptId}`);
  }

  private scheduleExpire(promptId: string, delayMs: number): void {
    this.clearExpireTimer(promptId);
    const timer = setTimeout(() => {
      void this.handleExpiredPrompt(promptId);
    }, delayMs);
    this.expireTimers.set(promptId, timer);
  }

  private clearExpireTimer(promptId: string): void {
    const timer = this.expireTimers.get(promptId);
    if (timer) {
      clearTimeout(timer);
      this.expireTimers.delete(promptId);
    }
  }

  private async handleExpiredPrompt(promptId: string): Promise<void> {
    if (!this.systemService) {
      return;
    }

    const state = await this.systemService.getPollingState(false);
    const prompt = state?.recoveryPrompt;
    if (!prompt || prompt.promptId !== promptId || prompt.status !== 'pending') {
      return;
    }

    this.clearExpireTimer(promptId);
    await this.applyAcceptedRecovery(promptId, 'expired');
  }

  private async applyAcceptedRecovery(
    promptId: string,
    reason: 'accepted' | 'expired' = 'accepted',
  ): Promise<void> {
    if (!this.systemService) {
      return;
    }

    try {
      await applyPollingEnabled(true, this.logger);
      await this.systemService.updateRecoveryPromptStatus(promptId, reason === 'expired' ? 'expired' : 'accepted');

      const ws = ServiceContainer.getInstance().getWebSocketService();
      ws?.broadcastPollingRecoveryResolved(promptId, reason);

      this.logger?.info(`[${this.SERVICE_NAME}] 폴링 복구 적용 (${reason}): ${promptId}`);
    } catch (error) {
      this.logger?.error(`[${this.SERVICE_NAME}] 폴링 시작 실패: ${error}`);
      await this.systemService.clearRecoveryPrompt();
    }
  }

  private async applyDismissedRecovery(promptId: string): Promise<void> {
    if (!this.systemService) {
      return;
    }

    await applyPollingEnabled(false, this.logger);
    await this.systemService.updateRecoveryPromptStatus(promptId, 'dismissed');

    const ws = ServiceContainer.getInstance().getWebSocketService();
    ws?.broadcastPollingRecoveryResolved(promptId, 'dismissed');

    this.logger?.info(`[${this.SERVICE_NAME}] 폴링 OFF 유지 (dismissed): ${promptId}`);
  }
}
