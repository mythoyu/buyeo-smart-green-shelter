import * as React from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui';

interface TimeSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  interval?: 1 | 5 | 10 | 15 | 30; // 분 단위 (1분, 5분, 10분, 15분, 30분)
  className?: string;
}

/**
 * Select 기반 시간 선택기 컴포넌트 (시간과 분 분리)
 *
 * 24시간 형식(00:00~23:59)으로 시간을 선택할 수 있는 드롭다운 컴포넌트입니다.
 * 시간과 분을 분리하여 선택할 수 있으며, 1분 단위로 설정 가능합니다.
 */
export const TimeSelect: React.FC<TimeSelectProps> = ({
  value,
  onChange,
  disabled = false,
  interval = 1,
  className,
}) => {
  // 현재 선택된 시간과 분 파싱
  const [selectedHour, selectedMinute] = React.useMemo(() => {
    if (!value) return ['00', '00'];
    const [hour, minute] = value.split(':');
    return [hour || '00', minute || '00'];
  }, [value]);

  // 시간 옵션 생성 (0-23시)
  const hourOptions = React.useMemo(() => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      options.push(hour.toString().padStart(2, '0'));
    }
    return options;
  }, []);

  // 분 옵션 생성 (1분 단위)
  const minuteOptions = React.useMemo(() => {
    const options: string[] = [];
    for (let minute = 0; minute < 60; minute += interval) {
      options.push(minute.toString().padStart(2, '0'));
    }
    return options;
  }, [interval]);

  // 시간 변경 핸들러
  const handleHourChange = (newHour: string) => {
    if (onChange && !disabled) {
      const newTime = `${newHour}:${selectedMinute}`;
      onChange(newTime);
    }
  };

  // 분 변경 핸들러
  const handleMinuteChange = (newMinute: string) => {
    if (onChange && !disabled) {
      const newTime = `${selectedHour}:${newMinute}`;
      onChange(newTime);
    }
  };

  return (
    <div className={`w-full ${className || ''}`}>
      <div className='flex gap-2 pointer-events-auto'>
        {/* 시간 선택 */}
        <div className='flex-1'>
          <Select value={selectedHour} onValueChange={handleHourChange} disabled={disabled}>
            <SelectTrigger
              className={`w-full ${
                disabled
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:border-blue-300 focus:border-blue-500'
              } transition-all duration-300`}
            >
              <SelectValue placeholder='시' />
            </SelectTrigger>
            <SelectContent className='max-h-60'>
              {hourOptions.map(hour => (
                <SelectItem
                  key={hour}
                  value={hour}
                  className='flex items-center justify-between cursor-pointer hover:bg-blue-50'
                >
                  <span className='font-mono text-sm'>{hour}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 분 선택 */}
        <div className='flex-1'>
          <Select value={selectedMinute} onValueChange={handleMinuteChange} disabled={disabled}>
            <SelectTrigger
              className={`w-full ${
                disabled
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:border-blue-300 focus:border-blue-500'
              } transition-all duration-300`}
            >
              <SelectValue placeholder='분' />
            </SelectTrigger>
            <SelectContent className='max-h-60'>
              {minuteOptions.map(minute => (
                <SelectItem
                  key={minute}
                  value={minute}
                  className='flex items-center justify-between cursor-pointer hover:bg-blue-50'
                >
                  <span className='font-mono text-sm'>{minute}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 시간 간격 정보 표시 */}
    </div>
  );
};
