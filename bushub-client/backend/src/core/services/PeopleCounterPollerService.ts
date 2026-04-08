/**
 * People Counter Poller Service
 * 10초 폴링, Data는 in/out/currentCount 중 하나라도 변경 시 갱신,
 * people_counter_raw는 폴링 성공 시마다 1건 저장 (inDelta=직전 폴링 대비 증분)
 */

import { Data } from '../../models/schemas/DataSchema';
import { PeopleCounterRaw } from '../../models/schemas/PeopleCounterRawSchema';
import type { PeopleCounterData } from './PeopleCounterService';
import { ServiceContainer } from '../container/ServiceContainer';
import { ILogger } from '../interfaces/ILogger';
import { PeopleCounterQueueService } from './PeopleCounterQueueService';
import type { IStatusService } from './interfaces/IStatusService';
import type { IErrorService } from './interfaces/IErrorService';
import { formatKstLocal, getKstCalendarParts, startOfKstDayFromYmd } from '../../shared/utils/kstDateTime';

import type { ISystemService } from './interfaces/ISystemService';

const POLL_INTERVAL_MS = Number(process.env.PEOPLE_COUNTER_POLL_INTERVAL) || 10000;
const DEVICE_ID = 'd082';
const DEVICE_TYPE = 'people_counter';

/** 직전 폴링 in 대비 증분(Raw·WS 공통, 카운터 리셋 시 endRef만큼 증분으로 간주) */
function computePollInDelta(prevIn: number | null, endRef: number): { inDelta: number; inRef: number } {
  if (prevIn === null) {
    return { inDelta: 0, inRef: endRef };
  }
  if (endRef < prevIn) {
    return { inDelta: endRef, inRef: endRef };
  }
  return { inDelta: endRef - prevIn, inRef: endRef };
}

type UnitRuntime = {
  unitId: string;
  queue: PeopleCounterQueueService;
  /** Raw inDelta 계산용: 직전 폴링 성공 시 inCumulative */
  lastRawPollInCumulative: number | null;
  /** 유닛카드용: KST 달력일 키 (YYYY-MM-DD) */
  todayKey: string | null;
  /** 유닛카드용: 오늘(00:00~현재, KST) 입실 누적 */
  todayInCount: number;
};

export class PeopleCounterPollerService {
  private logger: ILogger | undefined;
  private serviceContainer: ServiceContainer | null = null;
  private timer: NodeJS.Timeout | null = null;
  private units: UnitRuntime[] = [];

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  initialize(serviceContainer: ServiceContainer): void {
    this.serviceContainer = serviceContainer;
    // Container에서 QueueService들 획득 (unitId별)
    const map = serviceContainer.getPeopleCounterQueueServices?.();
    const entries = map && typeof map.entries === 'function' ? Array.from(map.entries()) : [];
    this.units =
      entries.length > 0
        ? entries.map(([unitId, queue]) => ({
            unitId,
            queue,
            lastRawPollInCumulative: null,
            todayKey: null,
            todayInCount: 0,
          }))
        : [
            {
              unitId: 'u001',
              queue: serviceContainer.getPeopleCounterQueueService('u001'),
              lastRawPollInCumulative: null,
              todayKey: null,
              todayInCount: 0,
            },
          ];
  }

  /**
   * PEOPLE_COUNTER_PORT 시리얼 폴링은 DDC 폴링 설정(pollingEnabled)이 ON일 때 수행한다.
   */
  private async isSerialPollingActive(systemService: ISystemService): Promise<boolean> {
    const polling = await systemService.getPollingState(false);
    return polling?.pollingEnabled === true;
  }

  async start(): Promise<void> {
    if (this.timer) {
      this.logger?.warn('[PeopleCounterPoller] 이미 실행 중');
      return;
    }
    this.logger?.info(`[PeopleCounterPoller] 시작 (${POLL_INTERVAL_MS}ms)`);

    // 활성화 직후 초기 d082 문서 upsert (데이터 없어도 카드가 보이도록)
    await this.initializeDataDocument();

    this.timer = setInterval(() => this.tick(), POLL_INTERVAL_MS);
  }

  /**
   * 활성화 직후 초기 d082 문서 생성/업데이트
   * 데이터가 없어도 카드가 표시되도록 하기 위함
   */
  private async initializeDataDocument(): Promise<void> {
    const sc = this.serviceContainer;
    if (!sc) return;

    try {
      const systemService = sc.getSystemService();
      const clientService = sc.getClientService();

      if (!(await this.isSerialPollingActive(systemService))) {
        return;
      }

      let clientId = 'c0101';
      try {
        const client = await clientService.getFirstClient();
        if (client?.id) clientId = client.id;
      } catch (e) {
        this.logger?.warn(`[PeopleCounterPoller] 초기화 시 클라이언트 조회 실패: ${e}`);
      }

      // 초기값으로 d082 문서 upsert (데이터가 없으면 0으로 설정)
      const parts = getKstCalendarParts(new Date());
      const todayKey = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(
        parts.day,
      ).padStart(2, '0')}`;

      // 시작 시 1회 보정: 오늘 00:00~현재(KST) inDelta 합
      const todayStart = startOfKstDayFromYmd(todayKey);
      const now = new Date();

      const initialBase = {
        todayKey,
        timestamp: formatKstLocal(now),
      };

      // 런타임 상태도 함께 초기화 (유닛카드/자정 리셋 기준)
      const units = await Promise.all(
        this.units.map(async (u) => {
          let todayInCount = 0;
          try {
            const result = await PeopleCounterRaw.aggregate([
              {
                $match: {
                  clientId,
                  deviceId: DEVICE_ID,
                  unitId: u.unitId,
                  timestamp: { $gte: todayStart, $lte: now },
                },
              },
              { $group: { _id: null, sum: { $sum: { $ifNull: ['$inDelta', 0] } } } },
            ]);
            todayInCount = typeof result?.[0]?.sum === 'number' ? result[0].sum : 0;
          } catch (e) {
            this.logger?.warn(`[PeopleCounterPoller] 시작 보정 집계 실패 unit=${u.unitId}: ${e}`);
          }

          u.todayKey = todayKey;
          u.todayInCount = todayInCount;

          return {
            unitId: u.unitId,
            data: {
              ...initialBase,
              todayInCount,
            },
          };
        }),
      );

      await Data.updateOne(
        { deviceId: DEVICE_ID },
        {
          $set: {
            clientId,
            type: DEVICE_TYPE,
            units,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );

      this.logger?.info(`[PeopleCounterPoller] 초기 d082 문서 생성/업데이트 완료 (clientId: ${clientId})`);
    } catch (e) {
      this.logger?.error(`[PeopleCounterPoller] 초기 d082 문서 생성 실패: ${e}`);
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.units.forEach((u) => {
      u.lastRawPollInCumulative = null;
      u.todayKey = null;
      u.todayInCount = 0;
    });
    this.logger?.info('[PeopleCounterPoller] 중지');
  }

  /**
   * 외부 스케줄러(00:00 KST 자동 리셋 등)에서 todayInCount를 즉시 0으로 맞추기 위한 런타임 동기화.
   * - Data 컬렉션은 스케줄러에서 별도로 0으로 반영한다.
   * - 여기서는 폴러 내부 누적값이 다음 tick에 덮어쓰지 않도록 메모리 상태를 리셋한다.
   */
  resetTodayInCountRuntime(unitId: string, todayKey: string): void {
    const u = this.units.find((x) => x.unitId === unitId);
    if (!u) return;
    u.todayKey = todayKey;
    u.todayInCount = 0;
  }

  /**
   * 통신 실패 시 Status·Error 갱신 (d082/unitId)
   */
  private async setCommunicationErrorState(unitId: string): Promise<void> {
    const sc = this.serviceContainer;
    if (!sc) return;
    try {
      const statusService = sc.getService<IStatusService>('statusService');
      const errorService = sc.getService<IErrorService>('errorService');
      await statusService.setCommunicationErrorForDevice(DEVICE_ID, unitId);
      await errorService.createCommunicationErrorForDevice(DEVICE_ID, unitId);
    } catch (e) {
      this.logger?.error(`[PeopleCounterPoller] Status/Error 갱신 실패: ${e}`);
    }
  }

  /**
   * 통신 성공 시 Status·Error clear (d082/unitId)
   */
  private async clearCommunicationErrorState(unitId: string): Promise<void> {
    const sc = this.serviceContainer;
    if (!sc) return;
    try {
      const statusService = sc.getService<IStatusService>('statusService');
      const errorService = sc.getService<IErrorService>('errorService');
      await statusService.clearCommunicationErrorForDevice(DEVICE_ID, unitId);
      await errorService.clearCommunicationErrorForDevice(DEVICE_ID, unitId);
    } catch (e) {
      this.logger?.error(`[PeopleCounterPoller] Status/Error clear 실패: ${e}`);
    }
  }

  /**
   * 폴링 1회 성공 시 people_counter_raw 1건 (inDelta = 직전 폴링 대비 입실 증분)
   */
  private async savePollRaw(clientId: string, unitId: string, d: PeopleCounterData, prevIn: number | null): Promise<void> {
    const endRef = d.inCumulative;
    const { inDelta, inRef } = computePollInDelta(prevIn, endRef);

    try {
      await PeopleCounterRaw.create({
        clientId,
        deviceId: DEVICE_ID,
        unitId,
        timestamp: d.timestamp,
        inCumulative: endRef,
        inDelta,
        inRef,
        outCumulative: d.outCumulative,
        currentCount: d.currentCount,
        output1: d.output1,
        output2: d.output2,
        countEnabled: d.countEnabled,
        buttonStatus: d.buttonStatus,
        sensorStatus: d.sensorStatus,
        limitExceeded: d.limitExceeded,
      });
    } catch (e) {
      this.logger?.error(`[PeopleCounterPoller] Raw 저장 실패 unit=${unitId}: ${e}`);
    }
  }

  /** 실시간 로그 패널: 폴링 성공 시 WS broadcast */
  private broadcastPollSuccessWs(
    clientId: string,
    unitId: string,
    d: PeopleCounterData,
    pollInDelta: number,
  ): void {
    const sc = this.serviceContainer;
    if (!sc) return;
    try {
      const ws = sc.getWebSocketService();
      ws?.broadcastLog(
        'info',
        'PeopleCounterPoller',
        `[${DEVICE_ID}/${unitId}] poll ok in=${d.inCumulative} out=${d.outCumulative} room=${d.currentCount} Δin=${pollInDelta}`,
        {
          clientId,
          deviceId: DEVICE_ID,
          unitId,
          inCumulative: d.inCumulative,
          outCumulative: d.outCumulative,
          currentCount: d.currentCount,
          inDelta: pollInDelta,
        },
      );
    } catch (e) {
      this.logger?.warn(`[PeopleCounterPoller] WebSocket 로그 전송 실패: ${e}`);
    }
  }

  private async tick(): Promise<void> {
    const sc = this.serviceContainer;
    if (!sc || this.units.length === 0) return;
    const systemService = sc.getSystemService();
    const clientService = sc.getClientService();

    if (!(await this.isSerialPollingActive(systemService))) {
      return;
    }

    let clientId = 'c0101';
    try {
      const client = await clientService.getFirstClient();
      if (client?.id) clientId = client.id;
    } catch (e) {
      this.logger?.warn(`[PeopleCounterPoller] 클라이언트 조회 실패: ${e}`);
    }

    const results = await Promise.all(
      this.units.map(async (u) => {
        let data: PeopleCounterData | null = null;
        try {
          data = await u.queue.enqueueQuery();
        } catch (e) {
          this.logger?.warn(`[PeopleCounterPoller] unit=${u.unitId} query 실패: ${e}`);
          await this.setCommunicationErrorState(u.unitId);
          return;
        }

        if (!data) {
          this.logger?.warn(`[PeopleCounterPoller] unit=${u.unitId} poll: 장비 응답 없음(null)`);
          await this.setCommunicationErrorState(u.unitId);
          return;
        }

        await this.clearCommunicationErrorState(u.unitId);
        this.logger?.info(
          `[PeopleCounterPoller] unit=${u.unitId} poll ok in=${data.inCumulative} out=${data.outCumulative} room=${data.currentCount}`,
        );

        const prevForRaw = u.lastRawPollInCumulative;
        const { inDelta: pollInDelta } = computePollInDelta(prevForRaw, data.inCumulative);
        await this.savePollRaw(clientId, u.unitId, data, prevForRaw);
        u.lastRawPollInCumulative = data.inCumulative;
        this.broadcastPollSuccessWs(clientId, u.unitId, data, pollInDelta);

        // ===== Data 컬렉션(d082): 유닛카드는 todayKey/todayInCount만 사용한다. =====
        const parts = getKstCalendarParts(data.timestamp);
        const todayKeyNow = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(
          parts.day,
        ).padStart(2, '0')}`;

        const hadKey = typeof u.todayKey === 'string' && u.todayKey !== '';
        const dayChanged = hadKey && u.todayKey !== todayKeyNow;
        if (!hadKey || dayChanged) {
          u.todayKey = todayKeyNow;
          u.todayInCount = 0;
        }

        if (pollInDelta !== 0) {
          u.todayInCount += pollInDelta;
        }

        // 첫 폴링, 자정 전환, 또는 증분 발생 시에만 반영(불필요한 write 최소화)
        if (!hadKey || dayChanged || pollInDelta !== 0) {
          await this.upsertData(clientId, u.unitId, {
            todayKey: todayKeyNow,
            todayInCount: u.todayInCount,
            timestamp: data.timestamp,
          });
        }
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    results.forEach((_r) => {});
  }

  private async upsertData(
    clientId: string,
    unitId: string,
    d: { todayKey: string; todayInCount: number; timestamp: Date },
  ): Promise<void> {
    try {
      const unitData = {
        unitId,
        data: {
          todayKey: d.todayKey,
          todayInCount: d.todayInCount,
          timestamp: formatKstLocal(d.timestamp),
        },
      };

      // 배열 구조(units: [{unitId,...}])로 통일: 존재하면 $로 갱신, 없으면 push
      const updateExisting = await Data.updateOne(
        { deviceId: DEVICE_ID, type: DEVICE_TYPE, 'units.unitId': unitId },
        {
          $set: {
            clientId,
            'units.$': unitData,
            updatedAt: d.timestamp,
          },
        },
      );

      // 해당 unitId가 없으면 배열에 추가 (문서 자체가 없으면 upsert로 생성)
      const updateResult =
        (updateExisting?.matchedCount ?? 0) > 0
          ? updateExisting
          : await Data.updateOne(
              { deviceId: DEVICE_ID, type: DEVICE_TYPE },
              {
                $set: {
                  clientId,
                  updatedAt: d.timestamp,
                },
                $setOnInsert: {
                  type: DEVICE_TYPE,
                },
                $push: {
                  units: unitData,
                },
              },
              { upsert: true },
            );

      this.logger?.info(
        `[PeopleCounterPoller] data 컬렉션 반영 완료 deviceId=${DEVICE_ID} unitId=${unitId} clientId=${clientId} todayKey=${d.todayKey} todayInCount=${d.todayInCount} matched=${updateResult.matchedCount} modified=${updateResult.modifiedCount} upserted=${updateResult.upsertedCount ?? 0}`,
      );
    } catch (e) {
      this.logger?.error(
        `[PeopleCounterPoller] Data upsert 실패 deviceId=${DEVICE_ID} unitId=${unitId} clientId=${clientId} todayKey=${d.todayKey} todayInCount=${d.todayInCount}: ${e}`,
      );
    }
  }
}
