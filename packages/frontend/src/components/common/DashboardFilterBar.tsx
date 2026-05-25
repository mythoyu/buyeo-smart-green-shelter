import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, Hand, Power, SlidersHorizontal } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useSendUnitBulkCommands } from '../../api/queries/device';
import { useApi } from '../../hooks/useApi';
import { Device, DeviceSpec } from './DeviceListShowDetail/types';
import { Button, Card, CardContent } from '../ui';

import { QuickSettingsPanel } from './QuickSettings/QuickSettingsPanel';

interface DeviceTypeOption {
  type: string;
  label: string;
  icon?: React.ReactNode;
  colorClass?: string;
  count?: number;
}

interface DashboardFilterBarProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  className?: string;
  devices?: Device[];
  deviceSpecs?: Record<string, DeviceSpec>;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = React.memo(
  ({ selectedType, onSelectType, className = '', devices = [], deviceSpecs = {} }) => {
    const { deviceTypeOptions: allDeviceTypeOptions } = useApi().client.catalog();
    const sendCommandMutation = useSendUnitBulkCommands();
    const queryClient = useQueryClient();
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
    const [isQuickSettingsApplying, setIsQuickSettingsApplying] = useState(false);
    const isControlBusy = isBulkLoading || isQuickSettingsApplying;

    const supportedUnits = useMemo(() => {
      const units: Array<{ deviceId: string; unitId: string; unitKey: string }> = [];
      devices.forEach((device) => {
        const spec = deviceSpecs[device.type];
        if (!spec?.commands?.length) return;
        device.units?.forEach((unit) => {
          units.push({ deviceId: device.id, unitId: unit.id, unitKey: `${device.id}_${unit.id}` });
        });
      });
      return units;
    }, [devices, deviceSpecs]);

    const runBulkCommands = useCallback(
      async (field: 'auto' | 'power', value: boolean) => {
        if (supportedUnits.length === 0) {
          toast.error('대상 유닛이 없습니다.');
          return;
        }

        setIsBulkLoading(true);
        try {
          const tasks = supportedUnits.map(async ({ deviceId, unitId }) => {
            const device = devices.find((d) => d.id === deviceId);
            const spec = device ? deviceSpecs[device.type] : undefined;
            const cmd = spec?.commands?.find((c) => c.key === field && c.set && c.action?.set);
            if (!cmd?.action?.set) return;
            await sendCommandMutation.mutateAsync({
              deviceId,
              unitId,
              commands: [{ action: cmd.action.set, value }],
            });
          });
          await Promise.all(tasks);
          await queryClient.invalidateQueries({ queryKey: ['dashboardData'], exact: false });
        } catch (e) {
          toast.error(`일괄 제어 실패: ${String(e)}`);
        } finally {
          setIsBulkLoading(false);
        }
      },
      [supportedUnits, devices, deviceSpecs, sendCommandMutation, queryClient],
    );

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
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
            <Button variant='outline' disabled={isControlBusy} onClick={() => runBulkCommands('auto', false)}>
              <Hand className='mr-2 h-4 w-4' />
              AUTO OFF
            </Button>
            <Button variant='outline' disabled={isControlBusy} onClick={() => runBulkCommands('auto', true)}>
              <Hand className='mr-2 h-4 w-4' />
              AUTO ON
            </Button>
            <Button variant='outline' disabled={isControlBusy} onClick={() => runBulkCommands('power', false)}>
              <Power className='mr-2 h-4 w-4' />
              OFF
            </Button>
            <Button variant='outline' disabled={isControlBusy} onClick={() => runBulkCommands('power', true)}>
              <Power className='mr-2 h-4 w-4' />
              ON
            </Button>
            <Button variant='default' disabled={isControlBusy} onClick={() => setQuickSettingsOpen(true)}>
              <SlidersHorizontal className='mr-2 h-4 w-4' />
              빠른설정
            </Button>
          </div>

          <QuickSettingsPanel
            open={quickSettingsOpen}
            onOpenChange={setQuickSettingsOpen}
            devices={devices}
            deviceSpecs={deviceSpecs}
            disabled={isBulkLoading}
            onApplyingChange={setIsQuickSettingsApplying}
          />

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
