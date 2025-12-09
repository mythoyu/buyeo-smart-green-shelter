import { RefreshCw, Activity } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { useReadAllHardwareStatus } from '../../../../api/queries/hardware';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../../../ui/table';

import { SensorDataRow } from '../components/SensorDataRow';

import type { SensorPort, SensorData, HardwareControlError } from '../../../../types/hardware';

// 센서 포트 목록 (읽기 전용)
const SENSOR_PORTS: SensorPort[] = ['INTEGRATED_SENSOR'];

interface SensorMonitoringTabProps {
  disabled?: boolean;
  onError?: (error: HardwareControlError) => void;
  pollingStatus?: { pollingEnabled: boolean };
}

/**
 * 센서 모니터링 탭 컴포넌트
 * 통합센서 데이터 읽기 전용
 */
export const SensorMonitoringTab: React.FC<SensorMonitoringTabProps> = ({
  disabled = false,
  onError,
  pollingStatus,
}) => {
  const readAllStatus = useReadAllHardwareStatus();

  // 센서 데이터 상태 관리
  const [sensorData, setSensorData] = useState<SensorData>({
    port: 'INTEGRATED_SENSOR',
    pm10: 0,
    pm25: 0,
    pm100: 0,
    co2: 0,
    voc: 0,
    temperature: 0,
    humidity: 0,
    lastUpdated: new Date().toISOString(),
  });

  // 전체 센서 데이터 읽기 함수
  const handleReadAllStatus = async () => {
    try {
      // 센서 명령 목록
      const sensorCommands = ['PM10', 'PM25', 'PM100', 'CO2', 'VOC', 'TEMP', 'HUM'];

      // 전체 상태 읽기 API 호출
      const result = await readAllStatus.mutateAsync({
        clientId: 'c0101',
        commands: sensorCommands,
      });

      console.log('[SensorMonitoringTab] 센서 데이터 읽기 결과:', result);

      // 결과에서 센서 데이터 추출
      const results = result.data?.results || {};
      const sensorPort = 'INTEGRATED_SENSOR'; // 또는 'SENSOR'

      // 센서 데이터 업데이트
      const newSensorData: SensorData = {
        port: 'INTEGRATED_SENSOR',
        pm10: results[sensorPort]?.PM10?.[0] ?? 0,
        pm25: results[sensorPort]?.PM25?.[0] ?? 0,
        pm100: results[sensorPort]?.PM100?.[0] ?? 0,
        co2: results[sensorPort]?.CO2?.[0] ?? 0,
        voc: results[sensorPort]?.VOC?.[0] ?? 0,
        temperature: results[sensorPort]?.TEMP?.[0] ?? 0,
        humidity: results[sensorPort]?.HUM?.[0] ?? 0,
        lastUpdated: new Date().toISOString(),
      };

      setSensorData(newSensorData);
      toast.success('센서 데이터 읽기 완료', { id: 'hw-sensor-read-success' });
    } catch (error: any) {
      console.error('[SensorMonitoringTab] 센서 데이터 읽기 실패:', error);
      toast.error(`센서 데이터 읽기 실패: ${error.message || '알 수 없는 오류'}`, {
        id: 'hw-sensor-read-error',
      });

      if (onError) {
        onError({
          type: 'hardware_error',
          message: error.message || '센서 데이터 읽기 중 오류가 발생했습니다',
          details: '센서 전체 데이터 읽기',
        });
      }
    }
  };

  // 자동 새로고침 (30초마다)
  useEffect(() => {
    if (!pollingStatus?.pollingEnabled && !disabled) {
      const interval = setInterval(() => {
        handleReadAllStatus();
      }, 30000); // 30초마다

      return () => clearInterval(interval);
    }
    return undefined;
  }, [pollingStatus?.pollingEnabled, disabled]);

  const isLoading = readAllStatus.isPending;

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <Activity className='h-5 w-5' />
              센서 모니터링
            </CardTitle>
            <CardDescription>
              통합센서 데이터 실시간 모니터링 (읽기 전용)
              {disabled && ' (폴링 활성화로 인해 비활성화됨)'}
            </CardDescription>
          </div>

          {!pollingStatus?.pollingEnabled && (
            <Button
              onClick={handleReadAllStatus}
              disabled={isLoading}
              variant='outline'
              size='sm'
              className='flex items-center gap-2'
            >
              <RefreshCw className={`h-4 w-4 ${readAllStatus.isPending ? 'animate-spin' : ''}`} />
              데이터 새로고침
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className='rounded-md border overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[100px] text-center'>센서</TableHead>
                <TableHead className='w-[120px] text-center'>설명</TableHead>
                <TableHead className='w-[100px] text-center'>PM1.0</TableHead>
                <TableHead className='w-[100px] text-center'>PM2.5</TableHead>
                <TableHead className='w-[100px] text-center'>PM10</TableHead>
                <TableHead className='w-[100px] text-center'>CO2</TableHead>
                <TableHead className='w-[100px] text-center'>VOC</TableHead>
                <TableHead className='w-[100px] text-center'>온도</TableHead>
                <TableHead className='w-[100px] text-center'>습도</TableHead>
                <TableHead className='w-[100px] text-center'>알람</TableHead>
                <TableHead className='w-[150px] text-center'>마지막 업데이트</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SENSOR_PORTS.map(port => (
                <SensorDataRow key={port} port={port} sensorData={sensorData} disabled={disabled || isLoading} />
              ))}
            </TableBody>
          </Table>
        </div>

        {isLoading && (
          <div className='absolute inset-0 bg-background/80 flex items-center justify-center rounded-md'>
            <div className='flex items-center gap-2'>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-primary'></div>
              <span className='text-sm text-muted-foreground'>센서 데이터 읽는 중...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SensorMonitoringTab;
