import * as React from 'react';

import { Input } from '../ui/input';

interface TimePickerProps {
  value?: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
}

/**
 * @deprecated TimePicker는 더 이상 사용되지 않습니다.
 * 대신 TimeSelect 컴포넌트를 사용하세요.
 *
 * TimeSelect는 Select 기반으로 더 나은 UX를 제공합니다:
 * - 15분, 30분, 60분 단위 선택 가능
 * - 24시간 형식 + 12시간 형식 표시
 * - 키보드 네비게이션 지원
 * - 더 나은 접근성
 */
export function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const [time, setTime] = React.useState(value || '');

  React.useEffect(() => {
    setTime(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newTime = e.target.value;
    setTime(newTime);
    if (onChange) onChange(newTime);
  };

  return (
    <div className='flex flex-col gap-1 w-full'>
      <Input
        type='time'
        id='time-picker'
        step='60'
        value={time}
        onChange={handleChange}
        disabled={disabled}
        pattern='[0-9]{2}:[0-9]{2}'
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-gray-900 hover:border-blue-300 placeholder:text-xs ${
          disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'
        }`}
        style={
          {
            // 24시간 형식 강제
            '--tw-ring-color': 'rgb(59 130 246)',
            // 24시간 형식 강제를 위한 추가 스타일
            'text-align': 'center',
            'font-family': 'monospace',
          } as React.CSSProperties
        }
        // 24시간 형식 강제
        lang='en'
      />
    </div>
  );
}
