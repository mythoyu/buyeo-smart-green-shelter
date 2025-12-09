import { ILogger } from '../../shared/interfaces/ILogger';
import { ServiceContainer } from '../container/ServiceContainer';

import { IDdcTimeSyncService } from './interfaces/IDdcTimeSyncService';

export class DdcTimeSyncService implements IDdcTimeSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private serviceContainer: ServiceContainer;
  private logger: ILogger;
  private lastSyncTime: Date | null = null;
  private nextSyncTime: Date | null = null;
  private syncStatus: 'idle' | 'syncing' | 'success' | 'failed' = 'idle';
  private clientId: string | null = null;
  private syncCount: number = 0; // 동기화 횟수 카운터

  constructor(serviceContainer: ServiceContainer) {
    this.serviceContainer = serviceContainer;
    this.logger = serviceContainer.getLogger();
    this.logger?.debug('[DdcTimeSyncService] DDC 시간 동기화 서비스 초기화 완료');
  }

  // 🎯 백엔드 기동 시 즉시 실행
  async syncDdcTime(): Promise<void> {
    try {
      this.syncStatus = 'syncing';
      this.logger.info('🕐 DDC 시간 동기화 시작');

      // 1️⃣ Client 컬렉션에서 클라이언트 정보 조회
      const clientInfo = await this.getClientInfo();

      if (!clientInfo) {
        throw new Error('클라이언트 정보를 찾을 수 없습니다.');
      }

      // 2️⃣ CLIENT_PORT_MAPPINGS에서 해당 클라이언트의 DDC 시간 매핑 사용
      const { CLIENT_PORT_MAPPINGS } = await import('../../data/clientPortMappings');
      const clientMapping = (CLIENT_PORT_MAPPINGS as any)[clientInfo.clientId];

      if (!clientMapping || !clientMapping.ddc_time) {
        throw new Error(`Client ${clientInfo.clientId}에 DDC 시간 매핑이 없습니다.`);
      }

      // 3️⃣ DDC 시간 동기화 실행
      await this.syncDdcTimeForClient(clientInfo.clientId);

      // 4️⃣ 성공 상태 업데이트
      this.lastSyncTime = new Date();
      this.syncStatus = 'success';
      this.syncCount++; // 동기화 횟수 증가

      // 🎯 클라이언트 ID를 포함한 완료 로그
      this.logger.info(`✅ DDC 시간 동기화 완료: ${clientInfo.clientName} (${clientInfo.clientId})`);
    } catch (error) {
      this.syncStatus = 'failed';
      this.logger.error(`❌ DDC 시간 동기화 실패: ${error}`);
      throw error;
    }
  }

  // 🎯 즉시 실행 + 24시간 스케줄링 시작
  async startScheduledSync(): Promise<void> {
    try {
      this.logger.info('🕐 DDC 시간 동기화 스케줄링 시작');

      // 즉시 첫 번째 동기화 실행
      await this.syncDdcTime();

      // 1시간마다 반복 실행 설정 (개발/테스트용으로 단축)
      this.syncInterval = setInterval(async () => {
        await this.syncDdcTime();
      }, 60 * 60 * 1000); // 1시간 = 3,600,000ms
      // }, 10 * 1000); // 10초 = 10,000ms (개발용)
      // }, 24 * 60 * 60 * 1000); // 24시간 = 86,400,000ms (운영용)

      // 🎯 클라이언트 ID를 포함한 스케줄링 완료 로그
      if (this.clientId) {
        this.logger.info(`✅ DDC 시간 동기화 1시간 반복 스케줄 설정 완료: ${this.clientId}`);
      } else {
        this.logger.info('✅ DDC 시간 동기화 1시간 반복 스케줄 설정 완료');
      }
    } catch (error) {
      this.logger.error(`❌ DDC 시간 동기화 스케줄링 실패: ${error}`);
      throw error;
    }
  }

  // 🎯 스케줄링 중지
  stopScheduledSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.logger.info(' DDC 시간 동기화 스케줄링 중지됨');
    }
  }

  // 🎯 특정 클라이언트의 DDC 시간 동기화
  private async syncDdcTimeForClient(clientId: string): Promise<void> {
    try {
      // KST(Asia/Seoul) 기준으로 현재 시각의 구성 요소를 분해하여 사용
      const getKstParts = () => {
        const dtf = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          weekday: 'short',
          hour12: false,
        });
        const parts = Object.fromEntries(dtf.formatToParts(new Date()).map((p) => [p.type, p.value])) as Record<
          string,
          string
        >;
        const dowMap: Record<string, number> = {
          Sun: 0,
          Mon: 1,
          Tue: 2,
          Wed: 3,
          Thu: 4,
          Fri: 5,
          Sat: 6,
        };
        return {
          year: Number(parts.year),
          month: Number(parts.month),
          day: Number(parts.day),
          dow: dowMap[parts.weekday] ?? 0,
          hour: Number(parts.hour),
          minute: Number(parts.minute),
          second: Number(parts.second),
        };
      };
      const kst = getKstParts();
      const { CLIENT_PORT_MAPPINGS } = await import('../../data/clientPortMappings');
      const clientMapping = (CLIENT_PORT_MAPPINGS as any)[clientId];

      if (!clientMapping || !clientMapping.ddc_time) {
        throw new Error(`Client ${clientId}에 DDC 시간 매핑이 없습니다.`);
      }

      // 🆕 Modbus 통신 서비스를 직접 사용 (ControlService와 동일한 경로)
      const unifiedModbusService = this.serviceContainer.getUnifiedModbusService();

      // DDC 시간 동기화 명령들을 직접 실행
      // SECOND는 경계 이슈를 줄이기 위해 마지막에 설정
      const ddcTimeCommands = [
        { action: 'SET_YEAR', value: kst.year },
        { action: 'SET_MONTH', value: kst.month },
        { action: 'SET_DAY', value: kst.day },
        { action: 'SET_DOW', value: kst.dow },
        { action: 'SET_HOUR', value: kst.hour % 24 }, // 24시간을 0으로 변환
        { action: 'SET_MINUTE', value: kst.minute },
        { action: 'SET_SECOND', value: kst.second },
      ];

      // this.logger.info(` DDC 시간 동기화 명령 생성: ${clientId} - ${ddcTimeCommands.length}개`);

      let successCount = 0;

      for (const command of ddcTimeCommands) {
        let ddcTimeConfig: any;

        try {
          // 🆕 ControlService와 동일한 방식으로 writeRegister 직접 호출
          ddcTimeConfig = clientMapping.ddc_time[command.action];

          if (
            !ddcTimeConfig ||
            !ddcTimeConfig.port ||
            !ddcTimeConfig.port.functionCode ||
            !ddcTimeConfig.port.address
          ) {
            throw new Error(`Invalid DDC time mapping for ${command.action}: missing port configuration`);
          }

          const modbusResult = await unifiedModbusService.writeRegister({
            slaveId: 1, // ControlService와 동일한 하드코딩 값
            functionCode: ddcTimeConfig.port.functionCode,
            address: ddcTimeConfig.port.address,
            value: command.value,
            context: 'control', // DDC 시간 동기화용 컨텍스트 (ControlService와 동일)
          });

          if (modbusResult.success) {
            this.logger.info(
              `✅ DDC 시간 동기화 성공: ${clientId} - ${command.action} = ${command.value} (주소: ${ddcTimeConfig.port.address})`,
            );
            successCount++;
          } else {
            this.logger.error(
              `❌ DDC 시간 동기화 실패: ${clientId} - ${command.action} = ${command.value} (주소: ${ddcTimeConfig.port.address}) - ${modbusResult.error}`,
            );
            throw new Error(
              `Modbus write failed: ${clientId} - ${command.action} (${ddcTimeConfig.port.address}) - ${modbusResult.error}`,
            );
          }
        } catch (error) {
          const errorAddress = ddcTimeConfig?.port?.address || 'unknown';
          this.logger.error(
            `❌ DDC 시간 동기화 명령 실행 실패: ${clientId} - ${command.action} = ${command.value} (주소: ${errorAddress}) - ${error}`,
          );
          throw error;
        }
      }

      if (successCount !== ddcTimeCommands.length) {
        throw new Error(`DDC 시간 동기화 실패: ${clientId} (${successCount}/${ddcTimeCommands.length})`);
      }

      // 🎯 클라이언트 ID를 포함한 명령 실행 완료 로그
      // this.logger.info(`✅ ${clientId} DDC 시간 동기화 명령 ${ddcTimeCommands.length}개 실행 완료`);
    } catch (error) {
      this.logger.error(`❌ ${clientId} DDC 시간 동기화 실패: ${error}`);
      throw error;
    }
  }

  // 🎯 Client 컬렉션에서 클라이언트 정보 조회
  private async getClientInfo(): Promise<{ clientId: string; clientName: string } | null> {
    try {
      const { Client } = await import('../../models/schemas/ClientSchema');

      // Client 컬렉션에서 첫 번째 클라이언트 정보 조회
      const client = await Client.findOne({});

      if (client) {
        this.clientId = client.id;
        this.logger.info(` 클라이언트 정보 조회: ${client.id} (${client.name})`);
        return {
          clientId: client.id,
          clientName: client.name,
        };
      }
      this.logger.warn('⚠️ Client 컬렉션에 클라이언트 정보가 없습니다.');
      return null;
    } catch (error) {
      this.logger.error(`❌ 클라이언트 정보 조회 실패: ${error}`);
      return null;
    }
  }

  // 🎯 상태 조회 메서드들
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  getNextSyncTime(): Date | null {
    return this.nextSyncTime;
  }

  getSyncStatus(): string {
    return this.syncStatus;
  }

  getClientId(): string | null {
    return this.clientId;
  }

  getSyncCount(): number {
    return this.syncCount;
  }
}
