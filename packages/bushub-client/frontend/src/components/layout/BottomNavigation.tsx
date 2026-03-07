import { ChevronLeft, ChevronRight, LayoutList } from 'lucide-react';
import React, { useState, useMemo, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';

export interface NavigationItem {
  name: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

interface BottomNavigationProps {
  navigation: NavigationItem[];
  rightSidebarContent?: ReactNode;
}

const VISIBLE_COUNT = 4;

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  navigation,
  rightSidebarContent,
}) => {
  const [startIndex, setStartIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActiveRoute = (href: string) => location.pathname === href;

  const currentItems = useMemo(() => {
    return navigation.slice(startIndex, startIndex + VISIBLE_COUNT);
  }, [navigation, startIndex]);

  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex + VISIBLE_COUNT < navigation.length;

  const handlePrev = () => {
    if (canGoPrev) setStartIndex(i => i - 1);
  };

  const handleNext = () => {
    if (canGoNext) setStartIndex(i => i + 1);
  };

  const handleNavigate = (href: string) => {
    navigate(href);
  };

  const hasRightSidebarContent = !!rightSidebarContent;

  return (
    <>
      <nav className='fixed bottom-0 left-0 right-0 h-16 z-50 bg-card border-t border-gray-200 dark:border-gray-700 flex items-center px-1 shadow-lg'>
        {/* 메뉴 슬라이더 영역 */}
        <div className='flex-1 flex items-center h-full'>
          {/* 이전 페이지 버튼 */}
          {canGoPrev ? (
            <Button
              variant='ghost'
              size='icon'
              onClick={handlePrev}
              className='h-12 w-8 shrink-0'
            >
              <ChevronLeft className='h-5 w-5' />
            </Button>
          ) : (
            <div className='w-8 shrink-0' />
          )}

          {/* 현재 페이지 메뉴들 */}
          <div className='flex-1 flex items-center justify-around'>
            {currentItems.map(item => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);
              return (
                <Button
                  key={item.href}
                  variant={isActive ? 'default' : 'ghost'}
                  onClick={() => handleNavigate(item.href)}
                  className={`h-14 w-14 flex flex-col gap-0.5 items-center justify-center rounded-lg p-1 ${
                    !isActive ? 'text-muted-foreground' : ''
                  }`}
                >
                  <Icon className={`h-5 w-5 ${!isActive ? 'text-muted-foreground' : ''}`} />
                  <span className={`text-[10px] text-center leading-tight whitespace-pre-line ${!isActive ? 'text-muted-foreground' : ''}`}>
                    {item.label.replace(/\\n/g, '\n')}
                  </span>
                </Button>
              );
            })}
          </div>

          {/* 다음 페이지 버튼 */}
          {canGoNext ? (
            <Button
              variant='ghost'
              size='icon'
              onClick={handleNext}
              className='h-12 w-8 shrink-0'
            >
              <ChevronRight className='h-5 w-5' />
            </Button>
          ) : (
            <div className='w-8 shrink-0' />
          )}
        </div>

        {/* 구분선 */}
        <div className='h-10 w-px bg-gray-300 dark:bg-gray-600 mx-1' />

        {/* 페이지 항목 버튼 */}
        <Button
          variant={sheetOpen ? 'default' : 'ghost'}
          onClick={() => setSheetOpen(true)}
          disabled={!hasRightSidebarContent}
          className={`h-14 w-14 flex flex-col gap-0.5 items-center justify-center rounded-lg p-1 shrink-0 ${
            !hasRightSidebarContent ? 'opacity-50' : ''
          }`}
        >
          <LayoutList className='h-5 w-5' />
          <span className='text-[10px] text-center leading-tight whitespace-pre-line'>
            {'페이지\n항목'}
          </span>
        </Button>
      </nav>

      {/* 바텀 시트 - 페이지 항목 (오른쪽 사이드바 내용) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side='bottom' className='h-auto max-h-[70vh] rounded-t-2xl'>
          <SheetHeader className='pb-4'>
            <SheetTitle className='text-center'>페이지 항목</SheetTitle>
          </SheetHeader>
          <div className='flex flex-wrap justify-center gap-2 pb-6'>
            {rightSidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

BottomNavigation.displayName = 'BottomNavigation';
