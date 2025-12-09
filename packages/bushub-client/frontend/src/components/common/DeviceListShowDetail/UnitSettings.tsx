import { Settings, Copy, Clipboard } from 'lucide-react';
import React from 'react';

import { Button, Label } from '../../ui';
import { TimeSelect } from '../TimeSelect';

import { CommandRenderer } from './CommandRenderer';
import { UnitSettingsProps } from './types';
import { getSettingsFormStyles, groupCommands } from './utils';

export const UnitSettings: React.FC<UnitSettingsProps> = ({
  unit,
  deviceSpec,
  unitForm,
  onFormChange,
  onSave,
  onCancel,
  bulkCommandsMutation,
  handleCopy,
  handlePaste,
}) => {
  const styles = getSettingsFormStyles();
  const unitLabel = unit.name || unit.id;
  const { timeCommands, otherCommands } = groupCommands(deviceSpec.commands);

  // auto 모드 활성화 상태 확인
  const isAutoEnabled = unitForm?.auto === true;

  // UnitSettings 디버깅
  console.log('🔍 UnitSettings 렌더링:', {
    unitId: unit.id,
    unitForm,
    isAutoEnabled,
    timeCommands: timeCommands.length,
    otherCommands: otherCommands.length,
  });

  // 시간 설정 항목들
  const renderTimeSettings = () => {
    if (timeCommands.length === 0) return null;

    return (
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
        {timeCommands.map((cmd, index) => (
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
              {cmd.label}
              {isAutoEnabled && <span className='text-xs text-gray-400 ml-2'>(Auto 모드에서 비활성화)</span>}
              <div className='flex gap-2 pointer-events-auto'>
                <div className='isolate'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => handleCopy(String(unitForm[cmd.key] ?? ''))}
                    className='h-5 w-5 p-0 hover:bg-gray-200 transition-all duration-200 hover:scale-110 active:scale-95'
                    title='복사'
                    disabled={isAutoEnabled}
                  >
                    <Copy className={`w-2.5 h-2.5 ${isAutoEnabled ? 'text-gray-300' : ''}`} />
                  </Button>
                </div>
                <div className='isolate'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => handlePaste(cmd.key)}
                    className='h-5 w-5 p-0 hover:bg-gray-200 transition-all duration-200 hover:scale-110 active:scale-95'
                    title='붙여넣기'
                    disabled={isAutoEnabled}
                  >
                    <Clipboard className={`w-2.5 h-2.5 ${isAutoEnabled ? 'text-gray-300' : ''}`} />
                  </Button>
                </div>
              </div>
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
        ))}
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
      <div className='text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2'>
        <Settings className='w-4 h-4 text-blue-600 animate-spin-slow' />
        {unitLabel} 설정
      </div>

      {/* 대량 제어 상태 표시 */}
      {/* {renderBulkStatus()} */}

      <div className='space-y-3'>
        {/* 시간 설정 항목들 */}
        {renderTimeSettings()}
        {/* 나머지 설정 항목들 */}
        {renderOtherSettings()}
      </div>

      {/* 설정 버튼 */}
      <div className='flex gap-2 mt-4'>
        <Button
          variant='outline'
          onClick={onCancel}
          className='flex-1 h-8 text-xs font-medium transition-all duration-200 hover:bg-gray-100 active:bg-gray-200'
        >
          취소
        </Button>
        <Button
          onClick={onSave}
          disabled={Boolean(bulkCommandsMutation?.isPending) || isAutoEnabled}
          className='flex-1 h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
          title={isAutoEnabled ? 'Auto 모드에서는 설정을 변경할 수 없습니다' : ''}
        >
          {bulkCommandsMutation?.isPending ? '전송 중...' : isAutoEnabled ? '비활성화됨' : '저장'}
        </Button>
      </div>
    </div>
  );
};
