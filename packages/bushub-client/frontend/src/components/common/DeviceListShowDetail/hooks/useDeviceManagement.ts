import React, { useMemo, useCallback } from 'react';

import { sampleClient } from '../../../../mock/sampleData';
import { Device, DeviceSpec, DeviceStyle } from '../types';

export const useDeviceManagement = (
  devices: Device[],
  deviceSpecs: Record<string, DeviceSpec>,
  deviceStyles: Record<string, DeviceStyle>
) => {
  // 디바이스 표시 로직
  const displayDevices = useMemo(() => (devices && devices.length > 0 ? devices : sampleClient.devices), [devices]);

  // 디버깅 로그
  const logDebugInfo = useCallback(() => {
    console.log('DeviceListShowDetail Debug:', {
      devicesLength: devices?.length,
      displayDevicesLength: displayDevices?.length,
      devices,
      displayDevices,
      isUsingSampleData: !devices || devices.length === 0,
      sessionStorage: {
        user: sessionStorage.getItem('user'),
        accessToken: sessionStorage.getItem('accessToken'),
      },
      deviceNames: displayDevices?.map(d => ({
        id: d.id,
        name: d.name,
        deviceId: (d as any).deviceId || d.id,
      })),
    });
  }, [devices, displayDevices]);

  // 디바이스 타입별 아이콘 및 색상 매핑
  const getDeviceIcon = useCallback(() => {
    // smartcityMetaHelpers에서 가져오는 로직은 나중에 분리
    return '🔧'; // 임시 아이콘
  }, []);

  const getDeviceColor = useCallback((type: string) => deviceStyles[type]?.bgColor || 'bg-gray-500', [deviceStyles]);

  const getDeviceLabel = useCallback((type: string) => deviceSpecs[type]?.deviceName || type, [deviceSpecs]);

  // 유닛 ID를 label로 변환하는 함수
  const formatUnitLabel = useCallback((unitId: string) => {
    if (!unitId) return 'Unknown';

    if (unitId.startsWith('u') && /^\d+$/.test(unitId.slice(1))) {
      const number = parseInt(unitId.slice(1));
      return `유닛 ${number}`;
    }

    return unitId;
  }, []);

  // 상태에 따른 Badge variant 및 아이콘 매핑
  const getStatusConfig = useCallback((status: number | undefined) => {
    switch (status) {
      case 0: // 정상
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: React.createElement('div', { className: 'w-4 h-4 bg-green-600 rounded-full' }),
          text: '정상',
        };
      case 1: // 경고
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: React.createElement('div', { className: 'w-4 h-4 bg-yellow-600 rounded-full' }),
          text: '경고',
        };
      case 2: // 오류
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: React.createElement('div', { className: 'w-4 h-4 bg-red-600 rounded-full' }),
          text: '오류',
        };
      default: // 알수없음
        return {
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: React.createElement('div', { className: 'w-4 h-4 bg-gray-600 rounded-full' }),
          text: '알수없음',
        };
    }
  }, []);

  return {
    displayDevices,
    logDebugInfo,
    getDeviceIcon,
    getDeviceColor,
    getDeviceLabel,
    formatUnitLabel,
    getStatusConfig,
  };
};
