import { Activity, Clock, AlertTriangle } from 'lucide-react';
import React from 'react';

import { Badge } from '../../../ui/badge';
import { TableCell, TableRow } from '../../../ui/table';

import type { SensorPort, SensorData } from '../../../../types/hardware';

interface SensorDataRowProps {
  port: SensorPort;
  sensorData: SensorData;
  disabled?: boolean;
}

/**
 * 센서 데이터 테이블 행 컴포넌트 (읽기 전용)
 */
export const SensorDataRow: React.FC<SensorDataRowProps> = ({ port, sensorData, disabled = false }) => {
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

  // 데이터 값 포맷팅 (소수점 1자리)
  const formatValue = (value: number, unit: string = '') => {
    if (value === 0 && unit === '') return '-';
    return `${value.toFixed(1)}${unit}`;
  };

  return (
    <TableRow className={disabled ? 'opacity-50' : ''}>
      {/* 센서 */}
      <TableCell className='font-mono text-sm'>
        <div className='flex items-center justify-center gap-2'>
          <Activity className='h-4 w-4 text-green-500' />
          {port}
        </div>
      </TableCell>

      {/* 설명 */}
      <TableCell>
        <div className='text-center'>
          <div className='font-medium'>통합센서</div>
          <div className='text-sm text-muted-foreground'>환경 데이터 모니터링</div>
        </div>
      </TableCell>

      {/* PM1.0 */}
      <TableCell>
        <div className='flex items-center justify-center gap-1'>
          <span className='text-sm font-medium'>{formatValue(sensorData.pm10, 'μg/m³')}</span>
        </div>
      </TableCell>

      {/* PM2.5 */}
      <TableCell>
        <div className='flex items-center justify-center gap-1'>
          <span className='text-sm font-medium'>{formatValue(sensorData.pm25, 'μg/m³')}</span>
        </div>
      </TableCell>

      {/* PM10 */}
      <TableCell>
        <div className='flex items-center justify-center gap-1'>
          <span className='text-sm font-medium'>{formatValue(sensorData.pm100, 'μg/m³')}</span>
        </div>
      </TableCell>

      {/* CO2 */}
      <TableCell>
        <div className='flex items-center justify-center gap-1'>
          <span className='text-sm font-medium'>{formatValue(sensorData.co2, 'ppm')}</span>
        </div>
      </TableCell>

      {/* VOC */}
      <TableCell>
        <div className='flex items-center justify-center gap-1'>
          <span className='text-sm font-medium'>{formatValue(sensorData.voc, 'ppb')}</span>
        </div>
      </TableCell>

      {/* 온도 */}
      <TableCell>
        <div className='flex items-center justify-center gap-1'>
          <span className='text-sm font-medium'>{formatValue(sensorData.temperature, '°C')}</span>
        </div>
      </TableCell>

      {/* 습도 */}
      <TableCell>
        <div className='flex items-center justify-center gap-1'>
          <span className='text-sm font-medium'>{formatValue(sensorData.humidity, '%')}</span>
        </div>
      </TableCell>

      {/* 통합센서 alarm 표시 제거 */}

      {/* 마지막 업데이트 */}
      <TableCell>
        <div className='flex items-center justify-center gap-1'>
          <Clock className='h-3 w-3 text-muted-foreground' />
          <span className='text-sm text-muted-foreground'>{formatLastUpdated(sensorData.lastUpdated)}</span>
        </div>
      </TableCell>
    </TableRow>
  );
};
