import React, { useState, useEffect } from 'react';

import { AlertTriangle } from 'lucide-react';

import { Badge } from '../../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Switch } from '../../../ui/switch';

import { TemperatureSelect } from '../../TemperatureSelect';
import { TimeSelect } from '../../TimeSelect';

import type { HVACPort, HVACState } from '../../../../types/hardware';

interface HVACControlRowProps {
  port: HVACPort;
  portName: string;
  portDescription: string;
  Icon: React.ComponentType<any>;
  hvacState?: HVACState | undefined;
  disabled?: boolean;
  loadingCommands?: string[];
  modeOptions?: { value: number; label: string }[];
  speedOptions?: { value: number; label: string }[];
  onCommand: (port: HVACPort, command: string, value: boolean | number) => void;
}

// 시간 선택 옵션들은 TimeSelect 컴포넌트에서 처리됨

/**
 * HVAC 제어 테이블 행 컴포넌트
 */
export const HVACControlRow: React.FC<HVACControlRowProps> = ({
  port,
  portName,
  portDescription,
  Icon,
  hvacState,
  disabled = false,
  loadingCommands = [],
  modeOptions = [],
  speedOptions = [],
  onCommand,
}) => {
  // 로컬 상태 관리
  const [localPower, setLocalPower] = useState(hvacState?.power ?? false);
  const [localAuto, setLocalAuto] = useState(hvacState?.auto ?? false);
  const [localMode, setLocalMode] = useState(hvacState?.mode ?? 0);
  const [localSpeed, setLocalSpeed] = useState(hvacState?.speed ?? 0);
  const [localSummerTemp, setLocalSummerTemp] = useState(hvacState?.summerTemp ?? 25);
  const [localWinterTemp, setLocalWinterTemp] = useState(hvacState?.winterTemp ?? 20);
  const [localSchedule1Start, setLocalSchedule1Start] = useState(hvacState?.schedule1Start ?? { hour: 9, minute: 0 });
  const [localSchedule1End, setLocalSchedule1End] = useState(hvacState?.schedule1End ?? { hour: 18, minute: 0 });

  // hvacState가 변경될 때 로컬 상태 동기화
  useEffect(() => {
    console.log(`[HVACControlRow] ${port} hvacState 변경됨:`, hvacState);

    if (hvacState) {
      setLocalPower(hvacState.power);
      setLocalAuto(hvacState.auto);
      setLocalMode(hvacState.mode);
      setLocalSpeed(hvacState.speed);
      setLocalSummerTemp(hvacState.summerTemp);
      setLocalWinterTemp(hvacState.winterTemp);
      setLocalSchedule1Start(hvacState.schedule1Start);
      setLocalSchedule1End(hvacState.schedule1End);
    }
  }, [hvacState, port]);

  // 모드 옵션 선택 (props로 전달받은 옵션 사용)

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

  // 모드 변경 핸들러
  const handleModeChange = (value: string) => {
    const mode = parseInt(value);
    setLocalMode(mode);
    onCommand(port, 'MODE', mode);
  };

  // 속도 변경 핸들러
  const handleSpeedChange = (value: string) => {
    const speed = parseInt(value);
    setLocalSpeed(speed);
    onCommand(port, 'SPEED', speed);
  };

  // 여름 온도 변경 핸들러
  const handleSummerTempChange = (value: string) => {
    const temp = parseFloat(value);
    setLocalSummerTemp(temp);
    onCommand(port, 'SUMMER_CONT_TEMP', temp * 10); // 16.0 -> 160
  };

  // 겨울 온도 변경 핸들러
  const handleWinterTempChange = (value: string) => {
    const temp = parseFloat(value);
    setLocalWinterTemp(temp);
    onCommand(port, 'WINTER_CONT_TEMP', temp * 10); // 18.0 -> 180
  };

  // 스케줄 시작 시간 변경 핸들러
  const handleSchedule1StartChange = (value: string) => {
    const [hour, minute] = value.split(':').map(Number);
    const newSchedule = { hour, minute };
    setLocalSchedule1Start(newSchedule);
    onCommand(port, 'SCHED1_START_HOUR', hour);
    onCommand(port, 'SCHED1_START_MIN', minute);
  };

  // 스케줄 종료 시간 변경 핸들러
  const handleSchedule1EndChange = (value: string) => {
    const [hour, minute] = value.split(':').map(Number);
    const newSchedule = { hour, minute };
    setLocalSchedule1End(newSchedule);
    onCommand(port, 'SCHED1_END_HOUR', hour);
    onCommand(port, 'SCHED1_END_MIN', minute);
  };

  // 알람 상태 배지 색상 결정
  const getAlarmBadgeVariant = (alarm: number) => {
    return alarm > 0 ? 'destructive' : 'default';
  };

  // 알람 상태 배지 텍스트
  const getAlarmText = (alarm: number) => {
    return alarm > 0 ? '알람' : '정상';
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
    <tr className={disabled ? 'opacity-50' : ''}>
      {/* 장치 */}
      <td className='font-mono text-sm p-4'>
        <div className='flex items-center justify-center gap-2'>
          <Icon className='h-4 w-4 text-blue-500' />
          {port}
        </div>
      </td>

      {/* 전원 */}
      <td className='p-4'>
        <div className='flex items-center justify-center space-x-2'>
          <Switch
            checked={localPower}
            onCheckedChange={handlePowerChange}
            disabled={disabled || loadingCommands.includes('POWER')}
            className='data-[state=checked]:bg-green-500'
          />
          <span className='text-sm text-muted-foreground hidden lg:inline'>{localPower ? 'ON' : 'OFF'}</span>
        </div>
      </td>

      {/* 자동/수동 */}
      <td className='p-4'>
        <div className='flex items-center justify-center space-x-2'>
          <Switch
            checked={localAuto}
            onCheckedChange={handleAutoChange}
            disabled={disabled || loadingCommands.includes('AUTO')}
            className='data-[state=checked]:bg-blue-500'
          />
          <span className='text-sm text-muted-foreground hidden lg:inline'>{localAuto ? '자동' : '수동'}</span>
        </div>
      </td>

      {/* 모드 */}
      <td className='p-4'>
        <div className='flex justify-center'>
          <Select
            value={localMode.toString()}
            onValueChange={handleModeChange}
            disabled={disabled || loadingCommands.includes('MODE')}
          >
            <SelectTrigger className='w-20 h-8 text-sm'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modeOptions.map(option => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </td>

      {/* 속도 */}
      <td className='p-4'>
        <div className='flex justify-center'>
          <Select
            value={localSpeed.toString()}
            onValueChange={handleSpeedChange}
            disabled={disabled || loadingCommands.includes('SPEED')}
          >
            <SelectTrigger className='w-20 h-8 text-sm'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {speedOptions.map(option => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </td>

      {/* 여름 온도 (COOLER만) */}
      {port === 'COOLER' && (
        <td className='p-4'>
          <div className='flex justify-center'>
            <TemperatureSelect
              value={localSummerTemp}
              onChange={handleSummerTempChange}
              disabled={disabled || loadingCommands.includes('SUMMER_CONT_TEMP')}
              min={16}
              max={30}
              step={0.5}
              className='w-20'
            />
          </div>
        </td>
      )}

      {/* 겨울 온도 (COOLER만) */}
      {port === 'COOLER' && (
        <td className='p-4'>
          <div className='flex justify-center'>
            <TemperatureSelect
              value={localWinterTemp}
              onChange={handleWinterTempChange}
              disabled={disabled || loadingCommands.includes('WINTER_CONT_TEMP')}
              min={16}
              max={30}
              step={0.5}
              className='w-20'
            />
          </div>
        </td>
      )}

      {/* 현재 온도 (COOLER만) */}
      {port === 'COOLER' && (
        <td className='p-4'>
          <div className='flex items-center justify-center gap-1'>
            <span className='text-sm font-medium'>{hvacState?.currentTemp ?? 0}°C</span>
          </div>
        </td>
      )}

      {/* 스케줄 시작 */}
      <td className='p-4'>
        <div className='flex justify-center'>
          <TimeSelect
            value={`${localSchedule1Start.hour.toString().padStart(2, '0')}:${localSchedule1Start.minute
              .toString()
              .padStart(2, '0')}`}
            onChange={handleSchedule1StartChange}
            disabled={disabled}
            interval={5}
            className='w-24'
          />
        </div>
      </td>

      {/* 스케줄 종료 */}
      <td className='p-4'>
        <div className='flex justify-center'>
          <TimeSelect
            value={`${localSchedule1End.hour.toString().padStart(2, '0')}:${localSchedule1End.minute
              .toString()
              .padStart(2, '0')}`}
            onChange={handleSchedule1EndChange}
            disabled={disabled}
            interval={5}
            className='w-24'
          />
        </div>
      </td>

      {/* 알람 */}
      <td className='p-4'>
        <div className='flex items-center justify-center gap-2'>
          <Badge variant={getAlarmBadgeVariant(hvacState?.alarm ?? 0)} className='text-xs'>
            {hvacState?.alarm && hvacState.alarm > 0 ? (
              <div className='flex items-center gap-1'>
                <AlertTriangle className='h-3 w-3' />
                {getAlarmText(hvacState.alarm)}
              </div>
            ) : (
              getAlarmText(hvacState?.alarm ?? 0)
            )}
          </Badge>
        </div>
      </td>

      {/* 상태 */}
      <td className='p-4'>
        <div className='flex items-center justify-center'>
          <Badge variant={getStatusBadgeVariant(hvacState?.status ?? 'unknown')} className='text-xs'>
            {getStatusText(hvacState?.status ?? 'unknown')}
          </Badge>
        </div>
      </td>
    </tr>
  );
};
