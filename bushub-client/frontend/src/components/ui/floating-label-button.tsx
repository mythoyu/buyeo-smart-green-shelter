import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from './button';
import { Badge } from './badge';

export interface LabeledStatusButtonProps extends React.ComponentProps<typeof Button> {
  /** 테두리 위에 살짝 걸쳐지는 라벨 텍스트 */
  floatingLabel: string;
  /** 라벨 정렬 위치 */
  labelPosition?: 'left' | 'center' | 'right';
  /** 감싸는 래퍼(div)에 적용할 클래스 */
  wrapperClassName?: string;
  /** 버튼 우상단에 표시할 상태 텍스트 (예: ON/OFF, AUTO/MANUAL) */
  statusText?: string;
  /** 상태 배지에 적용할 추가 클래스 (예: 꺼짐/수동 시 회색·amber 등) */
  statusBadgeClassName?: string;
}

/**
 * 테두리 라벨 + 우상단 상태 배지를 함께 가진 버튼 컴포넌트
 *
 * - 내부는 shadcn Button을 그대로 사용
 * - 외부 래퍼에 absolute 라벨과 상태 배지를 올려 시각적 그룹을 형성
 */
export const LabeledStatusButton = React.forwardRef<HTMLButtonElement, LabeledStatusButtonProps>(
  ({ floatingLabel, labelPosition = 'left', wrapperClassName, className, statusText, statusBadgeClassName, ...buttonProps }, ref) => {
    return (
      <div className={cn('relative inline-flex items-center pr-3 pb-1', wrapperClassName)}>
        <Button ref={ref} {...buttonProps} className={cn('rounded-lg pr-6 text-xs font-medium', className)} />
        {statusText && (
          <Badge
            variant='default'
            className={cn('absolute top-0 right-0 translate-x-1/10 -translate-y-1/2 px-1 py-0 text-[10px] font-semibold shadow-sm', statusBadgeClassName)}
          >
            {statusText}
          </Badge>
        )}
      </div>
    );
  }
);

LabeledStatusButton.displayName = 'LabeledStatusButton';
