import { Inbox, AlertCircle, Database } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'error' | 'data';
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, variant = 'default', action }: EmptyStateProps) {
  const getDefaultIcon = () => {
    switch (variant) {
      case 'error':
        return <AlertCircle className='h-12 w-12 text-red-400' />;
      case 'data':
        return <Database className='h-12 w-12 text-blue-400' />;
      default:
        return <Inbox className='h-12 w-12 text-gray-400' />;
    }
  };

  return (
    <div className='flex flex-col items-center justify-center py-12 px-4'>
      {icon || getDefaultIcon()}
      <h3 className='mt-4 text-lg font-medium text-gray-900'>{title}</h3>
      {description && <p className='mt-2 text-sm text-gray-500 text-center max-w-sm'>{description}</p>}
      {action && <div className='mt-6'>{action}</div>}
    </div>
  );
}
