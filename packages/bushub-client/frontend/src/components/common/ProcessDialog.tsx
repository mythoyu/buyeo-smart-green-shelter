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
          icon: <Loader2 className='w-6 h-6 animate-spin text-blue-500' />,
          className: 'text-blue-600',
        };
      case 'completed':
        return {
          icon: <CheckCircle className='w-6 h-6 text-green-500' />,
          className: 'text-green-600',
        };
      case 'error':
        return {
          icon: <XCircle className='w-6 h-6 text-red-500' />,
          className: 'text-red-600',
        };
      default:
        return {
          icon: <Loader2 className='w-6 h-6 text-gray-500' />,
          className: 'text-gray-600',
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
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200'
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
            <div className='flex justify-between text-sm text-gray-600'>
              <span>진행률</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className='w-full' />
          </div>

          {/* 상태 설명 */}
          <p className='text-sm text-gray-600'>{description}</p>
        </div>

        {/* 액션 버튼 */}
        {renderActions()}
      </DialogContent>
    </Dialog>
  );
};
