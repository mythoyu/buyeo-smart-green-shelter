import { Settings } from 'lucide-react';
import React, { useCallback } from 'react';

import { smartcityMetaHelpers } from '../../../meta/smartcityMetaHelpers';
import { Badge, Card, CardHeader, CardContent } from '../../ui';

import { CommandProcessingDialog } from './CommandProcessingDialog';
import { UnitControls } from './components/UnitControls';
import { useUnitState } from './hooks';
import { UnitCardProps } from './types';
import { UnitSettings } from './UnitSettings';

/**
 * UnitCard 컴포넌트
 *
 * 개별 유닛의 정보와 컨트롤을 표시하는 카드 컴포넌트입니다.
 * Power/Auto 스위치, 상태 배지, 명령 처리 상태를 포함합니다.
 */
export const UnitCard: React.FC<UnitCardProps> = ({
  unit,
  unitIndex,
  deviceIndex,
  device,
  deviceSpec,
  isSelected,
  canShowSettings,
  onUnitClick,
  getStatusConfig,
  onAutoModeChange,
  onPowerChange,
  unitForm,
  onFormChange,
  onCancel,
  bulkStatus,
  handleCopy,
  handlePaste,
}) => {
  // 상태 관리 Hook 사용
  const {
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
  } = useUnitState(unit, device, deviceSpec, unitForm, isSelected, deviceIndex, unitIndex, getStatusConfig);

  // 직접 명령 실행 핸들러
  const handleDirectPowerChange = async (checked: boolean) => {
    console.log('🎯 UnitCard에서 직접 Power 명령 실행:', {
      device: device.id,
      unit: unit.id,
      checked,
    });

    try {
      // deviceSpec에서 power 명령어 찾기
      const powerCommand = deviceSpec?.commands?.find((cmd: any) => cmd.key === 'power' && cmd.set === true);

      if (powerCommand && powerCommand.action?.set) {
        console.log('🚀 Power 명령어 발견, CommandManager로 실행...');

        // CommandManager를 통해 명령 실행
        await commandManager.executeCommand([
          {
            action: powerCommand.action.set,
            value: checked,
          },
        ]);
      } else {
        console.log('❌ Power 명령어를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ Power 모드 변경 실패:', error);
    }
  };

  const handleDirectAutoChange = async (checked: boolean) => {
    console.log('🎯 UnitCard에서 직접 Auto 명령 실행:', {
      device: device.id,
      unit: unit.id,
      checked,
    });

    try {
      // deviceSpec에서 auto 명령어 찾기
      const autoCommand = deviceSpec?.commands?.find((cmd: any) => cmd.key === 'auto' && cmd.set === true);

      if (autoCommand && autoCommand.action?.set) {
        console.log('🚀 Auto 명령어 발견, CommandManager로 실행...');

        // CommandManager를 통해 명령 실행
        await commandManager.executeCommand([
          {
            action: autoCommand.action.set,
            value: checked,
          },
        ]);
      } else {
        console.log('❌ Auto 명령어를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ Auto 모드 변경 실패:', error);
    }
  };

  // 저장 버튼 핸들러 (CommandManager 사용)
  const handleSaveWithCommandManager = useCallback(async () => {
    if (!deviceSpec?.commands) return;

    try {
      console.log('💾 UnitCard에서 저장 명령 실행:', { device: device.id, unit: unit.id, unitForm });

      // 폼 값에 해당하는 명령어들 생성
      const commands = deviceSpec.commands
        .filter(cmd => cmd.set && cmd.action?.set && unitForm[cmd.key] !== undefined)
        .map(cmd => ({
          action: cmd.action!.set!,
          value: unitForm[cmd.key],
        }))
        .filter(cmd => cmd.action && typeof cmd.action === 'string');

      if (commands.length === 0) {
        console.log('⚠️ 실행할 명령어가 없습니다.');
        return;
      }

      console.log('🚀 저장 명령어들:', commands);

      // CommandManager를 통해 명령 실행
      await commandManager.executeCommand(commands);

      console.log('✅ 저장 명령이 성공적으로 전송되었습니다.');
    } catch (error) {
      console.error('❌ 저장 명령 실행 실패:', error);
    }
  }, [deviceSpec, unitForm, unit.id, device.id, commandManager]);

  return (
    <>
      <div
        style={{
          animationDelay,
          animation: styles.animation,
        }}
      >
        <Card className={styles.container}>
          {/* CardHeader - 클릭 불가능한 영역 */}
          <CardHeader className='px-4'>
            <div className='flex items-center justify-between w-full'>
              {/* 유닛 이름 및 설정 아이콘 */}
              <div className='flex items-center gap-3'>
                <Settings
                  className={`w-4 h-4 transition-all duration-300 ${
                    isSelected ? 'text-blue-600 rotate-90' : 'text-gray-500 hover:text-blue-500'
                  }`}
                />
                <div className='flex flex-col'>
                  <span className='text-xs text-gray-500 transition-colors duration-200'>{unit.name || unit.id}</span>
                </div>
              </div>

              {/* Power/Auto 스위치 및 상태 배지 */}
              <UnitControls
                powerEnabled={hasPowerCommand}
                autoEnabled={hasAutoCommand}
                powerValue={Boolean(powerValue)}
                autoValue={Boolean(autoValue)}
                isProcessing={isProcessing}
                onPowerChange={checked => {
                  console.log('🎯 UnitCard에서 Power 핸들러 호출:', {
                    device: device.id,
                    unit: unit.id,
                    checked,
                    onPowerChange: !!onPowerChange,
                  });
                  handleDirectPowerChange(checked);
                }}
                onAutoChange={checked => {
                  console.log('🎯 UnitCard에서 Auto 핸들러 호출:', {
                    device: device.id,
                    unit: unit.id,
                    checked,
                    onAutoModeChange: !!onAutoModeChange,
                  });
                  handleDirectAutoChange(checked);
                }}
                {...(statusProps as any)}
              />
            </div>
          </CardHeader>

          {/* CardContent - 자동모드일 때는 클릭 비활성화 */}
          <CardContent
            onClick={
              Boolean(autoValue)
                ? undefined
                : () => {
                    if (isSelected) {
                      onCancel();
                    } else {
                      onUnitClick(device, unit);
                    }
                  }
            }
            className={`px-4 ${Boolean(autoValue) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
          >
            {/* Get 가능한 데이터 Badge들 */}
            {getCommands.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {getCommands.map((cmd: any) => {
                  const value = unit.data?.[cmd.key];

                  const displayValue = smartcityMetaHelpers.getCommandDisplayValue(cmd, value);
                  const { badgeVariant, badgeClassName } = smartcityMetaHelpers.getCommandBadgeStyle(cmd);

                  return (
                    <Badge
                      key={cmd.key}
                      variant={badgeVariant}
                      className={`${badgeClassName} transition-all duration-300 hover:scale-105`}
                      onClick={e => e.stopPropagation()}
                      title={`${cmd.label}: ${displayValue}`}
                    >
                      <div className='flex flex-col items-center'>
                        <span className='text-xs text-gray-500 font-medium leading-none'>{cmd.label}</span>
                        <span className='text-xs font-bold leading-none mt-0.5'>{displayValue}</span>
                      </div>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* 선택된 유닛의 설정 폼 - auto=true일 때만 표시 */}
            {canShowSettings && deviceSpec?.commands && (
              <div className='mt-4 pt-4 border-t border-gray-200' onClick={e => e.stopPropagation()}>
                <UnitSettings
                  unit={unit}
                  device={device}
                  deviceSpec={deviceSpec}
                  unitForm={unitForm}
                  onFormChange={onFormChange}
                  onSave={handleSaveWithCommandManager}
                  onCancel={onCancel}
                  bulkCommandsMutation={null}
                  bulkStatus={bulkStatus}
                  handleCopy={handleCopy}
                  handlePaste={handlePaste}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 명령 처리 중 팝업 다이얼로그 */}
      <CommandProcessingDialog
        isOpen={showDialog}
        onClose={() => {
          setShowDialog(false);
          // 다이얼로그 닫을 때 백그라운드 폴링도 중지
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
        deviceName={device.name || device.id}
        unitName={unit.name || unit.id}
        action={deviceSpec?.commands?.find((cmd: any) => cmd.key === 'power' || cmd.key === 'auto')?.label || '명령'}
      />
    </>
  );
};
