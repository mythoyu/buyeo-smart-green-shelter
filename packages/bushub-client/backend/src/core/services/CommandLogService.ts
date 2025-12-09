import { ILogger } from '../../shared/interfaces/ILogger';
import { ICommandLogRepository, LogStats, LogCleanupOptions } from '../repositories/interfaces/ICommandLogRepository';

import { ICommandLogService } from './interfaces/ICommandLogService';
import { IWebSocketService } from './interfaces/IWebSocketService';

export class CommandLogService implements ICommandLogService {
  constructor(
    private commandLogRepository: ICommandLogRepository,
    private _webSocketService?: IWebSocketService,
    private logger?: ILogger,
  ) {}

  async getLogStats(days = 7): Promise<LogStats> {
    try {
      const result = await this.commandLogRepository.getLogStats(days);
      this.logger?.info('명령 로그 통계 조회 완료');
      return result;
    } catch (error) {
      this.logger?.error('명령 로그 통계 조회 실패');
      throw error;
    }
  }

  async cleanupOldLogs(options: LogCleanupOptions = {}): Promise<number> {
    try {
      const deletedCount = await this.commandLogRepository.cleanupOldLogs(options);
      this.logger?.info('오래된 명령 로그 정리 완료');
      return deletedCount;
    } catch (error) {
      this.logger?.error('오래된 명령 로그 정리 실패');
      throw error;
    }
  }

  async compressSuccessfulLogs(days = 7): Promise<number> {
    try {
      const compressedCount = await this.commandLogRepository.compressSuccessfulLogs(days);
      this.logger?.info('성공한 명령 로그 압축 완료');
      return compressedCount;
    } catch (error) {
      this.logger?.error('성공한 명령 로그 압축 실패');
      throw error;
    }
  }

  async getDeviceLogStats(deviceId: string, days = 7): Promise<LogStats> {
    try {
      const result = await this.commandLogRepository.getDeviceLogStats(deviceId, days);
      this.logger?.info('디바이스 명령 로그 통계 조회 완료');
      return result;
    } catch (error) {
      this.logger?.error('디바이스 명령 로그 통계 조회 실패');
      throw error;
    }
  }

  async exportLogs(startDate: Date, endDate: Date): Promise<Record<string, unknown>[]> {
    try {
      const result = await this.commandLogRepository.exportLogs(startDate, endDate);
      this.logger?.info('명령 로그 내보내기 완료');
      return result;
    } catch (error) {
      this.logger?.error('명령 로그 내보내기 실패');
      throw error;
    }
  }
}
