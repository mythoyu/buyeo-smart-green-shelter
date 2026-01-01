/**
 * HVAC 스케줄러 서비스
 * 외부제어 HVAC 유닛의 자동 제어를 담당
 * - 시간 체크 및 POWER 제어 (auto=true인 경우)
 * - 절기 확인 및 온도 적용
 */

import { Data } from '../../models/schemas/DataSchema';
import { Unit } from '../../models/schemas/UnitSchema';
import { ILogger } from '../../shared/interfaces/ILogger';
import { ServiceContainer } from '../container/ServiceContainer';
import { getHvacConfigForUnit } from '../../config/hvac.config';

export interface IHvacSchedulerService {
  start(): Promise<void>;
  stop(): void;
  isRunning(): boolean;
}

export class HvacSchedulerService implements IHvacSchedulerService {
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isServiceRunning = false;
  private lastAppliedSeason: number | null = null; // 절기 변경 감지용 (0: 겨울, 1: 여름)

  constructor(private logger?: ILogger) {}

  /**
   * 스케줄러 시작
   */
  async start(): Promise<void> {
    if (this.isServiceRunning) {
      this.logger?.warn('[HvacSchedulerService] 스케줄러가 이미 실행 중입니다.');
      return;
    }

    this.logger?.info('[HvacSchedulerService] 스케줄러 시작 (실행 주기: 1분)');

    // 즉시 첫 번째 실행
    await this.executeScheduler();

    // 1분마다 실행
    this.schedulerInterval = setInterval(async () => {
      await this.executeScheduler();
    }, 60 * 1000);

    this.isServiceRunning = true;
    this.logger?.info('[HvacSchedulerService] 스케줄러 시작 완료');
  }

  /**
   * 스케줄러 중지
   */
  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    this.isServiceRunning = false;
    this.logger?.info('[HvacSchedulerService] 스케줄러 중지 완료');
  }

  /**
   * 스케줄러 실행 여부 확인
   */
  isRunning(): boolean {
    return this.isServiceRunning;
  }

  /**
   * 메인 스케줄러 로직
   */
  private async executeScheduler(): Promise<void> {
    this.logger?.debug('[HvacSchedulerService] 스케줄러 실행 시작');

    try {
      // 1. 시간 체크 및 POWER 제어
      await this.checkAndControlPower();

      // 2. 절기 확인 및 온도 적용
      await this.checkAndApplySeasonal();

      this.logger?.debug('[HvacSchedulerService] 스케줄러 실행 완료');
    } catch (error) {
      this.logger?.error(`[HvacSchedulerService] 스케줄러 실행 실패: ${error}`);
    }
  }

  /**
   * 시간 체크 및 POWER 제어
   * auto=true인 경우에만 start_time_1, end_time_1에 따라 POWER 제어
   */
  private async checkAndControlPower(): Promise<void> {
    try {
      // 1. 모든 cooler 타입 유닛 조회
      const units = await Unit.find({ type: 'cooler' }).lean();

      if (units.length === 0) {
        this.logger?.debug('[HvacSchedulerService] 처리할 cooler 유닛 없음');
        return;
      }

      // 2. 현재 시간 (HH:mm 형식)
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // 3. ControlService 가져오기
      const serviceContainer = ServiceContainer.getInstance();
      const controlService = serviceContainer.getControlService();

      // 4. 각 유닛별로 처리
      for (const unit of units) {
        try {
          // 4-1. HVAC 설정 확인
          const hvacConfig = await getHvacConfigForUnit(unit);

          // 4-2. externalControlEnabled 확인
          if (!hvacConfig.externalControlEnabled) {
            this.logger?.debug(
              `[HvacSchedulerService] 스킵: ${unit.deviceId}/${unit.unitId} - externalControlEnabled=false`,
            );
            continue;
          }

          // 4-3. manufacturer 확인
          if (!hvacConfig.manufacturer) {
            this.logger?.warn(
              `[HvacSchedulerService] 스킵: ${unit.deviceId}/${unit.unitId} - manufacturer 미설정`,
            );
            continue;
          }

          // 4-4. Data 컬렉션에서 auto, start_time_1, end_time_1, power 확인
          const dataDoc = await Data.findOne({
            deviceId: unit.deviceId,
            'units.unitId': unit.unitId,
          });

          if (!dataDoc) {
            this.logger?.warn(`[HvacSchedulerService] Data 없음: ${unit.deviceId}/${unit.unitId}`);
            continue;
          }

          const unitData = dataDoc.units.find((u: any) => u.unitId === unit.unitId);
          if (!unitData || !unitData.data) {
            this.logger?.warn(`[HvacSchedulerService] Unit 데이터 없음: ${unit.deviceId}/${unit.unitId}`);
            continue;
          }

          const auto = unitData.data.auto;
          const startTime1 = unitData.data.start_time_1; // "HH:mm" 형식
          const endTime1 = unitData.data.end_time_1; // "HH:mm" 형식
          const currentPower = unitData.data.power;

          // 4-5. auto가 false이면 스킵 (사용자 수동 제어)
          if (!auto) {
            this.logger?.debug(
              `[HvacSchedulerService] 스킵: ${unit.deviceId}/${unit.unitId} - auto=false (사용자 수동 제어)`,
            );
            continue;
          }

          // 4-6. start_time_1, end_time_1 확인
          if (!startTime1 || !endTime1) {
            this.logger?.debug(
              `[HvacSchedulerService] 스킵: ${unit.deviceId}/${unit.unitId} - start_time_1 또는 end_time_1 미설정`,
            );
            continue;
          }

          // 4-7. 시간 범위 확인
          const isInTimeRange = this.isTimeInRange(currentTime, startTime1, endTime1);

          // 4-8. Device 정보 가져오기
          const { Device } = await import('../../models/schemas/DeviceSchema');
          const device = await Device.findOne({ deviceId: unit.deviceId }).lean();

          if (!device) {
            this.logger?.warn(`[HvacSchedulerService] Device 없음: ${unit.deviceId}`);
            continue;
          }

          // 4-9. POWER 제어 결정
          if (isInTimeRange) {
            // 시간 범위 내: POWER ON
            if (!currentPower) {
              this.logger?.info(
                `[HvacSchedulerService] POWER 제어: ${unit.deviceId}/${unit.unitId} - auto=true, 시간 범위 내 (${startTime1}~${endTime1}) → POWER ON`,
              );

              const result = await controlService.executeUnitCommand(unit, device, 'SET_POWER', true);

              if (result.success) {
                this.logger?.info(
                  `[HvacSchedulerService] POWER ON 성공: ${unit.deviceId}/${unit.unitId}`,
                );
              } else {
                this.logger?.error(
                  `[HvacSchedulerService] POWER ON 실패: ${unit.deviceId}/${unit.unitId} - ${result.message}`,
                );
              }
            } else {
              this.logger?.debug(
                `[HvacSchedulerService] POWER 이미 ON: ${unit.deviceId}/${unit.unitId}`,
              );
            }
          } else {
            // 시간 범위 밖: POWER OFF
            if (currentPower) {
              this.logger?.info(
                `[HvacSchedulerService] POWER 제어: ${unit.deviceId}/${unit.unitId} - auto=true, 시간 범위 밖 (${startTime1}~${endTime1}) → POWER OFF`,
              );

              const result = await controlService.executeUnitCommand(unit, device, 'SET_POWER', false);

              if (result.success) {
                this.logger?.info(
                  `[HvacSchedulerService] POWER OFF 성공: ${unit.deviceId}/${unit.unitId}`,
                );
              } else {
                this.logger?.error(
                  `[HvacSchedulerService] POWER OFF 실패: ${unit.deviceId}/${unit.unitId} - ${result.message}`,
                );
              }
            } else {
              this.logger?.debug(
                `[HvacSchedulerService] POWER 이미 OFF: ${unit.deviceId}/${unit.unitId}`,
              );
            }
          }
        } catch (error) {
          this.logger?.error(
            `[HvacSchedulerService] 유닛 처리 실패: ${unit.deviceId}/${unit.unitId} - ${error}`,
          );
          // 다음 유닛 계속 처리
        }
      }
    } catch (error) {
      this.logger?.error(`[HvacSchedulerService] POWER 제어 실패: ${error}`);
    }
  }

  /**
   * 절기 확인 및 온도 적용
   * 현재 월 기준으로 여름/겨울 온도 자동 적용
   */
  private async checkAndApplySeasonal(): Promise<void> {
    try {
      // 1. 현재 월 확인
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12

      // 2. System 설정에서 절기 설정 가져오기
      const serviceContainer = ServiceContainer.getInstance();
      const systemService = serviceContainer.getSystemService();

      // 활성 클라이언트 ID 가져오기
      const { Client } = await import('../../models/schemas/ClientSchema');
      const clients = await Client.find().lean();
      if (!clients || clients.length === 0) {
        this.logger?.warn('[HvacSchedulerService] 활성 클라이언트 없음');
        return;
      }

      const clientId = clients[0].id;
      const seasonal = await systemService.getSeasonal(clientId);

      if (!seasonal) {
        this.logger?.warn('[HvacSchedulerService] 절기 설정 없음');
        return;
      }

      // 3. 현재 월의 절기 확인
      const monthFieldMap: Record<number, keyof typeof seasonal> = {
        1: 'january',
        2: 'february',
        3: 'march',
        4: 'april',
        5: 'may',
        6: 'june',
        7: 'july',
        8: 'august',
        9: 'september',
        10: 'october',
        11: 'november',
        12: 'december',
      };

      const currentMonthField = monthFieldMap[currentMonth];
      const isSummer = seasonal[currentMonthField] === 1;
      const currentSeason = isSummer ? 1 : 0;

      // 4. 절기 변경 감지
      if (this.lastAppliedSeason !== null && this.lastAppliedSeason === currentSeason) {
        // 절기가 변경되지 않았으면 스킵
        this.logger?.debug(
          `[HvacSchedulerService] 절기 변경 없음: 현재 월=${currentMonth}, 절기=${isSummer ? '여름' : '겨울'}`,
        );
        return;
      }

      // 5. 절기 변경 감지됨 → 온도 적용
      this.logger?.info(
        `[HvacSchedulerService] 절기 변경 감지: 현재 월=${currentMonth}, 절기=${isSummer ? '여름' : '겨울'}`,
      );

      await systemService.applySeasonalToHvac(clientId, seasonal);

      // 6. 마지막 적용 절기 업데이트
      this.lastAppliedSeason = currentSeason;

      this.logger?.info(
        `[HvacSchedulerService] 절기 온도 적용 완료: 현재 월=${currentMonth}, 절기=${isSummer ? '여름' : '겨울'}`,
      );
    } catch (error) {
      this.logger?.error(`[HvacSchedulerService] 절기 확인 및 온도 적용 실패: ${error}`);
    }
  }

  /**
   * 시간이 범위 내에 있는지 확인
   * @param currentTime 현재 시간 (HH:mm 형식)
   * @param startTime 시작 시간 (HH:mm 형식)
   * @param endTime 종료 시간 (HH:mm 형식)
   * @returns 범위 내에 있으면 true
   */
  private isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
    try {
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      const currentMinutes = currentHour * 60 + currentMinute;
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      // 자정을 넘어가는 경우 처리
      if (startMinutes <= endMinutes) {
        // 일반적인 경우: 09:00 ~ 18:00
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // 자정을 넘어가는 경우: 22:00 ~ 06:00
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    } catch (error) {
      this.logger?.error(`[HvacSchedulerService] 시간 범위 확인 실패: ${error}`);
      return false;
    }
  }
}

