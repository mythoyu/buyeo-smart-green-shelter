import { RefreshCw, Settings, Calendar } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { useSendDirectHardwareCommand, useSeasonalRead, useSeasonalSet } from '../../../../api/queries/hardware';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { SystemSettingRow } from '../components/SystemSettingRow';

import type { SystemPort, SystemSettings, HardwareControlError } from '../../../../types/hardware';

// 시스템 포트별 설명 정보
const SYSTEM_PORT_DESCRIPTIONS: Record<SystemPort, { name: string; icon: React.ComponentType<any> }> = {
  SEASONAL: {
    name: '절기 설정',
    icon: Calendar,
  },
  DDC_TIME: {
    name: 'DDC 시간',
    icon: Settings,
  },
};

interface SystemSettingsTabProps {
  disabled?: boolean;
  onError?: (error: HardwareControlError) => void;
  pollingStatus?: { pollingEnabled: boolean };
}

/**
 * 시스템 설정 탭 컴포넌트
 * 절기 설정 및 DDC 시간 설정
 */
export const SystemSettingsTab: React.FC<SystemSettingsTabProps> = ({ disabled = false, onError, pollingStatus }) => {
  const sendCommand = useSendDirectHardwareCommand();
  const seasonalRead = useSeasonalRead();
  const seasonalSet = useSeasonalSet();
  const [isApplyingDdc, setIsApplyingDdc] = useState(false);
  const [ddcDow, setDdcDow] = useState<number>(new Date().getDay());

  // 시스템 설정 상태 관리
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    season: false,
    monthlySummer: {
      JAN: false,
      FEB: false,
      MAR: false,
      APR: false,
      MAY: false,
      JUN: true,
      JUL: true,
      AUG: true,
      SEP: true,
      OCT: false,
      NOV: false,
      DEC: false,
    },
    ddcTime: {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
      hour: new Date().getHours(),
      minute: new Date().getMinutes(),
      second: new Date().getSeconds(),
    },
  });

  // 절기 설정 읽기 함수
  const handleReadSeasonal = async () => {
    try {
      const result = await seasonalRead.mutateAsync();
      if (result.success && result.data) {
        setSystemSettings(prev => ({
          ...prev,
          season: !!result.data!.season,
          monthlySummer: { ...prev.monthlySummer, ...result.data!.monthlySummer },
        }));
        toast.success('절기 설정 읽기 완료', { id: 'hw-system-season-read-success' });
      }
    } catch (error: any) {
      console.error('[SystemSettingsTab] 절기 설정 읽기 실패:', error);
      toast.error(`절기 설정 읽기 실패: ${error.message || '알 수 없는 오류'}`, {
        id: 'hw-system-season-read-error',
      });

      if (onError) {
        onError({
          type: 'hardware_error',
          message: error.message || '시스템 설정 읽기 중 오류가 발생했습니다',
          details: '시스템 전체 설정 읽기',
        });
      }
    }
  };

  // 명령 실행 함수
  const handleCommand = async (port: SystemPort, command: string, value: boolean | number) => {
    try {
      let success = false;
      if (port === 'SEASONAL') {
        if (command === 'SEASON') {
          success = await seasonalSet.mutateAsync({ season: Boolean(value) });
        } else if (command.startsWith('MONTHLY_SUMMER_')) {
          const month = command.replace('MONTHLY_SUMMER_', '');
          success = await seasonalSet.mutateAsync({ monthlySummer: { [month]: Boolean(value) } as any });
        }
      } else {
        success = await sendCommand.mutateAsync({ port, command, value });
      }

      if (success) {
        // 성공 시 상태 업데이트
        setSystemSettings(prev => {
          const updated = { ...prev };

          if (port === 'SEASONAL') {
            if (command === 'SEASON') {
              updated.season = value as boolean;
            } else if (command.startsWith('MONTHLY_SUMMER_')) {
              const month = command.replace('MONTHLY_SUMMER_', '') as keyof typeof updated.monthlySummer;
              updated.monthlySummer[month] = value as boolean;
            }
          } else if (port === 'DDC_TIME') {
            switch (command) {
              case 'YEAR':
                updated.ddcTime.year = value as number;
                break;
              case 'MONTH':
                updated.ddcTime.month = value as number;
                break;
              case 'DAY':
                updated.ddcTime.day = value as number;
                break;
              case 'HOUR':
                updated.ddcTime.hour = value as number;
                break;
              case 'MIN':
                updated.ddcTime.minute = value as number;
                break;
              case 'SECOND':
                updated.ddcTime.second = value as number;
                break;
            }
          }

          return updated;
        });

        const portInfo = SYSTEM_PORT_DESCRIPTIONS[port];
        toast.success(`${portInfo.name} 설정 성공`, {
          id: `hw-system-${port.toLowerCase()}-${command.toLowerCase()}-success`,
        });
      }
    } catch (error: any) {
      console.error('[SystemSettingsTab] 명령 실행 실패:', error);
      toast.error(`명령 실행 실패: ${error.message || '알 수 없는 오류'}`, {
        id: `hw-system-${port.toLowerCase()}-${command.toLowerCase()}-error`,
      });

      if (onError) {
        onError({
          type: 'hardware_error',
          message: error.message || '시스템 설정 중 오류가 발생했습니다',
          details: `${port} ${command} = ${value}`,
        });
      }
    }
  };

  const isLoading = sendCommand.isPending || seasonalRead.isPending || seasonalSet.isPending;

  return (
    <div className='space-y-6 relative'>
      {/* 절기 설정 카드 */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <Calendar className='h-5 w-5' />
              절기 설정
            </CardTitle>
          </div>
          {!pollingStatus?.pollingEnabled && (
            <Button
              onClick={handleReadSeasonal}
              disabled={isLoading}
              variant='outline'
              size='sm'
              className='flex items-center gap-2'
            >
              <RefreshCw className={`h-4 w-4 ${seasonalRead.isPending ? 'animate-spin' : ''}`} />
              계절 상태 읽기
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <SystemSettingRow
            port='SEASONAL'
            portName={SYSTEM_PORT_DESCRIPTIONS.SEASONAL.name}
            Icon={SYSTEM_PORT_DESCRIPTIONS.SEASONAL.icon}
            systemSettings={systemSettings}
            disabled={disabled || isLoading}
            onCommand={handleCommand}
          />
        </CardContent>
      </Card>

      {/* DDC 시간 카드 */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <Settings className='h-5 w-5' />
              DDC 시간 설정
            </CardTitle>
          </div>
          {/* DDC 시간 읽기는 전용 매핑 구현 후 연결 예정 */}
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3'>
            {/* 연도 */}
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-muted-foreground'>연도</label>
              <Select
                disabled={disabled || isApplyingDdc}
                value={String(systemSettings.ddcTime.year)}
                onValueChange={v => setSystemSettings(p => ({ ...p, ddcTime: { ...p.ddcTime, year: Number(v) } }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder='연도' />
                </SelectTrigger>
                <SelectContent className='max-h-64'>
                  {Array.from({ length: 101 }, (_, i) => 2000 + i).map(y => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 월 */}
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-muted-foreground'>월</label>
              <Select
                disabled={disabled || isApplyingDdc}
                value={String(systemSettings.ddcTime.month)}
                onValueChange={v => setSystemSettings(p => ({ ...p, ddcTime: { ...p.ddcTime, month: Number(v) } }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder='월' />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <SelectItem key={m} value={String(m)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 일 */}
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-muted-foreground'>일</label>
              <Select
                disabled={disabled || isApplyingDdc}
                value={String(systemSettings.ddcTime.day)}
                onValueChange={v => setSystemSettings(p => ({ ...p, ddcTime: { ...p.ddcTime, day: Number(v) } }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder='일' />
                </SelectTrigger>
                <SelectContent className='max-h-64'>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 요일 */}
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-muted-foreground'>요일</label>
              <Select
                disabled={disabled || isApplyingDdc}
                value={String(ddcDow)}
                onValueChange={v => setDdcDow(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder='요일' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='0'>일</SelectItem>
                  <SelectItem value='1'>월</SelectItem>
                  <SelectItem value='2'>화</SelectItem>
                  <SelectItem value='3'>수</SelectItem>
                  <SelectItem value='4'>목</SelectItem>
                  <SelectItem value='5'>금</SelectItem>
                  <SelectItem value='6'>토</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* 시 */}
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-muted-foreground'>시</label>
              <Select
                disabled={disabled || isApplyingDdc}
                value={String(systemSettings.ddcTime.hour)}
                onValueChange={v => setSystemSettings(p => ({ ...p, ddcTime: { ...p.ddcTime, hour: Number(v) } }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder='시' />
                </SelectTrigger>
                <SelectContent className='max-h-64'>
                  {Array.from({ length: 24 }, (_, i) => i).map(h => (
                    <SelectItem key={h} value={String(h)}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 분 */}
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-muted-foreground'>분</label>
              <Select
                disabled={disabled || isApplyingDdc}
                value={String(systemSettings.ddcTime.minute)}
                onValueChange={v => setSystemSettings(p => ({ ...p, ddcTime: { ...p.ddcTime, minute: Number(v) } }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder='분' />
                </SelectTrigger>
                <SelectContent className='max-h-64'>
                  {Array.from({ length: 60 }, (_, i) => i).map(mn => (
                    <SelectItem key={mn} value={String(mn)}>
                      {mn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 초 */}
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-muted-foreground'>초</label>
              <Select
                disabled={disabled || isApplyingDdc}
                value={String(systemSettings.ddcTime.second)}
                onValueChange={v => setSystemSettings(p => ({ ...p, ddcTime: { ...p.ddcTime, second: Number(v) } }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder='초' />
                </SelectTrigger>
                <SelectContent className='max-h-64'>
                  {Array.from({ length: 60 }, (_, i) => i).map(sc => (
                    <SelectItem key={sc} value={String(sc)}>
                      {sc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='mt-4 flex justify-end'>
            <Button
              disabled={
                disabled ||
                isApplyingDdc ||
                systemSettings.ddcTime.year < 2000 ||
                systemSettings.ddcTime.year > 2099 ||
                systemSettings.ddcTime.month < 1 ||
                systemSettings.ddcTime.month > 12 ||
                systemSettings.ddcTime.day < 1 ||
                systemSettings.ddcTime.day > 31 ||
                ddcDow < 0 ||
                ddcDow > 6 ||
                systemSettings.ddcTime.hour < 0 ||
                systemSettings.ddcTime.hour > 23 ||
                systemSettings.ddcTime.minute < 0 ||
                systemSettings.ddcTime.minute > 59 ||
                systemSettings.ddcTime.second < 0 ||
                systemSettings.ddcTime.second > 59
              }
              onClick={async () => {
                try {
                  setIsApplyingDdc(true);
                  const { year, month, day, hour, minute, second } = systemSettings.ddcTime as any;
                  const commands = [
                    { command: 'YEAR', value: year },
                    { command: 'MONTH', value: month },
                    { command: 'DAY', value: day },
                    { command: 'DOW', value: ddcDow },
                    { command: 'HOUR', value: hour },
                    { command: 'MIN', value: minute },
                    { command: 'SECOND', value: second },
                  ];

                  let ok = 0;
                  const failed: string[] = [];
                  for (const c of commands) {
                    try {
                      const success = await sendCommand.mutateAsync({
                        port: 'DDC_TIME' as any,
                        command: c.command,
                        value: c.value,
                      });
                      if (success) ok++;
                      else failed.push(c.command);
                    } catch {
                      failed.push(c.command);
                    }
                  }
                  if (failed.length === 0) toast.success('DDC 시간 설정이 적용되었습니다.');
                  else toast.error(`일부 실패: ${failed.join(', ')}`);
                } finally {
                  setIsApplyingDdc(false);
                }
              }}
            >
              {isApplyingDdc ? '적용 중...' : '적용'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettingsTab;
