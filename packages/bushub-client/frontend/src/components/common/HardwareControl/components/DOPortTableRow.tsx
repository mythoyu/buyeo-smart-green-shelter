import { Power, Clock } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '../../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Switch } from '../../../ui/switch';
import { TableCell, TableRow } from '../../../ui/table';

import type { DOPort, DOPortState, HardwareCommand, HardwareValue } from '../../../../types/hardware';

// 시간 선택 옵션 (00:00 ~ 23:59)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: `${i.toString().padStart(2, '0')}시`,
}));

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => ({
  value: i.toString(),
  label: `${i.toString().padStart(2, '0')}분`,
}));

interface DOPortTableRowProps {
  port: DOPort;
  portName: string;
  portDescription: string;
  portState?: DOPortState | undefined;
  disabled?: boolean;
  loadingCommands?: string[];
  onCommand: (port: DOPort, command: HardwareCommand, value: HardwareValue) => void;
  supportsSchedule2?: boolean;
}

/**
 * DO 포트 테이블 행 컴포넌트
 */
export const DOPortTableRow: React.FC<DOPortTableRowProps> = ({
  port,
  portName,
  portDescription,
  portState,
  disabled = false,
  loadingCommands = [],
  onCommand,
  supportsSchedule2 = false,
}) => {
  // 로컬 상태 관리 (portState prop을 기반으로 초기화)
  const [localPower, setLocalPower] = useState(portState?.power ?? false);
  const [localAuto, setLocalAuto] = useState(portState?.auto ?? false);
  const [localSchedule1Start, setLocalSchedule1Start] = useState(portState?.schedule1Start ?? { hour: 9, minute: 0 });
  const [localSchedule1End, setLocalSchedule1End] = useState(portState?.schedule1End ?? { hour: 18, minute: 0 });
  const [localSchedule2Start, setLocalSchedule2Start] = useState(portState?.schedule2Start ?? { hour: 20, minute: 0 });
  const [localSchedule2End, setLocalSchedule2End] = useState(portState?.schedule2End ?? { hour: 23, minute: 0 });

  // portState가 변경될 때 로컬 상태 동기화
  useEffect(() => {
    console.log(`[DOPortTableRow] ${port} portState 변경됨:`, portState);

    if (portState) {
      setLocalPower(portState.power);
      setLocalAuto(portState.auto);
      setLocalSchedule1Start(portState.schedule1Start);
      setLocalSchedule1End(portState.schedule1End);
      setLocalSchedule2Start(portState.schedule2Start);
      setLocalSchedule2End(portState.schedule2End);
    }
  }, [portState, port]);

  // 전원 제어 핸들러
  const handlePowerChange = (checked: boolean) => {
    setLocalPower(checked);
    onCommand(port, 'POWER', checked);
  };

  // 자동/수동 모드 핸들러
  const handleAutoChange = (checked: boolean) => {
    setLocalAuto(checked);
    onCommand(port, 'AUTO', checked);
  };

  // 스케줄 시작 시간 핸들러 (Select 컴포넌트용)
  const handleSchedule1StartHourChange = (value: string) => {
    const hour = parseInt(value);
    const newSchedule = { ...localSchedule1Start, hour };
    setLocalSchedule1Start(newSchedule);
    onCommand(port, 'SCHED1_START_HOUR', hour);
  };

  const handleSchedule1StartMinChange = (value: string) => {
    const minute = parseInt(value);
    const newSchedule = { ...localSchedule1Start, minute };
    setLocalSchedule1Start(newSchedule);
    onCommand(port, 'SCHED1_START_MIN', minute);
  };

  // 스케줄 종료 시간 핸들러 (Select 컴포넌트용)
  const handleSchedule1EndHourChange = (value: string) => {
    const hour = parseInt(value);
    const newSchedule = { ...localSchedule1End, hour };
    setLocalSchedule1End(newSchedule);
    onCommand(port, 'SCHED1_END_HOUR', hour);
  };

  const handleSchedule1EndMinChange = (value: string) => {
    const minute = parseInt(value);
    const newSchedule = { ...localSchedule1End, minute };
    setLocalSchedule1End(newSchedule);
    onCommand(port, 'SCHED1_END_MIN', minute);
  };

  // 스케줄2 시작 시간 핸들러 (Select 컴포넌트용)
  const handleSchedule2StartHourChange = (value: string) => {
    const hour = parseInt(value);
    const newSchedule = { ...localSchedule2Start, hour };
    setLocalSchedule2Start(newSchedule);
    onCommand(port, 'SCHED2_START_HOUR', hour);
  };

  const handleSchedule2StartMinChange = (value: string) => {
    const minute = parseInt(value);
    const newSchedule = { ...localSchedule2Start, minute };
    setLocalSchedule2Start(newSchedule);
    onCommand(port, 'SCHED2_START_MIN', minute);
  };

  // 스케줄2 종료 시간 핸들러 (Select 컴포넌트용)
  const handleSchedule2EndHourChange = (value: string) => {
    const hour = parseInt(value);
    const newSchedule = { ...localSchedule2End, hour };
    setLocalSchedule2End(newSchedule);
    onCommand(port, 'SCHED2_END_HOUR', hour);
  };

  const handleSchedule2EndMinChange = (value: string) => {
    const minute = parseInt(value);
    const newSchedule = { ...localSchedule2End, minute };
    setLocalSchedule2End(newSchedule);
    onCommand(port, 'SCHED2_END_MIN', minute);
  };

  // 상태 배지 색상 결정
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // 상태 배지 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '활성';
      case 'inactive':
        return '비활성';
      case 'error':
        return '오류';
      default:
        return '알 수 없음';
    }
  };

  return (
    <TableRow className={disabled ? 'opacity-50' : ''}>
      {/* 포트 번호 */}
      <TableCell className='font-mono text-sm'>
        <div className='flex items-center justify-center gap-2'>
          <Power className='h-4 w-4 text-blue-500' />
          {port}
        </div>
      </TableCell>

      {/* 포트 설명 */}
      <TableCell>
        <div className='text-center'>
          <div className='font-medium'>{portName}</div>
          <div className='text-sm text-muted-foreground'>{portDescription}</div>
        </div>
      </TableCell>

      {/* 전원 제어 */}
      <TableCell>
        <div className='flex items-center justify-center gap-2'>
          <div className='flex items-center space-x-2'>
            <Switch
              checked={localPower}
              onCheckedChange={handlePowerChange}
              disabled={disabled || loadingCommands.includes('POWER')}
              className='data-[state=checked]:bg-green-500'
            />
            <span className='text-sm text-muted-foreground'>{localPower ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </TableCell>

      {/* 자동/수동 모드 */}
      <TableCell>
        <div className='flex items-center justify-center gap-2'>
          <div className='flex items-center space-x-2'>
            <Switch
              checked={localAuto}
              onCheckedChange={handleAutoChange}
              disabled={disabled || loadingCommands.includes('AUTO')}
              className='data-[state=checked]:bg-blue-500'
            />
            <span className='text-sm text-muted-foreground hidden lg:inline'>{localAuto ? '자동' : '수동'}</span>
          </div>
        </div>
      </TableCell>

      {/* 스케줄1 시작시간 */}
      <TableCell>
        <div className='flex items-center justify-center gap-1'>
          <Clock className='h-3 w-3 text-muted-foreground' />
          <div className='flex items-center gap-1'>
            <Select
              value={localSchedule1Start.hour.toString()}
              onValueChange={handleSchedule1StartHourChange}
              disabled={disabled || loadingCommands.includes('SCHED1_START_HOUR')}
            >
              <SelectTrigger className='w-20 h-8 text-sm'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className='text-muted-foreground'>:</span>
            <Select
              value={localSchedule1Start.minute.toString()}
              onValueChange={handleSchedule1StartMinChange}
              disabled={disabled || loadingCommands.includes('SCHED1_START_MIN')}
            >
              <SelectTrigger className='w-20 h-8 text-sm'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINUTE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </TableCell>

      {/* 스케줄1 종료시간 */}
      <TableCell>
        <div className='flex items-center justify-center gap-1'>
          <Clock className='h-3 w-3 text-muted-foreground' />
          <div className='flex items-center gap-1'>
            <Select
              value={localSchedule1End.hour.toString()}
              onValueChange={handleSchedule1EndHourChange}
              disabled={disabled}
            >
              <SelectTrigger className='w-20 h-8 text-sm'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className='text-muted-foreground'>:</span>
            <Select
              value={localSchedule1End.minute.toString()}
              onValueChange={handleSchedule1EndMinChange}
              disabled={disabled}
            >
              <SelectTrigger className='w-20 h-8 text-sm'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINUTE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </TableCell>

      {/* 스케줄2 시작시간 - 모든 포트에서 렌더링, 지원하지 않는 포트는 비활성화 */}
      <TableCell>
        {supportsSchedule2 ? (
          <div className='flex items-center justify-center gap-1'>
            <Clock className='h-3 w-3 text-muted-foreground' />
            <div className='flex items-center gap-1'>
              <Select
                value={localSchedule2Start.hour.toString()}
                onValueChange={handleSchedule2StartHourChange}
                disabled={disabled}
              >
                <SelectTrigger className='w-20 h-8 text-sm'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className='text-muted-foreground'>:</span>
              <Select
                value={localSchedule2Start.minute.toString()}
                onValueChange={handleSchedule2StartMinChange}
                disabled={disabled}
              >
                <SelectTrigger className='w-20 h-8 text-sm'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className='flex items-center gap-1 opacity-50'>
            <Clock className='h-3 w-3 text-muted-foreground' />
            <span className='text-sm text-muted-foreground'>미지원</span>
          </div>
        )}
      </TableCell>

      {/* 스케줄2 종료시간 - 모든 포트에서 렌더링, 지원하지 않는 포트는 비활성화 */}
      <TableCell>
        {supportsSchedule2 ? (
          <div className='flex items-center justify-center gap-1'>
            <Clock className='h-3 w-3 text-muted-foreground' />
            <div className='flex items-center gap-1'>
              <Select
                value={localSchedule2End.hour.toString()}
                onValueChange={handleSchedule2EndHourChange}
                disabled={disabled}
              >
                <SelectTrigger className='w-20 h-8 text-sm'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className='text-muted-foreground'>:</span>
              <Select
                value={localSchedule2End.minute.toString()}
                onValueChange={handleSchedule2EndMinChange}
                disabled={disabled}
              >
                <SelectTrigger className='w-20 h-8 text-sm'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className='flex items-center gap-1 opacity-50'>
            <Clock className='h-3 w-3 text-muted-foreground' />
            <span className='text-sm text-muted-foreground'>미지원</span>
          </div>
        )}
      </TableCell>

      {/* 상태 */}
      <TableCell>
        <div className='flex items-center justify-center gap-2'>
          <Badge variant={getStatusBadgeVariant(portState?.status ?? 'unknown')} className='text-xs'>
            {getStatusText(portState?.status ?? 'unknown')}
          </Badge>
        </div>
      </TableCell>
    </TableRow>
  );
};
