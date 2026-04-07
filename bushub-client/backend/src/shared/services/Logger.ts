import logger from '../../logger';
import { UnitValue } from '../../types';
import { ILogger } from '../interfaces/ILogger';

export class Logger implements ILogger {
  info(message: string, meta?: Record<string, UnitValue>): void {
    if (meta) {
      logger.info(message, meta);
    } else {
      logger.info(message);
    }
  }

  warn(message: string, meta?: Record<string, UnitValue>): void {
    if (meta) {
      logger.warn(message, meta);
    } else {
      logger.warn(message);
    }
  }

  error(message: string, error?: Error | any, meta?: Record<string, UnitValue>): void {
    if (error && meta) {
      logger.error(message, { error: error.message || error, ...meta });
    } else if (error) {
      // error 객체를 직접 전달하여 Winston이 처리하도록 함
      logger.error(message, error);
    } else if (meta) {
      logger.error(message, meta);
    } else {
      logger.error(message);
    }
  }

  debug(message: string, meta?: Record<string, UnitValue>): void {
    if (meta) {
      logger.debug(message, meta);
    } else {
      logger.debug(message);
    }
  }
}
