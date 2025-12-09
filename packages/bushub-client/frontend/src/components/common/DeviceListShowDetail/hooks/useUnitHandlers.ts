import { useCallback } from 'react';

/**
 * UnitCard의 이벤트 핸들러를 담당하는 Hook
 */
export const useUnitHandlers = (
  device: any,
  unit: any,
  deviceSpec: any,
  onPowerChange?: (device: any, unit: any, powerMode: boolean) => void,
  onAutoModeChange?: (device: any, unit: any, autoMode: boolean) => void
) => {
  /**
   * Power 모드 변경 핸들러
   * 부모 컴포넌트에 알림만 전달
   */
  const handlePowerChange = useCallback(
    async (checked: boolean) => {
      console.log('🚀 Power 스위치 변경됨:', { device: device.id, unit: unit.id, checked });

      // 부모 컴포넌트에 상태 변경 알림 (UI 즉시 업데이트)
      onPowerChange?.(device, unit, checked);
    },
    [device, unit, onPowerChange]
  );

  /**
   * Auto 모드 변경 핸들러
   * 부모 컴포넌트에 알림만 전달
   */
  const handleAutoModeChange = useCallback(
    async (checked: boolean) => {
      console.log('🚀 Auto 모드 스위치 변경됨:', { device: device.id, unit: unit.id, checked });

      // 부모 컴포넌트에 상태 변경 알림 (UI 즉시 업데이트)
      onAutoModeChange?.(device, unit, checked);
    },
    [device, unit, onAutoModeChange]
  );

  return {
    handlePowerChange,
    handleAutoModeChange,
  };
};
