import { Loader2, CheckCircle } from 'lucide-react';
import React from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface SnapshotApplyProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotName?: string | undefined;
}

export const SnapshotApplyProgressDialog: React.FC<SnapshotApplyProgressDialogProps> = ({
  isOpen,
  onClose,
  snapshotName,
}) => {
  // 간단한 로딩 상태만 표시
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // 2초 후 로딩 완료로 표시
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 간단한 상태 정보
  const getStatusInfo = () => {
    if (isLoading) {
      return {
        icon: <Loader2 className='w-6 h-6 animate-spin text-blue-500' />,
        title: '적용 중',
        description: '스냅샷을 적용하고 있습니다...',
        className: 'text-blue-600',
      };
    }
    return {
      icon: <CheckCircle className='w-6 h-6 text-green-500' />,
      title: '완료',
      description: '스냅샷이 성공적으로 적용되었습니다.',
      className: 'text-green-600',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            {statusInfo.icon}
            <span className={statusInfo.className}>{statusInfo.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* 스냅샷 이름 */}
          {snapshotName && (
            <div className='text-sm text-gray-600'>
              <span className='font-medium'>스냅샷:</span> {snapshotName}
            </div>
          )}

          {/* 간단한 진행률 표시 */}
          {isLoading && (
            <div className='space-y-2'>
              <div className='flex justify-between text-sm text-gray-600'>
                <span>진행률</span>
                <span>적용 중...</span>
              </div>
              <Progress value={50} className='w-full' />
            </div>
          )}

          {/* 상태 설명 */}
          <p className='text-sm text-gray-600'>{statusInfo.description}</p>

          {/* 완료 메시지 */}
          {!isLoading && (
            <div className='p-3 bg-green-50 border border-green-200 rounded-md'>
              <p className='text-sm text-green-600'>스냅샷이 성공적으로 적용되었습니다.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
