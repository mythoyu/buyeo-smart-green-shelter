import { CommandLog } from '../../models/schemas/CommandLogSchema';

import { ICommandLogRepository, LogStats, LogCleanupOptions } from './interfaces/ICommandLogRepository';

export class MongoCommandLogRepository implements ICommandLogRepository {
  async getLogStats(days = 7): Promise<LogStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await CommandLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          success: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'fail'] }, 1, 0] },
          },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $and: [{ $ne: ['$finishedAt', null] }, { $ne: ['$requestedAt', null] }] },
                { $subtract: ['$finishedAt', '$requestedAt'] },
                null,
              ],
            },
          },
        },
      },
    ]);

    const result = stats[0] || {
      total: 0,
      pending: 0,
      success: 0,
      failed: 0,
      avgResponseTime: 0,
    };

    return {
      total: result.total,
      pending: result.pending,
      success: result.success,
      failed: result.failed,
      avgResponseTime: result.avgResponseTime || 0,
    };
  }

  async cleanupOldLogs(options: LogCleanupOptions = {}): Promise<number> {
    const { olderThanDays = 30, maxLogs, deviceId, unitId } = options;

    const filter: any = {};

    // 날짜 필터
    if (olderThanDays > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      filter.createdAt = { $lt: cutoffDate };
    }

    // 디바이스/유닛 필터
    if (deviceId) filter.deviceId = deviceId;
    if (unitId) filter.unitId = unitId;

    // 최대 로그 수 제한
    if (maxLogs) {
      const totalLogs = await CommandLog.countDocuments();
      if (totalLogs > maxLogs) {
        const logsToDelete = totalLogs - maxLogs;
        const oldestLogs = await CommandLog.find({}).sort({ createdAt: 1 }).limit(logsToDelete).select('_id');

        const idsToDelete = oldestLogs.map((log) => log._id);
        const result = await CommandLog.deleteMany({ _id: { $in: idsToDelete } });
        return result.deletedCount || 0;
      }
      return 0;
    }

    // 일반 삭제
    const result = await CommandLog.deleteMany(filter);
    return result.deletedCount || 0;
  }

  async compressSuccessfulLogs(days = 7): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await CommandLog.updateMany(
      {
        status: 'success',
        createdAt: { $lt: startDate },
        result: { $exists: true, $ne: null },
      },
      {
        $unset: { result: 1 },
      },
    );

    return result.modifiedCount || 0;
  }

  async getDeviceLogStats(deviceId: string, days = 7): Promise<LogStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await CommandLog.aggregate([
      {
        $match: {
          deviceId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          success: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'fail'] }, 1, 0] },
          },
        },
      },
    ]);

    return (
      stats[0] || {
        total: 0,
        pending: 0,
        success: 0,
        failed: 0,
        avgResponseTime: 0,
      }
    );
  }

  async exportLogs(startDate: Date, endDate: Date): Promise<any[]> {
    return await CommandLog.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .sort({ createdAt: 1 })
      .lean();
  }
}
