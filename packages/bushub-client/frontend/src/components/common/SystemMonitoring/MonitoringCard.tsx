import { LucideIcon } from 'lucide-react';
import React from 'react';

import { cn } from '../../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface MonitoringCardProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const MonitoringCard: React.FC<MonitoringCardProps> = ({
  icon: Icon,
  title,
  subtitle,
  headerRight,
  children,
  footer,
  className,
}) => {
  return (
    <Card
      className={cn(
        'border border-gray-200 dark:border-gray-600 transition-colors duration-200 hover:border-blue-400 dark:hover:border-primary/50',
        className
      )}
    >
      <CardHeader className='flex items-start justify-between gap-3 pb-3'>
        <div className='flex items-center gap-2'>
          {Icon && (
            <div className='w-9 h-9 rounded-lg bg-muted flex items-center justify-center'>
              <Icon className='h-4 w-4 text-primary' />
            </div>
          )}
          <div className='flex flex-col'>
            <CardTitle className='text-sm font-semibold leading-tight'>{title}</CardTitle>
            {subtitle && <span className='mt-0.5 text-xs text-muted-foreground'>{subtitle}</span>}
          </div>
        </div>
        {headerRight && <div className='flex-shrink-0'>{headerRight}</div>}
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='space-y-3 text-sm'>{children}</div>
        {footer && (
          <div className='mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-muted-foreground'>
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

