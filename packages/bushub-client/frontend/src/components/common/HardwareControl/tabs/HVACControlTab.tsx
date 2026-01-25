import { RefreshCw, Thermometer, Fan } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { useSendDirectHardwareCommand, useReadAllHardwareStatus } from '../../../../api/queries/hardware';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../../../ui/table';

import { HVACControlRow } from '../components/HVACControlRow';

import type { HVACPort, HVACState, HardwareControlError } from '../../../../types/hardware';

// HVAC 포트 목록
const HVAC_PORTS: HVACPort[] = ['COOLER', 'EXCHANGER'];

// HVAC 포트별 설명 정보
const HVAC_PORT_DESCRIPTIONS: Record<HVACPort, { name: string; description: string; icon: React.ComponentType<any> }> =
  {
    COOLER: {
      name: '냉난방기',
      description: '터미널 냉난방 시스템',
      icon: Thermometer,
    },
    EXCHANGER: {
      name: '전열교환기',
      description: '공기 환기 시스템',
      icon: Fan,
    },
  };

// COOLER 모드 옵션 (냉난방기)
const COOLER_MODE_OPTIONS = [
  { value: 0, label: '냉방' },
  { value: 1, label: '제습' },
  { value: 2, label: '송풍' },
  { value: 3, label: '자동' },
  { value: 4, label: '난방' },
];

// COOLER 속도 옵션 (냉난방기)
const COOLER_SPEED_OPTIONS = [
  { value: 1, label: '약' },
  { value: 2, label: '중' },
  { value: 3, label: '강' },
];

// EXCHANGER 모드 옵션 (전열교환기)
const EXCHANGER_MODE_OPTIONS = [
  { value: 1, label: '수동' },
  { value: 2, label: '자동' },
];

// EXCHANGER 속도 옵션 (전열교환기)
const EXCHANGER_SPEED_OPTIONS = [
  { value: 1, label: '약' },
  { value: 2, label: '중' },
  { value: 3, label: '강' },
  { value: 4, label: '자동' },
];

interface HVACControlTabProps {
  disabled?: boolean;
  onError?: (error: HardwareControlError) => void;
  pollingStatus?: { pollingEnabled: boolean };
}

/**
 * HVAC 제어 탭 컴포넌트
 * 냉난방기 및 전열교환기 제어
 */
export const HVACControlTab: React.FC<HVACControlTabProps> = ({ disabled = false, onError, pollingStatus }) => {
  const sendCommand = useSendDirectHardwareCommand();
  const readAllStatus = useReadAllHardwareStatus();

  // HVAC 상태 관리
  const [hvacStates, setHvacStates] = useState<Map<HVACPort, HVACState>>(() => {
    const initialState = new Map<HVACPort, HVACState>();
    HVAC_PORTS.forEach(port => {
      initialState.set(port, {
        port,
        auto: false,
        power: false,
        mode: 0,
        speed: 0,
        summerTemp: 25,
        winterTemp: 20,
        currentTemp: 22,
        alarm: 0,
        schedule1Start: { hour: 9, minute: 0 },
        schedule1End: { hour: 18, minute: 0 },
        status: 'unknown',
      });
    });
    return initialState;
  });

  // 냉난방기 상태 읽기 함수
  const handleReadCoolerStatus = async () => {
    const commandKey = 'COOLER_READ_STATUS';

    try {
      setLoadingPorts(prev => new Set(prev).add(commandKey));

      const result = await readAllStatus.mutateAsync({
        commands: [
          'AUTO',
          'POWER',
          'MODE',
          'SPEED',
          'SUMMER_CONT_TEMP',
          'WINTER_CONT_TEMP',
          'CUR_TEMP',
          'SCHED1_START_HOUR',
          'SCHED1_START_MIN',
          'SCHED1_END_HOUR',
          'SCHED1_END_MIN',
        ],
      });

      if (result.success && result.data?.results) {
        console.log('[HVACControlTab] 냉난방기 데이터:', result.data.results);

        // COOLER 상태만 업데이트
        setHvacStates(prev => {
          const newStates = new Map<HVACPort, HVACState>();
          prev.forEach((value, key) => {
            newStates.set(key, { ...value });
          });

          const coolerData = result.data?.results?.['COOLER'];
          if (coolerData) {
            const currentState = newStates.get('COOLER');
            if (currentState) {
              const updatedState = { ...currentState };

              Object.entries(coolerData).forEach(([command, values]) => {
                const value = values?.[0];
                if (value !== undefined) {
                  switch (command) {
                    case 'AUTO':
                      updatedState.auto = value === 1;
                      break;
                    case 'POWER':
                      updatedState.power = value === 1;
                      updatedState.status = value === 1 ? 'active' : 'inactive';
                      break;
                    case 'MODE':
                      updatedState.mode = value;
                      break;
                    case 'SPEED':
                      updatedState.speed = value;
                      break;
                    case 'SUMMER_CONT_TEMP':
                      updatedState.summerTemp = value / 10; // 160 -> 16.0°C
                      break;
                    case 'WINTER_CONT_TEMP':
                      updatedState.winterTemp = value / 10; // 180 -> 18.0°C
                      break;
                    case 'CUR_TEMP':
                      updatedState.currentTemp = value / 10; // 온도 값도 10으로 나누기
                      break;
                    case 'ALARM':
                      updatedState.alarm = value;
                      break;
                    case 'SCHED1_START_HOUR':
                      updatedState.schedule1Start = { ...updatedState.schedule1Start, hour: value };
                      break;
                    case 'SCHED1_START_MIN':
                      updatedState.schedule1Start = { ...updatedState.schedule1Start, minute: value };
                      break;
                    case 'SCHED1_END_HOUR':
                      updatedState.schedule1End = { ...updatedState.schedule1End, hour: value };
                      break;
                    case 'SCHED1_END_MIN':
                      updatedState.schedule1End = { ...updatedState.schedule1End, minute: value };
                      break;
                  }
                }
              });

              newStates.set('COOLER', updatedState);
            }
          }

          return newStates;
        });

        toast.success('냉난방기 상태 읽기 완료', { id: 'hw-hvac-cooler-read-success' });
      }
    } catch (error: any) {
      console.error(`[HVACControlTab] 냉난방기 상태 읽기 실패:`, error);
      toast.error(`냉난방기 상태 읽기 실패: ${error.message || '알 수 없는 오류'}`, {
        id: 'hw-hvac-cooler-read-error',
      });

      if (onError) {
        onError({
          type: 'hardware_error',
          message: error.message || '냉난방기 상태 읽기 중 오류가 발생했습니다',
          details: '냉난방기 상태 읽기',
        });
      }
    } finally {
      setLoadingPorts(prev => {
        const newSet = new Set(prev);
        newSet.delete(commandKey);
        return newSet;
      });
    }
  };

  // 전열교환기 상태 읽기 함수
  const handleReadExchangerStatus = async () => {
    const commandKey = 'EXCHANGER_READ_STATUS';

    try {
      setLoadingPorts(prev => new Set(prev).add(commandKey));

      const result = await readAllStatus.mutateAsync({
        commands: [
          'AUTO',
          'POWER',
          'MODE',
          'SPEED',
          'SCHED1_START_HOUR',
          'SCHED1_START_MIN',
          'SCHED1_END_HOUR',
          'SCHED1_END_MIN',
        ],
      });

      if (result.success && result.data?.results) {
        console.log('[HVACControlTab] 전열교환기 데이터:', result.data.results);

        // EXCHANGER 상태만 업데이트
        setHvacStates(prev => {
          const newStates = new Map<HVACPort, HVACState>();
          prev.forEach((value, key) => {
            newStates.set(key, { ...value });
          });

          const exchangerData = result.data?.results?.['EXCHANGER'];
          if (exchangerData) {
            const currentState = newStates.get('EXCHANGER');
            if (currentState) {
              const updatedState = { ...currentState };

              Object.entries(exchangerData).forEach(([command, values]) => {
                const value = values?.[0];
                if (value !== undefined) {
                  switch (command) {
                    case 'AUTO':
                      updatedState.auto = value === 1;
                      break;
                    case 'POWER':
                      updatedState.power = value === 1;
                      updatedState.status = value === 1 ? 'active' : 'inactive';
                      break;
                    case 'MODE':
                      updatedState.mode = value;
                      break;
                    case 'SPEED':
                      updatedState.speed = value;
                      break;
                    case 'ALARM':
                      updatedState.alarm = value;
                      break;
                    case 'SCHED1_START_HOUR':
                      updatedState.schedule1Start = { ...updatedState.schedule1Start, hour: value };
                      break;
                    case 'SCHED1_START_MIN':
                      updatedState.schedule1Start = { ...updatedState.schedule1Start, minute: value };
                      break;
                    case 'SCHED1_END_HOUR':
                      updatedState.schedule1End = { ...updatedState.schedule1End, hour: value };
                      break;
                    case 'SCHED1_END_MIN':
                      updatedState.schedule1End = { ...updatedState.schedule1End, minute: value };
                      break;
                  }
                }
              });

              newStates.set('EXCHANGER', updatedState);
            }
          }

          return newStates;
        });

        toast.success('전열교환기 상태 읽기 완료', { id: 'hw-hvac-exchanger-read-success' });
      }
    } catch (error: any) {
      console.error(`[HVACControlTab] 전열교환기 상태 읽기 실패:`, error);
      toast.error(`전열교환기 상태 읽기 실패: ${error.message || '알 수 없는 오류'}`, {
        id: 'hw-hvac-exchanger-read-error',
      });

      if (onError) {
        onError({
          type: 'hardware_error',
          message: error.message || '전열교환기 상태 읽기 중 오류가 발생했습니다',
          details: '전열교환기 상태 읽기',
        });
      }
    } finally {
      setLoadingPorts(prev => {
        const newSet = new Set(prev);
        newSet.delete(commandKey);
        return newSet;
      });
    }
  };

  // 개별 포트별 로딩 상태 관리
  const [loadingPorts, setLoadingPorts] = useState<Set<string>>(new Set());

  // 명령 실행 함수
  const handleCommand = async (port: HVACPort, command: string, value: boolean | number) => {
    const commandKey = `${port}-${command}`;

    try {
      // 로딩 상태 시작
      setLoadingPorts(prev => new Set(prev).add(commandKey));

      const success = await sendCommand.mutateAsync({ port, command, value });

      if (success) {
        setHvacStates(prev => {
          const newStates = new Map<HVACPort, HVACState>(); // 완전히 새로운 Map 생성

          // 기존 상태를 먼저 복사
          prev.forEach((value, key) => {
            newStates.set(key, { ...value });
          });

          const currentState = newStates.get(port);
          if (currentState) {
            const updatedState = { ...currentState }; // 새로운 객체 생성

            // 명령에 따른 상태 업데이트
            switch (command) {
              case 'AUTO':
                updatedState.auto = value as boolean;
                break;
              case 'POWER':
                updatedState.power = value as boolean;
                updatedState.status = (value as boolean) ? 'active' : 'inactive';
                break;
              case 'MODE':
                updatedState.mode = value as number;
                break;
              case 'SPEED':
                updatedState.speed = value as number;
                break;
              case 'SUMMER_CONT_TEMP':
                updatedState.summerTemp = (value as number) / 10; // 160 -> 16.0°C
                break;
              case 'WINTER_CONT_TEMP':
                updatedState.winterTemp = (value as number) / 10; // 180 -> 18.0°C
                break;
              case 'ALARM':
                updatedState.alarm = value as number;
                break;
              case 'SCHED1_START_HOUR':
                updatedState.schedule1Start = { ...currentState.schedule1Start, hour: value as number };
                break;
              case 'SCHED1_START_MIN':
                updatedState.schedule1Start = { ...currentState.schedule1Start, minute: value as number };
                break;
              case 'SCHED1_END_HOUR':
                updatedState.schedule1End = { ...currentState.schedule1End, hour: value as number };
                break;
              case 'SCHED1_END_MIN':
                updatedState.schedule1End = { ...currentState.schedule1End, minute: value as number };
                break;
            }

            newStates.set(port, updatedState);
          }
          return newStates;
        });

        const portInfo = HVAC_PORT_DESCRIPTIONS[port];
        toast.success(`${portInfo.name} 제어 성공`, {
          id: `hw-hvac-${port.toLowerCase()}-${command.toLowerCase()}-success`,
        });
      }
    } catch (error: any) {
      console.error('[HVACControlTab] 명령 실행 실패:', error);
      toast.error(`명령 실행 실패: ${error.message || '알 수 없는 오류'}`, {
        id: `hw-hvac-${port.toLowerCase()}-${command.toLowerCase()}-error`,
      });

      if (onError) {
        onError({
          type: 'hardware_error',
          message: error.message || 'HVAC 제어 중 오류가 발생했습니다',
          details: `${port} ${command} = ${value}`,
        });
      }
    } finally {
      // 로딩 상태 해제
      setLoadingPorts(prev => {
        const newSet = new Set(prev);
        newSet.delete(commandKey);
        return newSet;
      });
    }
  };

  // 로딩 상태 (개별 포트별 로딩 또는 전체 읽기 로딩)
  const isLoading = loadingPorts.size > 0;

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <Thermometer className='h-5 w-5' />
              HVAC 제어
            </CardTitle>
            <CardDescription>
              냉난방기 및 전열교환기 제어 및 모니터링
              {disabled && ' (폴링 활성화로 인해 비활성화됨)'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-6'>
          {/* 냉난방기 (COOLER) 테이블 */}
          <div>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-lg font-semibold flex items-center gap-2'>
                <Thermometer className='h-5 w-5' />
                냉난방기 (COOLER)
              </h3>
              {!pollingStatus?.pollingEnabled && (
                <Button
                  onClick={handleReadCoolerStatus}
                  disabled={isLoading}
                  variant='outline'
                  size='sm'
                  className='flex items-center gap-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                >
                  <RefreshCw className={`h-4 w-4 ${loadingPorts.has('COOLER_READ_STATUS') ? 'animate-spin' : ''}`} />
                  냉난방기 상태 읽기
                </Button>
              )}
            </div>
            <div className='rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[100px] text-center'>장치</TableHead>
                    <TableHead className='w-[80px] text-center'>전원</TableHead>
                    <TableHead className='w-[80px] text-center'>자동/수동</TableHead>
                    <TableHead className='w-[80px] text-center'>모드</TableHead>
                    <TableHead className='w-[80px] text-center'>속도</TableHead>
                    <TableHead className='w-[100px] text-center'>여름온도</TableHead>
                    <TableHead className='w-[100px] text-center'>겨울온도</TableHead>
                    <TableHead className='w-[100px] text-center'>현재온도</TableHead>
                    <TableHead className='w-[120px] text-center'>스케줄 시작</TableHead>
                    <TableHead className='w-[120px] text-center'>스케줄 종료</TableHead>
                    <TableHead className='w-[80px] text-center'>알람</TableHead>
                    <TableHead className='w-[80px] text-center'>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {HVAC_PORTS.filter(port => port === 'COOLER').map(port => {
                    const hvacState = hvacStates.get(port);
                    const portInfo = HVAC_PORT_DESCRIPTIONS[port];

                    return (
                      <HVACControlRow
                        key={port}
                        port={port}
                        portName={portInfo.name}
                        portDescription={portInfo.description}
                        Icon={portInfo.icon}
                        hvacState={hvacState}
                        disabled={disabled || isLoading}
                        loadingCommands={Array.from(loadingPorts)
                          .filter(key => key.startsWith(port))
                          .map(key => key.split('-')[1])}
                        modeOptions={COOLER_MODE_OPTIONS}
                        speedOptions={COOLER_SPEED_OPTIONS}
                        onCommand={handleCommand}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 전열교환기 (EXCHANGER) 테이블 */}
          <div>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-lg font-semibold flex items-center gap-2'>
                <Fan className='h-5 w-5' />
                전열교환기 (EXCHANGER)
              </h3>
              {!pollingStatus?.pollingEnabled && (
                <Button
                  onClick={handleReadExchangerStatus}
                  disabled={isLoading}
                  variant='outline'
                  size='sm'
                  className='flex items-center gap-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                >
                  <RefreshCw className={`h-4 w-4 ${loadingPorts.has('EXCHANGER_READ_STATUS') ? 'animate-spin' : ''}`} />
                  전열교환기 상태 읽기
                </Button>
              )}
            </div>
            <div className='rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[60px] lg:w-[100px] text-center'>장치</TableHead>
                    <TableHead className='w-[50px] lg:w-[80px] text-center'>전원</TableHead>
                    <TableHead className='w-[50px] lg:w-[80px] text-center hidden sm:table-cell'>자동/수동</TableHead>
                    <TableHead className='w-[50px] lg:w-[80px] text-center hidden lg:table-cell'>모드</TableHead>
                    <TableHead className='w-[50px] lg:w-[80px] text-center hidden lg:table-cell'>속도</TableHead>
                    <TableHead className='w-[80px] lg:w-[120px] text-center hidden xl:table-cell'>
                      스케줄 시작
                    </TableHead>
                    <TableHead className='w-[80px] lg:w-[120px] text-center hidden xl:table-cell'>
                      스케줄 종료
                    </TableHead>
                    <TableHead className='w-[50px] lg:w-[80px] text-center'>알람</TableHead>
                    <TableHead className='w-[50px] lg:w-[80px] text-center'>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {HVAC_PORTS.filter(port => port === 'EXCHANGER').map(port => {
                    const hvacState = hvacStates.get(port);
                    const portInfo = HVAC_PORT_DESCRIPTIONS[port];

                    return (
                      <HVACControlRow
                        key={port}
                        port={port}
                        portName={portInfo.name}
                        portDescription={portInfo.description}
                        Icon={portInfo.icon}
                        hvacState={hvacState}
                        disabled={disabled || isLoading}
                        loadingCommands={Array.from(loadingPorts)
                          .filter(key => key.startsWith(port))
                          .map(key => key.split('-')[1])}
                        modeOptions={EXCHANGER_MODE_OPTIONS}
                        speedOptions={EXCHANGER_SPEED_OPTIONS}
                        onCommand={handleCommand}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* {isLoading && (
          <div className='absolute inset-0 bg-background/80 flex items-center justify-center rounded-md'>
            <div className='flex items-center gap-2'>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-primary'></div>
              <span className='text-sm text-muted-foreground'>명령 실행 중...</span>
            </div>
          </div>
        )} */}
      </CardContent>
    </Card>
  );
};

export default HVACControlTab;
