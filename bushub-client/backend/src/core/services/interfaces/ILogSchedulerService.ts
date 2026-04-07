export interface ILogSchedulerService {
  start(): void;
  stop(): void;

  // 통합 로그 관리
  manualCleanup(options?: Record<string, unknown>): Promise<{
    commandLogs: number;
    dataLogs: number;
    statusLogs: number;
    errorLogs: number;
    total: number;
  }>;

  manualCompression(days?: number): Promise<{
    commandLogs: number;
    dataLogs: number;
    total: number;
  }>;

  // 개별 로그 타입별 정리
  cleanupCommandLogs(options?: Record<string, unknown>): Promise<number>;
  cleanupDataLogs(options?: Record<string, unknown>): Promise<number>;
  cleanupStatusLogs(options?: Record<string, unknown>): Promise<number>;
  cleanupErrorLogs(options?: Record<string, unknown>): Promise<number>;

  // 통계 조회
  getOverallLogStats(days?: number): Promise<{
    commandLogs: any;
    dataLogs: any;
    statusLogs: any;
    errorLogs: any;
  }>;
}
