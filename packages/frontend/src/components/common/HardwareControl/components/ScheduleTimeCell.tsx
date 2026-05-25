import { Clipboard, Clock, Copy } from 'lucide-react';
import React, { useCallback } from 'react';
import { toast } from 'sonner';

import { Button } from '../../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: `${i.toString().padStart(2, '0')}시`,
}));

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => ({
  value: i.toString(),
  label: `${i.toString().padStart(2, '0')}분`,
}));

const TIME_PATTERN = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;

export interface ScheduleTimeValue {
  hour: number;
  minute: number;
}

interface ScheduleTimeCellProps {
  time: ScheduleTimeValue;
  disabled?: boolean;
  unsupported?: boolean;
  hourLoading?: boolean;
  minuteLoading?: boolean;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  /** 붙여넣기 시 시·분을 한 번에 API로 전송 (미지정 시 시·분 각각 onHourChange/onMinuteChange 호출) */
  onTimePaste?: (hour: number, minute: number) => Promise<void>;
}

const formatTime = (time: ScheduleTimeValue): string =>
  `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;

export const ScheduleTimeCell: React.FC<ScheduleTimeCellProps> = ({
  time,
  disabled = false,
  unsupported = false,
  hourLoading = false,
  minuteLoading = false,
  onHourChange,
  onMinuteChange,
  onTimePaste,
}) => {
  const handleCopy = useCallback(async () => {
    const text = formatTime(time);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      toast.error('복사에 실패했습니다.', { id: 'hw-do-schedule-copy-error' });
    }
  }, [time]);

  const handlePaste = useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      const match = TIME_PATTERN.exec(text);
      if (!match) {
        toast.error(`올바르지 않은 시간 형식입니다: ${text}`, { id: 'hw-do-schedule-paste-error' });
        return;
      }
      const hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      if (onTimePaste) {
        await onTimePaste(hour, minute);
      } else {
        onHourChange(hour);
        onMinuteChange(minute);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '붙여넣기에 실패했습니다.';
      toast.error(message, { id: 'hw-do-schedule-paste-error' });
    }
  }, [onHourChange, onMinuteChange, onTimePaste]);

  if (unsupported) {
    return (
      <div className='flex items-center justify-center gap-1 opacity-50'>
        <Clock className='h-3 w-3 text-muted-foreground' />
        <span className='text-sm text-muted-foreground'>미지원</span>
      </div>
    );
  }

  const cellDisabled = disabled || hourLoading || minuteLoading;

  return (
    <div className='flex items-center justify-center gap-1 flex-nowrap whitespace-nowrap'>
      <Clock className='h-3 w-3 text-muted-foreground shrink-0' />
      <Select
        value={time.hour.toString()}
        onValueChange={value => onHourChange(parseInt(value, 10))}
        disabled={cellDisabled}
      >
        <SelectTrigger className='h-8 w-[4.75rem] shrink-0 px-2 text-sm'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOUR_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className='text-muted-foreground shrink-0'>:</span>
      <Select
        value={time.minute.toString()}
        onValueChange={value => onMinuteChange(parseInt(value, 10))}
        disabled={cellDisabled}
      >
        <SelectTrigger className='h-8 w-[4.75rem] shrink-0 px-2 text-sm'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTE_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        disabled={cellDisabled}
        onClick={() => void handleCopy()}
        className='h-6 w-6 shrink-0 p-0'
        title='복사 (HH:mm)'
      >
        <Copy className='h-3 w-3' />
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        disabled={cellDisabled}
        onClick={() => void handlePaste()}
        className='h-6 w-6 shrink-0 p-0'
        title='붙여넣기 후 즉시 적용 (HH:mm)'
      >
        <Clipboard className='h-3 w-3' />
      </Button>
    </div>
  );
};
