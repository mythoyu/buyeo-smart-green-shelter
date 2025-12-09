import { LogStats, LogCleanupOptions } from '../../repositories/interfaces/ICommandLogRepository';

export interface ICommandLogService {
  getLogStats(days?: number): Promise<LogStats>;
  cleanupOldLogs(options?: LogCleanupOptions): Promise<number>;
  compressSuccessfulLogs(days?: number): Promise<number>;
  getDeviceLogStats(deviceId: string, days?: number): Promise<LogStats>;
  exportLogs(startDate: Date, endDate: Date): Promise<any[]>;
}
