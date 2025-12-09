import { AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react';

import { Button } from '../ui';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: 'default' | 'warning' | 'danger' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = 'default',
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  console.log('ConfirmDialog 렌더링:', { open, title, variant });

  if (!open) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className='h-6 w-6 text-red-600' />,
          iconBg: 'bg-red-100',
          confirmButton: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white',
          border: 'border-red-100',
          titleColor: 'text-red-900',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className='h-6 w-6 text-yellow-600' />,
          iconBg: 'bg-yellow-100',
          confirmButton:
            'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white',
          border: 'border-yellow-100',
          titleColor: 'text-yellow-900',
        };
      case 'info':
        return {
          icon: <Info className='h-6 w-6 text-blue-600' />,
          iconBg: 'bg-blue-100',
          confirmButton: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
          border: 'border-blue-100',
          titleColor: 'text-blue-900',
        };
      default:
        return {
          icon: <CheckCircle className='h-6 w-6 text-green-600' />,
          iconBg: 'bg-green-100',
          confirmButton:
            'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white',
          border: 'border-green-100',
          titleColor: 'text-green-900',
        };
    }
  };

  const styles = getVariantStyles();

  const handleConfirm = () => {
    console.log('ConfirmDialog 확인 버튼 클릭');
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    console.log('ConfirmDialog 취소 버튼 클릭');
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]'>
      <div className='w-full max-w-md mx-4'>
        <div
          className={`bg-white rounded-2xl p-8 shadow-2xl border ${styles.border} hover:shadow-3xl transition-all duration-300`}
        >
          <div className='flex flex-col items-center gap-2 mb-6'>
            <span className={`w-12 h-12 flex items-center justify-center ${styles.iconBg} rounded-full mb-2`}>
              {styles.icon}
            </span>
            <h3 className={`text-2xl font-bold ${styles.titleColor}`}>{title}</h3>
            {description && <p className='text-gray-600 text-sm mt-1 text-center'>{description}</p>}
          </div>

          <div className='flex space-x-3'>
            <Button
              variant='outline'
              onClick={handleCancel}
              className='flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-300 text-gray-700 font-medium'
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-white ${styles.confirmButton}`}
            >
              <div className='flex items-center justify-center'>
                {variant === 'danger' && <Trash2 className='h-5 w-5 mr-2' />}
                {variant === 'warning' && <AlertTriangle className='h-5 w-5 mr-2' />}
                {variant === 'info' && <Info className='h-5 w-5 mr-2' />}
                {variant === 'default' && <CheckCircle className='h-5 w-5 mr-2' />}
                <span>{confirmText}</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
