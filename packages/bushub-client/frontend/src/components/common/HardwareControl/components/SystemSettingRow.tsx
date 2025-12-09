import React from 'react';

import { Checkbox } from '../../../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { TableCell, TableRow } from '../../../ui/table';

import type { SystemPort, SystemSettings } from '../../../../types/hardware';

interface SystemSettingRowProps {
  port: SystemPort;
  portName: string;
  Icon: React.ComponentType<any>;
  systemSettings: SystemSettings;
  disabled?: boolean;
  onCommand: (port: SystemPort, command: string, value: boolean | number) => void;
}

// 월 이름 배열
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

// 월 한글 이름
const MONTH_KOREAN_NAMES: Record<string, string> = {
  JAN: '1월',
  FEB: '2월',
  MAR: '3월',
  APR: '4월',
  MAY: '5월',
  JUN: '6월',
  JUL: '7월',
  AUG: '8월',
  SEP: '9월',
  OCT: '10월',
  NOV: '11월',
  DEC: '12월',
};

/**
 * 시스템 설정 테이블 행 컴포넌트
 */
export const SystemSettingRow: React.FC<SystemSettingRowProps> = ({
  port,
  portName,
  Icon,
  systemSettings,
  disabled = false,
  onCommand,
}) => {
  // 월별 하절기 설정 핸들러
  const handleMonthlySummerChange = (month: string, checked: boolean) => {
    onCommand('SEASONAL', `MONTHLY_SUMMER_${month}`, checked);
  };

  // DDC 시간 설정 핸들러
  const handleDDCTimeChange = (command: string, value: number) => {
    onCommand('DDC_TIME', command, value);
  };

  // DDC 시간 포맷팅
  const formatDDCTime = () => {
    const { year, month, day, hour, minute, second } = systemSettings.ddcTime;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour
      .toString()
      .padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
  };

  return (
    <TableRow className={disabled ? 'opacity-50' : ''}>
      {port === 'SEASONAL' && (
        <>
          <TableCell className='p-4' colSpan={2}>
            <div className='flex flex-wrap gap-3'>
              {MONTH_NAMES.map(month => (
                <div key={month} className='flex items-center space-x-2'>
                  <Checkbox
                    checked={systemSettings.monthlySummer[month]}
                    onCheckedChange={checked => handleMonthlySummerChange(month, Boolean(checked))}
                    disabled={disabled}
                    className='data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500'
                  />
                  <span className='text-sm text-muted-foreground'>{MONTH_KOREAN_NAMES[month]}</span>
                </div>
              ))}
            </div>
          </TableCell>
        </>
      )}

      {/* DDC_TIME 전용: 시간 드롭다운 */}
      {port === 'DDC_TIME' && (
        <TableCell className='p-4' colSpan={3}>
          <div className='space-y-3'>
            <div className='text-sm font-medium'>{formatDDCTime()}</div>
            <div className='flex flex-wrap gap-3'>
              {/* Year */}
              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>년</label>
                <Select
                  disabled={disabled}
                  value={String(systemSettings.ddcTime.year)}
                  onValueChange={v => handleDDCTimeChange('YEAR', Number(v))}
                >
                  <SelectTrigger size='sm' className='w-24'>
                    <SelectValue placeholder='연도' />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                      <SelectItem key={y} value={String(y)}>
                        {y}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month */}
              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>월</label>
                <Select
                  disabled={disabled}
                  value={String(systemSettings.ddcTime.month)}
                  onValueChange={v => handleDDCTimeChange('MONTH', Number(v))}
                >
                  <SelectTrigger size='sm' className='w-20'>
                    <SelectValue placeholder='월' />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <SelectItem key={m} value={String(m)}>
                        {m}월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Day */}
              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>일</label>
                <Select
                  disabled={disabled}
                  value={String(systemSettings.ddcTime.day)}
                  onValueChange={v => handleDDCTimeChange('DAY', Number(v))}
                >
                  <SelectTrigger size='sm' className='w-20'>
                    <SelectValue placeholder='일' />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <SelectItem key={d} value={String(d)}>
                        {d}일
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hour */}
              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>시</label>
                <Select
                  disabled={disabled}
                  value={String(systemSettings.ddcTime.hour)}
                  onValueChange={v => handleDDCTimeChange('HOUR', Number(v))}
                >
                  <SelectTrigger size='sm' className='w-20'>
                    <SelectValue placeholder='시' />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i).map(h => (
                      <SelectItem key={h} value={String(h)}>
                        {h.toString().padStart(2, '0')}시
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Minute */}
              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>분</label>
                <Select
                  disabled={disabled}
                  value={String(systemSettings.ddcTime.minute)}
                  onValueChange={v => handleDDCTimeChange('MIN', Number(v))}
                >
                  <SelectTrigger size='sm' className='w-20'>
                    <SelectValue placeholder='분' />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => i).map(mn => (
                      <SelectItem key={mn} value={String(mn)}>
                        {mn.toString().padStart(2, '0')}분
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Second */}
              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>초</label>
                <Select
                  disabled={disabled}
                  value={String(systemSettings.ddcTime.second)}
                  onValueChange={v => handleDDCTimeChange('SECOND', Number(v))}
                >
                  <SelectTrigger size='sm' className='w-20'>
                    <SelectValue placeholder='초' />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => i).map(sc => (
                      <SelectItem key={sc} value={String(sc)}>
                        {sc.toString().padStart(2, '0')}초
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
};
