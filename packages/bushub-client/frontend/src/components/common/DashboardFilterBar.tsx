import { BarChart3 } from 'lucide-react';
import React, { useState, useMemo } from 'react';

import { STATUS_OPTIONS } from '../../constants/statusOptions';
import { useApi } from '../../hooks/useApi';
import { Card, CardContent } from '../ui';

import { FilterBar } from './FilterBar';
// 예시: useClientCatalog로 deviceTypeOptions 생성
// import { useClientCatalog } from '@/hooks/useClientCatalog';
// const catalog = useClientCatalog();
// const deviceTypeOptions = catalog.map(meta => ({
//   type: meta.deviceId,
//   label: meta.deviceName,
//   icon: meta.iconComponent || meta.icon,
//   colorClass: meta.color,
// }));

interface DeviceTypeOption {
  type: string;
  label: string;
  icon?: React.ReactNode;
  colorClass?: string;
}

interface DashboardFilterBarProps {
  selectedStatus: string;
  onSelectStatus: (key: string) => void;
  selectedType: string;
  onSelectType: (type: string) => void;
  className?: string;
  devices?: any[]; // 🎯 장비 데이터 추가
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = React.memo(
  ({ selectedStatus, onSelectStatus, selectedType, onSelectType, className = '', devices = [] }) => {
    const { deviceTypeOptions } = useApi().client.catalog();
    const [openCardIdx, setOpenCardIdx] = useState<number | null>(null);

    // 🎯 실제 장비 데이터를 기반으로 status 카운트 계산
    const statusCounts = useMemo(() => {
      const counts = {
        all: devices.length,
        '0': 0,
        '1': 0,
        '2': 0,
      };

      devices.forEach((device: any) => {
        // device.status를 number로 변환하여 타입 안전성 보장
        const status = Number(device.status ?? 0);
        const statusKey = String(status);
        if (counts.hasOwnProperty(statusKey)) {
          counts[statusKey as keyof typeof counts]++;
        }
      });

      return counts;
    }, [devices]);

    const statusOptions = useMemo(
      () =>
        STATUS_OPTIONS.map(opt => ({
          key: opt.key,
          label: opt.label,
          icon: typeof opt.icon === 'function' ? opt.icon() : opt.icon,
          count: statusCounts[opt.key as keyof typeof statusCounts] ?? 0,
          colorClass: opt.colorClass,
        })),
      [statusCounts]
    );

    const handleSelectType = useMemo(
      () => (type: string) => {
        onSelectType(type);
        setOpenCardIdx(null);
      },
      [onSelectType]
    );

    const handleCardBlur = useMemo(
      () => () => {
        setTimeout(() => setOpenCardIdx(null), 150);
      },
      []
    );

    return (
      <Card className={`w-full ${className}`}>
        <CardContent className='flex flex-col gap-4'>
          {/* 상태 필터(1행) - @shared FilterBar 사용 */}
          <FilterBar options={statusOptions} selected={selectedStatus} onSelect={onSelectStatus} />
          {/* 장비 타입 카드(2행) */}
          <div className='flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar'>
            {/* 전체 옵션 */}
            <Card
              className={`flex-shrink-0 cursor-pointer select-none min-w-[120px] transition-all ${
                selectedType === 'all' ? 'border-primary bg-primary/10' : 'hover:border-primary/50 hover:bg-primary/5'
              }`}
              tabIndex={0}
              onClick={() => {
                onSelectType('all');
                setOpenCardIdx(null);
              }}
              onBlur={() => setTimeout(() => setOpenCardIdx(null), 150)}
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

            {deviceTypeOptions.map((opt: DeviceTypeOption, idx: number) => (
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
                  setOpenCardIdx(openCardIdx === idx ? null : idx);
                }}
                onBlur={() => setTimeout(() => setOpenCardIdx(null), 150)}
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
