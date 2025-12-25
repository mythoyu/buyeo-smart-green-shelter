import { Users, Check } from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { Button, Label, Popover, PopoverContent, PopoverTrigger, Checkbox, ScrollArea } from '../../ui';
import { TimeSelect } from '../TimeSelect';

import { CommandRenderer } from './CommandRenderer';
import { UnitSettingsProps } from './types';
import { getSettingsFormStyles, groupCommands } from './utils';

export const UnitSettings: React.FC<UnitSettingsProps> = ({
  unit,
  device,
  deviceSpec,
  unitForm,
  onFormChange,
  onSave,
  onCancel,
  bulkCommandsMutation,
  handleCopy,
  handlePaste,
  devices = [],
  deviceSpecs = {},
}) => {
  const styles = getSettingsFormStyles();
  const { timeCommands, otherCommands } = groupCommands(deviceSpec.commands);

  // auto 모드 활성화 상태 확인
  const isAutoEnabled = unitForm?.auto === true;

  // 필드별 선택된 유닛 관리 (필드 키 -> 선택된 유닛 키 Set)
  const [selectedUnitsByField, setSelectedUnitsByField] = useState<Record<string, Set<string>>>({});
  const [openPopoverField, setOpenPopoverField] = useState<string | null>(null);

  // 필드별 사용 가능한 다른 장비/유닛 목록 계산
  const getAvailableUnitsForField = useCallback(
    (fieldKey: string) => {
      console.log('🔍 getAvailableUnitsForField 시작:', {
        fieldKey,
        devicesCount: devices?.length || 0,
        deviceSpecsKeys: deviceSpecs ? Object.keys(deviceSpecs) : [],
        currentDeviceId: device.id,
        currentDeviceType: device.type,
      });

      if (!devices || devices.length === 0 || !deviceSpecs) {
        console.log('⚠️ getAvailableUnitsForField: devices 또는 deviceSpecs가 없음');
        return [];
      }

      // 타입에 관계없이 같은 필드를 지원하는 장비 필터링 (같은 장비 포함)
      const supportedDevices = devices.filter(d => {
        // 해당 필드를 지원하는 장비인지 확인
        const deviceSpec = deviceSpecs[d.type];
        const supportsField = deviceSpec?.commands?.some(cmd => cmd.key === fieldKey && cmd.set === true);

        return supportsField && d.units && d.units.length > 0;
      });

      // 각 장비의 유닛 수집 (현재 선택된 유닛은 제외)
      const availableUnits: Array<{
        deviceId: string;
        unitId: string;
        deviceName: string;
        unitName: string;
        deviceType: string;
        key: string;
      }> = [];

      supportedDevices.forEach(d => {
        if (d.units) {
          d.units.forEach(u => {
            // 현재 선택된 유닛은 제외 (같은 장비의 다른 유닛은 포함)
            if (d.id === device.id && u.id === unit.id) {
              return;
            }

            availableUnits.push({
              deviceId: d.id,
              unitId: u.id,
              deviceName: d.name || d.id,
              unitName: u.name || u.id,
              deviceType: d.type,
              key: `${d.id}_${u.id}`,
            });
          });
        }
      });

      console.log('✅ getAvailableUnitsForField 결과:', {
        fieldKey,
        availableUnitsCount: availableUnits.length,
        availableUnits: availableUnits.map(u => `${u.deviceName}/${u.unitName}`),
      });

      return availableUnits;
    },
    [devices, device, deviceSpecs]
  );

  // 필드별 선택된 유닛 토글
  const toggleUnitSelection = useCallback((fieldKey: string, unitKey: string) => {
    setSelectedUnitsByField(prev => {
      const currentSet = prev[fieldKey] || new Set<string>();
      const newSet = new Set(currentSet);

      if (newSet.has(unitKey)) {
        newSet.delete(unitKey);
      } else {
        newSet.add(unitKey);
      }

      return {
        ...prev,
        [fieldKey]: newSet,
      };
    });
  }, []);

  // 필드별 전체 선택/해제
  const toggleAllUnits = useCallback(
    (fieldKey: string) => {
      const availableUnits = getAvailableUnitsForField(fieldKey);
      const currentSet = selectedUnitsByField[fieldKey] || new Set<string>();
      const allSelected = availableUnits.every(u => currentSet.has(u.key));

      if (allSelected) {
        // 전체 해제
        setSelectedUnitsByField(prev => ({
          ...prev,
          [fieldKey]: new Set<string>(),
        }));
      } else {
        // 전체 선택
        setSelectedUnitsByField(prev => ({
          ...prev,
          [fieldKey]: new Set(availableUnits.map(u => u.key)),
        }));
      }
    },
    [getAvailableUnitsForField, selectedUnitsByField]
  );

  // 저장 핸들러 (선택된 유닛 목록 포함)
  const handleSaveWithSelection = useCallback(() => {
    // 현재 설정 중인 필드들의 선택된 유닛을 모두 수집
    const allSelectedUnits = new Set<string>();
    Object.values(selectedUnitsByField).forEach(set => {
      set.forEach(key => allSelectedUnits.add(key));
    });

    onSave(allSelectedUnits.size > 0 ? allSelectedUnits : undefined);
  }, [onSave, selectedUnitsByField]);

  // 장비 선택 Popover 렌더링
  const renderDeviceSelector = (fieldKey: string) => {
    const availableUnits = getAvailableUnitsForField(fieldKey);
    const selectedUnits = selectedUnitsByField[fieldKey] || new Set<string>();
    const isOpen = openPopoverField === fieldKey;

    // 사용 가능한 장비가 없어도 버튼은 표시 (비활성화 상태)
    // if (availableUnits.length === 0) return null;

    console.log('🔍 renderDeviceSelector:', {
      fieldKey,
      isOpen,
      isAutoEnabled,
      availableUnitsLength: availableUnits.length,
      disabled: isAutoEnabled || availableUnits.length === 0,
    });

    return (
      <Popover
        open={isOpen}
        onOpenChange={open => {
          console.log('🔍 Popover onOpenChange:', {
            fieldKey,
            open,
            isAutoEnabled,
            availableUnitsLength: availableUnits.length,
            willOpen: !isAutoEnabled && availableUnits.length > 0,
          });
          // disabled 상태일 때는 열리지 않도록 처리
          if (!isAutoEnabled && availableUnits.length > 0) {
            setOpenPopoverField(open ? fieldKey : null);
          } else if (open) {
            // 열려고 했지만 조건에 맞지 않으면 닫기
            setOpenPopoverField(null);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            disabled={isAutoEnabled || availableUnits.length === 0}
            className='h-5 px-2 text-xs hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-0'
            title={
              isAutoEnabled
                ? 'Auto 모드에서는 사용할 수 없습니다'
                : availableUnits.length === 0
                ? '같은 필드를 지원하는 다른 장비가 없습니다'
                : '다른 장비에도 적용'
            }
            onClick={e => {
              console.log('🔍 버튼 클릭:', {
                fieldKey,
                isAutoEnabled,
                availableUnitsLength: availableUnits.length,
                disabled: isAutoEnabled || availableUnits.length === 0,
                isOpen,
                currentOpenPopoverField: openPopoverField,
              });
              e.stopPropagation();
              // PopoverTrigger의 기본 동작을 방해하지 않도록 주의
              // PopoverTrigger가 자동으로 처리하지만, 수동으로도 열 수 있도록
              if (!isAutoEnabled && availableUnits.length > 0) {
                // 이미 열려있으면 닫기, 아니면 열기
                setOpenPopoverField(isOpen ? null : fieldKey);
              }
            }}
          >
            <Users className={`w-3 h-3 ${selectedUnits.size > 0 ? 'text-primary' : ''}`} />
          </Button>
        </PopoverTrigger>
        {availableUnits.length > 0 && (
          <PopoverContent
            className='w-80 p-0 border-gray-200/50 shadow-xl'
            align='start'
            onClick={e => e.stopPropagation()}
          >
            <div className='p-3 border-b border-gray-100'>
              <div className='flex items-center justify-between'>
                <h4 className='text-sm font-semibold'>다른 장비 선택</h4>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => toggleAllUnits(fieldKey)}
                  className='h-6 text-xs border-0 hover:bg-gray-100'
                >
                  {availableUnits.every(u => selectedUnits.has(u.key)) ? '전체 해제' : '전체 선택'}
                </Button>
              </div>
              <p className='text-xs text-gray-500 mt-1'>같은 필드를 지원하는 다른 장비에 동일한 설정을 적용합니다</p>
            </div>
            <ScrollArea className='h-[300px]'>
              <div className='p-2 space-y-1'>
                {availableUnits.map(unitItem => {
                  const isSelected = selectedUnits.has(unitItem.key);
                  return (
                    <div
                      key={unitItem.key}
                      className='flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer transition-colors'
                      onClick={() => toggleUnitSelection(fieldKey, unitItem.key)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleUnitSelection(fieldKey, unitItem.key)}
                      />
                      <div className='flex-1 min-w-0'>
                        <div className='text-sm font-medium truncate'>{unitItem.deviceName}</div>
                        <div className='text-xs text-gray-500 truncate'>
                          {unitItem.unitName} ({unitItem.deviceType})
                        </div>
                      </div>
                      {isSelected && <Check className='w-4 h-4 text-primary' />}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        )}
      </Popover>
    );
  };

  // 시간 설정 항목들
  const renderTimeSettings = () => {
    if (timeCommands.length === 0) return null;

    return (
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
        {timeCommands.map((cmd, index) => {
          const selectedCount = (selectedUnitsByField[cmd.key] || new Set<string>()).size;

          return (
            <div
              key={cmd.key}
              className='space-y-2 animate-fade-in'
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.3s ease-out forwards',
              }}
            >
              <Label
                className={`text-xs font-medium flex items-center justify-between ${
                  isAutoEnabled ? 'text-gray-400' : 'text-gray-700'
                }`}
              >
                <div className='flex items-center gap-2'>
                  <span>{cmd.label}</span>
                  {selectedCount > 0 && (
                    <span className='text-xs text-primary font-medium'>(+{selectedCount}개 장비)</span>
                  )}
                </div>
                <div className='flex gap-2 pointer-events-auto'>{renderDeviceSelector(cmd.key)}</div>
              </Label>
              <div className='pointer-events-auto'>
                <TimeSelect
                  value={String(unitForm[cmd.key] ?? '')}
                  onChange={isAutoEnabled ? () => {} : (val: string) => onFormChange(cmd.key, val)}
                  disabled={isAutoEnabled}
                  interval={1}
                  className='w-full'
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 나머지 설정 항목들
  const renderOtherSettings = () => {
    if (otherCommands.length === 0) return null;

    return (
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
        {otherCommands.map((cmd, index) => {
          // auto 명령어는 별도로 렌더링되므로 제외
          if (cmd.key === 'auto') return null;
          if (cmd.key === 'power') return null;

          // auto=true일 때 모든 설정 항목 비활성화 (power 제외하고는 이미 필터링됨)
          const isDisabled = isAutoEnabled;
          const animationDelay = (timeCommands?.length || 0) * 100 + index * 100;

          return (
            <CommandRenderer
              key={cmd.key}
              command={cmd}
              value={unitForm[cmd.key]}
              onChange={value => onFormChange(cmd.key, value)}
              disabled={isDisabled}
              index={index}
              animationDelay={animationDelay}
              handleCopy={handleCopy}
              handlePaste={handlePaste}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.container} style={{ animation: styles.animation }}>
      {/* 다이얼로그에서는 헤더가 DialogTitle로 분리되어 있으므로 여기서는 제거 */}

      {/* 대량 제어 상태 표시 */}
      {/* {renderBulkStatus()} */}

      <div className='space-y-6'>
        {/* 시간 설정 항목들 */}
        {timeCommands.length > 0 && (
          <div className='space-y-3'>
            <h3 className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
              <div className='w-1 h-4 bg-primary rounded-full' />
              시간 설정
            </h3>
            {renderTimeSettings()}
          </div>
        )}
        {/* 나머지 설정 항목들 */}
        {otherCommands.filter(cmd => cmd.key !== 'auto' && cmd.key !== 'power').length > 0 && (
          <div className='space-y-3'>
            <h3 className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
              <div className='w-1 h-4 bg-primary rounded-full' />
              기타 설정
            </h3>
            {renderOtherSettings()}
          </div>
        )}
      </div>

      {/* 설정 버튼 - 다이얼로그 스타일로 표시 */}
      <div className='flex gap-3 mt-6 pt-4 border-t border-gray-100'>
        <Button
          variant='outline'
          onClick={onCancel}
          className='flex-1 h-10 font-medium transition-all duration-200 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        >
          취소
        </Button>
        <Button
          onClick={handleSaveWithSelection}
          disabled={Boolean(bulkCommandsMutation?.isPending) || isAutoEnabled}
          className='flex-1 h-10 font-medium bg-primary hover:bg-primary/90 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
          title={isAutoEnabled ? 'Auto 모드에서는 설정을 변경할 수 없습니다' : ''}
        >
          {bulkCommandsMutation?.isPending ? (
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
              전송 중...
            </div>
          ) : isAutoEnabled ? (
            '비활성화됨'
          ) : (
            (() => {
              const totalSelected = Object.values(selectedUnitsByField).reduce((sum, set) => sum + set.size, 0);
              return totalSelected > 0 ? `저장 (+${totalSelected}개)` : '저장';
            })()
          )}
        </Button>
      </div>
    </div>
  );
};
