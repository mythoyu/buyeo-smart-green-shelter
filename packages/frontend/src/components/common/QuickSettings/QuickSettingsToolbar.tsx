import React from 'react';

import { Label } from '../../ui';
import { TimeSelect } from '../TimeSelect';

import { QuickSettingsScheduleBlockProps } from './types';

const TimeField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ label, value, onChange, disabled }) => (
  <div className='min-w-0 space-y-2'>
    <Label className='text-xs font-medium'>{label}</Label>
    <TimeSelect value={value} onChange={onChange} interval={1} className='w-full' disabled={disabled} />
  </div>
);

export const QuickSettingsScheduleBlock: React.FC<QuickSettingsScheduleBlockProps> = ({
  title,
  description,
  start1,
  end1,
  start2 = '18:00',
  end2 = '22:00',
  showSlot2 = false,
  onScheduleChange,
  disabled = false,
}) => (
  <div className='space-y-3 rounded-lg border border-border bg-muted/30 p-4'>
    <div>
      <p className='text-sm font-semibold'>{title}</p>
      <p className='text-xs text-muted-foreground'>{description}</p>
    </div>

    <div className='space-y-3'>
      <div>
        <p className='mb-2 text-xs font-medium text-muted-foreground'>1구간</p>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <TimeField
            label='시작시간'
            value={start1}
            onChange={(value) => onScheduleChange({ start1: value })}
            disabled={disabled}
          />
          <TimeField
            label='종료시간'
            value={end1}
            onChange={(value) => onScheduleChange({ end1: value })}
            disabled={disabled}
          />
        </div>
      </div>
      {showSlot2 && (
        <div>
          <p className='mb-2 text-xs font-medium text-muted-foreground'>2구간</p>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <TimeField
              label='시작시간'
              value={start2}
              onChange={(value) => onScheduleChange({ start2: value })}
              disabled={disabled}
            />
            <TimeField
              label='종료시간'
              value={end2}
              onChange={(value) => onScheduleChange({ end2: value })}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  </div>
);

