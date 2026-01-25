/**
 * People Counter Poller Service
 * 1초 폴링, IN누적 변경 시에만 Data + people_counter_raw 저장
 */

import { Data } from '../../models/schemas/DataSchema';
import { PeopleCounterRaw } from '../../models/schemas/PeopleCounterRawSchema';
import type { PeopleCounterData } from './PeopleCounterService';
import { ServiceContainer } from '../container/ServiceContainer';
import { ILogger } from '../interfaces/ILogger';
import type { PeopleCounterQueueService } from './PeopleCounterQueueService';
import type { IStatusService } from './interfaces/IStatusService';
import type { IErrorService } from './interfaces/IErrorService';

const POLL_INTERVAL_MS = Number(process.env.PEOPLE_COUNTER_POLL_INTERVAL) || 1000;
const DEVICE_ID = 'd082';
const UNIT_ID = 'u001';
const DEVICE_TYPE = 'people_counter';

export class PeopleCounterPollerService {
  private logger: ILogger | undefined;
  private serviceContainer: ServiceContainer | null = null;
  private queueService: PeopleCounterQueueService | null = null;
  private timer: NodeJS.Timeout | null = null;
  private lastInCumulative: number | null = null;

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  initialize(serviceContainer: ServiceContainer): void {
    this.serviceContainer = serviceContainer;
    // Container에서 QueueService 획득
    this.queueService = serviceContainer.getPeopleCounterQueueService();
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

      const state = await systemService.getPeopleCounterState(false);
      if (!state?.peopleCounterEnabled) {
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
        timestamp: new Date().toISOString(),
      };

      const unitData = {
        unitId: UNIT_ID,
        data: initialData,
      };

      await Data.updateOne(
        { deviceId: DEVICE_ID },
        {
          $set: {
            clientId,
            type: DEVICE_TYPE,
            units: [unitData],
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
    this.lastInCumulative = null;
    this.logger?.info('[PeopleCounterPoller] 중지');
  }

  /**
   * 통신 실패 시 Status·Error 갱신 (d082/u001)
   */
  private async setCommunicationErrorState(): Promise<void> {
    const sc = this.serviceContainer;
    if (!sc) return;
    try {
      const statusService = sc.getService<IStatusService>('statusService');
      const errorService = sc.getService<IErrorService>('errorService');
      await statusService.setCommunicationErrorForDevice(DEVICE_ID, UNIT_ID);
      await errorService.createCommunicationErrorForDevice(DEVICE_ID, UNIT_ID);
    } catch (e) {
      this.logger?.error(`[PeopleCounterPoller] Status/Error 갱신 실패: ${e}`);
    }
  }

  /**
   * 통신 성공 시 Status·Error clear (d082/u001)
   */
  private async clearCommunicationErrorState(): Promise<void> {
    const sc = this.serviceContainer;
    if (!sc) return;
    try {
      const statusService = sc.getService<IStatusService>('statusService');
      const errorService = sc.getService<IErrorService>('errorService');
      await statusService.clearCommunicationErrorForDevice(DEVICE_ID, UNIT_ID);
      await errorService.clearCommunicationErrorForDevice(DEVICE_ID, UNIT_ID);
    } catch (e) {
      this.logger?.error(`[PeopleCounterPoller] Status/Error clear 실패: ${e}`);
    }
  }

  private async tick(): Promise<void> {
    const sc = this.serviceContainer;
    if (!sc || !this.queueService) return;
    const systemService = sc.getSystemService();
    const clientService = sc.getClientService();

    const state = await systemService.getPeopleCounterState(false);
    if (!state?.peopleCounterEnabled) {
      return;
    }

    // QueueService를 통해 query (try/catch로 에러 처리)
    let data: PeopleCounterData | null = null;
    try {
      data = await this.queueService.enqueueQuery();
    } catch (e) {
      this.logger?.warn(`[PeopleCounterPoller] query 실패: ${e}`);
      await this.setCommunicationErrorState();
      return;
    }

    if (!data) {
      await this.setCommunicationErrorState();
      return;
    }

    // 통신 성공 → Status/Error clear (Raw 미저장 early return 경로 포함)
    await this.clearCommunicationErrorState();

    const prev = this.lastInCumulative;
    if (prev !== null && data.inCumulative === prev) return;
    this.lastInCumulative = data.inCumulative;

    let clientId = 'c0101';
    try {
      const client = await clientService.getFirstClient();
      if (client?.id) clientId = client.id;
    } catch (e) {
      this.logger?.warn(`[PeopleCounterPoller] 클라이언트 조회 실패: ${e}`);
    }

    await this.upsertData(clientId, data);
    await this.saveRaw(clientId, data);
  }

  private async upsertData(clientId: string, d: PeopleCounterData): Promise<void> {
    try {
      const unitData = {
        unitId: UNIT_ID,
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
          timestamp: d.timestamp.toISOString(),
        },
      };
      await Data.updateOne(
        { deviceId: DEVICE_ID },
        {
          $set: {
            clientId,
            type: DEVICE_TYPE,
            units: [unitData],
            updatedAt: d.timestamp,
          },
        },
        { upsert: true },
      );
    } catch (e) {
      this.logger?.error(`[PeopleCounterPoller] Data upsert 실패: ${e}`);
    }
  }

  private async saveRaw(clientId: string, d: PeopleCounterData): Promise<void> {
    try {
      await PeopleCounterRaw.create({
        clientId,
        deviceId: DEVICE_ID,
        unitId: UNIT_ID,
        timestamp: d.timestamp,
        inCumulative: d.inCumulative,
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
      this.logger?.error(`[PeopleCounterPoller] Raw 저장 실패: ${e}`);
    }
  }
}
