import { Activity, Clock } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '../../../ui/badge';
import { Switch } from '../../../ui/switch';
import { TableCell, TableRow } from '../../../ui/table';

import type { DIPort, DIPortState } from '../../../../types/hardware';

interface DIPortTableRowProps {
  port: DIPort;
  portName: string;
  portDescription: string;
  portState?: DIPortState | undefined;
  disabled?: boolean;
  loadingCommands?: string[];
  onCommand: (port: DIPort, command: string, value: boolean) => void;
}

/**
 * DI 포트 테이블 행 컴포넌트
 */
export const DIPortTableRow: React.FC<DIPortTableRowProps> = ({
  port,
  portName,
  portDescription,
  portState,
  disabled = false,
  loadingCommands = [],
  onCommand,
}) => {
  // 로컬 상태 관리 (portState prop을 기반으로 초기화)
  const [localEnabled, setLocalEnabled] = useState(portState?.enabled ?? false);

  // portState가 변경될 때 로컬 상태 동기화
  useEffect(() => {
    console.log(`[DIPortTableRow] ${port} portState 변경됨:`, portState);

    if (portState) {
      setLocalEnabled(portState.enabled);
    }
  }, [portState, port]);

  // 기능 활성화 핸들러
  const handleEnabledChange = (checked: boolean) => {
    setLocalEnabled(checked);
    onCommand(port, 'ENABLE', checked);
  };

  // 상태 배지 색상 결정
  const getStatusBadgeVariant = (status: boolean) => {
    return status ? 'default' : 'secondary';
  };

  // 상태 배지 텍스트
  const getStatusText = (status: boolean) => {
    return status ? '활성' : '비활성';
  };

  // 마지막 업데이트 시간 포맷팅
  const formatLastUpdated = (lastUpdated: string) => {
    try {
      const date = new Date(lastUpdated);
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '알 수 없음';
    }
  };

  return (
    <TableRow className={disabled ? 'opacity-50' : ''}>
      {/* 포트 번호 */}
      <TableCell className='font-mono text-sm'>
        <div className='flex items-center justify-center gap-2'>
          <Activity className='h-4 w-4 text-green-500' />
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

      {/* 기능 활성화 */}
      <TableCell>
        <div className='flex items-center justify-center gap-2'>
          <div className='flex items-center space-x-2'>
            <Switch
              checked={localEnabled}
              onCheckedChange={handleEnabledChange}
              disabled={disabled || loadingCommands.includes('ENABLE')}
              className='data-[state=checked]:bg-blue-500'
            />
            <span className='text-sm text-muted-foreground hidden lg:inline'>
              {localEnabled ? '활성화' : '비활성화'}
            </span>
          </div>
        </div>
      </TableCell>

      {/* 접점 상태 */}
      <TableCell>
        <div className='flex items-center justify-center gap-2'>
          <Badge variant={getStatusBadgeVariant(portState?.status ?? false)} className='text-xs'>
            {getStatusText(portState?.status ?? false)}
          </Badge>
        </div>
      </TableCell>

      {/* 마지막 업데이트 */}
      <TableCell>
        <div className='flex items-center justify-center gap-1'>
          <Clock className='h-3 w-3 text-muted-foreground' />
          <span className='text-sm text-muted-foreground'>
            {formatLastUpdated(portState?.lastUpdated ?? new Date().toISOString())}
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
};
