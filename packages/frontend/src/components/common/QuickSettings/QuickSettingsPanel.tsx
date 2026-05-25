import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { useIsMobile } from '../../../hooks/useIsMobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../ui';

import { QuickSettingsFooter } from './QuickSettingsFooter';
import { QuickSettingsForm } from './QuickSettingsForm';
import { QuickSettingsScheduleBlock } from './QuickSettingsToolbar';
import { QuickSettingsPanelProps } from './types';
import { useQuickSettingsForm } from './useQuickSettingsForm';

const QuickSettingsBody = React.memo<{
  disabled?: boolean;
  onClose: () => void;
  devices: QuickSettingsPanelProps['devices'];
  deviceSpecs: QuickSettingsPanelProps['deviceSpecs'];
  onApplyingChange?: QuickSettingsPanelProps['onApplyingChange'];
}>(({ disabled, onClose, devices, deviceSpecs, onApplyingChange }) => {
  const {
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
  } = useQuickSettingsForm({ devices, deviceSpecs, onApplyingChange });

  const isDisabled = disabled || isApplying;

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6'>
        <div className='space-y-4'>
          {!hasAnyQuickSettingsTarget && (
            <p className='py-4 text-center text-sm text-muted-foreground'>빠른설정을 적용할 장비가 없습니다.</p>
          )}
          {showLightingSchedule && (
            <QuickSettingsScheduleBlock
              title='조명 공통 운영시간'
              description='조명 유닛 전체에 1·2구간을 일괄 반영합니다.'
              start1={lightingSchedule.start1}
              end1={lightingSchedule.end1}
              start2={lightingSchedule.start2}
              end2={lightingSchedule.end2}
              showSlot2
              onScheduleChange={handleLightingScheduleChange}
              disabled={isDisabled}
            />
          )}
          {showOtherSchedule && (
            <QuickSettingsScheduleBlock
              title='기타 공통 운영시간'
              description='조명 이외 유닛에 1구간만 일괄 반영합니다. 운영시간은 여기서만 설정합니다.'
              start1={otherSchedule.start1}
              end1={otherSchedule.end1}
              onScheduleChange={handleOtherScheduleChange}
              disabled={isDisabled}
            />
          )}
          <QuickSettingsForm
            deviceTypes={accordionDeviceTypes}
            deviceSpecs={deviceSpecs}
            formsByUnit={formsByUnit}
            unitCountByType={unitCountByType}
            unitsByDeviceType={unitsByDeviceType}
            onFieldChange={handleFieldChange}
          />
        </div>
      </div>

      <QuickSettingsFooter
        unitCount={targetUnits.length}
        commandCount={commandCount}
        isApplying={isApplying}
        applyProgress={applyProgress}
        onCancel={onClose}
        onApply={handleApply}
        disabled={disabled}
      />
    </div>
  );
});

QuickSettingsBody.displayName = 'QuickSettingsBody';

function quickSettingsPanelPropsAreEqual(prev: QuickSettingsPanelProps, next: QuickSettingsPanelProps): boolean {
  if (prev.open !== next.open) {
    return false;
  }
  if (prev.disabled !== next.disabled) {
    return false;
  }
  if (prev.deviceSpecs !== next.deviceSpecs) {
    return false;
  }
  if (prev.onOpenChange !== next.onOpenChange) {
    return false;
  }
  if (prev.onApplyingChange !== next.onApplyingChange) {
    return false;
  }
  // 열린 동안 sessionDevices 스냅샷 사용 — 폴링으로 바뀌는 devices prop 무시
  if (prev.open && next.open) {
    return true;
  }
  return prev.devices === next.devices;
}

const QuickSettingsPanelComponent: React.FC<QuickSettingsPanelProps> = ({
  open,
  onOpenChange,
  devices,
  deviceSpecs,
  disabled = false,
  onApplyingChange,
}) => {
  const isMobile = useIsMobile();
  const prevOpenRef = useRef(false);
  const [sessionDevices, setSessionDevices] = useState<QuickSettingsPanelProps['devices'] | null>(null);

  useLayoutEffect(() => {
    if (open && !prevOpenRef.current) {
      setSessionDevices(devices);
    }
    if (!open) {
      setSessionDevices(null);
    }
    prevOpenRef.current = open;
  }, [open, devices]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const body =
    sessionDevices && (
      <QuickSettingsBody
        disabled={disabled}
        onClose={handleClose}
        devices={sessionDevices}
        deviceSpecs={deviceSpecs}
        onApplyingChange={onApplyingChange}
      />
    );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side='bottom' className='flex h-[92dvh] flex-col gap-0 p-0'>
          <SheetHeader className='border-b border-border px-4 py-4 text-left'>
            <SheetTitle>빠른설정</SheetTitle>
            <SheetDescription>공통 운영시간과 장비별 설정을 편집한 뒤 한 번에 적용합니다.</SheetDescription>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl'>
        <DialogHeader className='border-b border-border px-6 py-4 text-left'>
          <DialogTitle>빠른설정</DialogTitle>
          <DialogDescription>공통 운영시간과 장비별 설정을 편집한 뒤 한 번에 적용합니다.</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
};

export const QuickSettingsPanel = React.memo(QuickSettingsPanelComponent, quickSettingsPanelPropsAreEqual);

QuickSettingsPanel.displayName = 'QuickSettingsPanel';

