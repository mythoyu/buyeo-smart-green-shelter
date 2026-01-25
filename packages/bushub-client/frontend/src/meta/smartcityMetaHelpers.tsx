import { Leaf, Gauge, Thermometer, DoorOpen, Activity, ToggleLeft, Fan, RotateCcw, Wind, Users } from 'lucide-react';
import React from 'react';

import { UnitValue } from '../types/database';

import { clientStyles } from './smartcityClientStyles';
import { deviceSpecs } from './smartcityDeviceSpecs';

interface CommandConfig {
  type: 'boolean' | 'float' | 'int' | 'string';
  unit?: string;
  options?: Array<{ value: string | number; label: string }>;
  optionLabels?: Record<string | number, string>;
  [key: string]: unknown;
}

// 장비 타입별 아이콘 컴포넌트 반환
export function getDeviceTypeIcon(type: string) {
  switch (type) {
    case 'cooler':
      return <Fan />;
    case 'bench':
      return <Thermometer />;
    case 'door':
      return <DoorOpen />;
    case 'integrated_sensor':
      return <Activity />;
    case 'externalsw':
      return <ToggleLeft />;
    case 'exchanger':
      return <RotateCcw />;
    case 'aircurtain':
      return <Wind />;
    case 'people_counter':
      return <Users />;
    // 기타 타입별 매핑 추가
    default:
      return <Gauge />;
  }
}

export const smartcityMetaHelpers = {
  // 장비별 스타일 정보 가져오기
  getDeviceStyle: (deviceId: string) => {
    const spec = deviceSpecs.find(spec => spec.deviceId === deviceId);
    return (
      spec?.styles || {
        icon: 'Gauge',
        color: 'text-gray-400',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        gradient: 'from-gray-50 to-slate-50',
      }
    );
  },

  // 장비별 명세 정보 가져오기
  getDeviceSpec: (deviceId: string) => {
    return deviceSpecs.find(spec => spec.deviceId === deviceId);
  },

  // 클라이언트별 스타일 정보 가져오기 (lucide 아이콘 컴포넌트 변환)
  getClientStyle: (clientId: string) => {
    const style = clientStyles[clientId] || {
      icon: 'Leaf',
      color: '#888',
      marker: 'shelter',
    };
    // lucide 아이콘 매핑
    let IconComponent = Leaf;
    if (style.icon === 'Leaf') IconComponent = Leaf;
    // 필요시 다른 아이콘 추가 매핑
    return {
      ...style,
      IconComponent,
    };
  },

  // 명령 타입별 스타일 정보 가져오기
  getCommandBadgeStyle: (cmd: CommandConfig) => {
    let badgeVariant: 'default' | 'secondary' | 'outline' = 'outline';
    let badgeClassName = 'px-2 py-1 text-xs border border-gray-200 bg-gray-50 text-gray-500';

    if (cmd.type === 'boolean') {
      badgeVariant = 'default';
      badgeClassName = 'px-2 py-1 text-xs border border-green-200 bg-green-50 text-green-700';
    } else if (cmd.type === 'float' || cmd.type === 'int') {
      badgeVariant = 'default';
      badgeClassName = 'px-2 py-1 text-xs border border-blue-200 bg-blue-50 text-blue-700';
    } else if (Array.isArray(cmd.options)) {
      badgeVariant = 'default';
      badgeClassName = 'px-2 py-1 text-xs border border-purple-200 bg-purple-50 text-purple-700';
    } else {
      badgeVariant = 'default';
      badgeClassName = 'px-2 py-1 text-xs border border-blue-200 bg-blue-50 text-blue-700';
    }

    return {
      badgeVariant,
      badgeClassName,
    };
  },

  // 명령 값 표시 텍스트 가져오기
  getCommandDisplayValue: (cmd: CommandConfig, value: UnitValue) => {
    if (value === undefined || value === null || value === '') {
      return 'N/A';
    }

    // optionLabels가 있으면 우선 사용 (모든 타입에 대해)
    if (cmd.optionLabels) {
      // 값의 타입을 고려하여 optionLabels에서 찾기
      const optionLabel = cmd.optionLabels[String(value)];

      if (optionLabel) return optionLabel;
    }

    // 타입별 기본 처리
    if (cmd.type === 'float' || cmd.type === 'int') {
      // 통합센서의 경우 값이 10배로 저장되어 있음 (예: 205 → 20.5)
      const displayValue = value;
      return `${displayValue}${cmd.unit || ''}`;
    }

    return String(value);
  },
};
