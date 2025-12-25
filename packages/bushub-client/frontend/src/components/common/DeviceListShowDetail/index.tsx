import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import React, { useCallback, useMemo, useImperativeHandle } from 'react';

import { getDeviceTypeIcon } from '../../../meta/smartcityMetaHelpers';
import { sampleClient } from '../../../mock/sampleData';

import { DeviceCard } from './DeviceCard';
import { useUnitFormManagement } from './hooks';
import { DeviceListShowDetailProps, DeviceListShowDetailHandle, Device } from './types';

const DeviceListShowDetail = React.forwardRef<DeviceListShowDetailHandle, DeviceListShowDetailProps>(
  ({ devices, deviceSpecs, deviceStyles }, ref) => {
    // useUnitFormManagement 훅 사용 (Toast 포함된 handleCopy, handlePaste 포함)
    const {
      selectedUnit,
      setSelectedUnit,
      getUnitForm,
      handleCopy,
      handlePaste,
      handleFormChange,
      handleCancel,
      handleUnitClick,
      updateSelectedUnit,
    } = useUnitFormManagement(deviceSpecs);

    // devices가 비어있으면 기본값 사용 (단, 필터링 결과가 의도적으로 비어있는 경우는 제외)
    const displayDevices = useMemo(() => {
      // devices가 undefined이거나 null인 경우에만 샘플 데이터 사용
      // devices가 빈 배열인 경우는 필터링 결과가 없음을 의미하므로 빈 배열 그대로 사용
      if (devices === undefined || devices === null) {
        return sampleClient.devices as Device[];
      }
      return devices;
    }, [devices]);

    // 상태에 따른 Badge variant 및 아이콘 매핑
    const getStatusConfig = useCallback((status: number | undefined) => {
      switch (status) {
        case 0: // 정상
          return {
            variant: 'default' as const,
            className: 'bg-green-100 text-green-800 border-green-200',
            icon: <CheckCircle className='w-4 h-4 text-green-600' />,
            text: '정상',
          };
        case 1: // 경고
          return {
            variant: 'secondary' as const,
            className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            icon: <AlertTriangle className='w-4 h-4 text-yellow-600' />,
            text: '경고',
          };
        case 2: // 오류
          return {
            variant: 'destructive' as const,
            className: 'bg-red-100 text-red-800 border-red-200',
            icon: <XCircle className='w-4 h-4 text-red-600' />,
            text: '오류',
          };
        default: // 알수없음
          return {
            variant: 'outline' as const,
            className: 'bg-gray-100 text-gray-800 border-gray-200',
            icon: <HelpCircle className='w-4 h-4 text-gray-600' />,
            text: '알수없음',
          };
      }
    }, []);

    // 디바이스 타입별 아이콘 및 색상 매핑 (smartcityMetaHelpers 사용)
    const getDeviceIcon = useCallback((type: string) => getDeviceTypeIcon(type), []);
    const getDeviceColor = useCallback((type: string) => deviceStyles[type]?.bgColor || 'bg-gray-500', [deviceStyles]);
    const getDeviceLabel = useCallback((type: string) => deviceSpecs[type]?.deviceName || type, [deviceSpecs]);

    // 유닛 ID를 label로 변환하는 함수
    const formatUnitLabel = useCallback((unitId: string) => {
      if (!unitId) return 'Unknown';

      // u001 형태의 ID를 "유닛 1" 형태로 변환
      if (unitId.startsWith('u') && /^\d+$/.test(unitId.slice(1))) {
        const number = parseInt(unitId.slice(1));
        return `유닛 ${number}`;
      }

      // 기타 형태는 그대로 반환
      return unitId;
    }, []);

    // handleCopy와 handlePaste는 useUnitFormManagement 훅에서 제공됨 (Toast 포함)

    // handleUnitClick은 useUnitFormManagement 훅에서 제공됨

    // handleFormChange와 handleCancel은 useUnitFormManagement 훅에서 제공됨

    // 부모 컴포넌트에 handleFormChange 노출 (useImperativeHandle)
    useImperativeHandle(
      ref,
      () => ({
        handleFormChange,
      }),
      [handleFormChange]
    );

    // Auto 모드 변경 핸들러 (useUnitFormManagement 훅에서 처리)
    const handleAutoModeChangeWrapper = useCallback(async (device: any, unit: any, autoMode: boolean) => {
      console.log('🚀 Auto 모드 변경 요청:', { device: device.id, unit: unit.id, autoMode });
      // useUnitFormManagement 훅에서 상태 관리
    }, []);

    // Power 모드 변경 핸들러 (useUnitFormManagement 훅에서 처리)
    const handlePowerChangeWrapper = useCallback(async (device: any, unit: any, powerMode: boolean) => {
      console.log('🚀 Power 모드 변경 요청:', { device: device.id, unit: unit.id, powerMode });
      // useUnitFormManagement 훅에서 상태 관리
    }, []);

    if (displayDevices.length === 0) {
      return (
        <div className='text-gray-400 text-center py-8 font-medium animate-fade-in'>표시할 디바이스가 없습니다.</div>
      );
    }

    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {displayDevices.map((device: Device, deviceIndex: number) => (
          <DeviceCard
            key={device.id || device.deviceId}
            device={device}
            deviceIndex={deviceIndex}
            deviceSpecs={deviceSpecs}
            deviceStyles={deviceStyles}
            selectedUnit={selectedUnit}
            onUnitClick={handleUnitClick}
            onFormChange={handleFormChange}
            onCancel={handleCancel}
            getUnitForm={getUnitForm}
            unitForm={selectedUnit ? getUnitForm(selectedUnit.device.id, selectedUnit.unit.id) : {}}
            getStatusConfig={getStatusConfig}
            getDeviceIcon={getDeviceIcon}
            getDeviceColor={getDeviceColor}
            getDeviceLabel={getDeviceLabel}
            formatUnitLabel={formatUnitLabel}
            handleCopy={handleCopy}
            handlePaste={handlePaste}
            bulkStatus={null}
            onAutoModeChange={handleAutoModeChangeWrapper}
            onPowerChange={handlePowerChangeWrapper}
            devices={displayDevices}
          />
        ))}
      </div>
    );
  }
);

DeviceListShowDetail.displayName = 'DeviceListShowDetail';

export default React.memo(DeviceListShowDetail);
