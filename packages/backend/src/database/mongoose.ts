import mongoose from 'mongoose';

import { MONGODB_CONFIG, validateMongoDBConfig, logMongoDBConfig } from '../config/mongodb.config';
import { Logger } from '../shared/services/Logger';
import { getMongoUrl } from '../utils/environment';

const mongoLog = new Logger('Mongoose');

let isConnected = false;

export async function connectToDatabase(): Promise<void> {
  if (isConnected && mongoose.connection.readyState === 1) {
    mongoLog.info('Mongoose 이미 연결됨');
    return;
  }

  if (isConnected && mongoose.connection.readyState !== 1) {
    mongoLog.warn('MongoDB 연결 상태 불일치 감지 - 플래그 리셋');
    isConnected = false;
  }

  validateMongoDBConfig();
  logMongoDBConfig();

  const maxRetries = MONGODB_CONFIG.MAX_RETRIES;
  const baseDelay = MONGODB_CONFIG.BASE_DELAY_MS;
  const maxDelay = MONGODB_CONFIG.MAX_DELAY_MS;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      mongoLog.info(`Mongoose 연결 시도 ${attempt}/${maxRetries}...`);

      const mongoUri = getMongoUrl();
      const dbName = process.env.DB_NAME || 'bushub_client';

      await mongoose.connect(mongoUri, {
        dbName,
        maxPoolSize: MONGODB_CONFIG.MAX_POOL_SIZE,
        serverSelectionTimeoutMS: MONGODB_CONFIG.SERVER_SELECTION_TIMEOUT_MS,
        socketTimeoutMS: MONGODB_CONFIG.SOCKET_TIMEOUT_MS,
      });

      isConnected = true;
      mongoLog.info(`Mongoose 연결 성공: ${dbName} (시도 ${attempt}회)`);
      mongoLog.info(`데이터베이스: ${dbName}`);
      return;
    } catch (error) {
      lastError = error as Error;
      mongoLog.warn(`Mongoose 연결 시도 ${attempt}/${maxRetries} 실패: ${lastError.message}`);

      if (attempt === maxRetries) {
        break;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      mongoLog.info(`${delay}ms 후 재시도...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  mongoLog.error('Mongoose 연결 실패 - 모든 재시도 소진');
  throw lastError;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    mongoLog.info('Mongoose 연결 해제');
  }
}

export function getConnection(): mongoose.Connection {
  return mongoose.connection;
}

export function isConnectedToDb(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function syncIndexes(): Promise<void> {
  if (!isConnected) {
    throw new Error('데이터베이스가 연결되지 않았습니다.');
  }

  try {
    mongoLog.info('인덱스 동기화 중...');
    await mongoose.connection.syncIndexes();
    mongoLog.info('인덱스 동기화 완료');
  } catch (error) {
    mongoLog.info('인덱스 동기화 실패');
    throw error;
  }
}

export class MongoDBConnectionManager {
  private reconnectInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = MONGODB_CONFIG.MAX_RECONNECT_ATTEMPTS;
  private reconnectDelay = MONGODB_CONFIG.RECONNECT_DELAY_MS;
  private monitoringInterval = MONGODB_CONFIG.MONITORING_INTERVAL_MS;

  public startConnectionMonitoring(): void {
    if (this.reconnectInterval) {
      mongoLog.info('MongoDB 연결 모니터링이 이미 실행 중입니다.');
      return;
    }

    mongoLog.info('MongoDB 연결 상태 모니터링 시작');
    this.setupConnectionEventListeners();
    this.startPeriodicCheck();
  }

  public stopConnectionMonitoring(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
      mongoLog.info('MongoDB 연결 상태 모니터링 중지');
    }
  }

  private setupConnectionEventListeners(): void {
    mongoose.connection.on('connected', () => {
      mongoLog.info('MongoDB 연결됨');
      isConnected = true;
      this.reconnectAttempts = 0;
    });

    mongoose.connection.on('disconnected', () => {
      mongoLog.warn('MongoDB 연결 끊김');
      isConnected = false;
    });

    mongoose.connection.on('error', (error) => {
      mongoLog.error(`MongoDB 연결 오류: ${error.message}`);
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      mongoLog.info('MongoDB 재연결됨');
      isConnected = true;
      this.reconnectAttempts = 0;
    });
  }

  private startPeriodicCheck(): void {
    this.reconnectInterval = setInterval(async () => {
      await this.checkConnectionHealth();
    }, this.monitoringInterval);
  }

  private async checkConnectionHealth(): Promise<void> {
    if (this.isReconnecting) return;

    const { connection } = mongoose;
    const connected = connection.readyState === 1;

    if (!connected) {
      mongoLog.warn(`MongoDB 연결 끊김 감지 (readyState: ${connection.readyState})`);
      await this.attemptReconnect();
    } else {
      this.reconnectAttempts = 0;
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;

    try {
      mongoLog.info(`MongoDB 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      if (mongoose.connection.readyState !== 0) {
        mongoLog.info('기존 MongoDB 연결 정리 중...');
        await mongoose.disconnect();
        isConnected = false;
      }

      await connectToDatabase();

      if (mongoose.connection.readyState === 1) {
        mongoLog.info('MongoDB 재연결 성공');
        this.reconnectAttempts = 0;
      } else {
        throw new Error(`재연결 후 연결 상태가 비정상: ${mongoose.connection.readyState}`);
      }
    } catch (error) {
      mongoLog.warn(`MongoDB 재연결 실패: ${error}`);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        mongoLog.error('MongoDB 재연결 최대 시도 횟수 초과');
        this.stopConnectionMonitoring();
      }
    } finally {
      this.isReconnecting = false;
    }
  }

  public getConnectionStatus(): {
    isConnected: boolean;
    readyState: number;
    readyStateText: string;
    reconnectAttempts: number;
    isReconnecting: boolean;
  } {
    const { connection } = mongoose;
    const states: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return {
      isConnected: connection.readyState === 1,
      readyState: connection.readyState,
      readyStateText: states[connection.readyState] || 'unknown',
      reconnectAttempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting,
    };
  }
}

export const mongoConnectionManager = new MongoDBConnectionManager();
