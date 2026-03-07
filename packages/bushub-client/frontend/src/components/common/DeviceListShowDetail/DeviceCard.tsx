import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';

import { useIsMobile } from '../../../hooks/useIsMobile';
import { Button, LabeledStatusButton } from '../../ui';
import { useCommandManager } from './CommandManager';
import { CommandProcessingDialog } from './CommandProcessingDialog';
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
  unitForm: _unitForm,
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
  cardVariant = 'default',
}) => {
  // 디바이스 관련 데이터 준비
  const deviceIcon = getDeviceIcon(device.type);
  const deviceColor =
    deviceStyles[device.type]?.avatarBg ?? deviceStyles[device.type]?.bgColor ?? 'bg-gray-500 dark:bg-gray-700';
  const deviceSpec = deviceSpecs[device.type];

  const deviceStatusConfig = getStatusConfig(device.status);

  // 모바일 여부
  const isMobile = useIsMobile(1024);

  // 패널형에서 전원/자동 명령 전송용 (훅은 무조건 호출)
  const primaryUnitForCommand = device.units?.[0];
  const commandManager = useCommandManager(
    String(device.id ?? device.deviceId ?? ''),
    String(primaryUnitForCommand?.id ?? '')
  );
  const [showPanelCommandDialog, setShowPanelCommandDialog] = useState(false);
  useEffect(() => {
    const show =
      commandManager.commandStatus === 'loading' ||
      commandManager.commandStatus === 'success' ||
      commandManager.commandStatus === 'error';
    setShowPanelCommandDialog(show);
  }, [commandManager.commandStatus]);

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

  // 기본 카드 스타일 (grid형)
  if (cardVariant === 'default') {
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
  }

  // panel 변형: 2열 레이아웃 (좌측 장비, 우측 P/A/E + 정보 셀)
  const primaryUnit = device.units && device.units.length > 0 ? device.units[0] : undefined;
  const primaryUnitForm =
    primaryUnit && typeof getUnitForm === 'function' ? getUnitForm(device.id, primaryUnit.id) : {};
  const primaryUnitData = primaryUnit?.data ?? {};
  const isPrimarySelected =
    !!primaryUnit && selectedUnit?.device.id === device.id && selectedUnit?.unit.id === primaryUnit.id;

  const resolveValue = (key: string) => {
    if (primaryUnitForm && key in primaryUnitForm) {
      return (primaryUnitForm as any)[key];
    }
    if (primaryUnitData && key in primaryUnitData) {
      return (primaryUnitData as any)[key];
    }
    const cmd = deviceSpec?.commands?.find(c => c.key === key);
    return cmd?.defaultValue;
  };

  const hasPowerCommand = deviceSpec?.commands?.some(cmd => cmd.key === 'power') ?? false;
  const hasAutoCommand = deviceSpec?.commands?.some(cmd => cmd.key === 'auto') ?? false;

  const powerValue = Boolean(resolveValue('power'));
  const autoValue = Boolean(resolveValue('auto'));

  const handleTogglePower = async () => {
    if (!primaryUnit) return;
    const next = !powerValue;
    onFormChange('power', next, device.id, primaryUnit.id);
    onPowerChange?.(device, primaryUnit, next);

    const powerCommand = deviceSpec?.commands?.find((cmd: any) => cmd.key === 'power' && cmd.set === true);
    if (powerCommand?.action?.set) {
      try {
        await commandManager.executeCommand([{ action: powerCommand.action.set, value: next }]);
      } catch (err) {
        console.error('❌ 패널 Power 명령 전송 실패:', err);
      }
    }
  };

  const handleToggleAuto = async () => {
    if (!primaryUnit) return;
    const next = !autoValue;
    onFormChange('auto', next, device.id, primaryUnit.id);
    onAutoModeChange?.(device, primaryUnit, next);

    const autoCommand = deviceSpec?.commands?.find((cmd: any) => cmd.key === 'auto' && cmd.set === true);
    if (autoCommand?.action?.set) {
      try {
        await commandManager.executeCommand([{ action: autoCommand.action.set, value: next }]);
      } catch (err) {
        console.error('❌ 패널 Auto 명령 전송 실패:', err);
      }
    }
  };

  const statusSource = primaryUnit?.status ?? device.status;
  const isConnected = statusSource === 0;
  const statusBadgeText = isConnected ? '연결됨' : '연결 안 됨';
  const statusBadgeClass = isConnected
    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
    : 'bg-red-600 text-white dark:bg-red-500';

  // 스케줄 행 구성 (start_time_X / end_time_X 쌍)
  const scheduleRows: Array<{
    id: string;
    startKey: string;
    endKey: string;
    startLabel: string;
    endLabel: string;
  }> = [];

  ['1', '2'].forEach(suffix => {
    const startKey = `start_time_${suffix}`;
    const endKey = `end_time_${suffix}`;
    const startCmd = deviceSpec?.commands?.find(cmd => cmd.key === startKey);
    const endCmd = deviceSpec?.commands?.find(cmd => cmd.key === endKey);
    if (startCmd || endCmd) {
      scheduleRows.push({
        id: `schedule-${suffix}`,
        startKey,
        endKey,
        startLabel: startCmd?.label ?? `시작${suffix}`,
        endLabel: endCmd?.label ?? `종료${suffix}`,
      });
    }
  });

  // 기타 값 필드 (전원/자동 및 스케줄 키 제외)
  const excludedKeys = new Set<string>(['power', 'auto', ...scheduleRows.flatMap(row => [row.startKey, row.endKey])]);

  const valueFields =
    deviceSpec?.commands
      ?.filter(cmd => !excludedKeys.has(cmd.key) && (cmd.get || cmd.set))
      .map(cmd => ({
        key: cmd.key,
        label: cmd.label,
      })) ?? [];

  const chunkValueFields: Array<typeof valueFields> = [];
  for (let i = 0; i < valueFields.length; i += 2) {
    chunkValueFields.push(valueFields.slice(i, i + 2));
  }

  const getDisplayValueForKey = (key: string) => {
    const raw = resolveValue(key);
    if (raw === undefined || raw === null || raw === '') return '-';
    const cmd = deviceSpec?.commands?.find(c => c.key === key);
    if (cmd?.optionLabels) {
      const mapped = (cmd.optionLabels as any)[String(raw)];
      if (mapped !== undefined && mapped !== null && mapped !== '') {
        return mapped;
      }
    }
    if ((cmd?.type === 'int' || cmd?.type === 'float') && cmd?.unit) {
      return `${raw}${cmd.unit}`;
    }
    return String(raw);
  };

  return (
    <>
      <div
        className={`relative p-4 bg-white dark:bg-card border border-gray-200 dark:border-gray-600 shadow-sm rounded-2xl ${
          isMobile ? 'flex flex-col gap-3' : 'flex gap-4'
        }`}
        style={{
          animationDelay: `${deviceIndex * 100}ms`,
          animation: styles.animation,
        }}
      >
        {/* 1열(데스크탑) / 1행(모바일): 장비 아이콘 + 이름 */}
        <div
          className={`relative rounded-xl border border-slate-100 dark:border-slate-700 ${deviceColor} ${
            isMobile
              ? 'flex items-center gap-3 px-3 py-2'
              : 'flex flex-col items-center justify-center w-24 flex-shrink-0 px-2 py-3'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center border border-slate-600 dark:border-slate-400 flex-shrink-0 ${deviceColor}`}
          >
            {deviceIcon}
          </div>
          {primaryUnit?.name && (
            <div
              className={`text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight ${
                isMobile ? '' : 'text-center'
              }`}
            >
              {primaryUnit.name}
            </div>
          )}
        </div>

        {/* 2열(데스크탑) / 2행(모바일): 제어 + 2xN 정보 셀 */}
        <div
          className={`flex-1 flex flex-col gap-3 ${
            isMobile ? '' : 'border-l border-slate-200 dark:border-slate-700 pl-4'
          }`}
        >
          {/* 상단 제어 영역: P/A + 설정 버튼 (2열 1행) */}
          <div className='flex items-center justify-between pb-2 mb-1 border-b border-slate-200 dark:border-slate-700'>
            <span className='text-[11px] text-muted-foreground'>제어</span>
            <div className='flex items-center gap-2'>
              {hasPowerCommand && (
                <LabeledStatusButton
                  type='button'
                  floatingLabel='전원'
                  variant='outline'
                  size='sm'
                  onClick={handleTogglePower}
                  className={`h-8 px-3 py-1 text-[11px] font-semibold transition-colors ${
                    powerValue
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-600/90'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
                  }`}
                  statusText={powerValue ? '켜짐' : '꺼짐'}
                  {...(!powerValue && { statusBadgeClassName: 'bg-slate-600 text-white dark:bg-slate-500 border-0' })}
                >
                  전원
                </LabeledStatusButton>
              )}
              {hasAutoCommand && (
                <LabeledStatusButton
                  type='button'
                  floatingLabel='모드'
                  variant='outline'
                  size='sm'
                  onClick={handleToggleAuto}
                  className={`h-8 px-3 py-1 text-[11px] font-semibold transition-colors ${
                    autoValue
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-600/90'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
                  }`}
                  statusText={autoValue ? '자동' : '수동'}
                  {...(!autoValue && { statusBadgeClassName: 'bg-amber-600 text-white dark:bg-amber-500 border-0' })}
                >
                  모드
                </LabeledStatusButton>
              )}
              {primaryUnit && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => onUnitClick(device, primaryUnit)}
                  className='h-8 px-2 text-[10px] flex items-center gap-1 border-slate-200 dark:border-slate-700'
                >
                  <Settings className='w-3 h-3' />
                </Button>
              )}
            </div>
          </div>

          {/* 정보 영역: 2열 균등 그리드, 셀 내부는 라벨(좌)·값(우) 2열 균등 */}
          <div className='space-y-2 min-h-[128px]'>
            {scheduleRows.map(row => (
              <div key={row.id} className='grid grid-cols-[1fr_1fr] gap-2 min-w-0'>
                <div className='grid grid-cols-[1fr_1fr] min-w-0 gap-1 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'>
                  <span className='text-[10px] text-muted-foreground truncate text-left'>{row.startLabel}</span>
                  <span className='text-xs font-medium text-gray-900 dark:text-gray-100 truncate text-right min-w-0'>
                    {String(resolveValue(row.startKey) ?? '-')}
                  </span>
                </div>
                <div className='grid grid-cols-[1fr_1fr] min-w-0 gap-1 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'>
                  <span className='text-[10px] text-muted-foreground truncate text-left'>{row.endLabel}</span>
                  <span className='text-xs font-medium text-gray-900 dark:text-gray-100 truncate text-right min-w-0'>
                    {String(resolveValue(row.endKey) ?? '-')}
                  </span>
                </div>
              </div>
            ))}

            {chunkValueFields.map((rowFields, rowIndex) => (
              <div key={`values-${rowIndex}`} className='grid grid-cols-[1fr_1fr] gap-2 min-w-0'>
                {rowFields.map(field => (
                  <div
                    key={field.key}
                    className='grid grid-cols-[1fr_1fr] min-w-0 gap-1 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'
                  >
                    <span className='text-[10px] text-muted-foreground truncate text-left'>{field.label}</span>
                    <span className='text-xs font-medium text-gray-900 dark:text-gray-100 truncate text-right min-w-0'>
                      {getDisplayValueForKey(field.key)}
                    </span>
                  </div>
                ))}
                {rowFields.length === 1 && <div />}
              </div>
            ))}
          </div>
        </div>
        {/* 연결 상태 배지 - 데스크탑: 좌상단, 모바일: 우상단 */}
        <div className={`absolute top-0 ${isMobile ? 'right-1.5' : 'left-1.5'}`}>
          <span
            className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-semibold shadow-sm ${statusBadgeClass}`}
          >
            {statusBadgeText}
          </span>
        </div>
      </div>

      {/* 패널형에서도 설정 모달이 동작하도록, 유닛 설정 다이얼로그만 렌더 */}
      {primaryUnit && (
        <UnitCard
          unit={primaryUnit}
          unitIndex={0}
          deviceIndex={deviceIndex}
          device={device}
          deviceSpec={deviceSpec}
          isSelected={isPrimarySelected}
          canShowSettings={isPrimarySelected}
          onUnitClick={onUnitClick}
          getStatusConfig={getStatusConfig}
          formatUnitLabel={formatUnitLabel}
          onAutoModeChange={onAutoModeChange}
          onPowerChange={onPowerChange}
          unitForm={primaryUnitForm}
          onFormChange={onFormChange}
          onCancel={onCancel}
          bulkStatus={bulkStatus}
          handleCopy={handleCopy}
          handlePaste={handlePaste}
          devices={devices}
          deviceSpecs={deviceSpecs}
          renderSettingsDialogOnly
        />
      )}

      {/* 패널형 전원/자동 명령 처리 중 다이얼로그 */}
      <CommandProcessingDialog
        isOpen={showPanelCommandDialog}
        onClose={() => {
          setShowPanelCommandDialog(false);
          if (commandManager.commandStatus === 'loading') {
            commandManager.resetStatus();
          }
        }}
        status={
          commandManager.commandStatus === 'idle' || commandManager.commandStatus === 'loading'
            ? 'waiting'
            : commandManager.commandStatus === 'success'
              ? 'success'
              : 'fail'
        }
        progress={commandManager.progress}
        error={commandManager.error}
        deviceName={device.name || String(device.id)}
        unitName={primaryUnit?.name || String(primaryUnit?.id)}
        action={deviceSpec?.commands?.find((c: any) => c.key === 'power' || c.key === 'auto')?.label ?? '명령'}
      />
    </>
  );
};
