import { Data } from '../../models/schemas/DataSchema';
import SystemModel from '../../models/schemas/SystemSchema';
import { ILogger } from '../../shared/interfaces/ILogger';
import { createSuccessResponse, SuccessResponse } from '../../shared/utils/responseHelper';
import { ServiceContainer } from '../container/ServiceContainer';
import { ISystemRepository, SystemSettings } from '../repositories/interfaces/ISystemRepository';

import { ISystemService } from './interfaces/ISystemService';
import { IWebSocketService } from './interfaces/IWebSocketService';

// 절기 설정 데이터 타입
interface SeasonalData {
  season?: number;
  january?: number;
  february?: number;
  march?: number;
  april?: number;
  may?: number;
  june?: number;
  july?: number;
  august?: number;
  september?: number;
  october?: number;
  november?: number;
  december?: number;
}

// DDC 시간 데이터 타입
interface DdcTimeData {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number;
}

export class SystemService implements ISystemService {
  constructor(
    private systemRepository: ISystemRepository,
    private webSocketService?: IWebSocketService,
    private logger?: ILogger,
  ) {}

  async getSettings(): Promise<SystemSettings | null> {
    try {
      // this.logger?.info('시스템 설정 조회 시작');

      const systemDoc = await this.systemRepository.findOne();

      // this.logger?.info('시스템 설정 조회 완료');

      return systemDoc;
    } catch (error) {
      this.logger?.error('시스템 설정 조회 중 오류 발생');
      throw error;
    }
  }

  async updateSettings(settingsData: Partial<SystemSettings>): Promise<SystemSettings | null> {
    try {
      this.logger?.info('시스템 설정 업데이트 시작');

      const updated = await this.systemRepository.updateSettings(settingsData);

      this.logger?.info('시스템 설정 업데이트 완료');

      return updated;
    } catch (error) {
      this.logger?.error('시스템 설정 업데이트 중 오류 발생');
      throw error;
    }
  }

  // 🔄 폴링 상태 업데이트 (간소화됨)
  async updatePollingState(pollingEnabled: boolean): Promise<SystemSettings | null> {
    try {
      this.logger?.info(`🔍 [SystemService] 폴링 상태 업데이트 시작: ${pollingEnabled ? '시작' : '중지'}`);

      // 기존 runtime 설정을 유지하면서 pollingEnabled만 업데이트
      const currentSettings = await this.getSettings();
      this.logger?.info(`🔍 [SystemService] 현재 설정 조회 결과: ${JSON.stringify(currentSettings?.runtime, null, 2)}`);

      const currentRuntime = currentSettings?.runtime || {
        pollingEnabled: false,
        pollingInterval: 30000,
        applyInProgress: false,
        peopleCounterEnabled: true,
      };

      this.logger?.info(`🔍 [SystemService] 현재 runtime: ${JSON.stringify(currentRuntime, null, 2)}`);

      // 불필요한 필드 제거 (lastChangedAt, changedBy)
      const cleanRuntime = {
        pollingEnabled,
        pollingInterval: currentRuntime.pollingInterval,
        applyInProgress: currentRuntime.applyInProgress,
        peopleCounterEnabled: currentRuntime.peopleCounterEnabled ?? true,
      };

      this.logger?.info(`🔍 [SystemService] 업데이트할 runtime 설정: ${JSON.stringify(cleanRuntime, null, 2)}`);

      this.logger?.info(`🔍 [SystemService] systemRepository.updateSettings 호출 시작`);
      const updated = await this.systemRepository.updateSettings({
        runtime: cleanRuntime,
      });
      this.logger?.info(`🔍 [SystemService] systemRepository.updateSettings 호출 완료`);

      this.logger?.info(`🔍 [SystemService] DB 업데이트 결과: ${JSON.stringify(updated?.runtime, null, 2)}`);

      if (updated) {
        this.logger?.info(`✅ [SystemService] 폴링 상태 업데이트 완료: ${pollingEnabled ? '시작' : '중지'}`);
      } else {
        this.logger?.error(`❌ [SystemService] 폴링 상태 업데이트 실패: updated가 null`);
      }

      return updated;
    } catch (error) {
      this.logger?.error(`❌ [SystemService] 폴링 상태 업데이트 중 오류 발생: ${error}`);
      throw error;
    }
  }

  async setApplyLock(applyInProgress: boolean): Promise<SystemSettings | null> {
    try {
      this.logger?.info(`Data 적용 락 설정: ${applyInProgress ? '활성화' : '해제'}`);

      const currentSettings = await this.getSettings();
      if (!currentSettings?.runtime) {
        throw new Error('시스템 런타임 설정이 없습니다');
      }

      const updated = await this.systemRepository.updateSettings({
        runtime: {
          ...currentSettings.runtime,
          applyInProgress,
        },
      });

      this.logger?.info(`Data 적용 락 설정 완료: ${applyInProgress ? '활성화' : '해제'}`);

      return updated;
    } catch (error) {
      this.logger?.error('Data 적용 락 설정 중 오류 발생');
      throw error;
    }
  }

  // 🔄 폴링 상태 조회 (간소화됨)
  async getPollingState(initializeIfMissing = false): Promise<{
    pollingEnabled: boolean;
    applyInProgress: boolean;
  } | null> {
    try {
      const settings = await this.getSettings();
      if (!settings?.runtime) {
        // initializeIfMissing이 true일 때만 기본값으로 초기화
        if (initializeIfMissing) {
          this.logger?.info('폴링 상태가 없어 기본값으로 초기화합니다');
          const defaultRuntime = {
            pollingEnabled: false, // 기본값은 false이지만 사용자가 변경한 값은 보존
            pollingInterval: 30000,
            applyInProgress: false,
            peopleCounterEnabled: true,
          };

          const updated = await this.systemRepository.updateSettings({
            runtime: defaultRuntime,
          });

          if (!updated?.runtime) {
            return null;
          }

          return {
            pollingEnabled: updated.runtime.pollingEnabled,
            applyInProgress: updated.runtime.applyInProgress,
          };
        }
        // 기존 설정이 없고 초기화하지 않을 때는 null 반환
        this.logger?.info('폴링 상태가 없지만 기존 설정을 보존합니다');
        return null;
      }

      return {
        pollingEnabled: settings.runtime.pollingEnabled,
        applyInProgress: settings.runtime.applyInProgress,
      };
    } catch (error) {
      this.logger?.error('폴링 상태 조회 중 오류 발생');
      throw error;
    }
  }

  async getPeopleCounterState(initializeIfMissing = false): Promise<{ peopleCounterEnabled: boolean } | null> {
    try {
      const settings = await this.getSettings();
      if (!settings?.runtime) {
        if (initializeIfMissing) {
          this.logger?.info('피플카운터 상태가 없어 기본값으로 초기화합니다');
          const defaultRuntime = {
            pollingEnabled: false,
            pollingInterval: 30000,
            applyInProgress: false,
            peopleCounterEnabled: true,
          };
          const updated = await this.systemRepository.updateSettings({ runtime: defaultRuntime });
          if (!updated?.runtime) return null;
          return { peopleCounterEnabled: updated.runtime.peopleCounterEnabled ?? true };
        }
        return null;
      }
      return { peopleCounterEnabled: settings.runtime.peopleCounterEnabled ?? true };
    } catch (error) {
      this.logger?.error('피플카운터 상태 조회 중 오류 발생');
      throw error;
    }
  }

  async updatePeopleCounterState(peopleCounterEnabled: boolean): Promise<SystemSettings | null> {
    try {
      const currentSettings = await this.getSettings();
      const currentRuntime = currentSettings?.runtime || {
        pollingEnabled: false,
        pollingInterval: 30000,
        applyInProgress: false,
        peopleCounterEnabled: true,
      };
      const updated = await this.systemRepository.updateSettings({
        runtime: { ...currentRuntime, peopleCounterEnabled },
      });
      return updated;
    } catch (error) {
      this.logger?.error('피플카운터 상태 업데이트 중 오류 발생');
      throw error;
    }
  }

  async resetToDefaults(): Promise<SystemSettings | null> {
    try {
      this.logger?.info('시스템 설정을 기본값으로 초기화');

      const defaultSettings = (SystemModel as any).getDefaultSettings();
      const result = await this.systemRepository.updateSettings(defaultSettings);

      if (result) {
        this.logger?.info('시스템 설정 초기화 완료');
      }

      return result;
    } catch (error) {
      this.logger?.error('시스템 설정 초기화 중 오류 발생');
      throw error;
    }
  }

  // 🔄 시스템 모드 업데이트 메서드 제거됨
  // async updateSystemMode(mode: 'auto' | 'manual'): Promise<SystemSettings | null> {
  //   // 제거됨
  // }

  async exportSettings(): Promise<SystemSettings | null> {
    try {
      this.logger?.info('시스템 설정 내보내기');

      const systemDoc = await this.systemRepository.findOne();

      this.logger?.info('시스템 설정 내보내기 완료');

      return systemDoc;
    } catch (error) {
      this.logger?.error('시스템 설정 내보내기 중 오류 발생');
      throw error;
    }
  }

  async importSettings(settings: SystemSettings): Promise<SystemSettings | null> {
    try {
      this.logger?.info('시스템 설정 가져오기 시작');

      const result = await this.systemRepository.updateSettings(settings);

      if (result) {
        this.logger?.info('시스템 설정 가져오기 완료');
      }

      return result;
    } catch (error) {
      this.logger?.error('시스템 설정 가져오기 중 오류 발생');
      throw error;
    }
  }

  async applySettings(): Promise<SuccessResponse> {
    try {
      this.logger?.info('시스템 설정 적용');

      // 실제 시스템 설정 적용은 LinuxSystemService를 통해 처리됩니다
      // Network Control API가 별도로 네트워크/NTP 설정을 관리합니다

      this.logger?.info('시스템 설정 적용 완료');

      return createSuccessResponse('시스템 설정이 적용되었습니다.');
    } catch (error) {
      this.logger?.error('시스템 설정 적용 중 오류 발생');
      throw error;
    }
  }

  async saveSystemSettings(settingsData: SystemSettings): Promise<SuccessResponse> {
    try {
      this.logger?.info('시스템 설정 저장 (초기화)');

      await this.systemRepository.saveSystemSettings(settingsData);

      this.logger?.info('시스템 설정 저장 완료 (초기화)');

      return createSuccessResponse('시스템 설정이 저장되었습니다.');
    } catch (error) {
      this.logger?.error('시스템 설정 저장 중 오류 발생 (초기화)');
      throw error;
    }
  }

  // 🔄 폴링 간격 업데이트 (runtime.pollingInterval로 수정)
  async updatePollingInterval(pollingInterval: number): Promise<SystemSettings | null> {
    try {
      this.logger?.info(`폴링 간격 업데이트: ${pollingInterval}ms`);

      // 기존 runtime 설정을 유지하면서 pollingInterval만 업데이트
      const currentSettings = await this.getSettings();
      const currentRuntime = currentSettings?.runtime || {
        pollingEnabled: false,
        pollingInterval: 1000,
        applyInProgress: false,
        peopleCounterEnabled: true,
      };

      const updated = await this.systemRepository.updateSettings({
        runtime: {
          ...currentRuntime,
          pollingInterval,
        },
      });

      if (updated) {
        this.logger?.info(`폴링 간격 업데이트 완료: ${pollingInterval}ms`);
      }

      // 폴링 서비스에 간격 변경 알림
      const pollingService = ServiceContainer.getInstance().getUnifiedModbusPollerService();
      if (pollingService) {
        await pollingService.schedulePollingIntervalChange(pollingInterval);
        this.logger?.info(`폴링 서비스에 간격 변경 알림 완료: ${pollingInterval}ms`);
      }

      // WebSocket을 통해 실시간 알림 전송
      this.webSocketService?.broadcastLog('info', 'system', `폴링 간격이 ${pollingInterval}ms로 업데이트되었습니다.`);

      return updated;
    } catch (error) {
      this.logger?.error('폴링 간격 업데이트 중 오류 발생');
      throw error;
    }
  }

  // ==================== 🆕 CLIENT_PORT_MAPPINGS 기반 AUTO 명령 처리 ====================

  /**
   * 🆕 CLIENT_PORT_MAPPINGS에서 모든 SET_AUTO 명령 검색
   */
  private findAllAutoCommands(clientMapping: any): Array<{
    deviceType: string;
    unitId: string;
    command: any;
  }> {
    const allAutoCommands: Array<{
      deviceType: string;
      unitId: string;
      command: any;
    }> = [];

    // 장비 타입별로 순회 (COMMON_SYSTEM_PORTS 제외)
    for (const [deviceType, deviceMapping] of Object.entries(clientMapping)) {
      // ddc_time, seasonal은 제외 (일반 디바이스만 처리)
      if (deviceType === 'ddc_time' || deviceType === 'seasonal') continue;

      if (typeof deviceMapping === 'object' && deviceMapping !== null) {
        // 유닛별로 순회
        for (const [unitId, unitMapping] of Object.entries(deviceMapping)) {
          if (typeof unitMapping === 'object' && unitMapping !== null) {
            // SET_AUTO 명령이 있는지 확인
            if (unitMapping.SET_AUTO) {
              allAutoCommands.push({
                deviceType,
                unitId,
                command: unitMapping.SET_AUTO,
              });
            }
          }
        }
      }
    }

    return allAutoCommands;
  }

  /**
   * 🆕 활성 클라이언트 ID 조회
   */
  private async getActiveClientId(): Promise<string> {
    const clientRepository = ServiceContainer.getInstance().getClientRepository();
    const clients = await clientRepository.findAll();

    if (!clients || clients.length === 0) {
      throw new Error('활성 클라이언트가 없습니다.');
    }

    const activeClient = clients[0];
    this.logger?.info(`🎯 활성 클라이언트: ${activeClient.id} (${activeClient.name})`);

    return activeClient.id;
  }

  /**
   * 🆕 모든 SET_AUTO 명령 실행 (공통 로직)
   */
  async executeAllAutoCommands(
    clientId: string,
    targetValue: number, // 1: schedule, 0: manual
    modeText: string,
  ): Promise<{ successCount: number; failureCount: number }> {
    const { CLIENT_PORT_MAPPINGS } = await import('../../data/clientPortMappings');
    // 🆕 타입 오류 해결을 위해 any 타입 사용
    const clientMapping = (CLIENT_PORT_MAPPINGS as any)[clientId];

    if (!clientMapping) {
      throw new Error(`Client ${clientId}에 매핑이 없습니다.`);
    }

    const setAutoCommands = this.findAllAutoCommands(clientMapping);

    if (setAutoCommands.length === 0) {
      throw new Error(`Client ${clientId}에 SET_AUTO 명령이 없습니다.`);
    }

    this.logger?.info(`${modeText}모드 활성화: ${setAutoCommands.length}개 SET_AUTO 명령 발견`);

    const unifiedModbusService = ServiceContainer.getInstance().getUnifiedModbusService();
    let successCount = 0;
    let failureCount = 0;

    for (const { deviceType, unitId, command } of setAutoCommands) {
      try {
        // 새로운 매핑 구조에 맞게 functionCode와 address 추출
        let functionCode: number;
        let address: number;

        if (command.port) {
          // 새로운 구조: { port: { functionCode, address } }
          functionCode = command.port.functionCode;
          address = command.port.address;
        } else if (command.functionCode && command.address) {
          // 하위 호환성: { functionCode, address }
          functionCode = command.functionCode;
          address = command.address;
        } else {
          throw new Error(`Invalid command structure for ${deviceType}/${unitId}: missing functionCode or address`);
        }

        const modbusResult = await unifiedModbusService.writeRegister({
          slaveId: 1,
          functionCode,
          address,
          value: targetValue,
          context: 'control',
        });

        if (modbusResult.success) {
          successCount++;
          this.logger?.info(`✅ ${deviceType}/${unitId} SET_AUTO 성공: ${modeText} 모드`);
        } else {
          failureCount++;
          this.logger?.error(`❌ ${deviceType}/${unitId} SET_AUTO 실패: ${modbusResult.error}`);
        }
      } catch (error) {
        failureCount++;
        this.logger?.error(`❌ ${deviceType}/${unitId} SET_AUTO 실행 실패: ${error}`);
      }
    }

    return { successCount, failureCount };
  }


  // ==================== 🌸 절기 설정 관련 메서드들 ====================

  /**
   * 🌸 절기 설정 저장
   */
  async saveSeasonal(clientId: string, seasonal: SeasonalData): Promise<SuccessResponse> {
    try {
      this.logger?.info(`🔄 ${clientId} 절기 설정 저장 시작`);

      // 1️⃣ 시스템 설정에 절기 설정 저장
      const updated = await this.systemRepository.updateSettings({ seasonal });
      if (!updated) {
        throw new Error('시스템 설정 업데이트 실패');
      }

      // 2️⃣ 모드버스를 통해 DDC에 설정 반영
      const modbusSuccess = await this.applySeasonalToModbus(clientId, seasonal);

      if (modbusSuccess) {
        this.logger?.info(`✅ ${clientId} 절기 설정 저장 완료`);
        // 저장 후 DB에서 조회하여 응답 생성 (season 필드는 readonly이므로 제외)
        const savedSeasonal = await this.getSeasonal(clientId);
        if (savedSeasonal) {
          const { season, ...seasonalWithoutSeason } = savedSeasonal;
          return createSuccessResponse('절기 설정이 성공적으로 저장되었습니다.', { seasonal: seasonalWithoutSeason });
        }
        // 조회 실패 시 입력받은 데이터에서 season 필드만 제외하여 반환
        const { season, ...seasonalWithoutSeason } = seasonal;
        return createSuccessResponse('절기 설정이 성공적으로 저장되었습니다.', { seasonal: seasonalWithoutSeason });
      }
      throw new Error('모드버스 설정 반영 실패');
    } catch (error) {
      this.logger?.error(`❌ ${clientId} 절기 설정 저장 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 🌸 절기 설정 조회
   */
  async getSeasonal(clientId: string): Promise<SeasonalData | null> {
    try {
      this.logger?.info(`🔄 ${clientId} 절기 설정 조회 시작`);

      const systemDoc = await this.systemRepository.findOne();
      const seasonal = systemDoc?.seasonal;

      this.logger?.info(`✅ ${clientId} 절기 설정 조회 완료`);

      // 기본값 제공으로 타입 안전성 확보 (GET 조회 시에는 season 필드 포함)
      if (seasonal) {
        return {
          season: seasonal.season ?? 0,
          january: seasonal.january ?? 0,
          february: seasonal.february ?? 0,
          march: seasonal.march ?? 0,
          april: seasonal.april ?? 0,
          may: seasonal.may ?? 0,
          june: seasonal.june ?? 1,
          july: seasonal.july ?? 1,
          august: seasonal.august ?? 1,
          september: seasonal.september ?? 0,
          october: seasonal.october ?? 0,
          november: seasonal.november ?? 0,
          december: seasonal.december ?? 0,
        };
      }

      // 기본 절기 설정 반환 (GET 조회 시에는 season 필드 포함)
      return {
        season: 0, // 겨울
        january: 0, // 겨울
        february: 0, // 겨울
        march: 0, // 겨울
        april: 0, // 겨울
        may: 0, // 겨울
        june: 1, // 여름
        july: 1, // 여름
        august: 1, // 여름
        september: 0, // 겨울
        october: 0, // 겨울
        november: 0, // 겨울
        december: 0, // 겨울
      };
    } catch (error) {
      this.logger?.error(`❌ ${clientId} 절기 설정 조회 실패: ${error}`);
      return null;
    }
  }

  /**
   * 🌸 절기 설정을 모드버스에 반영
   */
  async applySeasonalToModbus(clientId: string, seasonal: SeasonalData): Promise<boolean> {
    this.logger?.info(`🔄 ${clientId} 절기 설정 모드버스 반영 시작`);

    // CLIENT_PORT_MAPPINGS에서 DDC 설정 매핑 가져오기
    const { CLIENT_PORT_MAPPINGS } = await import('../../data/clientPortMappings');
    const clientMapping = (CLIENT_PORT_MAPPINGS as any)[clientId];

    if (!clientMapping || !clientMapping.seasonal) {
      throw new Error(`Client ${clientId}에 절기 설정 매핑이 없습니다.`);
    }

    // 모드버스 서비스 가져오기
    const unifiedModbusService = ServiceContainer.getInstance().getUnifiedModbusService();

    const seasonalMapping = {
      season: 'SET_SEASON',
      january: 'SET_JAN_SUMMER',
      february: 'SET_FEB_SUMMER',
      march: 'SET_MAR_SUMMER',
      april: 'SET_APR_SUMMER',
      may: 'SET_MAY_SUMMER',
      june: 'SET_JUN_SUMMER',
      july: 'SET_JUL_SUMMER',
      august: 'SET_AUG_SUMMER',
      september: 'SET_SEP_SUMMER',
      october: 'SET_OCT_SUMMER',
      november: 'SET_NOV_SUMMER',
      december: 'SET_DEC_SUMMER',
    };

    for (const [field, actionKey] of Object.entries(seasonalMapping)) {
      const fieldValue = seasonal[field as keyof SeasonalData];
      if (fieldValue === undefined) {
        continue;
      }

      const actionConfig = this.findSeasonalActionConfig(clientMapping, actionKey);
      if (!actionConfig) {
        if (field === 'season') {
          this.logger?.info(`ℹ️ ${clientId} ${field} 설정은 장비에서 지원하지 않아 건너뜁니다.`);
          continue;
        }
        throw new Error(`절기 설정 매핑 누락: ${clientId} - ${actionKey}`);
      }

      let functionCode: number;
      let address: number;

      if (actionConfig.port) {
        functionCode = actionConfig.port.functionCode;
        address = actionConfig.port.address;
      } else if (actionConfig.functionCode && actionConfig.address) {
        functionCode = actionConfig.functionCode;
        address = actionConfig.address;
      } else {
        throw new Error(`Invalid action config for ${actionKey}: missing functionCode or address`);
      }

      const modbusResult = await unifiedModbusService.writeRegister({
        slaveId: 1,
        functionCode: functionCode || 6,
        address,
        value: fieldValue,
        context: 'control',
      });

      if (!modbusResult.success) {
        throw new Error(
          `Modbus write failed: ${clientId} - ${actionKey} (${address}) - ${modbusResult.error ?? 'unknown error'}`,
        );
      }

      this.logger?.info(`✅ ${clientId} ${field} 설정 성공: ${seasonal[field as keyof SeasonalData]}`);
    }

    this.logger?.info(`✅ ${clientId} 절기 설정 모드버스 반영 완료`);
    return true;
  }

  async refreshSeasonal(clientId: string): Promise<SuccessResponse> {
    this.logger?.info(`🔄 ${clientId} 절기 설정 새로고침 시작`);

    const { CLIENT_PORT_MAPPINGS } = await import('../../data/clientPortMappings');
    const clientMapping = (CLIENT_PORT_MAPPINGS as any)[clientId];

    if (!clientMapping || !clientMapping.seasonal) {
      throw new Error(`Client ${clientId}에 절기 설정 매핑이 없습니다.`);
    }

    const unifiedModbusService = ServiceContainer.getInstance().getUnifiedModbusService();

    const seasonalGetMapping = {
      season: 'GET_SEASON',
      january: 'GET_JAN_SUMMER',
      february: 'GET_FEB_SUMMER',
      march: 'GET_MAR_SUMMER',
      april: 'GET_APR_SUMMER',
      may: 'GET_MAY_SUMMER',
      june: 'GET_JUN_SUMMER',
      july: 'GET_JUL_SUMMER',
      august: 'GET_AUG_SUMMER',
      september: 'GET_SEP_SUMMER',
      october: 'GET_OCT_SUMMER',
      november: 'GET_NOV_SUMMER',
      december: 'GET_DEC_SUMMER',
    };

    const refreshedSeasonal: Record<string, number> = {};

    for (const [field, actionKey] of Object.entries(seasonalGetMapping)) {
      const actionConfig = this.findSeasonalActionConfig(clientMapping, actionKey);
      if (!actionConfig) {
        // season 필드는 장비에서 지원하지 않을 수 있으므로 건너뜀
        if (field === 'season') {
          this.logger?.info(`ℹ️ ${clientId} ${field} 설정은 장비에서 지원하지 않아 건너뜁니다.`);
          continue;
        }
        throw new Error(`절기 설정 읽기 매핑 누락: ${clientId} - ${actionKey}`);
      }

      let functionCode: number;
      let address: number;

      if (actionConfig.port) {
        functionCode = actionConfig.port.functionCode;
        address = actionConfig.port.address;
      } else if (actionConfig.functionCode && actionConfig.address) {
        functionCode = actionConfig.functionCode;
        address = actionConfig.address;
      } else {
        throw new Error(`Invalid action config for ${actionKey}: missing functionCode or address`);
      }

      const result = await unifiedModbusService.readRegisters({
        slaveId: 1,
        functionCode,
        address,
        length: actionConfig.length || 1,
        context: 'control',
      });

      if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
        throw new Error(
          `Modbus read failed: ${clientId} - ${actionKey} (${address}) - ${result.error ?? 'unknown error'}`,
        );
      }

      const rawValue = Number(result.data[0]);
      // season 필드는 원래 값 그대로 사용, 나머지는 0/1로 정규화
      const normalizedValue = field === 'season' ? rawValue : rawValue <= 0 ? 0 : rawValue >= 1 ? 1 : rawValue;

      refreshedSeasonal[field] = normalizedValue;
    }

    await this.systemRepository.updateSettings({
      seasonal: refreshedSeasonal as SeasonalData,
    });

    this.logger?.info(`✅ ${clientId} 절기 설정 새로고침 완료`);

    // refresh 응답에는 season 필드 포함
    return createSuccessResponse('절기 설정을 다시 불러왔습니다.', { seasonal: refreshedSeasonal });
  }

  /**
   * 🌸 CLIENT_PORT_MAPPINGS에서 절기 설정 액션 설정 찾기
   */
  private findSeasonalActionConfig(clientMapping: any, actionKey: string): any {
    // seasonal에서 검색
    if (clientMapping.seasonal && clientMapping.seasonal[actionKey]) {
      return clientMapping.seasonal[actionKey];
    }

    return null;
  }

  async updateAllUnitsAutoField(autoValue: boolean): Promise<{ unitsUpdated: number }> {
    try {
      this.logger?.info(`auto 필드가 있는 장비들의 auto 필드를 ${autoValue}로 변경 시작`);

      // 1. MongoDB aggregation으로 auto 필드가 실제로 존재하는 장비들 찾기
      const devicesWithAutoField = await this.findDevicesWithAutoField();

      if (devicesWithAutoField.length === 0) {
        this.logger?.warn('auto 필드가 있는 장비를 찾을 수 없습니다.');
        return { unitsUpdated: 0 };
      }

      // 2. MongoDB bulk update - auto 필드가 있는 장비만
      const result = await Data.updateMany(
        {
          deviceId: { $in: devicesWithAutoField },
        },
        {
          $set: {
            'units.$[].data.auto': autoValue,
            updatedAt: new Date(),
          },
        },
      );

      this.logger?.info(
        `auto 필드 업데이트 완료: ${result.modifiedCount}개 문서 수정, 대상 장비: ${devicesWithAutoField.join(', ')}`,
      );

      // 3. WebSocket 알림
      const modeText = autoValue ? '자동' : '수동';
      this.webSocketService?.broadcastLog(
        'info',
        'system',
        `${modeText}모드가 활성화되었습니다. 자동/수동 모드가 있는 장비들의 설정이 변경되었습니다.`,
      );

      return { unitsUpdated: result.modifiedCount };
    } catch (error) {
      this.logger?.error(`auto 필드 업데이트 중 오류: ${error}`);
      throw error;
    }
  }

  /**
   * MongoDB aggregation으로 auto 필드가 실제로 존재하는 장비들 찾기
   */
  private async findDevicesWithAutoField(): Promise<string[]> {
    try {
      // MongoDB aggregation으로 auto 필드가 실제로 존재하는 장비들 찾기
      const result = await Data.aggregate([
        {
          $match: {
            'units.data.auto': { $exists: true },
          },
        },
        {
          $group: {
            _id: '$deviceId',
          },
        },
        {
          $project: {
            deviceId: '$_id',
          },
        },
      ]);

      const deviceIds = result.map((item) => item.deviceId);
      this.logger?.info(`auto 필드가 있는 장비들 발견: ${deviceIds.join(', ')}`);

      return deviceIds;
    } catch (error) {
      this.logger?.error(`auto 필드 장비 조회 중 오류: ${error}`);
      // 에러 시 기본 장비 목록 반환 (fallback)
      const fallbackDevices = ['d011', 'd021', 'd022', 'd023', 'd041', 'd051', 'd081'];
      this.logger?.warn(`fallback 장비 목록 사용: ${fallbackDevices.join(', ')}`);
      return fallbackDevices;
    }
  }

  // ==================== 🕐 DDC 시간 설정 관련 메서드들 ====================

  /**
   * 🕐 DDC 시간 동기화 (UnifiedModbusService 사용)
   */
  async syncDdcTime(clientId: string): Promise<SuccessResponse> {
    try {
      this.logger?.info(`🔄 ${clientId} DDC 시간 동기화 시작 (delegated to DdcTimeSyncService)`);

      // 단일 진입점으로 DdcTimeSyncService 사용
      const serviceContainer = ServiceContainer.getInstance();
      const ddcTimeSyncService = serviceContainer.getDdcTimeSyncService();
      await ddcTimeSyncService.syncDdcTime();

      // 최신 시스템 설정에서 ddcTime 반환
      const settings = await this.getSettings();
      const ddcTime = settings?.ddcTime || null;
      this.logger?.info(`✅ ${clientId} DDC 시간 동기화 완료 (delegated)`);
      return createSuccessResponse('DDC 시간이 성공적으로 동기화되었습니다.', { ddcTime });
    } catch (error) {
      this.logger?.error(`❌ ${clientId} DDC 시간 동기화 실패: ${error}`);
      throw error;
    }
  }

  async refreshDdcTime(clientId: string): Promise<SuccessResponse> {
    try {
      this.logger?.info(`🔄 ${clientId} DDC 시간 새로고침 시작`);

      const { CLIENT_PORT_MAPPINGS } = await import('../../data/clientPortMappings');
      const clientMapping = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];

      if (!clientMapping || !clientMapping.ddc_time) {
        throw new Error(`Client ${clientId}에 DDC 시간 매핑이 없습니다.`);
      }

      const serviceContainer = ServiceContainer.getInstance();
      const unifiedModbusService = serviceContainer.getUnifiedModbusService();

      const actionMap: Record<string, { actionKey: string; fallback?: number }> = {
        year: { actionKey: 'GET_YEAR' },
        month: { actionKey: 'GET_MONTH' },
        day: { actionKey: 'GET_DAY' },
        dow: { actionKey: 'GET_DOW' },
        hour: { actionKey: 'GET_HOUR' },
        minute: { actionKey: 'GET_MINUTE' },
        second: { actionKey: 'GET_SECOND' },
      };

      const refreshed: Record<string, number> = {};

      for (const [field, { actionKey, fallback = 0 }] of Object.entries(actionMap)) {
        const actionConfig = clientMapping.ddc_time[actionKey];

        if (!actionConfig || !actionConfig.port) {
          throw new Error(`Invalid DDC time mapping for ${clientId}: ${actionKey}`);
        }

        const result = await unifiedModbusService.readRegisters({
          slaveId: 1,
          functionCode: actionConfig.port.functionCode,
          address: actionConfig.port.address,
          length: actionConfig.length || 1,
          context: 'control',
        });

        if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
          throw new Error(`Modbus read failed: ${clientId} - ${actionKey}`);
        }

        refreshed[field] = Number(result.data[0]);
      }

      // dayOfWeek 호환 필드 유지
      const refreshedDdcTime = {
        year: refreshed.year ?? 0,
        month: refreshed.month ?? 0,
        day: refreshed.day ?? 0,
        dow: refreshed.dow ?? 0,
        dayOfWeek: refreshed.dow ?? 0,
        hour: refreshed.hour ?? 0,
        minute: refreshed.minute ?? 0,
        second: refreshed.second ?? 0,
      };

      await this.systemRepository.updateSettings({
        ddcTime: refreshedDdcTime,
      });

      this.logger?.info(`✅ ${clientId} DDC 시간 새로고침 완료`);

      return createSuccessResponse('DDC 시간을 다시 불러왔습니다.', { ddcTime: refreshedDdcTime });
    } catch (error) {
      this.logger?.error(`❌ ${clientId} DDC 시간 새로고침 실패: ${error}`);
      throw error;
    }
  }

  async getDdcTime(clientId: string): Promise<DdcTimeData | null> {
    try {
      this.logger?.info(`DDC 시간 조회: ${clientId}`);

      // TODO: 실제 DDC 시간 조회 로직 구현
      // 현재는 기본 구현만 제공

      return null;
    } catch (error) {
      this.logger?.error('DDC 시간 조회 중 오류 발생');
      throw error;
    }
  }

  // 🔧 클라이언트 포트 매핑 가져오기 헬퍼
  private async getClientPortMapping(clientId: string): Promise<any> {
    try {
      // CLIENT_PORT_MAPPINGS에서 클라이언트별 매핑 가져오기
      const { CLIENT_PORT_MAPPINGS } = await import('../../data/clientPortMappings');
      return (CLIENT_PORT_MAPPINGS as any)[clientId];
    } catch (error) {
      this.logger?.error(`클라이언트 포트 매핑 로드 실패: ${clientId} - ${error}`);
      return null;
    }
  }

  // ==================== 🔧 디바이스 상세설정 관련 메서드들 ====================

  /**
   * 🔧 디바이스 상세설정 조회
   */
  async getDeviceAdvancedSettings(): Promise<{
    temp: {
      'fine-tuning-summer': number;
      'fine-tuning-winter': number;
    };
  } | null> {
    try {
      this.logger?.info('디바이스 상세설정 조회 시작');

      const systemDoc = await this.systemRepository.findOne();
      const deviceAdvanced = systemDoc?.['device-advanced'];

      if (!deviceAdvanced) {
        // 기본값 반환
        return {
          temp: {
            'fine-tuning-summer': 0,
            'fine-tuning-winter': 0,
          },
        };
      }

      this.logger?.info('디바이스 상세설정 조회 완료');

      // 데이터베이스에서 가져온 값이 없으면 기본값 반환
      if (!deviceAdvanced.temp) {
        return {
          temp: {
            'fine-tuning-summer': 0,
            'fine-tuning-winter': 0,
          },
        };
      }

      return {
        temp: {
          'fine-tuning-summer': deviceAdvanced.temp['fine-tuning-summer'] ?? 0,
          'fine-tuning-winter': deviceAdvanced.temp['fine-tuning-winter'] ?? 0,
        },
      };
    } catch (error) {
      this.logger?.error('디바이스 상세설정 조회 중 오류 발생');
      throw error;
    }
  }

  /**
   * 🔧 디바이스 상세설정 업데이트
   */
  async updateDeviceAdvancedSettings(settings: {
    temp: {
      'fine-tuning-summer': number;
      'fine-tuning-winter': number;
    };
  }): Promise<{
    temp: {
      'fine-tuning-summer': number;
      'fine-tuning-winter': number;
    };
  } | null> {
    try {
      this.logger?.info('디바이스 상세설정 업데이트 시작');

      const updated = await this.systemRepository.updateSettings({
        'device-advanced': settings,
      });

      if (!updated?.['device-advanced']) {
        throw new Error('디바이스 상세설정 업데이트 실패');
      }

      this.logger?.info('디바이스 상세설정 업데이트 완료');

      const deviceAdvanced = updated['device-advanced'];
      if (!deviceAdvanced?.temp) {
        return {
          temp: {
            'fine-tuning-summer': 0,
            'fine-tuning-winter': 0,
          },
        };
      }

      return {
        temp: {
          'fine-tuning-summer': deviceAdvanced.temp['fine-tuning-summer'] ?? 0,
          'fine-tuning-winter': deviceAdvanced.temp['fine-tuning-winter'] ?? 0,
        },
      };
    } catch (error) {
      this.logger?.error('디바이스 상세설정 업데이트 중 오류 발생');
      throw error;
    }
  }
}
