import { Loader2, XCircle, Clock } from 'lucide-react';
import React from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Progress } from '../../ui/progress';

interface CommandProcessingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'waiting' | 'success' | 'fail';
  progress: { current: number; total: number };
  error?: string | null;
  deviceName?: string;
  unitName?: string;
  action?: string;
}

export const CommandProcessingDialog: React.FC<CommandProcessingDialogProps> = ({
  isOpen,
  onClose,
  status,
  progress,
  error,
  deviceName,
  unitName,
  action,
}) => {
  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  const getStatusInfo = () => {
    switch (status) {
      case 'waiting':
        return {
          icon: <Loader2 className='w-6 h-6 animate-spin text-blue-500' />,
          title: '명령 처리 중...',
          description: `${deviceName || '디바이스'}의 ${unitName || '유닛'}에 ${action || '명령'}을 실행하고 있습니다.`,
          className: 'text-blue-600',
        };
      case 'success':
        return {
          icon: <Loader2 className='w-6 h-6 text-green-500' />, // 스피너 유지, 색상만 변경
          title: '명령 처리 완료', // 제목 유지
          description: `${action || '명령'}이 성공적으로 실행되었습니다.`, // 설명만 변경
          className: 'text-green-600',
        };
      case 'fail':
        return {
          icon: <XCircle className='w-6 h-6 text-red-500' />,
          title: '명령 실행 실패',
          description: error || '명령 실행 중 오류가 발생했습니다.',
          className: 'text-red-600',
        };
      default:
        return {
          icon: <Clock className='w-6 h-6 text-gray-500' />,
          title: '알 수 없는 상태',
          description: '명령 상태를 확인할 수 없습니다.',
          className: 'text-gray-600',
        };
    }
  };

  const statusInfo = getStatusInfo();

  // 성공 시 500ms 후 자동으로 닫기
  React.useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined; // 명시적으로 undefined 반환
  }, [status, onClose]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        // 명령 처리 중(waiting)에는 외부 클릭으로 닫히지 않도록 방지
        if (!open && status === 'waiting') {
          return; // 외부 클릭 무시
        }
        onClose();
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            {statusInfo.icon}
            <span className={statusInfo.className}>{statusInfo.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* 진행률 표시 */}
          {(status === 'waiting' || status === 'success') && progress.total > 0 && (
            <div className='space-y-2'>
              <div className='flex justify-between text-sm text-gray-600'>
                <span>진행률</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <Progress value={progressPercentage} className='w-full' />
            </div>
          )}

          {/* 상태 설명 */}
          <p className='text-sm text-gray-600'>{statusInfo.description}</p>

          {/* 에러 메시지 */}
          {status === 'fail' && error && (
            <div className='p-3 bg-red-50 border border-red-200 rounded-md'>
              <p className='text-sm text-red-600'>{error}</p>
            </div>
          )}

          {/* 버튼 */}
          {/* <div className='flex justify-end gap-2'>
            {status === 'fail' && (
              <button
                onClick={onClose}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200'
              >
                닫기
              </button>
            )}
            {status === 'success' && (
              <button
                onClick={onClose}
                className='px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700'
              >
                확인
              </button>
            )}
          </div> */}
        </div>
      </DialogContent>
    </Dialog>
  );
};
