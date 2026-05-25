import { RefreshCw } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  useReadAllHardwareStatus,
  useSendBulkHardwareCommand,
  useSendDirectHardwareCommand,
} from '../../../../api/queries/hardware';
import { SCHEDULE2_SUPPORTED_PORTS } from '../../../../types/hardware';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../../../ui/table';

import { DOPortTableRow } from '../components/DOPortTableRow';
import { useHardwareTabAutoRead } from '../useHardwareTabAutoRead';

import type { DOPort, DOPortState, HardwareControlError } from '../../../../types/hardware';

// DO 포트 목록
const DO_PORTS: DOPort[] = [
  'DO1',
  'DO2',
  'DO3',
  'DO4',
  'DO5',
  'DO6',
  'DO7',
  'DO8',
  'DO9',
  'DO10',
  'DO11',
  'DO12',
  'DO13',
  'DO14',
  'DO15',
  'DO16',
];

const DO_READ_COMMANDS = [
  'POWER',
  'AUTO',
  'SCHED1_START_HOUR',
  'SCHED1_START_MIN',
  'SCHED1_END_HOUR',
  'SCHED1_END_MIN',
  'SCHED2_START_HOUR',
  'SCHED2_START_MIN',
  'SCHED2_END_HOUR',
  'SCHED2_END_MIN',
] as const;

interface DOPortTabProps {
  disabled?: boolean;
  autoReadToken?: number;
  onError?: (error: HardwareControlError) => void;
  pollingStatus?: { pollingEnabled: boolean };
}

/**
 * DO 포트 제어 탭 컴포넌트
 * 디지털 출력 포트를 통한 하드웨어 직접 제어
 */
export const DOPortTab: React.FC<DOPortTabProps> = ({
  disabled = false,
  autoReadToken,
  onError,
  pollingStatus,
}) => {
  const sendCommand = useSendDirectHardwareCommand();
  const sendBulkCommand = useSendBulkHardwareCommand();
  const readAllStatus = useReadAllHardwareStatus();

  // 포트별 상태 관리
  const [portStates, setPortStates] = useState<Map<DOPort, DOPortState>>(() => {
    const initialState = new Map<DOPort, DOPortState>();
    DO_PORTS.forEach(port => {
      initialState.set(port, {
        port,
        power: false,
        auto: false,
        schedule1Start: { hour: 9, minute: 0 },
        schedule1End: { hour: 18, minute: 0 },
        schedule2Start: { hour: 20, minute: 0 },
        schedule2End: { hour: 23, minute: 0 },
        status: 'unknown',
      });
    });
    return initialState;
  });

  // 전체 상태 읽기 함수
  const handleReadAllStatus = async () => {
    // 전체 읽기 로딩 상태 설정
    const allReadCommands = ['READ_ALL_STATUS'];

    try {
      setLoadingPorts(prev => {
        const newSet = new Set(prev);
        allReadCommands.forEach(cmd => newSet.add(cmd));
        return newSet;
      });

      const result = await readAllStatus.mutateAsync({
        commands: [...DO_READ_COMMANDS],
      });

      if (result.success && result.data?.results) {

        // 모든 포트 상태 업데이트
        setPortStates(prev => {
          const newStates = new Map<DOPort, DOPortState>(); // 완전히 새로운 Map 생성

          // 기존 상태를 먼저 복사
          prev.forEach((value, key) => {
            newStates.set(key, { ...value });
          });

          Object.entries(result.data?.results || {}).forEach(([port, commands]) => {
            const currentState = newStates.get(port as DOPort);
            if (currentState) {
              const updatedState = { ...currentState }; // 새로운 객체 생성

              // 각 명령어별 상태 업데이트
              Object.entries(commands).forEach(([command, data]) => {

                // 데이터가 있으면 사용하고, 없으면 기본값 유지
                if (data.length > 0) {
                  const value = data[0];

                  switch (command) {
                    case 'POWER':
                      updatedState.power = value === 1;
                      updatedState.status = value === 1 ? 'active' : 'inactive';
                      break;
                    case 'AUTO':
                      updatedState.auto = value === 1;
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
                    case 'SCHED2_START_HOUR':
                      updatedState.schedule2Start = { hour: value, minute: updatedState.schedule2Start?.minute ?? 0 };
                      break;
                    case 'SCHED2_START_MIN':
                      updatedState.schedule2Start = { hour: updatedState.schedule2Start?.hour ?? 0, minute: value };
                      break;
                    case 'SCHED2_END_HOUR':
                      updatedState.schedule2End = { hour: value, minute: updatedState.schedule2End?.minute ?? 0 };
                      break;
                    case 'SCHED2_END_MIN':
                      updatedState.schedule2End = { hour: updatedState.schedule2End?.hour ?? 0, minute: value };
                      break;
                  }
                } else {
                  // SCHED2 관련 필드가 빈 배열일 때는 기본값(0:00)으로 설정
                  if (command === 'SCHED2_START_HOUR') {
                    updatedState.schedule2Start = { hour: 0, minute: updatedState.schedule2Start?.minute ?? 0 };
                  } else if (command === 'SCHED2_START_MIN') {
                    updatedState.schedule2Start = { hour: updatedState.schedule2Start?.hour ?? 0, minute: 0 };
                  } else if (command === 'SCHED2_END_HOUR') {
                    updatedState.schedule2End = { hour: 0, minute: updatedState.schedule2End?.minute ?? 0 };
                  } else if (command === 'SCHED2_END_MIN') {
                    updatedState.schedule2End = { hour: updatedState.schedule2End?.hour ?? 0, minute: 0 };
                  }
                }
              });

              newStates.set(port as DOPort, updatedState);
            }
          });

          return newStates;
        });

      }
    } catch (error: any) {
      console.error(`[DOPortTab] 전체 상태 읽기 실패:`, error);
      toast.error(`DO 포트 상태 읽기 실패: ${error.message || '알 수 없는 오류'}`, {
        id: 'hw-do-read-error',
      });

      if (onError) {
        onError({
          type: 'hardware_error',
          message: error.message || 'DO 포트 전체 상태 읽기 중 오류가 발생했습니다',
          details: 'DO 포트 전체 상태 읽기',
        });
      }
    } finally {
      // 전체 읽기 로딩 상태 해제
      setLoadingPorts(prev => {
        const newSet = new Set(prev);
        allReadCommands.forEach(cmd => newSet.delete(cmd));
        return newSet;
      });
    }
  };

  const readAllRef = useRef(handleReadAllStatus);
  readAllRef.current = handleReadAllStatus;
  useHardwareTabAutoRead(autoReadToken, {
    disabled,
    pollingEnabled: pollingStatus?.pollingEnabled,
    onRead: () => readAllRef.current(),
  });

  // 개별 포트별 로딩 상태 관리
  const [loadingPorts, setLoadingPorts] = useState<Set<string>>(new Set());

  const applyDoBulkLocalState = (command: string, value: boolean) => {
    setPortStates(prev => {
      const next = new Map(prev);
      for (const port of DO_PORTS) {
        const current = next.get(port);
        if (!current) {
          continue;
        }
        const updated = { ...current };
        if (command === 'POWER') {
          updated.power = value;
          updated.status = value ? 'active' : 'inactive';
        } else if (command === 'AUTO') {
          updated.auto = value;
        }
        next.set(port, updated);
      }
      return next;
    });
  };

  const runBulkForAllPorts = async (command: string, value: boolean) => {
    const bulkKey = `BULK_${command}`;
    try {
      setLoadingPorts(prev => new Set(prev).add(bulkKey));
      const result = await sendBulkCommand.mutateAsync({ command, value });
      if (result.success) {
        applyDoBulkLocalState(command, value);
        const tx = result.data?.transactionCount ?? 1;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      toast.error(`전체 제어 실패: ${message}`, { id: `hw-do-bulk-${command.toLowerCase()}-error` });
      onError?.({
        type: 'hardware_error',
        message,
        details: `DO bulk ${command}=${value}`,
      });
    } finally {
      setLoadingPorts(prev => {
        const next = new Set(prev);
        next.delete(bulkKey);
        return next;
      });
    }
  };

  // 명령 실행 함수
  const handleCommand = async (port: DOPort, command: string, value: boolean | number) => {
    const commandKey = `${port}-${command}`;

    try {
      // 로딩 상태 시작
      setLoadingPorts(prev => new Set(prev).add(commandKey));

      const success = await sendCommand.mutateAsync({
        port,
        command,
        value,
      });

      if (success) {
        // 성공 시 상태 업데이트
        setPortStates(prev => {
          const newStates = new Map(prev);
          const currentState = newStates.get(port);
          if (currentState) {
            const updatedState = { ...currentState };

            // 명령에 따른 상태 업데이트
            switch (command) {
              case 'POWER':
                updatedState.power = value as boolean;
                updatedState.status = (value as boolean) ? 'active' : 'inactive';
                break;
              case 'AUTO':
                updatedState.auto = value as boolean;
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
              case 'SCHED2_START_HOUR':
                updatedState.schedule2Start = {
                  hour: value as number,
                  minute: currentState.schedule2Start?.minute ?? 0,
                };
                break;
              case 'SCHED2_START_MIN':
                updatedState.schedule2Start = {
                  hour: currentState.schedule2Start?.hour ?? 0,
                  minute: value as number,
                };
                break;
              case 'SCHED2_END_HOUR':
                updatedState.schedule2End = {
                  hour: value as number,
                  minute: currentState.schedule2End?.minute ?? 0,
                };
                break;
              case 'SCHED2_END_MIN':
                updatedState.schedule2End = {
                  hour: currentState.schedule2End?.hour ?? 0,
                  minute: value as number,
                };
                break;
            }

            newStates.set(port, updatedState);
          }
          return newStates;
        });

        // 성공 토스트
      }
    } catch (error: any) {
      console.error(`[DOPortTab] 명령 실행 실패:`, error);

      // 에러 토스트
      toast.error(`명령 실행 실패: ${error.message || '알 수 없는 오류'}`, {
        id: `hw-do-${port.toLowerCase()}-${command.toLowerCase()}-error`,
      });

      // 에러 콜백 호출
      if (onError) {
        onError({
          type: 'hardware_error',
          message: error.message || 'DO 포트 제어 중 오류가 발생했습니다',
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

  const handleScheduleTimePaste = async (
    port: DOPort,
    hourCommand: string,
    minuteCommand: string,
    hour: number,
    minute: number,
  ) => {
    await handleCommand(port, hourCommand, hour);
    await handleCommand(port, minuteCommand, minute);
  };

  // 로딩 상태 (개별 포트별 로딩 또는 전체 읽기 로딩)
  const isLoading = loadingPorts.size > 0;

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle>DO 포트 제어</CardTitle>
            <CardDescription>
              디지털 출력 포트를 통한 하드웨어 직접 제어
              {disabled && ' (폴링 활성화로 인해 비활성화됨)'}
            </CardDescription>
          </div>

          {!pollingStatus?.pollingEnabled && (
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={disabled || isLoading}
                onClick={() => void runBulkForAllPorts('POWER', false)}
              >
                전체 OFF
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={disabled || isLoading}
                onClick={() => void runBulkForAllPorts('POWER', true)}
              >
                전체 ON
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={disabled || isLoading}
                onClick={() => void runBulkForAllPorts('AUTO', false)}
              >
                전체 수동
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={disabled || isLoading}
                onClick={() => void runBulkForAllPorts('AUTO', true)}
              >
                전체 자동
              </Button>
              <Button
                onClick={handleReadAllStatus}
                disabled={isLoading}
                variant='outline'
                size='sm'
                className='flex items-center gap-2'
              >
                <RefreshCw className={`h-4 w-4 ${loadingPorts.has('READ_ALL_STATUS') ? 'animate-spin' : ''}`} />
                전체 상태 읽기
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className='rounded-md border overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[80px] text-center'>포트</TableHead>
                <TableHead className='w-[100px] text-center'>전원</TableHead>
                <TableHead className='w-[100px] text-center'>수동/자동</TableHead>
                <TableHead className='w-[150px] text-center'>스케줄1 시작</TableHead>
                <TableHead className='w-[150px] text-center'>스케줄1 종료</TableHead>
                <TableHead className='w-[150px] text-center'>스케줄2 시작</TableHead>
                <TableHead className='w-[150px] text-center'>스케줄2 종료</TableHead>
                <TableHead className='w-[100px] text-center'>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DO_PORTS.map(port => {
                const portState = portStates.get(port);

                return (
                  <DOPortTableRow
                    key={port}
                    port={port}
                    portState={portState}
                    disabled={disabled || isLoading}
                    loadingCommands={Array.from(loadingPorts)
                      .filter(key => key.startsWith(port))
                      .map(key => key.split('-')[1])}
                    onCommand={handleCommand}
                    onScheduleTimePaste={handleScheduleTimePaste}
                    supportsSchedule2={SCHEDULE2_SUPPORTED_PORTS.includes(port)}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* 로딩 오버레이 */}
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

export default DOPortTab;
