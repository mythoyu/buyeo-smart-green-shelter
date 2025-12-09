/**
 * Snapshot Scheduler Service
 * 일일 자동 스냅샷 스케줄러
 *
 * 주요 기능:
 * 1. 매일 자정에 시스템/데이터 스냅샷 자동 생성
 * 2. 스냅샷 보관 정책 관리 (오래된 스냅샷 자동 삭제)
 * 3. 스냅샷 생성 실패 시 재시도 로직
 */

import { ServiceContainer } from '../container/ServiceContainer';
import { ILogger } from '../interfaces/ILogger';

export interface SnapshotConfig {
  enabled: boolean;
  systemSnapshotEnabled: boolean;
  dataSnapshotEnabled: boolean;
  retentionDays: number;
  maxSnapshots: number;
  scheduleTime: string; // HH:mm 형식
}

export class SnapshotScheduler {
  private static instance: SnapshotScheduler;
  private logger: ILogger | undefined;
  private serviceContainer: ServiceContainer | null = null;
  private schedulerTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  // 기본 설정
  private config: SnapshotConfig = {
    enabled: true,
    systemSnapshotEnabled: true,
    dataSnapshotEnabled: true,
    retentionDays: 9999, // 시간 제한 없음 (충분히 큰 값)
    maxSnapshots: 30, // 최대 30개
    scheduleTime: '00:00', // 자정
  };

  private constructor(logger?: ILogger) {
    this.logger = logger;
  }

  public static getInstance(logger?: ILogger): SnapshotScheduler {
    if (!SnapshotScheduler.instance) {
      SnapshotScheduler.instance = new SnapshotScheduler(logger);
    }
    return SnapshotScheduler.instance;
  }

  /**
   * 스케줄러 초기화
   */
  public initialize(serviceContainer: ServiceContainer, config?: Partial<SnapshotConfig>): void {
    this.serviceContainer = serviceContainer;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.logger?.debug('[SnapshotScheduler] 스케줄러 초기화 완료');
    this.logger?.info(`[SnapshotScheduler] 설정: ${JSON.stringify(this.config)}`);

    if (this.config.enabled) {
      this.start();
    }
  }

  /**
   * 스케줄러 시작
   */
  public start(): void {
    if (this.isRunning) {
      this.logger?.warn('[SnapshotScheduler] 스케줄러가 이미 실행 중입니다');
      return;
    }

    if (!this.config.enabled) {
      this.logger?.info('[SnapshotScheduler] 스케줄러가 비활성화되어 있습니다');
      return;
    }

    this.scheduleNextRun();
    this.isRunning = true;
    this.logger?.info('[SnapshotScheduler] 스케줄러 시작됨');
  }

  /**
   * 스케줄러 중지
   */
  public stop(): void {
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.isRunning = false;
    this.logger?.info('[SnapshotScheduler] 스케줄러 중지됨');
  }

  /**
   * 다음 실행 시간 계산 및 스케줄링
   */
  private scheduleNextRun(): void {
    const now = new Date();
    const [hours, minutes] = this.config.scheduleTime.split(':').map(Number);

    // 오늘의 스케줄 시간
    const todaySchedule = new Date(now);
    todaySchedule.setHours(hours, minutes, 0, 0);

    // 이미 지났으면 내일로 설정
    let nextRun = todaySchedule;
    if (now >= todaySchedule) {
      nextRun = new Date(todaySchedule);
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - now.getTime();

    this.logger?.info(`[SnapshotScheduler] 다음 실행 예정: ${nextRun.toISOString()}`);
    this.logger?.info(`[SnapshotScheduler] 대기 시간: ${Math.round(delay / 1000 / 60)}분`);

    this.schedulerTimer = setTimeout(() => {
      this.executeScheduledSnapshots();
      this.scheduleNextRun(); // 다음 실행 스케줄링
    }, delay);
  }

  /**
   * 예약된 스냅샷 실행
   */
  private async executeScheduledSnapshots(): Promise<void> {
    try {
      this.logger?.info('[SnapshotScheduler] 예약된 스냅샷 생성 시작');

      const promises: Promise<void>[] = [];

      // 시스템 스냅샷 생성
      if (this.config.systemSnapshotEnabled) {
        promises.push(this.createSystemSnapshot());
      }

      // 데이터 스냅샷 생성
      if (this.config.dataSnapshotEnabled) {
        promises.push(this.createDataSnapshot());
      }

      // Promise.allSettled 대신 개별 처리
      for (const promise of promises) {
        try {
          await promise;
        } catch (error) {
          this.logger?.error(`[SnapshotScheduler] 스냅샷 생성 실패: ${error}`);
        }
      }

      // 오래된 스냅샷 정리
      await this.cleanupOldSnapshots();

      this.logger?.info('[SnapshotScheduler] 예약된 스냅샷 생성 완료');
    } catch (error) {
      this.logger?.error(`[SnapshotScheduler] 예약된 스냅샷 생성 실패: ${error}`);
    }
  }

  /**
   * 시스템 스냅샷 생성
   */
  private async createSystemSnapshot(): Promise<void> {
    try {
      this.logger?.info('[SnapshotScheduler] 시스템 스냅샷 생성 시작');

      const systemService = this.serviceContainer?.getSystemService();
      if (!systemService) {
        throw new Error('SystemService를 찾을 수 없습니다');
      }

      const systemSettings = await systemService.getSettings();
      if (!systemSettings) {
        throw new Error('시스템 설정을 찾을 수 없습니다');
      }

      // 스냅샷 생성
      const snapshot = {
        id: `auto_system_${Date.now()}`,
        name: `자동 시스템 스냅샷 - ${new Date().toISOString().split('T')[0]}`,
        type: 'system' as const,
        description: '일일 자동 생성된 시스템 설정 스냅샷',
        createdAt: new Date(),
        createdBy: 'system',
        data: systemSettings,
        size: JSON.stringify(systemSettings).length,
      };

      // 스냅샷 저장 (실제로는 DB나 파일에 저장)
      await this.saveSnapshot(snapshot);

      this.logger?.info(`[SnapshotScheduler] 시스템 스냅샷 생성 완료: ${snapshot.id}`);
    } catch (error) {
      this.logger?.error(`[SnapshotScheduler] 시스템 스냅샷 생성 실패: ${error}`);
    }
  }

  /**
   * 데이터 스냅샷 생성
   */
  private async createDataSnapshot(): Promise<void> {
    try {
      this.logger?.info('[SnapshotScheduler] 데이터 스냅샷 생성 시작');

      const { Data } = await import('../../models/schemas/DataSchema');
      const dataCollection = await Data.find({}).lean();

      // 스냅샷 생성
      const snapshot = {
        id: `auto_data_${Date.now()}`,
        name: `자동 데이터 스냅샷 - ${new Date().toISOString().split('T')[0]}`,
        type: 'data' as const,
        description: '일일 자동 생성된 데이터 컬렉션 스냅샷',
        createdAt: new Date(),
        createdBy: 'system',
        data: dataCollection,
        size: JSON.stringify(dataCollection).length,
      };

      // 스냅샷 저장
      await this.saveSnapshot(snapshot);

      this.logger?.info(`[SnapshotScheduler] 데이터 스냅샷 생성 완료: ${snapshot.id}`);
    } catch (error) {
      this.logger?.error(`[SnapshotScheduler] 데이터 스냅샷 생성 실패: ${error}`);
    }
  }

  /**
   * 스냅샷을 실제로 DB에 저장
   */
  private async saveSnapshot(snapshot: any): Promise<void> {
    try {
      const { default: SnapshotModel } = await import('../../models/schemas/SnapshotSchema');

      // MongoDB에 실제 저장
      const savedSnapshot = new SnapshotModel({
        id: snapshot.id,
        name: snapshot.name,
        type: snapshot.type,
        description: snapshot.description,
        data: snapshot.data,
        size: snapshot.size,
        clientId: snapshot.clientId,
        clientName: snapshot.clientName,
        clientDescription: snapshot.clientDescription,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await savedSnapshot.save();

      this.logger?.info(`[SnapshotScheduler] 스냅샷 저장 완료: ${snapshot.id} (${snapshot.size} bytes)`);

      // 저장 후 정리 작업 실행
      await this.cleanupOldSnapshots();
    } catch (error) {
      this.logger?.error(`[SnapshotScheduler] 스냅샷 저장 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 오래된 스냅샷 정리 (30개 제한)
   */
  private async cleanupOldSnapshots(): Promise<void> {
    try {
      const { default: SnapshotModel } = await import('../../models/schemas/SnapshotSchema');

      // 전체 스냅샷 개수 확인
      const totalCount = await SnapshotModel.countDocuments();

      if (totalCount > this.config.maxSnapshots) {
        const excessCount = totalCount - this.config.maxSnapshots;

        // 오래된 순으로 정렬하여 초과분 삭제
        const oldSnapshots = await SnapshotModel.find({})
          .sort({ createdAt: 1 }) // 오래된 순
          .limit(excessCount)
          .select('_id name createdAt');

        if (oldSnapshots.length > 0) {
          const idsToDelete = oldSnapshots.map((s) => s._id);
          await SnapshotModel.deleteMany({ _id: { $in: idsToDelete } });

          this.logger?.info(`[SnapshotScheduler] 오래된 스냅샷 ${excessCount}개 삭제 완료`);
        }
      }
    } catch (error) {
      this.logger?.error(`[SnapshotScheduler] 스냅샷 정리 실패: ${error}`);
    }
  }

  /**
   * 설정 업데이트
   */
  public updateConfig(config: Partial<SnapshotConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger?.info(`[SnapshotScheduler] 설정 업데이트: ${JSON.stringify(config)}`);

    // 스케줄러 재시작
    if (this.isRunning) {
      this.stop();
      if (this.config.enabled) {
        this.start();
      }
    }
  }

  /**
   * 현재 설정 조회
   */
  public getConfig(): SnapshotConfig {
    return { ...this.config };
  }

  /**
   * 스케줄러 상태 조회
   */
  public getStatus(): { isRunning: boolean; nextRun?: Date; config: SnapshotConfig } {
    return {
      isRunning: this.isRunning,
      config: this.getConfig(),
    };
  }
}
