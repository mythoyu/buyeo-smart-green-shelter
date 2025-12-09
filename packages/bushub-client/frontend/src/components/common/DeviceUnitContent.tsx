import { Building } from 'lucide-react';
import React from 'react';

import { getDeviceTypeIcon, smartcityMetaHelpers } from '../../meta/smartcityMetaHelpers';
import { Card, Badge } from '../ui';

import { EmptyState } from './EmptyState';

interface DeviceUnitContentProps {
  selectedClient: any;
  getGroupedDevices: (client: any) => any[];
}

const DeviceUnitContent: React.FC<DeviceUnitContentProps> = ({ selectedClient, getGroupedDevices }) => {
  const groupedDevices = getGroupedDevices(selectedClient);

  if (groupedDevices.length === 0) {
    return (
      <EmptyState
        icon={<Building className='h-12 w-12 text-muted-foreground' />}
        title='장비/유닛 없음'
        description='이 현장에 등록된 장비/유닛이 없습니다.'
      />
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {groupedDevices.map((device: any) => (
        <Card
          key={device.deviceId}
          className='border-2 py-0 hover:border-primary/50 transition-colors min-w-0 border-gray-200 h-fit'
        >
          <div className='flex items-center gap-4 p-4'>
            <div
              className={`flex items-center justify-center w-16 h-16 rounded-lg flex-shrink-0 ${
                smartcityMetaHelpers.getDeviceStyle(device.deviceId)?.bgColor || 'bg-muted'
              }`}
            >
              {getDeviceTypeIcon(device.deviceType || 'default')}
            </div>
            <div className='flex flex-col items-start min-w-0 flex-1'>
              <h3 className='font-semibold text-lg truncate text-black'>{device.deviceName}</h3>
              <div className='flex flex-wrap gap-1 mt-1'>
                {device.units.map((unit: any) => (
                  <Badge key={unit.unitId} variant='secondary' className='text-xs border-gray-200'>
                    {unit.unitName}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default DeviceUnitContent;
