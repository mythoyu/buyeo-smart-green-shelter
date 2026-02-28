import { exec } from 'child_process';
import { promisify } from 'util';

import { ILogger } from '../../shared/interfaces/ILogger';
import { ISystemRepository, SystemSettings } from '../repositories/interfaces/ISystemRepository';
import { ISystemService } from './interfaces/ISystemService';
import { IWebSocketService } from './interfaces/IWebSocketService';

const execAsync = promisify(exec);

export class RebootSchedulerService {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly systemService: ISystemService,
    private readonly systemRepository: ISystemRepository,
    private readonly webSocketService: IWebSocketService,
    private readonly logger: ILogger,
  ) {}

  start(): void {
    if (this.timer) {
      this.logger.info('[RebootSchedulerService] 이미 시작됨');
      return;
    }

    this.logger.info('[RebootSchedulerService] 호스트 자동 재부팅 스케줄러 시작 (1분 간격)');
    // 1분마다 스케줄 체크
    this.timer = setInterval(() => {
      this.checkScheduleAndReboot().catch(error => {
        this.logger.error(`[RebootSchedulerService] 스케줄 체크 중 오류: ${error}`);
      });
    }, 60_000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.info('[RebootSchedulerService] 호스트 자동 재부팅 스케줄러 중지');
    }
  }

  private async checkScheduleAndReboot(): Promise<void> {
    const settings: SystemSettings | null = await this.systemService.getSettings();
    const schedule = settings?.runtime?.rebootSchedule;

    if (!schedule || !schedule.enabled) {
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();

    // 오늘 이미 실행되었는지 확인
    if (schedule.lastExecutedAt) {
      const last = new Date(schedule.lastExecutedAt);
      if (
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate()
      ) {
        // 이미 오늘 한 번 실행됨
        return;
      }
    }

    if (currentHour !== schedule.hour) {
      return;
    }

    if (schedule.mode === 'weekly') {
      if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0) {
        return;
      }
      const today = now.getDay(); // 0~6 (일~토)
      if (!schedule.daysOfWeek.includes(today)) {
        return;
      }
    }

    this.logger.info(
      `[RebootSchedulerService] 호스트 자동 재부팅 조건 충족 - mode=${schedule.mode}, hour=${schedule.hour}`,
    );

    // lastExecutedAt 업데이트 (하루 1회 보장용)
    await this.systemRepository.updateSettings({
      runtime: {
        rebootSchedule: {
          ...schedule,
          lastExecutedAt: now,
        },
      },
    });

    await this.triggerHostReboot('schedule');
  }

  async triggerHostReboot(source: 'manual' | 'schedule' = 'manual'): Promise<void> {
    try {
      const reasonText = source === 'schedule' ? '자동 스케줄' : '수동 요청';
      this.webSocketService?.broadcastLog(
        'info',
        'system',
        `호스트 PC 재기동을 시작합니다. (${reasonText}) 잠시 후 시스템이 재시작됩니다.`,
      );

      // 비동기로 재기동 실행
      setTimeout(async () => {
        try {
          this.logger.info(
            `[RebootSchedulerService] 호스트 PC 재기동 요청됨 (${reasonText}) - 컨테이너 환경에서는 호스트에서 직접 재부팅이 필요할 수 있습니다.`,
          );

          try {
            await execAsync('reboot');
          } catch (rebootError) {
            this.logger.info(
              `[RebootSchedulerService] 컨테이너 내 재부팅 시도 실패: ${rebootError}. 호스트에서 직접 'sudo reboot' 를 실행해야 할 수 있습니다.`,
            );
          }
        } catch (error) {
          this.logger.error(`[RebootSchedulerService] 호스트 PC 재기동 실행 중 오류: ${error}`);
        }
      }, 1000);
    } catch (error) {
      this.logger.error(`[RebootSchedulerService] 호스트 PC 재기동 요청 처리 중 오류: ${error}`);
      throw error;
    }
  }
}

