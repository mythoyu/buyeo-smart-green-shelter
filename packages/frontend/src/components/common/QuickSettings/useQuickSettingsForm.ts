import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useSendUnitBulkCommands } from '../../../api/queries/device';
import { Device, DeviceSpec } from '../DeviceListShowDetail/types';
import { getQuickSettingsUnitKey, LightingScheduleState, OtherScheduleState } from './types';

import {
  APPLY_CONCURRENCY,
  applyCommonScheduleToForms,
  buildCommandsFromForm,
  buildInitialForms,
  countCommandsForApply,
  filterTargetUnits,
  getAccordionDeviceTypes,
  getTargetUnits,
  getUnitCountByType,
  getUnitsByDeviceType,
  hasLightingScheduleTargets,
  hasOtherScheduleTargets,
  inferLightingSchedule,
  inferOtherSchedule,
  isLightingDeviceType,
  mapWithConcurrency,
} from './quickSettingsUtils';
import { QuickSettingsFormState } from './types';

interface UseQuickSettingsFormOptions {
  /** 패널 open 시점 스냅샷 (폴링 devices 와 분리) */
  devices: Device[];
  deviceSpecs: Record<string, DeviceSpec>;
  onApplyingChange?: (applying: boolean) => void;
}

export function useQuickSettingsForm({ devices: sessionDevices, deviceSpecs, onApplyingChange }: UseQuickSettingsFormOptions) {
  const queryClient = useQueryClient();
  const sendCommandMutation = useSendUnitBulkCommands();

  const targetUnits = useMemo(() => getTargetUnits(sessionDevices, deviceSpecs), [sessionDevices, deviceSpecs]);

  const lightingUnits = useMemo(() => filterTargetUnits(targetUnits, (u) => isLightingDeviceType(u.deviceType)), [targetUnits]);
  const otherScheduleUnits = useMemo(
    () => filterTargetUnits(targetUnits, (u) => !isLightingDeviceType(u.deviceType)),
    [targetUnits],
  );

  const accordionDeviceTypes = useMemo(
    () => getAccordionDeviceTypes(sessionDevices, deviceSpecs),
    [sessionDevices, deviceSpecs],
  );

  const unitsByDeviceType = useMemo(() => getUnitsByDeviceType(sessionDevices, deviceSpecs), [sessionDevices, deviceSpecs]);

  const unitCountByType = useMemo(() => {
    const counts: Record<string, number> = {};
    accordionDeviceTypes.forEach((type) => {
      counts[type] = getUnitCountByType(sessionDevices, type);
    });
    return counts;
  }, [accordionDeviceTypes, sessionDevices]);

  const showLightingSchedule = useMemo(() => hasLightingScheduleTargets(targetUnits, deviceSpecs), [targetUnits, deviceSpecs]);
  const showOtherSchedule = useMemo(() => hasOtherScheduleTargets(targetUnits, deviceSpecs), [targetUnits, deviceSpecs]);

  const [formsByUnit, setFormsByUnit] = useState<QuickSettingsFormState>(() => {
    const units = getTargetUnits(sessionDevices, deviceSpecs);
    return buildInitialForms(units, deviceSpecs);
  });
  const [lightingSchedule, setLightingSchedule] = useState<LightingScheduleState>(() => {
    const units = getTargetUnits(sessionDevices, deviceSpecs);
    const forms = buildInitialForms(units, deviceSpecs);
    return inferLightingSchedule(forms, units);
  });
  const [otherSchedule, setOtherSchedule] = useState<OtherScheduleState>(() => {
    const units = getTargetUnits(sessionDevices, deviceSpecs);
    const forms = buildInitialForms(units, deviceSpecs);
    return inferOtherSchedule(forms, units);
  });

  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    onApplyingChange?.(isApplying);
  }, [isApplying, onApplyingChange]);

  const commandCount = useMemo(() => countCommandsForApply(formsByUnit, targetUnits, deviceSpecs), [formsByUnit, targetUnits, deviceSpecs]);

  const handleLightingScheduleChange = useCallback(
    (patch: Partial<LightingScheduleState>) => {
      const schedule = { ...lightingSchedule, ...patch };
      setLightingSchedule(schedule);
      setFormsByUnit((prev) => applyCommonScheduleToForms(prev, schedule, lightingUnits, deviceSpecs, { applySlot2: true }));
    },
    [deviceSpecs, lightingSchedule, lightingUnits],
  );

  const handleOtherScheduleChange = useCallback(
    (patch: Partial<OtherScheduleState>) => {
      const schedule = { ...otherSchedule, ...patch };
      setOtherSchedule(schedule);
      const asCommon = { ...schedule, start2: '', end2: '' };
      setFormsByUnit((prev) =>
        applyCommonScheduleToForms(prev, asCommon, otherScheduleUnits, deviceSpecs, {
          applySlot2: false,
        }),
      );
    },
    [deviceSpecs, otherSchedule, otherScheduleUnits],
  );

  const handleFieldChange = useCallback((unitKey: string, key: string, value: unknown) => {
    setFormsByUnit((prev) => ({
      ...prev,
      [unitKey]: {
        ...prev[unitKey],
        [key]: value,
      },
    }));
  }, []);

  const handleApply = useCallback(async () => {
    if (targetUnits.length === 0) {
      toast.error('적용할 유닛이 없습니다');
      return;
    }

    const totalCommands = countCommandsForApply(formsByUnit, targetUnits, deviceSpecs);
    if (totalCommands === 0) {
      toast.error('적용할 설정이 없습니다');
      return;
    }

    setIsApplying(true);
    setApplyProgress({ current: 0, total: targetUnits.length });

    try {
      let completedUnits = 0;

      const results = await mapWithConcurrency(targetUnits, APPLY_CONCURRENCY, async ({ device, unit, deviceType }) => {
        const spec = deviceSpecs[deviceType];
        const form = formsByUnit[getQuickSettingsUnitKey(device.id, unit.id)];

        if (!spec || !form) {
          completedUnits += 1;
          setApplyProgress({ current: completedUnits, total: targetUnits.length });
          return { success: true, skipped: true as const };
        }

        const commands = buildCommandsFromForm(form, spec);
        if (commands.length === 0) {
          completedUnits += 1;
          setApplyProgress({ current: completedUnits, total: targetUnits.length });
          return { success: true, skipped: true as const };
        }

        await sendCommandMutation.mutateAsync({
          deviceId: device.id,
          unitId: unit.id,
          commands,
        });

        completedUnits += 1;
        setApplyProgress({ current: completedUnits, total: targetUnits.length });
        return { success: true as const };
      });

      const successCount = results.filter((result) => result.status === 'fulfilled' && result.value.success).length;
      const failCount = targetUnits.length - successCount;

      await queryClient.invalidateQueries({ queryKey: ['dashboardData'], exact: false });

      if (failCount > 0) {
        toast.warning(`완료: ${successCount}개 유닛 성공, ${failCount}개 실패`);
      } else {
        toast.success(`${successCount}개 유닛에 설정을 적용했습니다`);
      }
    } catch (error) {
      console.error('빠른설정 적용 실패:', error);
      toast.error('설정 적용에 실패했습니다');
    } finally {
      setIsApplying(false);
      setApplyProgress({ current: 0, total: 0 });
    }
  }, [deviceSpecs, formsByUnit, queryClient, sendCommandMutation, targetUnits]);

  const hasAnyQuickSettingsTarget = targetUnits.length > 0;

  return {
    accordionDeviceTypes,
    unitsByDeviceType,
    formsByUnit,
    unitCountByType,
    targetUnits,
    commandCount,
    lightingSchedule,
    otherSchedule,
    showLightingSchedule,
    showOtherSchedule,
    hasAnyQuickSettingsTarget,
    isApplying,
    applyProgress,
    handleLightingScheduleChange,
    handleOtherScheduleChange,
    handleFieldChange,
    handleApply,
  };
}

