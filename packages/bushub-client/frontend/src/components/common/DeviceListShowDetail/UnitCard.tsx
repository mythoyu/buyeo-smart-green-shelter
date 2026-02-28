import { Settings, Users, TrendingUp, TrendingDown, ArrowRight, ChevronDown, RotateCcw } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSendUnitBulkCommands } from '../../../api/queries/device';
import { useResetPeopleCounter, type ResetType } from '../../../api/queries/people-counter';
import { smartcityMetaHelpers } from '../../../meta/smartcityMetaHelpers';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui';
import { toast } from 'sonner';

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
  devices = [],
  deviceSpecs = {},
}) => {
  const navigate = useNavigate();
  const isPeopleCounter = device.type === 'people_counter' || device.id === 'd082';
  const resetMutation = useResetPeopleCounter();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetType, setResetType] = useState<ResetType | null>(null);

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

  // 다른 유닛에 명령 전송을 위한 mutation
  const sendCommandMutation = useSendUnitBulkCommands();

  // 직접 명령 실행 핸들러
  const handleDirectPowerChange = async (checked: boolean) => {
    console.log('🎯 UnitCard에서 직접 Power 명령 실행:', {
      device: device.id,
      unit: unit.id,
      checked,
    });

    try {
      // 즉시 unitForm 상태 업데이트 (UI 즉시 반영) - UnitSettings와 동일한 방식
      // device와 unit 정보를 전달하여 선택되지 않은 유닛에서도 동작하도록 함
      onFormChange('power', checked, device.id, unit.id);

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
      // 롤백하지 않음 - UnitSettings와 동일 (폴링 데이터로 자연스럽게 복원)
    }
  };

  const handleDirectAutoChange = async (checked: boolean) => {
    console.log('🎯 UnitCard에서 직접 Auto 명령 실행:', {
      device: device.id,
      unit: unit.id,
      checked,
    });

    try {
      // 즉시 unitForm 상태 업데이트 (UI 즉시 반영) - UnitSettings와 동일한 방식
      // device와 unit 정보를 전달하여 선택되지 않은 유닛에서도 동작하도록 함
      onFormChange('auto', checked, device.id, unit.id);

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
      // 롤백하지 않음 - UnitSettings와 동일 (폴링 데이터로 자연스럽게 복원)
    }
  };

  // 저장 버튼 핸들러 (CommandManager 사용)
  const handleSaveWithCommandManager = useCallback(
    async (selectedUnits?: Set<string>) => {
      if (!deviceSpec?.commands) return;

      try {
        console.log('💾 UnitCard에서 저장 명령 실행:', {
          device: device.id,
          unit: unit.id,
          unitForm,
          selectedUnitsCount: selectedUnits?.size || 0,
        });

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

        // 1. 현재 유닛에 명령 실행
        await commandManager.executeCommand(commands);
        console.log('✅ 현재 유닛 저장 명령이 성공적으로 전송되었습니다.');

        // 2. 선택된 다른 유닛들에도 명령 실행
        if (selectedUnits && selectedUnits.size > 0) {
          const commandPromises = Array.from(selectedUnits).map(async unitKey => {
            const [targetDeviceId, targetUnitId] = unitKey.split('_');
            try {
              console.log(`🚀 다른 유닛에 명령 전송: ${targetDeviceId}/${targetUnitId}`);
              const result = await sendCommandMutation.mutateAsync({
                deviceId: targetDeviceId,
                unitId: targetUnitId,
                commands,
              });
              console.log(`✅ 다른 유닛 명령 전송 성공: ${targetDeviceId}/${targetUnitId}`, result);
              return { success: true, unitKey, result };
            } catch (error) {
              console.error(`❌ 다른 유닛 명령 전송 실패: ${targetDeviceId}/${targetUnitId}`, error);
              return { success: false, unitKey, error };
            }
          });

          const results = await Promise.allSettled(commandPromises);
          const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
          const failCount = results.length - successCount;

          console.log(`📊 다른 유닛 명령 실행 결과: 성공 ${successCount}개, 실패 ${failCount}개`);

          if (failCount > 0) {
            console.warn(`⚠️ 일부 유닛에 명령 전송 실패: ${failCount}개`);
          }
        }
      } catch (error) {
        console.error('❌ 저장 명령 실행 실패:', error);
      }
    },
    [deviceSpec, unitForm, unit.id, device.id, commandManager, sendCommandMutation]
  );

  // 리셋 핸들러
  const handleResetClick = useCallback((type: ResetType) => {
    setResetType(type);
    setResetDialogOpen(true);
  }, []);

  const handleResetConfirm = useCallback(async () => {
    if (!resetType) return;
    try {
      await resetMutation.mutateAsync(resetType);
      toast.success('피플카운터가 초기화되었습니다.', { id: 'people-counter-reset-success' });
      setResetDialogOpen(false);
      setResetType(null);
    } catch (error) {
      toast.error('피플카운터 초기화에 실패했습니다.', { id: 'people-counter-reset-error' });
    }
  }, [resetType, resetMutation]);

  const getResetMessage = (type: ResetType): string => {
    switch (type) {
      case 'current':
        return '현재 인원을 0으로 리셋하시겠습니까?';
      case 'in':
        return '입실 누적을 0으로 리셋하시겠습니까?';
      case 'out':
        return '퇴실 누적을 0으로 리셋하시겠습니까?';
      case 'all':
        return '모든 값(현재 인원, 입실 누적, 퇴실 누적)을 0으로 리셋하시겠습니까?';
      default:
        return '리셋하시겠습니까?';
    }
  };

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
              {/* 유닛 이름 및 설정 아이콘 (피플카운터는 설정 없음) */}
              <div className='flex items-center gap-3'>
                {!isPeopleCounter && (
                  <Settings
                    className={`w-4 h-4 transition-all duration-300 ${
                      isSelected ? 'text-blue-600 rotate-90' : 'text-gray-500 hover:text-blue-500'
                    }`}
                  />
                )}
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

          {/* CardContent - 피플카운터 전용 영역 또는 Get 가능한 데이터 Badge들 */}
          <CardContent
            onClick={
              isPeopleCounter || Boolean(autoValue)
                ? undefined
                : () => {
                    if (isSelected) {
                      onCancel();
                    } else {
                      onUnitClick(device, unit);
                    }
                  }
            }
            className={`px-4 ${
              isPeopleCounter ? 'cursor-default' : Boolean(autoValue) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
            }`}
          >
            {isPeopleCounter ? (
              <div className='space-y-3' onClick={e => e.stopPropagation()}>
                {unit.data ? (
                  <>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Users className='h-4 w-4 text-muted-foreground' />
                        <span className='text-sm text-muted-foreground'>현재 인원</span>
                      </div>
                      <span className='text-xl font-bold text-blue-600'>
                        {Number(unit.data.currentCount ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className='grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700'>
                      <div className='flex flex-col'>
                        <div className='flex items-center gap-1 mb-0.5'>
                          <TrendingUp className='h-3 w-3 text-green-600' />
                          <span className='text-xs text-muted-foreground'>입실 누적</span>
                        </div>
                        <span className='text-sm font-semibold text-green-600'>
                          {Number(unit.data.inCumulative ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className='flex flex-col'>
                        <div className='flex items-center gap-1 mb-0.5'>
                          <TrendingDown className='h-3 w-3 text-red-600' />
                          <span className='text-xs text-muted-foreground'>퇴실 누적</span>
                        </div>
                        <span className='text-sm font-semibold text-red-600'>
                          {Number(unit.data.outCumulative ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className='flex flex-col items-center justify-center py-4 space-y-1'>
                    <Users className='h-6 w-6 text-muted-foreground' />
                    <span className='text-sm text-muted-foreground'>데이터 수집 중...</span>
                  </div>
                )}
                <div className='flex gap-2 mt-1'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => navigate('/user-statistics')}
                    className='flex-1 h-8 text-xs justify-center bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 hover:bg-green-100 hover:border-green-300 dark:hover:bg-green-800/40 dark:hover:border-green-700 text-green-800 dark:text-green-200'
                  >
                    상세보기
                    <ArrowRight className='h-3 w-3 ml-1' />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='outline' size='sm' className='h-8 text-xs px-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-600'>
                        <RotateCcw className='h-3 w-3 mr-1' />
                        초기화
                        <ChevronDown className='h-3 w-3 ml-1' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem onClick={() => handleResetClick('current')}>
                        현재 인원 리셋
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResetClick('in')}>
                        입실 누적 리셋
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResetClick('out')}>
                        퇴실 누적 리셋
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResetClick('all')} className='text-red-600'>
                        전체 리셋
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : (
              getCommands.length > 0 && (
                <div className='grid grid-cols-4 gap-2'>
                  {getCommands.map((cmd: any) => {
                    const value = unit.data?.[cmd.key];

                    const displayValue = smartcityMetaHelpers.getCommandDisplayValue(cmd, value);
                    const { badgeVariant, badgeClassName } = smartcityMetaHelpers.getCommandBadgeStyle(cmd);

                    return (
                      <Badge
                        key={cmd.key}
                        variant={badgeVariant}
                        className={`w-full min-w-0 ${badgeClassName} transition-all duration-300 hover:scale-105`}
                        onClick={e => e.stopPropagation()}
                        title={`${cmd.label}: ${displayValue}`}
                      >
                        <div className='flex flex-col items-center w-full min-w-0'>
                          <span className='text-xs text-gray-500 font-medium leading-none truncate max-w-full'>{cmd.label}</span>
                          <span className='text-xs font-bold leading-none mt-0.5 truncate max-w-full'>{displayValue}</span>
                        </div>
                      </Badge>
                    );
                  })}
                </div>
              )
            )}
          </CardContent>

          {/* 유닛 설정 다이얼로그 (명령이 있는 장비만, 피플카운터 제외) */}
          {canShowSettings && (deviceSpec?.commands?.length ?? 0) > 0 && !isPeopleCounter && (
            <Dialog
              open={isSelected}
              onOpenChange={open => {
                if (!open) {
                  onCancel();
                }
              }}
            >
              <DialogContent
                className='max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden border-gray-200/50 shadow-xl'
                onClick={e => e.stopPropagation()}
                showCloseButton={false}
              >
                {/* 헤더 */}
                <DialogHeader className='px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-primary/5 via-primary/5 to-transparent'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                      <div className='w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm'>
                        <Settings className='w-6 h-6 text-primary' />
                      </div>
                      <div>
                        <DialogTitle className='text-xl font-bold text-gray-900 flex items-center gap-2'>
                          {device.name || device.id}
                        </DialogTitle>
                        <DialogDescription className='text-sm text-gray-600 mt-1 flex items-center gap-2'>
                          <span className='font-medium'>{unit.name || unit.id}</span>
                          <span className='text-gray-400'>·</span>
                          <span>{deviceSpec?.deviceName || device.type}</span>
                        </DialogDescription>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                {/* 컨텐츠 영역 - 스크롤 가능 */}
                <div className='flex-1 overflow-y-auto px-6 py-6 min-h-0 custom-scrollbar'>
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
                    devices={devices}
                    deviceSpecs={deviceSpecs}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </Card>
      </div>

      {/* 리셋 확인 다이얼로그 */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>피플카운터 초기화</AlertDialogTitle>
            <AlertDialogDescription>
              {resetType ? getResetMessage(resetType) : '리셋하시겠습니까?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetConfirm} disabled={resetMutation.isPending}>
              {resetMutation.isPending ? '처리 중...' : '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
