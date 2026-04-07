import { BarChart3 } from 'lucide-react';
import React, { useMemo } from 'react';

import type { DeviceInfoDto } from '../../api/dto/Client.dto';

// import { STATUS_OPTIONS } from '../../constants/statusOptions';
import { useApi } from '../../hooks/useApi';
import { Card, CardContent } from '../ui';

// import { FilterBar } from './FilterBar';

interface DeviceTypeOption {
  type: string;
  label: string;
  icon?: React.ReactNode;
  colorClass?: string;
  count?: number;
}

// DeviceWithStatus는 DeviceInfoDto를 확장하고 status를 추가한 타입
interface DeviceWithStatus extends DeviceInfoDto {
  status: number | undefined; // exactOptionalPropertyTypes: true 때문에 명시적으로 undefined 허용
  units: Array<DeviceInfoDto['units'][number] & { status: number | undefined }>;
}

interface DashboardFilterBarProps {
  selectedStatus: string;
  onSelectStatus: (key: string) => void;
  selectedType: string;
  onSelectType: (type: string) => void;
  className?: string;
  devices?: DeviceWithStatus[];
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = React.memo(
  ({ selectedStatus, onSelectStatus, selectedType, onSelectType, className = '', devices = [] }) => {
    const { deviceTypeOptions: allDeviceTypeOptions } = useApi().client.catalog();

    // // 🎯 상태 필터(전체/정상/일부비정상/전체비정상) - 주석 처리
    // const statusCounts = useMemo(() => {
    //   const counts = {
    //     all: devices.length,
    //     '0': 0,
    //     '1': 0,
    //     '2': 0,
    //   };
    //   devices.forEach(device => {
    //     const status = Number(device.status ?? 0);
    //     const statusKey = String(status);
    //     if (counts.hasOwnProperty(statusKey)) {
    //       counts[statusKey as keyof typeof counts]++;
    //     }
    //   });
    //   return counts;
    // }, [devices]);
    // const statusOptions = useMemo(
    //   () =>
    //     STATUS_OPTIONS.map(opt => ({
    //       key: opt.key,
    //       label: opt.label,
    //       icon: typeof opt.icon === 'function' ? opt.icon() : opt.icon,
    //       count: statusCounts[opt.key as keyof typeof statusCounts] ?? 0,
    //       colorClass: opt.colorClass,
    //     })),
    //   [statusCounts]
    // );

    // 🎯 실제 존재하는 장비 타입만 필터 옵션으로 생성 (카운트 포함)
    const deviceTypeOptions = useMemo(() => {
      const counts: Record<string, number> = {};
      const existingTypes = new Set<string>();

      // 한 번의 순회로 카운트 계산 및 존재하는 타입 수집
      devices.forEach(device => {
        const deviceType = device.type || '';
        if (deviceType) {
          existingTypes.add(deviceType);
          counts[deviceType] = (counts[deviceType] || 0) + 1;
        }
      });

      // 실제 존재하는 타입만 필터링하고 카운트 추가
      return allDeviceTypeOptions
        .filter((opt: DeviceTypeOption) => existingTypes.has(opt.type))
        .map((opt: DeviceTypeOption) => ({
          ...opt,
          count: counts[opt.type] || 0,
        }));
    }, [allDeviceTypeOptions, devices]);

    return (
      <Card className={`w-full ${className}`}>
        <CardContent className='flex flex-col gap-4'>
          {/* 상태 필터(전체/정상/일부비정상/전체비정상) - 주석 처리 */}
          {/* <FilterBar options={statusOptions} selected={selectedStatus} onSelect={onSelectStatus} /> */}
          {/* 장비 타입 카드 */}
          <div className='flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar'>
            {/* 전체 옵션 */}
            <Card
              className={`flex-shrink-0 cursor-pointer select-none min-w-[120px] transition-all ${
                selectedType === 'all' ? 'border-primary bg-primary/10' : 'hover:border-primary/50 hover:bg-primary/5'
              }`}
              tabIndex={0}
              onClick={() => {
                onSelectType('all');
              }}
            >
              <CardContent className='flex flex-col items-center justify-center'>
                {/* 1행: 아이콘 */}
                <div className='flex items-center justify-center w-full mb-2'>
                  <BarChart3 className='h-6 w-6' />
                </div>
                {/* 2행: 한글 label */}
                <div className='font-medium text-sm text-center'>전체</div>
              </CardContent>
            </Card>

            {deviceTypeOptions.map((opt: DeviceTypeOption & { count?: number }) => (
              <Card
                key={opt.type}
                className={`flex-shrink-0 cursor-pointer select-none min-w-[120px] transition-all ${
                  selectedType === opt.type
                    ? 'border-primary bg-primary/10'
                    : 'hover:border-primary/50 hover:bg-primary/5'
                }`}
                tabIndex={0}
                onClick={() => {
                  onSelectType(opt.type);
                }}
              >
                <CardContent className='flex flex-col items-center justify-center'>
                  {/* 1행: 아이콘 */}
                  <div className='flex items-center justify-center w-full mb-2'>
                    {opt.icon && <span className='h-6 w-6'>{opt.icon}</span>}
                  </div>
                  {/* 2행: 한글 label */}
                  <div className='font-medium text-sm text-center'>{opt.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
);
