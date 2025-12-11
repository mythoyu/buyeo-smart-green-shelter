import { ISystem, UnitValue } from '../../../models/schemas/SystemSchema';
import { NetworkSettings, NtpSettings, SoftapSettings } from '../../services/interfaces/ILinuxSystemService';

export interface SystemMode {
  mode: 'auto' | 'manual';
}

export interface SystemAction {
  action: 'reset' | 'apply' | 'import' | 'export';
  backupPath?: string;
}

export interface SystemSettings {
  systemName?: string;
  maintenanceMode?: boolean;
  // mode?: 'auto' | 'manual'; // 제거됨
  // pollingInterval?: number; // runtime으로 이동됨
  notificationSettings?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  dataRetentionDays?: number;
  network?: NetworkSettings;
  ntp?: NtpSettings;
  softap?: SoftapSettings;

  // 🔄 런타임 상태 관리
  runtime?: {
    pollingEnabled: boolean;
    pollingInterval: number; // 이동됨
    applyInProgress: boolean;
  };

  // 🎯 DDC 시간 설정 추가
  ddcTime?: {
    year: number;
    month: number;
    day: number;
    dow: number;
    hour: number;
    minute: number;
    second: number;
  };

  // 🌸 절기 설정 추가
  seasonal?: {
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
  };

  // 🔧 디바이스 고급 설정
  'device-advanced'?: {
    temp?: {
      'fine-tuning-summer'?: number;
      'fine-tuning-winter'?: number;
    };
  };
}

export interface SystemUpdateParams {
  // mode?: 'auto' | 'manual'; // 제거됨
  // pollingInterval?: number; // runtime으로 이동됨
  network?: Record<string, UnitValue>;
  ntp?: Record<string, UnitValue>;
  softap?: Record<string, UnitValue>;
  runtime?: {
    pollingEnabled?: boolean;
    pollingInterval?: number; // 이동됨
    applyInProgress?: boolean;
  };
  seasonal?: {
    season: number;
    january: number;
    february: number;
    march: number;
    april: number;
    may: number;
    june: number;
    july: number;
    august: number;
    september: number;
    october: number;
    november: number;
    december: number;
  };
  'device-advanced'?: {
    temp?: {
      'fine-tuning-summer'?: number;
      'fine-tuning-winter'?: number;
    };
  };
}

export interface ISystemRepository {
  findOne(): Promise<ISystem | null>;
  findOneAndUpdate(filter: any, update: any, options?: any): Promise<ISystem | null>;
  create(data: SystemSettings): Promise<ISystem>;
  updateSettings(settingsData: Partial<SystemSettings>): Promise<ISystem | null>;

  updateSystemMode(mode: SystemMode['mode']): Promise<ISystem | null>;
  resetToDefault(): Promise<ISystem | null>;
  saveSystemSettings(settingsData: SystemSettings): Promise<ISystem | null>;
}
