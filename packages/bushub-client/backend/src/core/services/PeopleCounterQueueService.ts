/**
 * People Counter Queue Service
 * ttyS1 포트 직렬화를 위한 큐 시스템
 * query와 reset 작업을 순차적으로 처리
 */

import { ILogger } from '../interfaces/ILogger';
import type { PeopleCounterData } from './PeopleCounterService';
import { PeopleCounterService } from './PeopleCounterService';

export type ResetType = 'current' | 'in' | 'out' | 'all';

type Job =
  | { type: 'query'; resolve: (v: PeopleCounterData | null) => void; reject: (e: unknown) => void }
  | { type: 'reset'; payload: { type: ResetType }; resolve: () => void; reject: (e: unknown) => void };

export class PeopleCounterQueueService {
  private queue: Job[] = [];
  private processing = false;
  private peopleCounter: PeopleCounterService;
  private logger: ILogger | undefined;

  constructor(logger?: ILogger) {
    this.logger = logger;
    this.peopleCounter = new PeopleCounterService(logger);
    this.logger?.info('[PeopleCounterQueueService] 큐 서비스 초기화 완료');
  }

  /**
   * Query 작업 enqueue
   */
  async enqueueQuery(): Promise<PeopleCounterData | null> {
    return new Promise<PeopleCounterData | null>((resolve, reject) => {
      this.queue.push({ type: 'query', resolve, reject });
      this.drain();
    });
  }

  /**
   * Reset 작업 enqueue
   */
  async enqueueReset(type: ResetType): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ type: 'reset', payload: { type }, resolve, reject });
      this.drain();
    });
  }

  /**
   * Worker: 큐에서 작업을 순차 처리
   */
  private drain(): void {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const job = this.queue.shift();
    if (!job) {
      this.processing = false;
      return;
    }

    let settled = false;

    const safeResolve = (value?: PeopleCounterData | null) => {
      if (settled) return;
      try {
        if (job.type === 'query') {
          job.resolve(value ?? null);
        } else {
          job.resolve();
        }
        settled = true;
      } catch (e) {
        this.logger?.error(`[PeopleCounterQueueService] resolve 콜백 오류: ${e}`);
      }
    };

    const safeReject = (error: unknown) => {
      if (settled) return;
      try {
        job.reject(error);
        settled = true;
      } catch (e) {
        this.logger?.error(`[PeopleCounterQueueService] reject 콜백 오류: ${e}`);
      }
    };

    (async () => {
      try {
        if (job.type === 'query') {
          const data = await this.peopleCounter.query();
          safeResolve(data);
        } else {
          const ok = await this.peopleCounter.reset(job.payload.type);
          if (ok) {
            safeResolve();
          } else {
            safeReject(new Error('reset failed'));
          }
        }
      } catch (e) {
        if (!settled) {
          safeReject(e);
        }
      } finally {
        this.processing = false;
        // 다음 job 처리
        if (this.queue.length > 0) {
          setImmediate(() => this.drain());
        }
      }
    })();
  }

  /**
   * 큐 상태 조회 (디버깅용)
   */
  getQueueStatus(): { queueLength: number; processing: boolean } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
    };
  }
}
