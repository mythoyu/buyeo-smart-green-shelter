import { Power } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Badge } from '../../../ui/badge';
import { Switch } from '../../../ui/switch';
import { TableCell, TableRow } from '../../../ui/table';

import { ScheduleTimeCell } from './ScheduleTimeCell';

import type { DOPort, DOPortState, HardwareCommand, HardwareValue } from '../../../../types/hardware';

interface DOPortTableRowProps {
  port: DOPort;
  portState?: DOPortState | undefined;
  disabled?: boolean;
  loadingCommands?: string[];
  onCommand: (port: DOPort, command: HardwareCommand, value: HardwareValue) => void;
  onScheduleTimePaste: (
    port: DOPort,
    hourCommand: string,
    minuteCommand: string,
    hour: number,
    minute: number,
  ) => Promise<void>;
  supportsSchedule2?: boolean;
}

export const DOPortTableRow: React.FC<DOPortTableRowProps> = ({
  port,
  portState,
  disabled = false,
  loadingCommands = [],
  onCommand,
  onScheduleTimePaste,
  supportsSchedule2 = false,
}) => {
  const [localPower, setLocalPower] = useState(portState?.power ?? false);
  const [localAuto, setLocalAuto] = useState(portState?.auto ?? false);
  const [localSchedule1Start, setLocalSchedule1Start] = useState(portState?.schedule1Start ?? { hour: 9, minute: 0 });
  const [localSchedule1End, setLocalSchedule1End] = useState(portState?.schedule1End ?? { hour: 18, minute: 0 });
  const [localSchedule2Start, setLocalSchedule2Start] = useState(portState?.schedule2Start ?? { hour: 20, minute: 0 });
  const [localSchedule2End, setLocalSchedule2End] = useState(portState?.schedule2End ?? { hour: 23, minute: 0 });

  useEffect(() => {
    if (!portState) {
      return;
    }
    setLocalPower(portState.power);
    setLocalAuto(portState.auto);
    setLocalSchedule1Start(portState.schedule1Start);
    setLocalSchedule1End(portState.schedule1End);
    setLocalSchedule2Start(portState.schedule2Start ?? { hour: 20, minute: 0 });
    setLocalSchedule2End(portState.schedule2End ?? { hour: 23, minute: 0 });
  }, [portState]);

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
      <TableCell className='font-mono text-sm'>
        <div className='flex items-center justify-center gap-2'>
          <Power className='h-4 w-4 text-blue-500' />
          {port}
        </div>
      </TableCell>

      <TableCell>
        <div className='flex items-center justify-center'>
          <Switch
            checked={localPower}
            onCheckedChange={checked => {
              setLocalPower(checked);
              onCommand(port, 'POWER', checked);
            }}
            disabled={disabled || loadingCommands.includes('POWER')}
            className='data-[state=checked]:bg-green-500'
          />
        </div>
      </TableCell>

      <TableCell>
        <div className='flex items-center justify-center'>
          <Switch
            checked={localAuto}
            onCheckedChange={checked => {
              setLocalAuto(checked);
              onCommand(port, 'AUTO', checked);
            }}
            disabled={disabled || loadingCommands.includes('AUTO')}
            className='data-[state=checked]:bg-blue-500'
          />
        </div>
      </TableCell>

      <TableCell>
        <ScheduleTimeCell
          time={localSchedule1Start}
          disabled={disabled}
          hourLoading={loadingCommands.includes('SCHED1_START_HOUR')}
          minuteLoading={loadingCommands.includes('SCHED1_START_MIN')}
          onHourChange={hour => {
            setLocalSchedule1Start(prev => ({ ...prev, hour }));
            onCommand(port, 'SCHED1_START_HOUR', hour);
          }}
          onMinuteChange={minute => {
            setLocalSchedule1Start(prev => ({ ...prev, minute }));
            onCommand(port, 'SCHED1_START_MIN', minute);
          }}
          onTimePaste={(hour, minute) => onScheduleTimePaste(port, 'SCHED1_START_HOUR', 'SCHED1_START_MIN', hour, minute)}
        />
      </TableCell>

      <TableCell>
        <ScheduleTimeCell
          time={localSchedule1End}
          disabled={disabled}
          hourLoading={loadingCommands.includes('SCHED1_END_HOUR')}
          minuteLoading={loadingCommands.includes('SCHED1_END_MIN')}
          onHourChange={hour => {
            setLocalSchedule1End(prev => ({ ...prev, hour }));
            onCommand(port, 'SCHED1_END_HOUR', hour);
          }}
          onMinuteChange={minute => {
            setLocalSchedule1End(prev => ({ ...prev, minute }));
            onCommand(port, 'SCHED1_END_MIN', minute);
          }}
          onTimePaste={(hour, minute) => onScheduleTimePaste(port, 'SCHED1_END_HOUR', 'SCHED1_END_MIN', hour, minute)}
        />
      </TableCell>

      <TableCell>
        <ScheduleTimeCell
          time={localSchedule2Start}
          disabled={disabled}
          unsupported={!supportsSchedule2}
          hourLoading={loadingCommands.includes('SCHED2_START_HOUR')}
          minuteLoading={loadingCommands.includes('SCHED2_START_MIN')}
          onHourChange={hour => {
            setLocalSchedule2Start(prev => ({ ...prev, hour }));
            onCommand(port, 'SCHED2_START_HOUR', hour);
          }}
          onMinuteChange={minute => {
            setLocalSchedule2Start(prev => ({ ...prev, minute }));
            onCommand(port, 'SCHED2_START_MIN', minute);
          }}
          onTimePaste={(hour, minute) => onScheduleTimePaste(port, 'SCHED2_START_HOUR', 'SCHED2_START_MIN', hour, minute)}
        />
      </TableCell>

      <TableCell>
        <ScheduleTimeCell
          time={localSchedule2End}
          disabled={disabled}
          unsupported={!supportsSchedule2}
          hourLoading={loadingCommands.includes('SCHED2_END_HOUR')}
          minuteLoading={loadingCommands.includes('SCHED2_END_MIN')}
          onHourChange={hour => {
            setLocalSchedule2End(prev => ({ ...prev, hour }));
            onCommand(port, 'SCHED2_END_HOUR', hour);
          }}
          onMinuteChange={minute => {
            setLocalSchedule2End(prev => ({ ...prev, minute }));
            onCommand(port, 'SCHED2_END_MIN', minute);
          }}
          onTimePaste={(hour, minute) => onScheduleTimePaste(port, 'SCHED2_END_HOUR', 'SCHED2_END_MIN', hour, minute)}
        />
      </TableCell>

      <TableCell>
        <div className='flex items-center justify-center'>
          <Badge variant={getStatusBadgeVariant(portState?.status ?? 'unknown')} className='text-xs'>
            {getStatusText(portState?.status ?? 'unknown')}
          </Badge>
        </div>
      </TableCell>
    </TableRow>
  );
};
