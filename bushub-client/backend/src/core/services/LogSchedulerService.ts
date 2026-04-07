import { ILogger } from '../../shared/interfaces/ILogger';

import { ILogSchedulerService } from './interfaces/ILogSchedulerService';
import { IUnifiedLogService } from './interfaces/IUnifiedLogService';
import { IWebSocketService } from './interfaces/IWebSocketService';

export class LogSchedulerService implements ILogSchedulerService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private compressInterval: NodeJS.Timeout | null = null;

  constructor(
    private unifiedLogService: IUnifiedLogService,
    private _webSocketService?: IWebSocketService,
    private logger?: ILogger,
  ) {}

  start(): void {
    // 매일 새벽 2시에 전체 로그 정리 (30일 이상 된 로그 삭제)
    this.scheduleCleanup();

    // 매주 일요일 새벽 3시에 전체 로그 압축 (성공한 로그의 상세 정보 제거)
    this.scheduleCompression();

    this.logger?.info('Log scheduler started');
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.compressInterval) {
      clearInterval(this.compressInterval);
      this.compressInterval = null;
    }

    this.logger?.info('Log scheduler stopped');
  }

  private scheduleCleanup(): void {
    const now = new Date();
    const nextCleanup = new Date();
    nextCleanup.setHours(2, 0, 0, 0); // 새벽 2시

    // 오늘 새벽 2시가 지났으면 내일로 설정
    if (now.getTime() > nextCleanup.getTime()) {
      nextCleanup.setDate(nextCleanup.getDate() + 1);
    }

    const timeUntilCleanup = nextCleanup.getTime() - now.getTime();

    // 첫 번째 실행
    setTimeout(async () => {
      await this.performCleanup();

      // 이후 24시간마다 반복
      this.cleanupInterval = setInterval(async () => {
        await this.performCleanup();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilCleanup);
  }

  private scheduleCompression(): void {
    const now = new Date();
    const nextCompression = new Date();
    nextCompression.setHours(3, 0, 0, 0); // 새벽 3시

    // 다음 일요일로 설정
    const daysUntilSunday = (7 - nextCompression.getDay()) % 7;
    nextCompression.setDate(nextCompression.getDate() + daysUntilSunday);

    // 오늘 일요일 새벽 3시가 지났으면 다음 주로 설정
    if (now.getTime() > nextCompression.getTime()) {
      nextCompression.setDate(nextCompression.getDate() + 7);
    }

    const timeUntilCompression = nextCompression.getTime() - now.getTime();

    // 첫 번째 실행
    setTimeout(async () => {
      await this.performCompression();

      // 이후 7일마다 반복
      this.compressInterval = setInterval(async () => {
        await this.performCompression();
      }, 7 * 24 * 60 * 60 * 1000);
    }, timeUntilCompression);
  }

  private async performCleanup(): Promise<void> {
    try {
      this.logger?.info('Starting scheduled log cleanup...');

      const result = await this.unifiedLogService.cleanupAllLogs({
        olderThanDays: 30,
        maxLogs: 1000000, // 최대 100만개 로그 유지
      });

      this.logger?.info(`Scheduled log cleanup completed.`);
    } catch (error) {
      this.logger?.error('Error during scheduled log cleanup');
    }
  }

  private async performCompression(): Promise<void> {
    try {
      this.logger?.info('Starting scheduled log compression...');

      const result = await this.unifiedLogService.compressAllLogs(7);

      this.logger?.info(`Scheduled log compression completed.`);
    } catch (error) {
      this.logger?.error('Error during scheduled log compression');
    }
  }

  async manualCleanup(options: any = {}): Promise<{
    commandLogs: number;
    dataLogs: number;
    statusLogs: number;
    errorLogs: number;
    total: number;
  }> {
    try {
      this.logger?.info('Starting manual log cleanup...');

      const result = await this.unifiedLogService.cleanupAllLogs(options);

      this.logger?.info(`Manual log cleanup completed.`);
      return result;
    } catch (error) {
      this.logger?.error('Error during manual log cleanup');
      throw error;
    }
  }

  async manualCompression(days = 7): Promise<{
    commandLogs: number;
    dataLogs: number;
    total: number;
  }> {
    try {
      this.logger?.info('Starting manual log compression...');

      const result = await this.unifiedLogService.compressAllLogs(days);

      this.logger?.info(`Manual log compression completed.`);
      return result;
    } catch (error) {
      this.logger?.error('Error during manual log compression');
      throw error;
    }
  }

  // 개별 로그 타입별 정리 메서드들
  async cleanupCommandLogs(options: any = {}): Promise<number> {
    try {
      this.logger?.info('Starting command log cleanup...');
      const result = await this.unifiedLogService.cleanupCommandLogs(options);
      this.logger?.info(`Command log cleanup completed. Deleted ${result} entries.`);
      return result;
    } catch (error) {
      this.logger?.error('Error during command log cleanup');
      throw error;
    }
  }

  async cleanupDataLogs(options: any = {}): Promise<number> {
    try {
      this.logger?.info('Starting data log cleanup...');
      const result = await this.unifiedLogService.cleanupDataLogs(options);
      this.logger?.info(`Data log cleanup completed. Deleted ${result} entries.`);
      return result;
    } catch (error) {
      this.logger?.error('Error during data log cleanup');
      throw error;
    }
  }

  async cleanupStatusLogs(options: any = {}): Promise<number> {
    try {
      this.logger?.info('Starting status log cleanup...');
      const result = await this.unifiedLogService.cleanupStatusLogs(options);
      this.logger?.info(`Status log cleanup completed. Deleted ${result} entries.`);
      return result;
    } catch (error) {
      this.logger?.error('Error during status log cleanup');
      throw error;
    }
  }

  async cleanupErrorLogs(options: any = {}): Promise<number> {
    try {
      this.logger?.info('Starting error log cleanup...');
      const result = await this.unifiedLogService.cleanupErrorLogs(options);
      this.logger?.info(`Error log cleanup completed. Deleted ${result} entries.`);
      return result;
    } catch (error) {
      this.logger?.error('Error during error log cleanup');
      throw error;
    }
  }

  // 통계 조회 메서드
  async getOverallLogStats(days = 7): Promise<{
    commandLogs: any;
    dataLogs: any;
    statusLogs: any;
    errorLogs: any;
  }> {
    try {
      this.logger?.info('Getting overall log stats...');
      const result = await this.unifiedLogService.getOverallLogStats(days);
      this.logger?.info('Overall log stats retrieved successfully');
      return result;
    } catch (error) {
      this.logger?.error('Error getting overall log stats');
      throw error;
    }
  }
}
