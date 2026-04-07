import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import React from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Progress } from '../ui/progress';

interface ProcessDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  progress: number; // 0-100
  status: 'processing' | 'completed' | 'error';
  onClose?: () => void; // 추가
}

export const ProcessDialog: React.FC<ProcessDialogProps> = ({
  isOpen,
  title,
  description,
  progress,
  status,
  onClose,
}) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'processing':
        return {
          icon: <Loader2 className='w-6 h-6 animate-spin text-blue-500 dark:text-blue-400' />,
          className: 'text-blue-600 dark:text-blue-400',
        };
      case 'completed':
        return {
          icon: <CheckCircle className='w-6 h-6 text-green-500 dark:text-green-400' />,
          className: 'text-green-600 dark:text-green-400',
        };
      case 'error':
        return {
          icon: <XCircle className='w-6 h-6 text-red-500 dark:text-red-400' />,
          className: 'text-red-600 dark:text-red-400',
        };
      default:
        return {
          icon: <Loader2 className='w-6 h-6 text-gray-500 dark:text-gray-400' />,
          className: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  const statusInfo = getStatusInfo();

  // 에러 상태일 때 수동 닫기 버튼 추가
  const renderActions = () => {
    if (status === 'error') {
      return (
        <div className='flex justify-end mt-4'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600'
          >
            닫기
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            {statusInfo.icon}
            <span className={statusInfo.className}>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* 진행률 바 */}
          <div className='space-y-2'>
            <div className='flex justify-between text-sm text-gray-600 dark:text-gray-400'>
              <span>진행률</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className='w-full' />
          </div>

          {/* 상태 설명 */}
          <p className='text-sm text-gray-600 dark:text-gray-400'>{description}</p>
        </div>

        {/* 액션 버튼 */}
        {renderActions()}
      </DialogContent>
    </Dialog>
  );
};
