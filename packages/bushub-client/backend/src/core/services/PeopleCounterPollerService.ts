/**
 * People Counter Poller Service
 * 1초 폴링, IN누적 변경 시에만 Data + people_counter_raw 저장
 */

import { Data } from '../../models/schemas/DataSchema';
import { PeopleCounterRaw } from '../../models/schemas/PeopleCounterRawSchema';
import type { PeopleCounterData } from './PeopleCounterService';
import { PeopleCounterService } from './PeopleCounterService';
import { ServiceContainer } from '../container/ServiceContainer';
import { ILogger } from '../interfaces/ILogger';

const POLL_INTERVAL_MS = Number(process.env.PEOPLE_COUNTER_POLL_INTERVAL) || 1000;
const DEVICE_ID = 'd082';
const UNIT_ID = 'u001';
const DEVICE_TYPE = 'people_counter';

export class PeopleCounterPollerService {
  private logger: ILogger | undefined;
  private serviceContainer: ServiceContainer | null = null;
  private peopleCounter: PeopleCounterService;
  private timer: NodeJS.Timeout | null = null;
  private lastInCumulative: number | null = null;

  constructor(logger?: ILogger) {
    this.logger = logger;
    this.peopleCounter = new PeopleCounterService(logger);
  }

  initialize(serviceContainer: ServiceContainer): void {
    this.serviceContainer = serviceContainer;
  }

  start(): void {
    if (this.timer) {
      this.logger?.warn('[PeopleCounterPoller] 이미 실행 중');
      return;
    }
    this.logger?.info(`[PeopleCounterPoller] 시작 (${POLL_INTERVAL_MS}ms)`);
    this.timer = setInterval(() => this.tick(), POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.peopleCounter.close();
    this.lastInCumulative = null;
    this.logger?.info('[PeopleCounterPoller] 중지');
  }

  private async tick(): Promise<void> {
    const sc = this.serviceContainer;
    if (!sc) return;
    const systemService = sc.getSystemService();
    const clientService = sc.getClientService();

    const state = await systemService.getPeopleCounterState(false);
    if (!state?.peopleCounterEnabled) {
      this.peopleCounter.close();
      return;
    }

    const data = await this.peopleCounter.query();
    if (!data) return;

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
