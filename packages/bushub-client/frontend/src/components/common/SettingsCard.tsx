import { LucideIcon } from 'lucide-react';
import React from 'react';

import { Button } from '../ui';

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  onApply?: () => void;
  onReset?: () => void;
  applyDisabled?: boolean;
  resetDisabled?: boolean;
  currentSettings?: React.ReactNode;
  isLoading?: boolean;
  applyButtonText?: string;
  applyExtra?: React.ReactNode;
  headerExtra?: React.ReactNode;
}

const SettingsCard: React.FC<SettingsCardProps> = ({
  icon: Icon,
  title,
  description,
  children,
  onApply,
  onReset,
  applyDisabled = false,
  resetDisabled = false,
  currentSettings,
  isLoading = false,
  applyButtonText = '적용',
  applyExtra,
  headerExtra,
}) => {
  return (
    <div className='p-6 space-y-4 border border-gray-200 rounded-lg'>
      {/* 카드 헤더 */}
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 bg-muted rounded-lg flex items-center justify-center'>
          <Icon className='h-5 w-5 text-primary' />
        </div>
        <div className='flex-1'>
          <h2 className='text-lg font-semibold'>{title}</h2>
          <p className='text-sm text-muted-foreground'>{description}</p>
        </div>
        {headerExtra && <div className='flex-shrink-0'>{headerExtra}</div>}
      </div>

      {/* 버튼 영역 */}
      {onApply && (
        <div className='flex gap-2 w-full'>
          {onReset ? (
            <>
              <Button variant='outline' className='flex-1' onClick={onReset} disabled={resetDisabled || isLoading}>
                복구
              </Button>
              <div className='flex gap-2 flex-1 items-center'>
                <Button className='flex-1' onClick={onApply} disabled={applyDisabled || isLoading}>
                  {isLoading ? '적용 중...' : applyButtonText}
                </Button>
                {applyExtra ? <div className='flex-shrink-0'>{applyExtra}</div> : null}
              </div>
            </>
          ) : (
            <Button className='w-full' onClick={onApply} disabled={applyDisabled || isLoading}>
              {isLoading ? '적용 중...' : applyButtonText}
            </Button>
          )}
        </div>
      )}

      {/* 현재 설정값 표시 */}
      {currentSettings && (
        <div className='text-xs text-muted-foreground p-2 bg-muted rounded-lg'>{currentSettings}</div>
      )}

      {/* 설정 내용 */}
      <div className='space-y-4'>{children}</div>
    </div>
  );
};

export default SettingsCard;
