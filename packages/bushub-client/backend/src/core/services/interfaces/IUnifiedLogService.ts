export interface IUnifiedLogService {
  // 시스템 이벤트 로깅
  logSystemEvent(eventType: string, data: any): void;

  // CommandLog 관련
  getCommandLogStats(days?: number): Promise<any>;
  cleanupCommandLogs(options?: any): Promise<number>;
  compressCommandLogs(days?: number): Promise<number>;

  // Data 로그 관련
  getDataLogStats(days?: number): Promise<any>;
  cleanupDataLogs(options?: any): Promise<number>;
  compressDataLogs(days?: number): Promise<number>;

  // Status 로그 관련
  getStatusLogStats(days?: number): Promise<any>;
  cleanupStatusLogs(options?: any): Promise<number>;

  // Error 로그 관련
  getErrorLogStats(days?: number): Promise<any>;
  cleanupErrorLogs(options?: any): Promise<number>;

  // 통합 로그 관리
  cleanupAllLogs(options?: any): Promise<{
    commandLogs: number;
    dataLogs: number;
    statusLogs: number;
    errorLogs: number;
    total: number;
  }>;

  compressAllLogs(days?: number): Promise<{
    commandLogs: number;
    dataLogs: number;
    total: number;
  }>;

  getOverallLogStats(days?: number): Promise<{
    commandLogs: any;
    dataLogs: any;
    statusLogs: any;
    errorLogs: any;
  }>;
}
