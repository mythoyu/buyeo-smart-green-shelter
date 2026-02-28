import { Copy, Clipboard } from 'lucide-react';
import React from 'react';

import { Button, Input, Label } from '../../ui';
import { TemperatureSelect } from '../TemperatureSelect';

import { CommandRendererProps } from './types';

export const CommandRenderer: React.FC<CommandRendererProps> = ({
  command,
  value,
  onChange,
  disabled = false,
  animationDelay,
  handleCopy,
  handlePaste,
}) => {
  // power 명령어가 auto 모드로 인해 비활성화된 경우 표시할 메시지
  const isPowerCommand = command.key === 'power';
  const showAutoModeMessage = isPowerCommand && disabled;
  const renderBooleanCommand = () => (
    <div className='flex gap-2'>
      <Button
        type='button'
        variant={value ? 'default' : 'outline'}
        size='sm'
        onClick={() => !disabled && onChange(true)}
        disabled={disabled}
        className={`flex-1 h-8 text-xs font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            : value
            ? 'bg-primary hover:bg-primary/90 text-white'
            : 'bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
        }`}
      >
        ON
      </Button>
      <Button
        type='button'
        variant={!value ? 'default' : 'outline'}
        size='sm'
        onClick={() => !disabled && onChange(false)}
        disabled={disabled}
        className={`flex-1 h-8 text-xs font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            : !value
            ? 'bg-gray-600 hover:bg-gray-700 text-white'
            : 'bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
        }`}
      >
        OFF
      </Button>
    </div>
  );

  const renderNumberInput = () => (
    <div
      className={`border border-gray-200 dark:border-gray-600 rounded-md transition-all duration-200 ${
        disabled ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-card'
      }`}
    >
      <Input
        value={value ?? ''}
        onChange={e => {
          if (!disabled) {
            if (command.type === 'int') {
              const intValue = parseInt(e.target.value, 10);
              onChange(isNaN(intValue) ? e.target.value : intValue);
            } else {
              const floatValue = parseFloat(e.target.value);
              onChange(isNaN(floatValue) ? e.target.value : floatValue);
            }
          }
        }}
        type='number'
        placeholder={command.label}
        disabled={disabled}
        className={`h-8 text-xs border-0 transition-all duration-200 ${
          disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-card'
        }`}
      />
    </div>
  );

  // 옵션 설명 매핑 함수 (command.optionLabels 활용)
  const getOptionLabel = (option: string | number | boolean) => {
    // 디버깅 로그 추가
    console.log('🔍 getOptionLabel 호출:', {
      option,
      commandKey: command.key,
      commandType: command.type,
      commandOptions: command.options,
      commandOptionLabels: command.optionLabels,
    });

    // command.optionLabels가 있으면 우선 사용
    if (command.optionLabels && command.optionLabels[String(option)]) {
      const result = `${option} - ${command.optionLabels[String(option)]}`;
      console.log('✅ command.optionLabels 사용:', result);
      return result;
    }

    // deviceSpecs.ts에서 모든 명령어에 optionLabels가 제공되므로 fallback 불필요

    console.log('❌ 매핑 없음, 원본 값 사용:', option);
    return String(option);
  };

  const renderSelectInput = () => {
    if (!Array.isArray(command.options) || command.options.length === 0) {
      return renderTextInput(); // options가 없으면 기본 Input
    }

    return (
      <div
        className={`border border-gray-200 dark:border-gray-600 rounded-md transition-all duration-200 ${
          disabled ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-card'
        }`}
      >
        <select
          value={value ?? ''}
          onChange={e => !disabled && onChange(e.target.value)}
          disabled={disabled}
          className={`h-8 text-xs border-0 w-full px-3 transition-all duration-200 ${
            disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-card'
          }`}
        >
          {command.options.map(option => (
            <option key={option} value={option}>
              {getOptionLabel(option)}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderTextInput = () => (
    <div
      className={`border border-gray-200 dark:border-gray-600 rounded-md transition-all duration-200 ${
        disabled ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-card'
      }`}
    >
      <Input
        value={value ?? ''}
        onChange={e => !disabled && onChange(e.target.value)}
        placeholder={command.label}
        disabled={disabled}
        className={`h-8 text-xs border-0 transition-all duration-200 ${
          disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-card'
        }`}
      />
    </div>
  );

  const renderTemperatureInput = () => {
    // 온도 관련 명령어 확인
    const isTemperatureCommand = command.key.includes('temp') || command.key.includes('_temp');

    if (isTemperatureCommand) {
      return (
        <TemperatureSelect
          value={value}
          onChange={val => onChange(parseFloat(val))}
          disabled={disabled}
          min={command.min || 16}
          max={command.max || 30}
          step={0.5}
          unit={command.unit || '°C'}
          className='w-full'
        />
      );
    }

    return null;
  };

  const renderCommandInput = () => {
    console.log('🔍 renderCommandInput 호출:', {
      commandKey: command.key,
      commandType: command.type,
      hasOptions: Array.isArray(command.options),
      optionsLength: command.options?.length,
      options: command.options,
      optionLabels: command.optionLabels,
    });

    // 1순위: 온도 관련 명령어인 경우 TemperatureSelect 사용
    const temperatureInput = renderTemperatureInput();
    if (temperatureInput) {
      console.log('✅ TemperatureSelect 렌더링 선택 (온도 명령어)');
      return temperatureInput;
    }

    // 2순위: options가 있는 경우 Select 사용 (타입 무관)
    if (Array.isArray(command.options) && command.options.length > 0) {
      console.log('✅ Select 렌더링 선택 (options 있음)');
      return renderSelectInput();
    }

    console.log('❌ Select 조건 불만족, 기존 로직 사용');
    // 3순위: 기존 로직 사용
    switch (command.type) {
      case 'boolean':
        return renderBooleanCommand();
      case 'int':
      case 'float':
        return renderNumberInput();
      default:
        return renderTextInput();
    }
  };

  // power 명령어가 auto 모드로 인해 비활성화된 경우 메시지 표시
  const renderAutoModeMessage = () => {
    if (!showAutoModeMessage) return null;

    return (
      <div className='mt-1.5 p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-md'>
        <div className='flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300'>
          <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
          <span className='font-medium'>자동모드에서 비활성화</span>
        </div>
        <div className='text-xs text-blue-600 dark:text-blue-400 mt-1'>
          자동 모드에서는 스케줄에 따라 장비가 제어되므로 수동 전원 제어가 불가능합니다.
        </div>
      </div>
    );
  };

  return (
    <div
      className={`space-y-1.5 animate-fade-in ${disabled ? 'opacity-50' : ''}`}
      style={{
        animationDelay: `${animationDelay}ms`,
        animation: 'fadeInUp 0.3s ease-out forwards',
      }}
    >
      <Label className='text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          {command.label}
          {disabled && (
            <span className='text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950/40 px-1.5 py-0.5 rounded-full'>비활성화</span>
          )}
        </div>
        {command.unit && <span className='text-xs text-gray-500 dark:text-gray-400'>({command.unit})</span>}
      </Label>

      {renderCommandInput()}

      {/* Auto 모드 메시지 */}
      {renderAutoModeMessage()}

      {/* 복사/붙여넣기 버튼 (시간 관련 명령어에만) */}
      {command.key.includes('time') && handleCopy && handlePaste && (
        <div className='flex gap-1 justify-end'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => handleCopy(value || '')}
            className='h-5 w-5 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 active:scale-95'
            title='복사'
          >
            <Copy className='w-2.5 h-2.5' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => handlePaste(command.key)}
            className='h-5 w-5 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 active:scale-95'
            title='붙여넣기'
          >
            <Clipboard className='w-2.5 h-2.5' />
          </Button>
        </div>
      )}
    </div>
  );
};
