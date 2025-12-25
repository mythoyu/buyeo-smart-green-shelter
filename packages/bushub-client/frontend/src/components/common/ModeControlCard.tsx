import { CheckSquare2, Hand, TimerIcon, Power } from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

import { getDeviceTypeIcon } from '../../meta/smartcityMetaHelpers';
import { useSendUnitBulkCommands } from '../../api/queries/device';
import { Device, DeviceSpec } from '../DeviceListShowDetail/types';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import { DeviceStyle } from '../DeviceListShowDetail/types';

interface ModeControlCardProps {
  className?: string;
  devices?: Device[];
  deviceSpecs?: Record<string, DeviceSpec>;
  deviceStyles?: Record<string, DeviceStyle>;
  onFormChange?: (key: string, value: any, deviceId?: string, unitId?: string) => void;
}

// 유닛 ID를 label로 변환하는 함수
const formatUnitLabel = (unitId: string) => {
  if (!unitId) return 'Unknown';

  // u001 형태의 ID를 "유닛 1" 형태로 변환
  if (unitId.startsWith('u') && /^\d+$/.test(unitId.slice(1))) {
    const number = parseInt(unitId.slice(1));
    return `유닛 ${number}`;
  }

  // 기타 형태는 그대로 반환
  return unitId;
};

const ModeControlCard = React.forwardRef<HTMLDivElement, ModeControlCardProps>(
  ({ className, devices = [], deviceSpecs = {}, deviceStyles = {}, onFormChange }, ref) => {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedUnitKeys, setSelectedUnitKeys] = useState<Set<string>>(new Set());

    const sendCommandMutation = useSendUnitBulkCommands();

    // auto 명령어를 지원하는 유닛 목록 (장비별이 아닌 유닛별)
    const supportedUnits = useMemo(() => {
      const units: Array<{ device: Device; unit: any; unitKey: string }> = [];

      devices.forEach(device => {
        if (!device.units || device.units.length === 0) return;

        const deviceSpec = deviceSpecs[device.type];
        if (!deviceSpec) return;

        const autoCommand = deviceSpec.commands?.find(cmd => cmd.key === 'auto' && cmd.set === true);
        if (!autoCommand || !autoCommand.action?.set) return;

        device.units.forEach(unit => {
          units.push({
            device,
            unit,
            unitKey: `${device.id}_${unit.id}`,
          });
        });
      });

      return units;
    }, [devices, deviceSpecs]);

    // 유닛 선택/해제 토글
    const toggleUnitSelection = useCallback((unitKey: string) => {
      setSelectedUnitKeys(prev => {
        const newSet = new Set(prev);
        if (newSet.has(unitKey)) {
          newSet.delete(unitKey);
        } else {
          newSet.add(unitKey);
        }
        return newSet;
      });
    }, []);

    // 전체 선택/해제
    const toggleAllUnits = useCallback(() => {
      if (selectedUnitKeys.size === supportedUnits.length) {
        setSelectedUnitKeys(new Set());
      } else {
        setSelectedUnitKeys(new Set(supportedUnits.map(u => u.unitKey)));
      }
    }, [selectedUnitKeys.size, supportedUnits]);

    // 선택된 유닛 목록
    const selectedUnits = useMemo(() => {
      return supportedUnits.filter(u => selectedUnitKeys.has(u.unitKey));
    }, [supportedUnits, selectedUnitKeys]);

    // Mode Switch 핸들러
    const handleModeChange = async (isAutoMode: boolean) => {
      if (selectedUnits.length === 0) {
        toast.error('변경할 유닛을 선택해주세요');
        return;
      }

      if (!deviceSpecs || Object.keys(deviceSpecs).length === 0) {
        toast.error('장비 스펙 정보가 없습니다');
        return;
      }

      setIsLoading(true);

      try {
        // 선택된 유닛들에 대해 auto 모드 변경 명령 실행
        const commandPromises: Promise<{ success: boolean; deviceId: string; unitId: string }>[] = [];

        selectedUnits.forEach(({ device, unit }) => {
          const deviceSpec = deviceSpecs[device.type];
          if (!deviceSpec) return;

          // auto 명령어 찾기
          const autoCommand = deviceSpec.commands?.find(cmd => cmd.key === 'auto' && cmd.set === true);
          if (!autoCommand || !autoCommand.action?.set) return;

          // 즉시 UI 업데이트 (UnitCard의 handleDirectAutoChange와 동일한 방식)
          onFormChange?.('auto', isAutoMode, device.id, unit.id);

          const promise = sendCommandMutation
            .mutateAsync({
              deviceId: device.id,
              unitId: unit.id,
              commands: [
                {
                  action: autoCommand.action.set,
                  value: isAutoMode,
                },
              ],
            })
            .then(() => ({ success: true, deviceId: device.id, unitId: unit.id }))
            .catch(error => {
              console.error(`❌ 유닛 모드 변경 실패: ${device.id}/${unit.id}`, error);
              return { success: false, deviceId: device.id, unitId: unit.id };
            });

          commandPromises.push(promise);
        });

        const results = await Promise.allSettled(commandPromises);

        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failCount = results.length - successCount;

        if (failCount === 0) {
          toast.success(`${isAutoMode ? '자동' : '수동'} 모드가 활성화되었습니다 (${successCount}개 유닛)`);
        } else {
          toast.warning(`${isAutoMode ? '자동' : '수동'} 모드 변경 완료: ${successCount}개 성공, ${failCount}개 실패`);
        }
      } catch (error) {
        console.error('모드 변경 실패:', error);
        toast.error('모드 변경에 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    };

    // Power Switch 핸들러
    const handlePowerChange = async (isPowerOn: boolean) => {
      if (selectedUnits.length === 0) {
        toast.error('변경할 유닛을 선택해주세요');
        return;
      }

      if (!deviceSpecs || Object.keys(deviceSpecs).length === 0) {
        toast.error('장비 스펙 정보가 없습니다');
        return;
      }

      setIsLoading(true);

      try {
        // 선택된 유닛들에 대해 power 변경 명령 실행
        const commandPromises: Promise<{ success: boolean; deviceId: string; unitId: string }>[] = [];

        selectedUnits.forEach(({ device, unit }) => {
          const deviceSpec = deviceSpecs[device.type];
          if (!deviceSpec) return;

          // power 명령어 찾기
          const powerCommand = deviceSpec.commands?.find(cmd => cmd.key === 'power' && cmd.set === true);
          if (!powerCommand || !powerCommand.action?.set) return;

          // 즉시 UI 업데이트 (UnitCard의 handleDirectPowerChange와 동일한 방식)
          onFormChange?.('power', isPowerOn, device.id, unit.id);

          const promise = sendCommandMutation
            .mutateAsync({
              deviceId: device.id,
              unitId: unit.id,
              commands: [
                {
                  action: powerCommand.action.set,
                  value: isPowerOn,
                },
              ],
            })
            .then(() => ({ success: true, deviceId: device.id, unitId: unit.id }))
            .catch(error => {
              console.error(`❌ 유닛 전원 변경 실패: ${device.id}/${unit.id}`, error);
              return { success: false, deviceId: device.id, unitId: unit.id };
            });

          commandPromises.push(promise);
        });

        const results = await Promise.allSettled(commandPromises);

        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failCount = results.length - successCount;

        if (failCount === 0) {
          toast.success(`전원 ${isPowerOn ? 'ON' : 'OFF'} 처리 완료 (${successCount}개 유닛)`);
        } else {
          toast.warning(`전원 ${isPowerOn ? 'ON' : 'OFF'} 변경 완료: ${successCount}개 성공, ${failCount}개 실패`);
        }
      } catch (error) {
        console.error('전원 변경 실패:', error);
        toast.error('전원 변경에 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    };

    const selectedUnitsCount = selectedUnits.length;
    const allSelected = supportedUnits.length > 0 && selectedUnitKeys.size === supportedUnits.length;

    return (
      <Card ref={ref} className={className}>
        <CardContent className='space-y-4'>
          {/* 컨트롤 버튼 그룹 */}
          <div className='flex items-center gap-4'>
            {/* 자동/수동 모드 버튼 */}
            <div className='grid grid-cols-2 gap-4 flex-1'>
              <Button
                variant='outline'
                size='default'
                onClick={() => handleModeChange(false)}
                disabled={isLoading || selectedUnitKeys.size === 0 || selectedUnitsCount === 0}
                className='w-full h-12 border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-primary font-medium text-sm'
              >
                <div className='flex items-center gap-2'>
                  <Hand className='w-4 h-4' />
                  <span>{isLoading ? '변경 중...' : '수동모드'}</span>
                </div>
              </Button>
              <Button
                variant='outline'
                size='default'
                onClick={() => handleModeChange(true)}
                disabled={isLoading || selectedUnitKeys.size === 0 || selectedUnitsCount === 0}
                className='w-full h-12 border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-primary font-medium text-sm'
              >
                <div className='flex items-center gap-2'>
                  <TimerIcon className='w-4 h-4' />
                  <span>{isLoading ? '변경 중...' : '자동모드'}</span>
                </div>
              </Button>
            </div>

            {/* 세로 구분선 */}
            <Separator orientation='vertical' className='h-12' />

            {/* 전원 ON/OFF 버튼 */}
            <div className='grid grid-cols-2 gap-4 flex-1'>
              <Button
                variant='outline'
                size='default'
                onClick={() => handlePowerChange(false)}
                disabled={isLoading || selectedUnitKeys.size === 0 || selectedUnitsCount === 0}
                className='w-full h-12 border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-primary font-medium text-sm'
              >
                <div className='flex items-center gap-2'>
                  <Power className='w-4 h-4' />
                  <span>{isLoading ? '변경 중...' : '전원 OFF'}</span>
                </div>
              </Button>
              <Button
                variant='outline'
                size='default'
                onClick={() => handlePowerChange(true)}
                disabled={isLoading || selectedUnitKeys.size === 0 || selectedUnitsCount === 0}
                className='w-full h-12 border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-primary font-medium text-sm'
              >
                <div className='flex items-center gap-2'>
                  <Power className='w-4 h-4' />
                  <span>{isLoading ? '변경 중...' : '전원 ON'}</span>
                </div>
              </Button>
            </div>
          </div>

          {/* 자동/수동 모드 버튼과 유닛 선택 사이 구분선 */}
          <Separator orientation='horizontal' />

          {/* 유닛 선택 섹션 */}
          <div className='space-y-3'>
            {/* 유닛 목록 (전체 선택 + Checkbox + Badge) */}
            {supportedUnits.length === 0 ? (
              <p className='text-xs text-muted-foreground text-center py-4'>auto 명령어를 지원하는 유닛이 없습니다</p>
            ) : (
              <div className='flex flex-wrap gap-2'>
                {/* 전체 선택 항목 - 가장 앞에 위치 */}
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors cursor-pointer ${
                    allSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/50 hover:border-primary/50 hover:bg-muted'
                  }`}
                  onClick={toggleAllUnits}
                >
                  <Checkbox checked={allSelected} onCheckedChange={toggleAllUnits} onClick={e => e.stopPropagation()} />
                  <div className='flex items-center gap-2'>
                    <div className='flex items-center justify-center w-6 h-6 rounded bg-muted [&>svg]:w-full [&>svg]:h-full text-gray-600'>
                      <CheckSquare2 className='w-full h-full' />
                    </div>
                    <span className='text-xs text-muted-foreground font-medium'>
                      {allSelected ? '전체 해제' : '전체 선택'}
                    </span>
                  </div>
                </div>
                {/* 전체 선택 항목과 유닛 항목 사이 구분선 */}
                {supportedUnits.length > 0 && (
                  <Separator orientation='vertical' className='!h-8 self-center data-[orientation=vertical]:!h-8' />
                )}

                {supportedUnits.map(({ device, unit, unitKey }, index) => {
                  const isSelected = selectedUnitKeys.has(unitKey);
                  const deviceStyle = deviceStyles[device.type];
                  const deviceIcon = getDeviceTypeIcon(device.type);
                  const unitLabel = formatUnitLabel(unit.id);
                  const unitName = unit.name || unitLabel;
                  const bgColor = deviceStyle?.bgColor || 'bg-muted';

                  return (
                    <React.Fragment key={unitKey}>
                      {index > 0 && (
                        <Separator
                          orientation='vertical'
                          className='!h-8 self-center data-[orientation=vertical]:!h-8'
                        />
                      )}
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : `border-border ${bgColor} hover:border-primary/50`
                        }`}
                        onClick={() => toggleUnitSelection(unitKey)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleUnitSelection(unitKey)}
                          onClick={e => e.stopPropagation()}
                        />
                        <div className='flex items-center gap-2'>
                          <div
                            className={`flex items-center justify-center w-6 h-6 rounded [&>svg]:w-full [&>svg]:h-full text-gray-600 ${bgColor}`}
                          >
                            {deviceIcon}
                          </div>
                          <span className='text-xs text-muted-foreground'>{unitName}</span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

ModeControlCard.displayName = 'ModeControlCard';

export default ModeControlCard;
