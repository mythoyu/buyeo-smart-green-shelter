export interface ILogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error | any, meta?: Record<string, any>): void;
  debug(message: string, ...args: any[]): void;
}
