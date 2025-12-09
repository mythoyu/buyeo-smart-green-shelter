import { Filter } from 'lucide-react';
import React from 'react';

import { Card, CardContent } from '../ui';

interface UserManagementStatusCardProps {
  title: string;
  value: number;
  icon?: React.ReactNode;
  colorClass?: string;
  bgColorClass?: string;
  iconColorClass?: string;
  onClick?: () => void;
  isActive?: boolean;
  showFilter?: boolean;
}

export function UserManagementStatusCard({
  title,
  value,
  icon,
  colorClass = 'text-gray-900',
  bgColorClass = 'bg-gray-100',
  iconColorClass = 'text-gray-600',
  onClick,
  isActive = false,
  showFilter = false,
}: UserManagementStatusCardProps) {
  return (
    <Card
      className={`bg-white rounded-xl border shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
        isActive
          ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50 shadow-lg transform scale-105'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <CardContent className='p-6'>
        <div className='flex items-center justify-between'>
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <p className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>{title}</p>
              {showFilter && <Filter className={`h-3 w-3 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />}
              {isActive && <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></div>}
            </div>
            <p className={`text-2xl font-bold ${isActive ? 'text-blue-700' : colorClass}`}>{value}</p>
          </div>
          {icon && (
            <div
              className={`w-12 h-12 ${
                isActive ? 'bg-blue-100' : bgColorClass
              } rounded-lg flex items-center justify-center transition-colors duration-200`}
            >
              <div className={isActive ? 'text-blue-600' : iconColorClass}>{icon}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
