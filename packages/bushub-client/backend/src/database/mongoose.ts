import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { MONGODB_CONFIG, validateMongoDBConfig, logMongoDBConfig } from '../config/mongodb.config';
import { logInfo, logError, logWarn } from '../logger';

dotenv.config();

let isConnected = false;

export async function connectToDatabase(): Promise<void> {
  // 실제 mongoose 연결 상태 확인
  if (isConnected && mongoose.connection.readyState === 1) {
    logInfo('Mongoose 이미 연결됨');
    return;
  }

  // 연결이 끊어진 경우 플래그 리셋
  if (isConnected && mongoose.connection.readyState !== 1) {
    logWarn('MongoDB 연결 상태 불일치 감지 - 플래그 리셋');
    isConnected = false;
  }

  // MongoDB 설정 검증 및 로깅
  validateMongoDBConfig();
  logMongoDBConfig();

  const maxRetries = MONGODB_CONFIG.MAX_RETRIES;
  const baseDelay = MONGODB_CONFIG.BASE_DELAY_MS;
  const maxDelay = MONGODB_CONFIG.MAX_DELAY_MS;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logInfo(`Mongoose 연결 시도 ${attempt}/${maxRetries}...`);

      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const dbName = process.env.DB_NAME || 'bushub_client';

      await mongoose.connect(mongoUri, {
        dbName,
        maxPoolSize: MONGODB_CONFIG.MAX_POOL_SIZE,
        serverSelectionTimeoutMS: MONGODB_CONFIG.SERVER_SELECTION_TIMEOUT_MS,
        socketTimeoutMS: MONGODB_CONFIG.SOCKET_TIMEOUT_MS,
      });

      isConnected = true;
      logInfo(`Mongoose 연결 성공: ${dbName} (시도 ${attempt}회)`);
      logInfo(`데이터베이스: ${dbName}`);
      return;
    } catch (error) {
      lastError = error as Error;
      logWarn(`Mongoose 연결 시도 ${attempt}/${maxRetries} 실패: ${lastError.message}`);

      if (attempt === maxRetries) {
        break;
      }

      // 지수 백오프: 2, 4, 8, 16, 32초 (최대 30초)
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      logInfo(`${delay}ms 후 재시도...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // 모든 재시도 실패
  logError('Mongoose 연결 실패 - 모든 재시도 소진');
  throw lastError;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logInfo('Mongoose 연결 해제');
  }
}

export function getConnection(): mongoose.Connection {
  return mongoose.connection;
}

export function isConnectedToDb(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

// 스키마 동기화 (개발 환경에서만 사용)
export async function syncIndexes(): Promise<void> {
  if (!isConnected) {
    throw new Error('데이터베이스가 연결되지 않았습니다.');
  }

  try {
    logInfo('인덱스 동기화 중...');
    await mongoose.connection.syncIndexes();
    logInfo('인덱스 동기화 완료');
  } catch (error) {
    logInfo('인덱스 동기화 실패');
    throw error;
  }
}

/**
 * MongoDB 연결 상태 모니터링 및 백그라운드 재연결 관리
 */
export class MongoDBConnectionManager {
  private reconnectInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = MONGODB_CONFIG.MAX_RECONNECT_ATTEMPTS;
  private reconnectDelay = MONGODB_CONFIG.RECONNECT_DELAY_MS;
  private monitoringInterval = MONGODB_CONFIG.MONITORING_INTERVAL_MS;

  /**
   * 연결 상태 모니터링 시작
   */
  public startConnectionMonitoring(): void {
    if (this.reconnectInterval) {
      logInfo('MongoDB 연결 모니터링이 이미 실행 중입니다.');
      return;
    }

    logInfo('MongoDB 연결 상태 모니터링 시작');
    this.setupConnectionEventListeners();
    this.startPeriodicCheck();
  }

  /**
   * 연결 상태 모니터링 중지
   */
  public stopConnectionMonitoring(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
      logInfo('MongoDB 연결 상태 모니터링 중지');
    }
  }

  /**
   * 연결 이벤트 리스너 설정
   */
  private setupConnectionEventListeners(): void {
    mongoose.connection.on('connected', () => {
      logInfo('MongoDB 연결됨');
      isConnected = true;
      this.reconnectAttempts = 0;
    });

    mongoose.connection.on('disconnected', () => {
      logWarn('MongoDB 연결 끊김');
      isConnected = false;
    });

    mongoose.connection.on('error', (error) => {
      logError(`MongoDB 연결 오류: ${error.message}`);
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logInfo('MongoDB 재연결됨');
      isConnected = true;
      this.reconnectAttempts = 0;
    });
  }

  /**
   * 주기적 연결 상태 확인 시작
   */
  private startPeriodicCheck(): void {
    this.reconnectInterval = setInterval(async () => {
      await this.checkConnectionHealth();
    }, this.monitoringInterval);
  }

  /**
   * 연결 상태 확인 및 필요시 재연결
   */
  private async checkConnectionHealth(): Promise<void> {
    if (this.isReconnecting) return;

    const { connection } = mongoose;
    const isConnected = connection.readyState === 1;

    if (!isConnected) {
      logWarn(`MongoDB 연결 끊김 감지 (readyState: ${connection.readyState})`);
      await this.attemptReconnect();
    } else {
      // 연결이 정상이면 재시도 카운터 리셋
      this.reconnectAttempts = 0;
    }
  }

  /**
   * 재연결 시도
   */
  private async attemptReconnect(): Promise<void> {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;

    try {
      logInfo(`MongoDB 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      // 기존 연결 정리
      if (mongoose.connection.readyState !== 0) {
        logInfo('기존 MongoDB 연결 정리 중...');
        await mongoose.disconnect();
        // 연결 플래그 리셋
        isConnected = false;
      }

      // 재연결 시도
      await connectToDatabase();

      // 연결 성공 확인
      if (mongoose.connection.readyState === 1) {
        logInfo('MongoDB 재연결 성공');
        this.reconnectAttempts = 0;
      } else {
        throw new Error(`재연결 후 연결 상태가 비정상: ${mongoose.connection.readyState}`);
      }
    } catch (error) {
      logWarn(`MongoDB 재연결 실패: ${error}`);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logError('MongoDB 재연결 최대 시도 횟수 초과');
        this.stopConnectionMonitoring();
      }
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * 연결 상태 확인 (ping 명령)
   */
  private async checkConnectionWithPing(): Promise<boolean> {
    try {
      if (!mongoose.connection.db) {
        return false;
      }
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      logWarn(`MongoDB ping 실패: ${error}`);
      return false;
    }
  }

  /**
   * 현재 연결 상태 반환
   */
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

// 싱글톤 인스턴스
export const mongoConnectionManager = new MongoDBConnectionManager();
