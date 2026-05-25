import React from 'react';

import { Button, Progress } from '../../ui';

import { QuickSettingsFooterProps } from './types';

export const QuickSettingsFooter: React.FC<QuickSettingsFooterProps> = ({
  unitCount,
  commandCount,
  isApplying,
  applyProgress,
  onCancel,
  onApply,
  disabled = false,
}) => {
  const progressPercent =
    applyProgress.total > 0 ? Math.round((applyProgress.current / applyProgress.total) * 100) : 0;

  return (
    <div className='space-y-3 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]'>
      {isApplying && applyProgress.total > 0 && (
        <div className='space-y-1'>
          <Progress value={progressPercent} className='h-2' />
          <p className='text-xs text-muted-foreground'>
            {applyProgress.current} / {applyProgress.total} 유닛 처리 중...
          </p>
        </div>
      )}

      <div className='flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-xs text-muted-foreground sm:text-sm'>
          {unitCount}유닛 · {commandCount}명령
        </p>
        <div className='flex flex-col-reverse gap-2 sm:flex-row'>
          <Button type='button' variant='outline' onClick={onCancel} disabled={isApplying || disabled}>
            취소
          </Button>
          <Button
            type='button'
            onClick={onApply}
            disabled={isApplying || disabled || unitCount === 0 || commandCount === 0}
          >
            {isApplying ? '적용 중...' : '일괄 적용'}
          </Button>
        </div>
      </div>
    </div>
  );
};

