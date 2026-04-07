export interface LogStats {
  total: number;
  pending: number;
  success: number;
  failed: number;
  avgResponseTime: number;
}

export interface LogCleanupOptions {
  olderThanDays?: number;
  maxLogs?: number;
  deviceId?: string;
  unitId?: string;
}

export interface ICommandLogRepository {
  getLogStats(days?: number): Promise<LogStats>;
  cleanupOldLogs(options?: LogCleanupOptions): Promise<number>;
  compressSuccessfulLogs(days?: number): Promise<number>;
  getDeviceLogStats(deviceId: string, days?: number): Promise<LogStats>;
  exportLogs(startDate: Date, endDate: Date): Promise<any[]>;
}
