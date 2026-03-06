import {
  Gauge,
  ThermometerSun,
  DoorOpen,
  Users,
  Snowflake,
  ArrowLeftRight,
  Sun,
  AirVent,
  Armchair,
  DoorClosed,
  Thermometer,
  DoorClosedLocked,
} from 'lucide-react';
import React from 'react';

import { UnitValue } from '../types/database';
import { deviceSpecs } from './smartcityDeviceSpecs';

interface CommandConfig {
  type: 'boolean' | 'float' | 'int' | 'string';
  unit?: string;
  options?: Array<{ value: string | number; label: string }>;
  optionLabels?: Record<string | number, string>;
  [key: string]: unknown;
}

// 장비 타입별 아이콘 컴포넌트 반환 (해당 장비 의미에 맞는 아이콘)
export function getDeviceTypeIcon(type: string) {
  switch (type) {
    case 'cooler':
      return <Snowflake />; // 냉방기
    case 'bench':
      return <Armchair />; // 스마트벤치(온도)
    case 'door':
      return <DoorClosed />; // 출입문
    case 'integrated_sensor':
      return <Thermometer />; // 통합 센서
    case 'externalsw':
      return <DoorClosedLocked />; // 조명
    case 'lighting':
      return <Sun />; // 조명
    case 'exchanger':
      return <ArrowLeftRight />; // 열교환기
    case 'aircurtain':
      return <AirVent />; // 에어커튼
    case 'people_counter':
      return <Users />; // 이용자 계수
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
        avatarBg: 'bg-gray-50 dark:bg-gray-700',
        borderColor: 'border-gray-200',
        gradient: 'from-gray-50 to-slate-50',
      }
    );
  },

  // 장비별 명세 정보 가져오기
  getDeviceSpec: (deviceId: string) => {
    return deviceSpecs.find(spec => spec.deviceId === deviceId);
  },

  // 명령 타입별 스타일 정보 가져오기
  getCommandBadgeStyle: (cmd: CommandConfig) => {
    let badgeVariant: 'default' | 'secondary' | 'outline' = 'outline';
    let badgeClassName =
      'px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300';

    if (cmd.type === 'boolean') {
      badgeVariant = 'default';
      badgeClassName =
        'px-2 py-1 text-xs border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-200';
    } else if (cmd.type === 'float' || cmd.type === 'int') {
      badgeVariant = 'default';
      badgeClassName =
        'px-2 py-1 text-xs border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200';
    } else if (Array.isArray(cmd.options)) {
      badgeVariant = 'default';
      badgeClassName =
        'px-2 py-1 text-xs border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-200';
    } else {
      badgeVariant = 'default';
      badgeClassName =
        'px-2 py-1 text-xs border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200';
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
