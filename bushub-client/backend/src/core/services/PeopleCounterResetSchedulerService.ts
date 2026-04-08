import { DateTime } from 'luxon';

import { Data } from '../../models/schemas/DataSchema';
import { ILogger } from '../interfaces/ILogger';
import { PeopleCounterPollerService } from './PeopleCounterPollerService';
import { PeopleCounterQueueService } from './PeopleCounterQueueService';

const KST_ZONE = 'Asia/Seoul';

type ResetResult = {
  unitId: string;
  ok: boolean;
  error?: string;
};

export class PeopleCounterResetSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private stopped = true;
  private lastRunKey: string | null = null; // YYYY-MM-DD (KST)

  constructor(
    private queueServices: Map<string, PeopleCounterQueueService>,
    private peopleCounterPoller: PeopleCounterPollerService,
    private logger?: ILogger,
  ) {}

  start(): void {
    if (!this.stopped) {
      this.logger?.warn('[PeopleCounterResetScheduler] 이미 실행 중');
      return;
    }
    this.stopped = false;
    this.logger?.info('[PeopleCounterResetScheduler] 시작');
    this.scheduleNextMidnight();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger?.info('[PeopleCounterResetScheduler] 중지');
  }

  private scheduleNextMidnight(): void {
    if (this.stopped) return;

    const nowKst = DateTime.now().setZone(KST_ZONE);
    const nextMidnightKst = nowKst.startOf('day').plus({ days: 1 });
    const delayMs = Math.max(0, Math.floor(nextMidnightKst.diff(nowKst).as('milliseconds')));
    const runKey = nextMidnightKst.toFormat('yyyy-MM-dd');

    this.logger?.info(`[PeopleCounterResetScheduler] 다음 실행 예약: ${runKey} 00:00 KST (in ${delayMs}ms)`);

    this.timer = setTimeout(async () => {
      try {
        await this.runOnceAtMidnight(runKey);
      } catch (e) {
        this.logger?.error(`[PeopleCounterResetScheduler] 실행 오류: ${e}`);
      } finally {
        // 드리프트 방지: 매번 다음 자정을 다시 계산해 예약
        this.scheduleNextMidnight();
      }
    }, delayMs);
  }

  private async runOnceAtMidnight(todayKey: string): Promise<void> {
    if (this.stopped) return;

    // 중복 방지: 같은 todayKey에 대해 하루 1회만 실행
    if (this.lastRunKey === todayKey) {
      this.logger?.warn(`[PeopleCounterResetScheduler] 중복 실행 방지: todayKey=${todayKey}`);
      return;
    }

    const startedAt = Date.now();
    this.logger?.info(`[PeopleCounterResetScheduler] 00:00 KST 리셋 시작: todayKey=${todayKey}`);

    const unitIds = Array.from(this.queueServices.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const results: ResetResult[] = [];

    for (const unitId of unitIds) {
      const q = this.queueServices.get(unitId);
      if (!q) continue;

      // 1차 시도
      try {
        await q.enqueueReset('all');
        results.push({ unitId, ok: true });
      } catch (e) {
        const firstErr = e instanceof Error ? e.message : String(e);
        this.logger?.warn(`[PeopleCounterResetScheduler] reset 실패(1차) unit=${unitId}: ${firstErr}`);

        // 1회 재시도(1초 후)
        await new Promise((r) => setTimeout(r, 1000));
        try {
          await q.enqueueReset('all');
          results.push({ unitId, ok: true });
          this.logger?.info(`[PeopleCounterResetScheduler] reset 재시도 성공 unit=${unitId}`);
        } catch (e2) {
          const err = e2 instanceof Error ? e2.message : String(e2);
          results.push({ unitId, ok: false, error: err });
          this.logger?.error(`[PeopleCounterResetScheduler] reset 실패(재시도) unit=${unitId}: ${err}`);
        }
      }

      // reset 성공/실패와 무관하게, 정책상 오늘 누적은 0으로 초기화 (성공한 경우에만 반영해도 되지만, 운영 해석을 위해 성공 시만 적용)
    }

    const okUnits = results.filter((r) => r.ok).map((r) => r.unitId);
    if (okUnits.length > 0) {
      await Promise.all(
        okUnits.map(async (unitId) => {
          try {
            // Data(d082) 즉시 0 반영
            await Data.updateOne(
              { deviceId: 'd082', type: 'people_counter', 'units.unitId': unitId },
              {
                $set: {
                  'units.$.data.todayKey': todayKey,
                  'units.$.data.todayInCount': 0,
                  updatedAt: new Date(),
                },
              },
            );
          } catch (e) {
            this.logger?.warn(`[PeopleCounterResetScheduler] Data todayInCount=0 반영 실패 unit=${unitId}: ${e}`);
          }

          try {
            // Poller 런타임 누적도 0으로 맞춤 (폴링 덮어쓰기 방지)
            this.peopleCounterPoller.resetTodayInCountRuntime(unitId, todayKey);
          } catch (e) {
            this.logger?.warn(`[PeopleCounterResetScheduler] Poller 런타임 리셋 실패 unit=${unitId}: ${e}`);
          }
        }),
      );
    }

    this.lastRunKey = todayKey;

    const elapsed = Date.now() - startedAt;
    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.filter((r) => !r.ok).length;

    this.logger?.info(
      `[PeopleCounterResetScheduler] 00:00 KST 리셋 완료: todayKey=${todayKey} ok=${okCount} fail=${failCount} elapsedMs=${elapsed}`,
    );
  }
}

