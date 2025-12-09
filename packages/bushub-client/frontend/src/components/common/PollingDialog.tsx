import React, { useState, useEffect } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface PollingDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onAction: (action: 'redirect' | 'stop') => void;
  onClose: () => void;
}

export const PollingDialog: React.FC<PollingDialogProps> = ({ isOpen, title, message, onAction, onClose }) => {
  const [countdown, setCountdown] = useState(30);

  // 30초 타이머
  useEffect(() => {
    if (isOpen) {
      setCountdown(30);

      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            onAction('redirect');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
    return undefined;
  }, [isOpen]); // onAction 의존성 제거

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            <div className='w-3 h-3 bg-green-500 rounded-full animate-pulse'></div>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className='space-y-2'>
            <p>{message}</p>
            <p className='text-sm text-muted-foreground'>
              클라이언트 등록을 계속하거나 대시보드에서 실시간 모니터링을 확인할 수 있습니다.
            </p>
            <p className='text-sm font-semibold text-red-600'>{countdown}초 후 자동으로 대시보드로 이동합니다.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='flex-col sm:flex-row gap-2'>
          <AlertDialogAction onClick={() => onAction('redirect')} className='w-full sm:w-auto'>
            대시보드로 이동
          </AlertDialogAction>
          <AlertDialogAction onClick={() => onAction('stop')} className='w-full sm:w-auto'>
            폴링 중지
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
