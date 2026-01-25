import { CalendarIcon } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

function formatDateForInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateFromValue(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export interface DatePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  value,
  onChange,
  placeholder = '날짜 선택',
  className,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseDateFromValue(value), [value]);

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      onChange(formatDateForInput(date));
      setOpen(false);
    },
    [onChange]
  );

  const display = value || '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          disabled={disabled}
          className={cn(
            'w-36 h-9 justify-start text-left font-normal text-sm border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
            !display && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className='mr-2 h-4 w-4' />
          {display || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar mode='single' selected={selected} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
};
