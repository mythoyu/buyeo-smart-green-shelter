import React from 'react';

import { cn } from '../../lib/utils';
import { LoadingPanel } from './LoadingPanel';

interface PageSectionLoadingProps {
  message?: string;
  minHeightClass?: string;
  className?: string;
}

export function PageSectionLoading({
  message = '데이터를 불러오는 중입니다...',
  minHeightClass = 'min-h-[320px]',
  className,
}: PageSectionLoadingProps) {
  return (
    <div className={cn('p-6', className)}>
      <LoadingPanel isLoading text={message}>
        <div className={minHeightClass} />
      </LoadingPanel>
    </div>
  );
}

