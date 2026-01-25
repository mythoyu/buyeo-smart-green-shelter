import React from 'react';

import { Button } from '../ui/button';

export interface RightSidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
}

/**
 * 좌측 사이드바와 동일한 형태의 아이콘+텍스트 버튼
 */
export const RightSidebarItem: React.FC<RightSidebarItemProps> = ({
  icon: Icon,
  label,
  active = false,
  onClick,
  title,
  className = '',
}) => (
  <Button
    type='button'
    variant={active ? 'default' : 'ghost'}
    onClick={onClick}
    title={title ?? label.replace(/\n/g, ' ')}
    className={`text-sm font-medium duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 w-16 h-16 flex flex-col gap-1 items-center justify-center rounded-lg transition-colors ${
      !active ? 'text-muted-foreground' : ''
    } ${className}`}
  >
    {Icon != null && (
      <Icon className={`h-5 w-5 mb-0.5 ${!active ? 'text-muted-foreground' : ''}`} aria-hidden='true' />
    )}
    <span
      className={`text-xs text-center leading-tight whitespace-pre-line ${
        !active ? 'text-muted-foreground' : ''
      }`}
    >
      {label.replace(/\\n/g, '\n')}
    </span>
  </Button>
);
RightSidebarItem.displayName = 'RightSidebarItem';

interface RightSidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  isMobile?: boolean;
}

/**
 * 오른쪽 사이드바 - 좌측과 동일한 너비·형태, 숨김 없이 항상 표시
 */
export const RightSidebar: React.FC<RightSidebarProps> = ({
  isOpen = true,
  onToggle,
  children,
  isMobile = false,
}) => {
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            className='fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden'
            onClick={onToggle}
          />
        )}
        <div
          className={`
            fixed top-16 bottom-0 right-0 z-50 w-20 transform transition-all duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            bg-card border-l border-gray-200 shadow-lg
            flex flex-col
            lg:hidden
          `}
        >
          <nav className='flex-1 py-4 flex flex-col'>
            <div className='flex flex-col items-center gap-1 flex-1 overflow-auto'>
              {children ?? (
                <div className='w-16 h-16 flex flex-col items-center justify-center text-xs text-muted-foreground text-center' />
              )}
            </div>
          </nav>
        </div>
      </>
    );
  }

  // 데스크탑: 숨기지 않음, 항상 표시, 좌측과 동일 형태
  return (
    <div
      className='fixed top-16 bottom-0 right-0 z-50 w-20 bg-card border-l border-gray-200 shadow-lg flex flex-col max-lg:hidden'
    >
      <nav className='flex-1 py-4 flex flex-col'>
        <div className='flex flex-col items-center gap-1 flex-1 overflow-auto'>
          {children ?? (
            <div className='w-16 h-16 flex flex-col items-center justify-center text-xs text-muted-foreground text-center' />
          )}
        </div>
      </nav>
    </div>
  );
};
