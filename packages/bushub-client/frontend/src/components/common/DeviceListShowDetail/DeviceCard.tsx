import React, { useEffect } from 'react';

import { DeviceHeader } from './components/DeviceHeader';
import { DeviceCardProps } from './types';
import { UnitCard } from './UnitCard';
import { getDeviceCardStyles } from './utils';

/**
 * DeviceCard 컴포넌트
 *
 * 개별 디바이스의 정보와 유닛들을 표시하는 카드 컴포넌트입니다.
 * 디바이스 헤더, 유닛 목록, 선택된 유닛의 설정 폼을 포함합니다.
 */
export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  deviceIndex,
  deviceSpecs,
  deviceStyles,
  selectedUnit,
  onUnitClick,
  onFormChange,
  onCancel,
  getUnitForm,
  unitForm,
  updateSelectedUnit,
  getStatusConfig,
  getDeviceIcon,
  formatUnitLabel,
  handleCopy,
  handlePaste,
  bulkStatus,
  onAutoModeChange,
  onPowerChange,
  devices = [],
}) => {
  // 디바이스 관련 데이터 준비
  const deviceIcon = getDeviceIcon(device.type);
  const deviceColor = deviceStyles[device.type]?.avatarBg ?? deviceStyles[device.type]?.bgColor ?? 'bg-gray-500 dark:bg-gray-700';
  const deviceSpec = deviceSpecs[device.type];

  const deviceStatusConfig = getStatusConfig(device.status);

  // 디바이스 카드 스타일 적용
  const styles = getDeviceCardStyles();

  // 선택된 유닛의 데이터 변경 시 selectedUnit 동기화
  useEffect(() => {
    if (selectedUnit && selectedUnit.device.id === device.id) {
      const currentUnit = device.units?.find(unit => unit.id === selectedUnit.unit.id);
      if (currentUnit && currentUnit.data !== selectedUnit.unit.data) {
        console.log('🔄 DeviceCard에서 unit 데이터 변경 감지:', {
          deviceId: device.id,
          unitId: currentUnit.id,
          oldData: selectedUnit.unit.data,
          newData: currentUnit.data,
        });

        if (updateSelectedUnit && typeof updateSelectedUnit === 'function') {
          updateSelectedUnit(currentUnit);
        } else {
          console.warn('⚠️ updateSelectedUnit을 사용할 수 없어 동기화를 건너뜁니다.');
        }
      }
    }
  }, [device.units, selectedUnit, updateSelectedUnit]);

  return (
    <div
      className={styles.container}
      style={{
        animationDelay: `${deviceIndex * 100}ms`, // 순차적 애니메이션
        animation: styles.animation,
      }}
    >
      {/* 디바이스 헤더: 아이콘, 이름, 상태 배지 */}
      <DeviceHeader
        deviceName={device.name || device.deviceId || device.id}
        deviceIcon={deviceIcon}
        deviceColor={deviceColor}
        badgeVariant={deviceStatusConfig.variant}
        badgeClassName={deviceStatusConfig.className}
        badgeIcon={deviceStatusConfig.icon}
        badgeText={deviceStatusConfig.text}
      />

      {/* 유닛 정보 영역: 스크롤 가능한 컨테이너 */}
      {device.units && device.units.length > 0 && (
        <div className={`flex-1`}>
          <div className='space-y-2'>
            {device.units.map((unit, unitIndex) => {
              const isSelected = selectedUnit?.unit.id === unit.id && selectedUnit?.device.id === device.id;

              // 유닛별 폼 상태 가져오기 (getUnitForm prop 사용 - unitForms 상태 변경 시 자동 업데이트)
              const currentUnitForm = (() => {
                try {
                  return typeof getUnitForm === 'function' ? getUnitForm(device.id, unit.id) : {};
                } catch (error) {
                  console.error('❌ getUnitForm 호출 실패:', error);
                  return {};
                }
              })();

              // auto 값 계산 (unit.data 우선, 없으면 unitForm 사용)
              const autoValue =
                unit.data?.auto !== undefined && unit.data?.auto !== null ? unit.data.auto : currentUnitForm?.auto;

              // 설정 표시 가능 여부: 선택되면 항상 표시 (auto 값과 무관)
              const canShowSettings = isSelected;

              return (
                <div key={unit.id || unitIndex}>
                  {/* 개별 유닛 카드 */}
                  <UnitCard
                    unit={unit}
                    unitIndex={unitIndex}
                    deviceIndex={deviceIndex}
                    device={device}
                    deviceSpec={deviceSpec}
                    isSelected={isSelected}
                    canShowSettings={canShowSettings}
                    onUnitClick={onUnitClick}
                    getStatusConfig={getStatusConfig}
                    formatUnitLabel={formatUnitLabel}
                    onAutoModeChange={onAutoModeChange}
                    onPowerChange={onPowerChange}
                    unitForm={currentUnitForm}
                    onFormChange={onFormChange}
                    onCancel={onCancel}
                    bulkStatus={bulkStatus}
                    handleCopy={handleCopy}
                    handlePaste={handlePaste}
                    devices={devices}
                    deviceSpecs={deviceSpecs}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
