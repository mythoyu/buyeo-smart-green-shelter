import { useState, useCallback, useEffect } from 'react';

import { useSendUnitBulkCommands, useGetUnitBulkCommandStatus } from '../../../../api/queries/device';
import { Device, Unit, DeviceSpec } from '../types';

export const useCommandExecution = (
  selectedUnit: { device: Device; unit: Unit } | null,
  handleFormChange: (key: string, value: any) => void
) => {
  // 대량 제어 요청 ID들
  const [bulkCommandRequestIds, setBulkCommandRequestIds] = useState<string[]>([]);

  // API 훅들
  const bulkCommandsMutation = useSendUnitBulkCommands();
  const bulkCommandStatus = useGetUnitBulkCommandStatus(
    selectedUnit?.device?.id || '',
    selectedUnit?.unit?.id || '',
    bulkCommandRequestIds,
    { enabled: bulkCommandRequestIds.length > 0 }
  );

  // 대량 제어 상태 확인
  const getBulkCommandStatus = useCallback(() => {
    if (!bulkCommandStatus.data || bulkCommandStatus.data.length === 0) {
      return null;
    }

    const allSuccess = bulkCommandStatus.data.every((item: any) => item.status === 'success');
    const anyFailed = bulkCommandStatus.data.some((item: any) => item.status === 'fail');
    const anyPending = bulkCommandStatus.data.some((item: any) => item.status === 'pending');

    if (anyPending) return 'pending';
    if (anyFailed) return 'failed';
    if (allSuccess) return 'success';
    return 'mixed';
  }, [bulkCommandStatus.data]);

  // 모든 명령이 완료되면 상태 조회 중단
  useEffect(() => {
    if (bulkCommandStatus.data && bulkCommandStatus.data.length > 0) {
      const allCompleted = bulkCommandStatus.data.every(
        (item: any) => item.status === 'success' || item.status === 'fail'
      );

      if (allCompleted) {
        // 3초 후에 requestIds 초기화하여 상태 조회 중단
        const timer = setTimeout(() => {
          setBulkCommandRequestIds([]);
        }, 3000);

        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [bulkCommandStatus.data]);

  // Power 모드 변경 핸들러
  const handlePowerChange = useCallback(
    async (device: any, unit: any, powerMode: boolean, deviceSpecs: Record<string, DeviceSpec>) => {
      try {
        console.log('🚀 Power 모드 변경 요청:', { device: device.id, unit: unit.id, powerMode });

        // 즉시 unitForm 상태 업데이트 (UI 즉시 반영)
        handleFormChange('power', powerMode);

        // deviceSpec에서 power 명령어 찾기
        const powerCommand = deviceSpecs[device.type]?.commands?.find(
          (cmd: any) => cmd.key === 'power' && cmd.set === true
        );

        if (powerCommand && powerCommand.action?.set) {
          console.log('🚀 Power 명령어 발견, API 호출 시작...');

          const commands = [
            {
              action: powerCommand.action.set,
              value: powerMode,
            },
          ].filter(cmd => cmd.action && typeof cmd.action === 'string');

          const result = await bulkCommandsMutation.mutateAsync({
            deviceId: device.deviceId || device.id,
            unitId: unit.id,
            commands,
          });

          console.log('✅ Power 모드 명령 전송 성공:', result);

          const requestIds = result.map((item: any) => item.requestId);
          setBulkCommandRequestIds(requestIds);

          console.log('✅ Power 모드 변경 완료, 상태 동기화됨');
        } else {
          console.log('❌ Power 명령어를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('❌ Power 모드 변경 실패:', error);
        handleFormChange('power', !powerMode);
      }
    },
    [bulkCommandsMutation, handleFormChange]
  );

  // Auto 모드 변경 핸들러
  const handleAutoModeChange = useCallback(
    async (device: any, unit: any, autoMode: boolean, deviceSpecs: Record<string, DeviceSpec>) => {
      try {
        console.log('🚀 Auto 모드 변경 요청:', { device: device.id, unit: unit.id, autoMode });

        handleFormChange('auto', autoMode);

        const autoCommand = deviceSpecs[device.type]?.commands?.find(
          (cmd: any) => cmd.key === 'auto' && cmd.set === true
        );

        if (autoCommand && autoCommand.action?.set) {
          console.log('🚀 Auto 명령어 발견, API 호출 시작...');

          const commands = [
            {
              action: autoCommand.action.set,
              value: autoMode,
            },
          ].filter(cmd => cmd.action && typeof cmd.action === 'string');

          const result = await bulkCommandsMutation.mutateAsync({
            deviceId: device.deviceId || device.id,
            unitId: unit.id,
            commands,
          });

          console.log('✅ Auto 모드 명령 전송 성공:', result);

          const requestIds = result.map((item: any) => item.requestId);
          setBulkCommandRequestIds(requestIds);

          console.log('✅ Auto 모드 변경 완료, 상태 동기화됨');
        } else {
          console.log('❌ Auto 명령어를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('❌ Auto 모드 변경 실패:', error);
        handleFormChange('auto', !autoMode);
      }
    },
    [bulkCommandsMutation, handleFormChange]
  );

  return {
    bulkCommandRequestIds,
    setBulkCommandRequestIds,
    bulkCommandsMutation,
    bulkCommandStatus,
    getBulkCommandStatus,
    handlePowerChange,
    handleAutoModeChange,
  };
};
