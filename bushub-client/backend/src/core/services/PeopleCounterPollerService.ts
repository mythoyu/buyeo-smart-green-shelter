/**
 * People Counter Poller Service
 * 10초 폴링, Data는 IN누적 변경 시 갱신, people_counter_raw는 1분당 1건만 저장 (inDelta, inRef)
 */

import { Data } from '../../models/schemas/DataSchema';
import { PeopleCounterRaw } from '../../models/schemas/PeopleCounterRawSchema';
import type { PeopleCounterData } from './PeopleCounterService';
import { ServiceContainer } from '../container/ServiceContainer';
import { ILogger } from '../interfaces/ILogger';
import { PeopleCounterQueueService } from './PeopleCounterQueueService';
import type { IStatusService } from './interfaces/IStatusService';
import type { IErrorService } from './interfaces/IErrorService';
import { formatKstLocal, getKstCalendarParts, startOfKstMinute } from '../../shared/utils/kstDateTime';

import type { ISystemService } from './interfaces/ISystemService';

const POLL_INTERVAL_MS = Number(process.env.PEOPLE_COUNTER_POLL_INTERVAL) || 10000;
const DEVICE_ID = 'd082';
const DEVICE_TYPE = 'people_counter';

type UnitRuntime = {
  unitId: string;
  queue: PeopleCounterQueueService;
  lastInCumulative: number | null;
  lastSavedMinuteKey: string | null;
  refAtStartOfCurrentMinute: number;
  lastMinuteInRef: number;
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
            lastInCumulative: null,
            lastSavedMinuteKey: null,
            refAtStartOfCurrentMinute: 0,
            lastMinuteInRef: 0,
          }))
        : [
            {
              unitId: 'u001',
              queue: serviceContainer.getPeopleCounterQueueService('u001'),
              lastInCumulative: null,
              lastSavedMinuteKey: null,
              refAtStartOfCurrentMinute: 0,
              lastMinuteInRef: 0,
            },
          ];
  }

  /**
   * PEOPLE_COUNTER_PORT(/dev/bushub-people-counter) 시리얼 폴링은
   * 피플카운터 ON + DDC 폴링 ON 둘 다일 때만 수행한다.
   */
  private async isSerialPollingActive(systemService: ISystemService): Promise<boolean> {
    const pc = await systemService.getPeopleCounterState(false);
    if (!pc?.peopleCounterEnabled) {
      return false;
    }
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
      const initialData = {
        currentCount: 0,
        inCumulative: 0,
        outCumulative: 0,
        output1: false,
        output2: false,
        countEnabled: true,
        buttonStatus: false,
        sensorStatus: true,
        limitExceeded: false,
        timestamp: formatKstLocal(new Date()),
      };

      const units: Record<string, any> = {};
      for (const u of this.units) {
        units[u.unitId] = { unitId: u.unitId, data: initialData };
      }

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
      u.lastInCumulative = null;
      u.lastSavedMinuteKey = null;
      u.refAtStartOfCurrentMinute = 0;
      u.lastMinuteInRef = 0;
    });
    this.logger?.info('[PeopleCounterPoller] 중지');
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

    // 1분 경계 감지 (KST 달력·시각 기준)
    const now = new Date();
    const kst = getKstCalendarParts(now);
    const currentMinuteKey = `${kst.year}-${kst.month}-${kst.day}-${kst.hour}-${kst.minute}`;

    const results = await Promise.allSettled(
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

        // Data 컬렉션: IN 누적 변경 시에만 업데이트 (유닛별)
        const prevIn = u.lastInCumulative;
        if (prevIn === null || data.inCumulative !== prevIn) {
          u.lastInCumulative = data.inCumulative;
          await this.upsertData(clientId, u.unitId, data);
        }

        if (u.lastSavedMinuteKey !== null && currentMinuteKey !== u.lastSavedMinuteKey) {
          await this.saveOneMinuteRaw(clientId, u.unitId, data, u.lastSavedMinuteKey, u.refAtStartOfCurrentMinute, u.lastMinuteInRef);
        }

        if (u.lastSavedMinuteKey === null || u.lastSavedMinuteKey !== currentMinuteKey) {
          u.refAtStartOfCurrentMinute = u.lastMinuteInRef;
        }
        u.lastSavedMinuteKey = currentMinuteKey;
        u.lastMinuteInRef = data.inCumulative;
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    results.forEach((_r) => {});
  }

  /**
   * 직전 분 1건을 people_counter_raw에 저장 (inDelta, inRef 포함)
   * lastSavedMinuteKey 형식: "YYYY-M-D-H-m" (M/D/H/m은 KST 연·월·일·시·분)
   */
  private async saveOneMinuteRaw(
    clientId: string,
    unitId: string,
    endOfMinuteData: PeopleCounterData,
    minuteKey: string,
    refAtStartOfCurrentMinute: number,
    lastMinuteInRef: number,
  ): Promise<void> {
    try {
      const [y, mon, d, h, min] = minuteKey.split('-').map(Number);
      const minuteStart = startOfKstMinute(y, mon, d, h, min);

      const startRef = refAtStartOfCurrentMinute;
      const endRef = lastMinuteInRef;
      let inDelta: number;
      let inRef: number;
      if (endRef < startRef) {
        inDelta = endRef;
        inRef = endRef;
      } else {
        inDelta = endRef - startRef;
        inRef = endRef;
      }

      await PeopleCounterRaw.create({
        clientId,
        deviceId: DEVICE_ID,
        unitId,
        timestamp: minuteStart,
        inCumulative: inRef,
        inDelta,
        inRef,
        outCumulative: endOfMinuteData.outCumulative,
        currentCount: endOfMinuteData.currentCount,
        output1: endOfMinuteData.output1,
        output2: endOfMinuteData.output2,
        countEnabled: endOfMinuteData.countEnabled,
        buttonStatus: endOfMinuteData.buttonStatus,
        sensorStatus: endOfMinuteData.sensorStatus,
        limitExceeded: endOfMinuteData.limitExceeded,
      });
    } catch (e) {
      this.logger?.error(`[PeopleCounterPoller] 1분 Raw 저장 실패: ${e}`);
    }
  }

  private async upsertData(clientId: string, unitId: string, d: PeopleCounterData): Promise<void> {
    try {
      const unitData = {
        unitId,
        data: {
          currentCount: d.currentCount,
          inCumulative: d.inCumulative,
          outCumulative: d.outCumulative,
          output1: d.output1,
          output2: d.output2,
          countEnabled: d.countEnabled,
          buttonStatus: d.buttonStatus,
          sensorStatus: d.sensorStatus,
          limitExceeded: d.limitExceeded,
          timestamp: formatKstLocal(d.timestamp),
        },
      };
      await Data.updateOne(
        { deviceId: DEVICE_ID },
        {
          $set: {
            clientId,
            type: DEVICE_TYPE,
            [`units.${unitId}`]: unitData,
            updatedAt: d.timestamp,
          },
        },
        { upsert: true },
      );
    } catch (e) {
      this.logger?.error(`[PeopleCounterPoller] Data upsert 실패: ${e}`);
    }
  }
}
