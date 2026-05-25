import * as React from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui';

interface TemperatureSelectProps {
  value?: number | string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
}

/**
 * 온도 선택기 컴포넌트
 *
 * 16°C~30°C 범위의 온도를 선택할 수 있는 드롭다운 컴포넌트입니다.
 * 0.5°C 단위로 온도를 설정할 수 있습니다.
 */
export const TemperatureSelect: React.FC<TemperatureSelectProps> = ({
  value,
  onChange,
  disabled = false,
  min = 16,
  max = 30,
  step = 0.5,
  unit = '°C',
  className,
}) => {
  // 현재 선택된 온도 파싱
  const selectedTemperature = React.useMemo(() => {
    if (!value) return '';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return numValue.toString();
  }, [value]);

  // 온도 옵션 생성
  const temperatureOptions = React.useMemo(() => {
    const options: string[] = [];
    for (let temp = min; temp <= max; temp += step) {
      // 소수점이 0인 경우 정수로 표시
      const tempStr = temp % 1 === 0 ? temp.toString() : temp.toFixed(1);
      options.push(tempStr);
    }
    return options;
  }, [min, max, step]);

  // 온도 변경 핸들러
  const handleTemperatureChange = (newTemp: string) => {
    if (onChange && !disabled) {
      onChange(newTemp);
    }
  };

  // 온도 표시 형식
  const formatTemperatureDisplay = (temp: string) => {
    const tempNum = parseFloat(temp);
    if (tempNum < 20) {
      return `냉방 ${temp}${unit}`;
    } else if (tempNum > 25) {
      return `난방 ${temp}${unit}`;
    } else {
      return `적정 ${temp}${unit}`;
    }
  };

  return (
    <div className={`w-full ${className || ''}`}>
      <Select value={selectedTemperature} onValueChange={handleTemperatureChange} disabled={disabled}>
        <SelectTrigger
          className={`w-full ${
            disabled
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'bg-white hover:border-blue-300 focus:border-blue-500'
          } transition-all duration-300`}
        >
          <SelectValue placeholder='온도 선택' />
        </SelectTrigger>
        <SelectContent className='max-h-60'>
          {temperatureOptions.map(temp => (
            <SelectItem
              key={temp}
              value={temp}
              className='flex items-center justify-between cursor-pointer hover:bg-blue-50'
            >
              <span className='font-mono text-sm'>
                {temp}
                {unit}
              </span>
              {/* <span className='text-xs text-gray-500 ml-2'>{formatTemperatureDisplay(temp)}</span> */}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
