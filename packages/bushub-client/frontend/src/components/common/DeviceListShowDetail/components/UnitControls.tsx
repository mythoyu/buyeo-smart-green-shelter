import { Power, TimerIcon } from 'lucide-react';
import React from 'react';

import { Badge, Switch } from '../../../ui';

interface UnitControlsProps {
  powerEnabled: boolean;
  autoEnabled: boolean;
  powerValue: boolean;
  autoValue: boolean;
  isProcessing: boolean;
  onPowerChange: (checked: boolean) => void;
  onAutoChange: (checked: boolean) => void;
  statusVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  statusClassName?: string;
  statusIcon?: React.ReactNode;
}

export const UnitControls: React.FC<UnitControlsProps> = ({
  powerEnabled,
  autoEnabled,
  powerValue,
  autoValue,
  isProcessing,
  onPowerChange,
  onAutoChange,
  statusVariant,
  statusClassName,
  statusIcon,
}) => {
  return (
    <div className='flex items-center gap-2'>
      {powerEnabled && (
        <div
          className='flex items-center gap-1'
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={e => e.stopPropagation()}
          onMouseUp={e => e.stopPropagation()}
        >
          <Power className={`w-3 h-3 ${autoValue ? 'text-gray-300' : 'text-gray-400'}`} />
          <Switch
            checked={powerValue}
            onCheckedChange={onPowerChange}
            className='scale-75'
            disabled={isProcessing || autoValue}
          />
        </div>
      )}

      {autoEnabled && (
        <div
          className='flex items-center gap-1'
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={e => e.stopPropagation()}
          onMouseUp={e => e.stopPropagation()}
        >
          <TimerIcon className='w-3 h-3 text-gray-400' />
          <Switch checked={autoValue} onCheckedChange={onAutoChange} className='scale-75' disabled={isProcessing} />
        </div>
      )}

      {statusVariant && statusClassName && statusIcon && (
        <Badge
          className={`px-2 py-1 text-xs border transition-all duration-300 hover:scale-105 ${statusClassName}`}
          variant={statusVariant}
          onClick={e => e.stopPropagation()}
        >
          <div className='flex items-center gap-1'>{statusIcon}</div>
        </Badge>
      )}
    </div>
  );
};
