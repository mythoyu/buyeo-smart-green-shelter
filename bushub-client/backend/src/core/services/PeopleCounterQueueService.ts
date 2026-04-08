/**
 * People Counter Queue Service
 * ttyS1 포트 직렬화를 위한 큐 시스템
 * query와 reset 작업을 순차적으로 처리
 */

import { ILogger } from '../interfaces/ILogger';
import { PeopleCounterService, type ManualApcSendResult, type PeopleCounterData } from './PeopleCounterService';

export type ResetType = 'current' | 'in' | 'out' | 'all';

type Job =
  | { type: 'query'; resolve: (v: PeopleCounterData | null) => void; reject: (e: unknown) => void }
  | { type: 'reset'; payload: { type: ResetType }; resolve: () => void; reject: (e: unknown) => void }
  | {
      type: 'manualApc';
      payload: { data: string; timeoutMs: number; waitForClosingBracket: boolean };
      resolve: (v: ManualApcSendResult) => void;
      reject: (e: unknown) => void;
    };

export class PeopleCounterQueueService {
  private queue: Job[] = [];
  private processing = false;
  private peopleCounter: PeopleCounterService;
  private logger: ILogger | undefined;

  constructor(logger?: ILogger, portPath?: string) {
    this.logger = logger;
    this.peopleCounter = new PeopleCounterService(logger, portPath);
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
   * APC 수동 테스트 프레임 — 폴링(query)과 동일 포트 직렬화
   */
  async enqueueManualApc(
    data: string,
    timeoutMs: number,
    waitForClosingBracket: boolean,
  ): Promise<ManualApcSendResult> {
    return new Promise<ManualApcSendResult>((resolve, reject) => {
      this.queue.push({
        type: 'manualApc',
        payload: { data, timeoutMs, waitForClosingBracket },
        resolve,
        reject,
      });
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
        } else if (job.type === 'reset') {
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
        } else if (job.type === 'reset') {
          const ok = await this.peopleCounter.reset(job.payload.type);
          if (ok) {
            safeResolve();
          } else {
            safeReject(new Error('reset failed'));
          }
        } else if (job.type === 'manualApc') {
          const result = await this.peopleCounter.sendManualApcFrame(
            job.payload.data,
            job.payload.timeoutMs,
            job.payload.waitForClosingBracket,
          );
          if (!settled) {
            try {
              job.resolve(result);
              settled = true;
            } catch (e) {
              this.logger?.error(`[PeopleCounterQueueService] manualApc resolve 오류: ${e}`);
            }
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
