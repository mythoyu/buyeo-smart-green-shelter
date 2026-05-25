import { Device, DeviceSpec, Unit } from '../DeviceListShowDetail/types';

export type QuickSettingsFormState = Record<string, Record<string, unknown>>;

/** `${deviceId}_${unitId}` */
export function getQuickSettingsUnitKey(deviceId: string, unitId: string): string {
  return `${deviceId}_${unitId}`;
}

/** 조명 공통 운영시간 (1·2구간) */
export interface LightingScheduleState {
  start1: string;
  end1: string;
  start2: string;
  end2: string;
}

/** 조명 이외 공통 운영시간 (1구간) */
export interface OtherScheduleState {
  start1: string;
  end1: string;
}

export const DEFAULT_LIGHTING_SCHEDULE: LightingScheduleState = {
  start1: '08:00',
  end1: '22:00',
  start2: '18:00',
  end2: '22:00',
};

export const DEFAULT_OTHER_SCHEDULE: OtherScheduleState = {
  start1: '08:00',
  end1: '22:00',
};

/** @deprecated applyCommonScheduleToForms 내부용 */
export interface CommonScheduleState {
  start1: string;
  end1: string;
  start2: string;
  end2: string;
}

export interface QuickSettingsTargetUnit {
  device: Device;
  unit: Unit;
  deviceType: string;
}

export interface QuickSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: Device[];
  deviceSpecs: Record<string, DeviceSpec>;
  disabled?: boolean;
  onApplyingChange?: (applying: boolean) => void;
}

export interface QuickSettingsFormProps {
  deviceTypes: string[];
  deviceSpecs: Record<string, DeviceSpec>;
  formsByUnit: QuickSettingsFormState;
  unitCountByType: Record<string, number>;
  unitsByDeviceType: Record<string, QuickSettingsTargetUnit[]>;
  onFieldChange: (unitKey: string, key: string, value: unknown) => void;
}

export interface QuickSettingsScheduleBlockProps {
  title: string;
  description: string;
  start1: string;
  end1: string;
  start2?: string;
  end2?: string;
  showSlot2?: boolean;
  onScheduleChange: (patch: Partial<LightingScheduleState & OtherScheduleState>) => void;
  disabled?: boolean;
}

export interface QuickSettingsFooterProps {
  unitCount: number;
  commandCount: number;
  isApplying: boolean;
  applyProgress: { current: number; total: number };
  onCancel: () => void;
  onApply: () => void;
  disabled?: boolean;
}

