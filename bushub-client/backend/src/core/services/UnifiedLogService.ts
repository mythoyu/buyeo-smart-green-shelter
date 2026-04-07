import { Data } from '../../models/schemas/DataSchema';
import { Error } from '../../models/schemas/ErrorSchema';
import { Status } from '../../models/schemas/StatusSchema';
import { ILogger } from '../../shared/interfaces/ILogger';
import { ICommandLogRepository } from '../repositories/interfaces/ICommandLogRepository';

import { IUnifiedLogService } from './interfaces/IUnifiedLogService';
import { IWebSocketService } from './interfaces/IWebSocketService';

// MongoDB 모델들 import

export class UnifiedLogService implements IUnifiedLogService {
  constructor(
    private commandLogRepository: ICommandLogRepository,
    private _webSocketService?: IWebSocketService,
    private logger?: ILogger,
  ) {}

  // 시스템 이벤트 로깅
  logSystemEvent(eventType: string, data: any): void {
    try {
      this.logger?.info(`[UnifiedLogService] 시스템 이벤트: ${eventType} - ${JSON.stringify(data)}`);

      // WebSocket으로 실시간 브로드캐스트
      if (this._webSocketService) {
        this._webSocketService.broadcastLog('info', 'UnifiedLogService', `시스템 이벤트: ${eventType}`, data);
      }
    } catch (error) {
      this.logger?.error(`[UnifiedLogService] 시스템 이벤트 로깅 실패: ${error}`);
    }
  }

  // CommandLog 관련 메서드들
  async getCommandLogStats(days = 7): Promise<any> {
    try {
      const result = await this.commandLogRepository.getLogStats(days);
      this.logger?.info('명령 로그 통계 조회 완료');
      return result;
    } catch (error) {
      this.logger?.error('명령 로그 통계 조회 실패');
      throw error;
    }
  }

  async cleanupCommandLogs(options: any = {}): Promise<number> {
    try {
      const deletedCount = await this.commandLogRepository.cleanupOldLogs(options);
      this.logger?.info('명령 로그 정리 완료');
      return deletedCount;
    } catch (error) {
      this.logger?.error('명령 로그 정리 실패');
      throw error;
    }
  }

  async compressCommandLogs(days = 7): Promise<number> {
    try {
      const compressedCount = await this.commandLogRepository.compressSuccessfulLogs(days);
      this.logger?.info('명령 로그 압축 완료');
      return compressedCount;
    } catch (error) {
      this.logger?.error('명령 로그 압축 실패');
      throw error;
    }
  }

  // Data 로그 관련 메서드들
  async getDataLogStats(days = 7): Promise<any> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const total = await Data.countDocuments({ updatedAt: { $gte: cutoffDate } });
      const deviceIds = await Data.distinct('deviceId', { updatedAt: { $gte: cutoffDate } });
      const deviceCount = deviceIds.length;

      const result = { total, deviceCount, days };
      this.logger?.info('데이터 로그 통계 조회 완료');
      return result;
    } catch (error) {
      this.logger?.error('데이터 로그 통계 조회 실패');
      throw error;
    }
  }

  async cleanupDataLogs(options: any = {}): Promise<number> {
    try {
      const { olderThanDays = 30, maxLogs } = options;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedCount = 0;

      if (maxLogs) {
        // 최대 로그 수 제한
        const totalLogs = await Data.countDocuments();
        if (totalLogs > maxLogs) {
          const logsToDelete = totalLogs - maxLogs;
          const oldestLogs = await Data.find({}).sort({ updatedAt: 1 }).limit(logsToDelete).select('_id');
          const idsToDelete = oldestLogs.map((log) => log._id);

          if (idsToDelete.length > 0) {
            const result = await Data.deleteMany({ _id: { $in: idsToDelete } });
            deletedCount = result.deletedCount || 0;
          }
        }
      } else {
        // 날짜 기반 정리
        const result = await Data.deleteMany({ updatedAt: { $lt: cutoffDate } });
        deletedCount = result.deletedCount || 0;
      }

      this.logger?.info('데이터 로그 정리 완료');
      return deletedCount;
    } catch (error) {
      this.logger?.error('데이터 로그 정리 실패');
      throw error;
    }
  }

  async compressDataLogs(days = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // 7일 이전 데이터는 상세 정보를 제거하고 요약 정보만 유지
      const result = await Data.updateMany(
        { updatedAt: { $lt: cutoffDate } },
        {
          $set: {
            'units.data.rawRegisters': null,
            'units.data.scheduleStatus': null,
            'units.data.season': null,
          },
        },
      );

      const compressedCount = result.modifiedCount || 0;
      this.logger?.info('데이터 로그 압축 완료');
      return compressedCount;
    } catch (error) {
      this.logger?.error('데이터 로그 압축 실패');
      throw error;
    }
  }

  // Status 로그 관련 메서드들
  async getStatusLogStats(days = 7): Promise<any> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const total = await Status.countDocuments({ updatedAt: { $gte: cutoffDate } });
      const deviceIds = await Status.distinct('deviceId', { updatedAt: { $gte: cutoffDate } });
      const deviceCount = deviceIds.length;

      const result = { total, deviceCount, days };
      this.logger?.info('상태 로그 통계 조회 완료');
      return result;
    } catch (error) {
      this.logger?.error('상태 로그 통계 조회 실패');
      throw error;
    }
  }

  async cleanupStatusLogs(options: any = {}): Promise<number> {
    try {
      const { olderThanDays = 30, maxLogs } = options;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedCount = 0;

      if (maxLogs) {
        const totalLogs = await Status.countDocuments();
        if (totalLogs > maxLogs) {
          const logsToDelete = totalLogs - maxLogs;
          const oldestLogs = await Status.find({}).sort({ updatedAt: 1 }).limit(logsToDelete).select('_id');
          const idsToDelete = oldestLogs.map((log) => log._id);

          if (idsToDelete.length > 0) {
            const result = await Status.deleteMany({ _id: { $in: idsToDelete } });
            deletedCount = result.deletedCount || 0;
          }
        }
      } else {
        const result = await Status.deleteMany({ updatedAt: { $lt: cutoffDate } });
        deletedCount = result.deletedCount || 0;
      }

      this.logger?.info('상태 로그 정리 완료');
      return deletedCount;
    } catch (error) {
      this.logger?.error('상태 로그 정리 실패');
      throw error;
    }
  }

  // Error 로그 관련 메서드들
  async getErrorLogStats(days = 7): Promise<any> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const total = await Error.countDocuments({ updatedAt: { $gte: cutoffDate } });
      const deviceIds = await Error.distinct('deviceId', { updatedAt: { $gte: cutoffDate } });
      const deviceCount = deviceIds.length;

      const result = { total, deviceCount, days };
      this.logger?.info('에러 로그 통계 조회 완료');
      return result;
    } catch (error) {
      this.logger?.error('에러 로그 통계 조회 실패');
      throw error;
    }
  }

  async cleanupErrorLogs(options: any = {}): Promise<number> {
    try {
      const { olderThanDays = 30, maxLogs } = options;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedCount = 0;

      if (maxLogs) {
        const totalLogs = await Error.countDocuments();
        if (totalLogs > maxLogs) {
          const logsToDelete = totalLogs - maxLogs;
          const oldestLogs = await Error.find({}).sort({ updatedAt: 1 }).limit(logsToDelete).select('_id');
          const idsToDelete = oldestLogs.map((log) => log._id);

          if (idsToDelete.length > 0) {
            const result = await Error.deleteMany({ _id: { $in: idsToDelete } });
            deletedCount = result.deletedCount || 0;
          }
        }
      } else {
        const result = await Error.deleteMany({ updatedAt: { $lt: cutoffDate } });
        deletedCount = result.deletedCount || 0;
      }

      this.logger?.info('에러 로그 정리 완료');
      return deletedCount;
    } catch (error) {
      this.logger?.error('에러 로그 정리 실패');
      throw error;
    }
  }

  // 통합 로그 관리 메서드들
  async cleanupAllLogs(options: any = {}): Promise<{
    commandLogs: number;
    dataLogs: number;
    statusLogs: number;
    errorLogs: number;
    total: number;
  }> {
    try {
      this.logger?.info('전체 로그 정리 시작');

      const [commandLogs, dataLogs, statusLogs, errorLogs] = await Promise.all([
        this.cleanupCommandLogs(options),
        this.cleanupDataLogs(options),
        this.cleanupStatusLogs(options),
        this.cleanupErrorLogs(options),
      ]);

      const total = commandLogs + dataLogs + statusLogs + errorLogs;

      const result = { commandLogs, dataLogs, statusLogs, errorLogs, total };
      this.logger?.info('전체 로그 정리 완료');
      return result;
    } catch (error) {
      this.logger?.error('전체 로그 정리 실패');
      throw error;
    }
  }

  async compressAllLogs(days = 7): Promise<{
    commandLogs: number;
    dataLogs: number;
    total: number;
  }> {
    try {
      this.logger?.info('전체 로그 압축 시작');

      const [commandLogs, dataLogs] = await Promise.all([this.compressCommandLogs(days), this.compressDataLogs(days)]);

      const total = commandLogs + dataLogs;

      const result = { commandLogs, dataLogs, total };
      this.logger?.info('전체 로그 압축 완료');
      return result;
    } catch (error) {
      this.logger?.error('전체 로그 압축 실패');
      throw error;
    }
  }

  async getOverallLogStats(days = 7): Promise<{
    commandLogs: any;
    dataLogs: any;
    statusLogs: any;
    errorLogs: any;
  }> {
    try {
      this.logger?.info('전체 로그 통계 조회 시작');

      const [commandLogs, dataLogs, statusLogs, errorLogs] = await Promise.all([
        this.getCommandLogStats(days),
        this.getDataLogStats(days),
        this.getStatusLogStats(days),
        this.getErrorLogStats(days),
      ]);

      const result = { commandLogs, dataLogs, statusLogs, errorLogs };
      this.logger?.info('전체 로그 통계 조회 완료');
      return result;
    } catch (error) {
      this.logger?.error('전체 로그 통계 조회 실패');
      throw error;
    }
  }
}
