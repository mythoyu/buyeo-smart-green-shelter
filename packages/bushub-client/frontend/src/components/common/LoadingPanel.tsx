import { Loader2, Circle, CheckCircle2 } from 'lucide-react';
import React from 'react';

import { cn } from '../../lib/utils';

export type LoadingVariant = 'spinner' | 'dots' | 'pulse' | 'success';

interface LoadingPanelProps {
  isLoading?: boolean;
  isSuccess?: boolean;
  text?: string;
  successText?: string;
  variant?: LoadingVariant;
  fullScreen?: boolean;
  backdropBlur?: boolean;
  className?: string;
  size?: number;
  children?: React.ReactNode;
}

export function LoadingPanel({
  isLoading = false,
  isSuccess = false,
  text = '로딩중...',
  successText = '완료되었습니다!',
  variant = 'spinner',
  fullScreen = false,
  backdropBlur = true,
  className,
  size = 36,
  children,
}: LoadingPanelProps) {
  if (!isLoading && !isSuccess) {
    return <>{children}</>;
  }

  const renderLoadingContent = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className='flex space-x-1'>
            {[0, 1, 2].map(i => (
              <Circle
                key={i}
                className={cn('animate-bounce text-blue-500', `opacity-${60 + i * 20}`)}
                size={size / 2}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1.2s',
                }}
              />
            ))}
          </div>
        );
      case 'pulse':
        return (
          <div className='relative flex items-center justify-center'>
            <div className='w-8 h-8 bg-blue-400 rounded-full animate-pulse opacity-70' />
            <div className='absolute w-8 h-8 bg-blue-300 rounded-full animate-ping opacity-40' />
          </div>
        );
      case 'success':
        return (
          <div className='flex items-center justify-center'>
            {isSuccess ? (
              <CheckCircle2 className='text-green-500 animate-bounce' size={size} />
            ) : (
              <Loader2 className='animate-spin text-blue-500' size={size} />
            )}
          </div>
        );
      default:
        return <Loader2 className='animate-spin text-blue-500' size={size} />;
    }
  };

  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-6 bg-white/95 dark:bg-gray-900/95 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
        backdropBlur && 'backdrop-blur-sm',
        className
      )}
    >
      {renderLoadingContent()}
      <p className='text-sm font-medium text-gray-700 dark:text-gray-300 text-center'>
        {isSuccess && variant === 'success' ? successText : text}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/40',
          backdropBlur && 'backdrop-blur-sm'
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <div className='relative'>
      {children}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80',
          backdropBlur && 'backdrop-blur-sm'
        )}
      >
        {content}
      </div>
    </div>
  );
}

// 간단한 스피너 (기존 LoadingSpinner 대체)
export function SimpleLoadingSpinner({
  size = 24,
  className = '',
  text = '로딩중...',
}: {
  size?: number;
  className?: string;
  text?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className='animate-spin text-blue-500' size={size} />
      {text && <p className='text-sm text-gray-600 dark:text-gray-400'>{text}</p>}
    </div>
  );
}

// 전체 페이지 로딩
export function PageLoading({
  text = '페이지를 불러오는 중...',
  variant = 'spinner',
}: {
  text?: string;
  variant?: LoadingVariant;
}) {
  return <LoadingPanel isLoading={true} text={text} variant={variant} fullScreen={true} className='min-h-[200px]' />;
}

// 버튼용 로딩
export function ButtonLoading({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className='animate-spin' size={size} />
      <span>처리중...</span>
    </div>
  );
}
