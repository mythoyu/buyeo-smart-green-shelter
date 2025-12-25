export interface Device {
  id: string;
  deviceId?: string; // optional로 변경 (실제 객체에 없을 수 있음)
  name?: string;
  type: string;
  status?: number;
  units?: Unit[];
}

export interface Unit {
  id: string;
  name?: string;
  status?: number;
  data?: Record<string, any>;
}

export interface Command {
  key: string;
  label: string;
  type: 'boolean' | 'int' | 'float' | 'string';
  get?: boolean;
  set?: boolean;
  unit?: string;
  options?: any[];
  optionLabels?: Record<string, string>;
  defaultValue?: any;
  min?: number;
  max?: number;
  action?: {
    get?: string;
    set?: string; // optional로 유지 (기존 코드 호환성)
  };
}

export interface DeviceSpec {
  deviceName: string;
  commands: Command[];
}

export interface DeviceStyle {
  bgColor: string;
  textColor?: string;
}

export interface StatusConfig {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  icon: React.ReactNode;
  text: string;
}

export interface SelectedUnit {
  device: Device;
  unit: Unit;
}

export interface UnitForm {
  // 시간 관련 설정
  start_time_1?: string;
  end_time_1?: string;
  start_time_2?: string;
  end_time_2?: string;

  // 모드 설정
  auto?: boolean;
  power?: boolean;

  // 기타 설정 (동적 키를 위한 인덱스 시그니처)
  [key: string]: string | boolean | number | undefined;
}

export interface BulkCommandResult {
  requestId: string;
  status: 'success' | 'fail' | 'pending';
}

export interface BulkCommandRequest {
  action: string; // 필수 필드
  value: any;
}

// API 응답 타입 추가
export interface BulkCommandResponse {
  requestId: string;
  action: string;
  status: 'waiting' | 'success' | 'fail';
  [key: string]: any;
}

// Mutation 타입 정의 - CommandManager와 호환되도록 유연하게
export interface BulkCommandsMutation {
  mutateAsync: (params: {
    deviceId: string;
    unitId: string;
    commands: Array<{ action: string; value: any }>;
  }) => Promise<any[]>; // any[]로 변경하여 유연성 확보
  isPending?: boolean;
  isLoading?: boolean; // CommandManager와 호환
  isError?: boolean;
  error?: any;
  // CommandManager의 추가 속성들
  commandStatus?: string;
  progress?: { current: number; total: number };
  resetStatus?: () => void;
  executeCommand?: (commands: Array<{ action: string; value: any }>) => Promise<void>;
}

import React from 'react';

export interface DeviceListShowDetailHandle {
  handleFormChange: (key: string, value: any, deviceId?: string, unitId?: string) => void;
}

export interface DeviceListShowDetailProps {
  devices: Device[];
  deviceSpecs: Record<string, DeviceSpec>;
  deviceStyles: Record<string, DeviceStyle>;
  onExecuteAction?: (deviceId: string, unitId: string, action: any, value?: any) => Promise<void>;
  getAvailableActions?: (deviceId: string) => Record<string, any>;
}

export interface DeviceCardProps {
  device: Device;
  deviceIndex: number;
  deviceSpecs: Record<string, DeviceSpec>;
  deviceStyles: Record<string, DeviceStyle>;
  selectedUnit: SelectedUnit | null;
  onUnitClick: (device: Device, unit: Unit) => void;
  onFormChange: (key: string, value: any, deviceId?: string, unitId?: string) => void;
  onCancel: () => void;
  getUnitForm: (deviceId: string, unitId: string) => UnitForm;
  unitForm: UnitForm;
  updateSelectedUnit?: (updatedUnit: any) => void;
  getStatusConfig: (status: number | undefined) => StatusConfig;
  getDeviceIcon: (type: string) => React.ReactNode;
  getDeviceColor: (type: string) => string;
  getDeviceLabel: (type: string) => string;
  formatUnitLabel: (unitId: string) => string;
  handleCopy: (text: string) => void;
  handlePaste: (key: string) => void;
  bulkStatus: string | null;
  onAutoModeChange: (device: Device, unit: Unit, autoMode: boolean) => void;
  onPowerChange: (device: Device, unit: Unit, powerMode: boolean) => void;
  devices?: Device[]; // 모든 장비 목록
}

export interface UnitCardProps {
  unit: Unit;
  unitIndex: number;
  deviceIndex: number;
  device: Device;
  deviceSpec: DeviceSpec;
  isSelected: boolean;
  canShowSettings: boolean;
  onUnitClick: (device: Device, unit: Unit) => void;
  getStatusConfig: (status: number | undefined) => StatusConfig;
  formatUnitLabel: (unitId: string) => string;
  onAutoModeChange: (device: Device, unit: Unit, autoMode: boolean) => void;
  onPowerChange: (device: Device, unit: Unit, powerMode: boolean) => void;
  unitForm: Record<string, any>;
  onFormChange: (key: string, value: any, deviceId?: string, unitId?: string) => void;
  onCancel: () => void;
  bulkStatus: string | null;
  handleCopy: (text: string) => void;
  handlePaste: (key: string) => void;
  devices?: Device[]; // 모든 장비 목록
  deviceSpecs?: Record<string, DeviceSpec>; // 장비 스펙
}

export interface UnitSettingsProps {
  unit: Unit;
  device: Device;
  deviceSpec: DeviceSpec;
  unitForm: UnitForm;
  onFormChange: (key: string, value: any, deviceId?: string, unitId?: string) => void;
  onSave: (selectedUnits?: Set<string>) => void; // 선택된 유닛 목록 추가
  onCancel: () => void;
  bulkCommandsMutation?: BulkCommandsMutation | null; // optional로 변경
  bulkStatus: string | null;
  handleCopy: (text: string) => void;
  handlePaste: (key: string) => void;
  devices?: Device[]; // 모든 장비 목록
  deviceSpecs?: Record<string, DeviceSpec>; // 장비 스펙 (필드 지원 여부 확인용)
}

export interface CommandRendererProps {
  command: Command;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  index: number;
  animationDelay: number;
  handleCopy?: (text: string) => void;
  handlePaste?: (key: string) => void;
}
