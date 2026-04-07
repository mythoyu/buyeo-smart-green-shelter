// 스마트시티 데이터 헬퍼 함수 모음

import { UnitValue } from '../types/database';

import { deviceUnits } from './smartcityClients';

interface FieldConfig {
  type: 'boolean' | 'int' | 'float' | 'string';
  options?: Array<{ value: string | number; label: string }>;
  [key: string]: unknown;
}

export const smartcityHelpers = {
  // 클라이언트별 장비/유닛 목록 가져오기
  getClientDevices: (clientId: string) => {
    return deviceUnits.filter(unit => unit.clients.includes(clientId));
  },

  // 장비별로 그룹핑된 유닛 목록 가져오기
  getGroupedDevices: (clientId: string) => {
    const units = deviceUnits.filter(unit => unit.clients.includes(clientId));
    const deviceMap: Record<
      string,
      {
        deviceId: string;
        deviceName: string;
        units: { unitId: string; unitName: string }[];
      }
    > = {};

    units.forEach(unit => {
      if (!deviceMap[unit.deviceId]) {
        deviceMap[unit.deviceId] = {
          deviceId: unit.deviceId,
          deviceName: unit.deviceName,
          units: [],
        };
      }
      deviceMap[unit.deviceId].units.push({
        unitId: unit.unitId,
        unitName: unit.unitName,
      });
    });

    return Object.values(deviceMap);
  },

  // 유닛별 기본 설정값 가져오기
  getUnitDefaultConfig: (unitId: string) => {
    const unit = deviceUnits.find(u => u.unitId === unitId);
    return unit?.defaultConfig || {};
  },

  // 필드 타입별 적절한 컴포넌트 타입 반환
  getFieldComponentType: (field: FieldConfig) => {
    switch (field.type) {
      case 'boolean':
        return 'switch';
      case 'int':
      case 'float':
        return field.options && field.options.length > 0 ? 'select' : 'number';
      case 'string':
        return 'text';
      default:
        return 'text';
    }
  },

  // 값 포맷팅 (단위 포함)
  formatValue: (value: UnitValue, unit: string | null) => {
    if (value === null || value === undefined) return '-';
    if (unit) {
      return `${value} ${unit}`;
    }
    return String(value);
  },

  // 상태별 색상 클래스 반환
  getStatusColor: (status: boolean | string) => {
    if (typeof status === 'boolean') {
      return status ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
    }
    return 'text-gray-600 bg-gray-100';
  },
};
