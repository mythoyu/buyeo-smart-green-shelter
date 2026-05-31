import { useState, useEffect, useMemo } from 'react';

import { useCommandManager } from '../CommandManager';
import { getUnitCardStyles, getAnimationDelay, resolvePowerAutoValues } from '../utils';

/**
 * UnitCard의 상태 관리를 담당하는 Hook
 */
export const useUnitState = (
  unit: any,
  device: any,
  deviceSpec: any,
  unitForm: any,
  isSelected: boolean,
  deviceIndex: number,
  unitIndex: number,
  getStatusConfig: (status: number | undefined) => any,
  bulkCommandsMutation?: any
) => {
  // CommandManager 훅을 사용하여 명령 상태 관리
  const commandManager = useCommandManager(device.deviceId || device.id, unit.id);

  // 명령 처리 상태에 따른 다이얼로그 표시 여부
  const [showDialog, setShowDialog] = useState(false);

  // 명령 완료 시 CommandManager 상태 초기화 (즉시 초기화하지 않음)
  useEffect(() => {
    if (commandManager.commandStatus === 'success') {
      console.log('🎯 명령 완료됨, 상태 초기화는 CommandManager에서 관리');
      // resetStatus() 호출 제거 - CommandManager에서 1초 후 자동 초기화
    }
  }, [commandManager.commandStatus, commandManager]);

  // 명령 처리 상태 변경 시 다이얼로그 표시/숨김
  useEffect(() => {
    const shouldShowDialog =
      commandManager.commandStatus === 'loading' ||
      commandManager.commandStatus === 'success' ||
      commandManager.commandStatus === 'error';

    setShowDialog(shouldShowDialog);
  }, [commandManager.commandStatus]);

  // 유닛 상태 및 스타일 설정
  const unitStatusConfig = getStatusConfig(unit.status);
  const styles = getUnitCardStyles(isSelected);
  const animationDelay = getAnimationDelay(deviceIndex, unitIndex);

  // Get 가능한 데이터 명령어들 (읽기 전용)
  const getCommands = deviceSpec?.commands?.filter((cmd: any) => cmd.get === true) || [];

  // Power 및 Auto 모드 상태 (unit.data 우선, 없으면 unitForm — references 정합)
  const { powerValue, autoValue } = useMemo(
    () => resolvePowerAutoValues(unit.data, unitForm),
    [unitForm?.power, unitForm?.auto, unit.data?.power, unit.data?.auto, unit.data, unitForm]
  );

  // Power/Auto 명령어 지원 여부 확인
  const hasPowerCommand = deviceSpec?.commands?.some((cmd: any) => cmd.key === 'power');
  const hasAutoCommand = deviceSpec?.commands?.some((cmd: any) => cmd.key === 'auto');

  // 명령 처리 중일 때 스위치 비활성화 (bulkCommandsMutation 우선, 없으면 commandManager 사용)
  const isProcessing = bulkCommandsMutation
    ? bulkCommandsMutation.isPending || bulkCommandsMutation.isLoading
    : commandManager.commandStatus === 'loading';

  // 상태 배지 props (status 미수집 시 getStatusConfig → 미설정)
  const statusProps = {
    statusVariant: unitStatusConfig.variant,
    statusClassName: unitStatusConfig.className,
    statusIcon: unitStatusConfig.icon,
  };

  return {
    commandManager,
    showDialog,
    setShowDialog,
    styles,
    animationDelay,
    getCommands,
    powerValue,
    autoValue,
    hasPowerCommand,
    hasAutoCommand,
    isProcessing,
    statusProps,
  };
};
