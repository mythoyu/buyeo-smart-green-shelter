import { SuccessResponse } from '../../../shared/utils/responseHelper';
import { SystemSettings } from '../../repositories/interfaces/ISystemRepository';

// 계절 설정 데이터 타입
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

export interface ISystemService {
  getSettings(): Promise<SystemSettings | null>;
  updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings | null>;
  applySnapshotSettings(snapshotData: any, appliedBy: string): Promise<SystemSettings | null>;
  updatePollingState(pollingEnabled: boolean): Promise<SystemSettings | null>;
  getPollingState(initializeIfMissing?: boolean): Promise<{
    pollingEnabled: boolean;
    applyInProgress: boolean;
  } | null>;
  setApplyLock(applyInProgress: boolean): Promise<SystemSettings | null>;
  updatePollingInterval(pollingInterval: number): Promise<SystemSettings | null>;
  exportSettings(): Promise<SystemSettings | null>;
  importSettings(settings: SystemSettings): Promise<SystemSettings | null>;
  resetToDefaults(): Promise<SystemSettings | null>;
  setAllUnitsToScheduleMode(): Promise<{ unitsUpdated: number }>;
  setAllUnitsToManualMode(): Promise<{ unitsUpdated: number }>;
  saveSeasonal(clientId: string, seasonal: SeasonalData): Promise<SuccessResponse>;
  getSeasonal(clientId: string): Promise<SeasonalData | null>;
  applySeasonalToModbus(clientId: string, seasonal: SeasonalData): Promise<boolean>;
  refreshSeasonal(clientId: string): Promise<SuccessResponse>;
  getDdcTime(clientId: string): Promise<DdcTimeData | null>;
  syncDdcTime(clientId: string): Promise<SuccessResponse>;
  refreshDdcTime(clientId: string): Promise<SuccessResponse>;
  updateAllUnitsAutoField(autoValue: boolean): Promise<{ unitsUpdated: number }>;
  executeAllAutoCommands(
    clientId: string,
    autoValue: number,
    modeText: string,
  ): Promise<{ successCount: number; failureCount: number }>;

  // 디바이스 상세설정 관련 메서드
  getDeviceAdvancedSettings(): Promise<{
    temp: {
      'fine-tuning-summer': number;
      'fine-tuning-winter': number;
    };
  } | null>;

  updateDeviceAdvancedSettings(settings: {
    temp: {
      'fine-tuning-summer': number;
      'fine-tuning-winter': number;
    };
  }): Promise<{
    temp: {
      'fine-tuning-summer': number;
      'fine-tuning-winter': number;
    };
  } | null>;
}
