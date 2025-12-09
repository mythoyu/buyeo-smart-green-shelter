import React from 'react';

import { Avatar, Badge } from '../../../ui';

interface DeviceHeaderProps {
  deviceName: string;
  deviceIcon: React.ReactNode;
  deviceColor: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  badgeClassName: string;
  badgeIcon: React.ReactNode;
  badgeText: string;
}

export const DeviceHeader: React.FC<DeviceHeaderProps> = ({
  deviceName,
  deviceIcon,
  deviceColor,
  badgeVariant,
  badgeClassName,
  badgeIcon,
  badgeText,
}) => {
  return (
    <div className='flex items-center gap-3 mb-3 flex-shrink-0'>
      <Avatar className={`w-12 h-12 ${deviceColor} text-black border border-gray-300 flex items-center justify-center`}>
        {deviceIcon}
      </Avatar>
      <div className='flex-1 min-w-0'>
        <div className='font-semibold text-gray-900 text-lg truncate transition-colors duration-200'>{deviceName}</div>
      </div>
      <Badge
        className={`px-3 py-1 text-sm font-medium border transition-all duration-300 hover:scale-105 ${badgeClassName}`}
        variant={badgeVariant}
      >
        <div className='flex items-center gap-1'>
          {badgeIcon}
          <span>{badgeText}</span>
        </div>
      </Badge>
    </div>
  );
};
