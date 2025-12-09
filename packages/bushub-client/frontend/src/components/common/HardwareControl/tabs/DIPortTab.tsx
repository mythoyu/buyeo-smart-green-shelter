import { RefreshCw, Activity } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { useSendDirectHardwareCommand, useReadAllHardwareStatus } from '../../../../api/queries/hardware';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../../../ui/table';

import { DIPortTableRow } from '../components/DIPortTableRow';

import type { DIPort, DIPortState, HardwareControlError } from '../../../../types/hardware';

// DI 포트 목록
const DI_PORTS: DIPort[] = [
  'DI1',
  'DI2',
  'DI3',
  'DI4',
  'DI5',
  'DI6',
  'DI7',
  'DI8',
  'DI9',
  'DI10',
  'DI11',
  'DI12',
  'DI13',
  'DI14',
  'DI15',
  'DI16',
];

// DI 포트별 설명 정보
const DI_PORT_DESCRIPTIONS: Record<DIPort, { name: string; description: string }> = {
  DI1: { name: '입력포트1', description: '디지털 입력 포트 1' },
  DI2: { name: '입력포트2', description: '디지털 입력 포트 2' },
  DI3: { name: '입력포트3', description: '디지털 입력 포트 3' },
  DI4: { name: '입력포트4', description: '디지털 입력 포트 4' },
  DI5: { name: '입력포트5', description: '디지털 입력 포트 5' },
  DI6: { name: '입력포트6', description: '디지털 입력 포트 6' },
  DI7: { name: '입력포트7', description: '디지털 입력 포트 7' },
  DI8: { name: '입력포트8', description: '디지털 입력 포트 8' },
  DI9: { name: '입력포트9', description: '디지털 입력 포트 9' },
  DI10: { name: '입력포트10', description: '디지털 입력 포트 10' },
  DI11: { name: '입력포트11', description: '디지털 입력 포트 11' },
  DI12: { name: '입력포트12', description: '디지털 입력 포트 12' },
  DI13: { name: '입력포트13', description: '디지털 입력 포트 13' },
  DI14: { name: '입력포트14', description: '디지털 입력 포트 14' },
  DI15: { name: '입력포트15', description: '디지털 입력 포트 15' },
  DI16: { name: '입력포트16', description: '디지털 입력 포트 16' },
};

interface DIPortTabProps {
  disabled?: boolean;
  onError?: (error: HardwareControlError) => void;
  pollingStatus?: { pollingEnabled: boolean };
}

/**
 * DI 포트 제어 탭 컴포넌트
 * 디지털 입력 포트 상태 모니터링 및 기능 활성화
 */
export const DIPortTab: React.FC<DIPortTabProps> = ({ disabled = false, onError, pollingStatus }) => {
  const sendCommand = useSendDirectHardwareCommand();
  const readAllStatus = useReadAllHardwareStatus();

  // DI 포트 상태 관리
  const [portStates, setPortStates] = useState<Map<DIPort, DIPortState>>(() => {
    const initialState = new Map<DIPort, DIPortState>();
    DI_PORTS.forEach(port => {
      initialState.set(port, {
        port,
        enabled: false,
        status: false,
        lastUpdated: new Date().toISOString(),
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
        commands: ['ENABLE', 'DI_STATUS'],
      });

      if (result.success && result.data?.results) {
        console.log('[DIPortTab] 받은 데이터:', result.data.results);

        // 모든 포트 상태 업데이트
        setPortStates(prev => {
          const newStates = new Map<DIPort, DIPortState>(); // 완전히 새로운 Map 생성

          // 기존 상태를 먼저 복사
          prev.forEach((value, key) => {
            newStates.set(key, { ...value });
          });

          Object.entries(result.data?.results || {}).forEach(([port, commands]) => {
            console.log(`[DIPortTab] 포트 ${port} 처리 중:`, commands);
            const currentState = newStates.get(port as DIPort);
            if (currentState) {
              const updatedState = { ...currentState }; // 새로운 객체 생성

              // 각 명령어별 상태 업데이트
              Object.entries(commands).forEach(([command, values]) => {
                if (values && values.length > 0) {
                  switch (command) {
                    case 'ENABLE':
                      // ENABLE은 단일 값
                      updatedState.enabled = values[0] === 1;
                      break;
                    case 'DI_STATUS':
                      // DI_STATUS는 단일 값 (coil 방식)
                      updatedState.status = values[0] === 1;
                      break;
                  }
                }
              });

              updatedState.lastUpdated = new Date().toISOString();
              newStates.set(port as DIPort, updatedState);
            }
          });

          console.log('[DIPortTab] 모든 포트 상태 업데이트 완료:', newStates);
          return newStates;
        });

        toast.success(`DI 포트 상태 읽기 완료: ${Object.keys(result.data.results).length}개 포트`, {
          id: 'hw-di-read-success',
        });
      }
    } catch (error: any) {
      console.error(`[DIPortTab] 전체 상태 읽기 실패:`, error);
      toast.error(`DI 포트 상태 읽기 실패: ${error.message || '알 수 없는 오류'}`, {
        id: 'hw-di-read-error',
      });

      if (onError) {
        onError({
          type: 'hardware_error',
          message: error.message || 'DI 포트 전체 상태 읽기 중 오류가 발생했습니다',
          details: 'DI 포트 전체 상태 읽기',
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

  // 개별 포트별 로딩 상태 관리
  const [loadingPorts, setLoadingPorts] = useState<Set<string>>(new Set());

  // 명령 실행 함수 (ENABLE만)
  const handleCommand = async (port: DIPort, command: string, value: boolean) => {
    const commandKey = `${port}-${command}`;

    try {
      // 로딩 상태 시작
      setLoadingPorts(prev => new Set(prev).add(commandKey));

      const success = await sendCommand.mutateAsync({ port, command, value });

      if (success) {
        setPortStates(prev => {
          const newStates = new Map<DIPort, DIPortState>(); // 완전히 새로운 Map 생성

          // 기존 상태를 먼저 복사
          prev.forEach((value, key) => {
            newStates.set(key, { ...value });
          });

          const currentState = newStates.get(port);
          if (currentState) {
            const updatedState = { ...currentState }; // 새로운 객체 생성
            if (command === 'ENABLE') {
              updatedState.enabled = value;
            }
            updatedState.lastUpdated = new Date().toISOString();
            newStates.set(port, updatedState);
          }
          return newStates;
        });

        toast.success(`${port} ${DI_PORT_DESCRIPTIONS[port].name} 제어 성공`, {
          id: `hw-di-${port.toLowerCase()}-${command.toLowerCase()}-success`,
        });
      }
    } catch (error: any) {
      console.error('[DIPortTab] 명령 실행 실패:', error);
      toast.error(`명령 실행 실패: ${error.message || '알 수 없는 오류'}`, {
        id: `hw-di-${port.toLowerCase()}-${command.toLowerCase()}-error`,
      });

      if (onError) {
        onError({
          type: 'hardware_error',
          message: error.message || 'DI 포트 제어 중 오류가 발생했습니다',
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
              <Activity className='h-5 w-5' />
              DI 포트 제어
            </CardTitle>
            <CardDescription>
              디지털 입력 포트 상태 모니터링 및 기능 활성화
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
              <RefreshCw className={`h-4 w-4 ${loadingPorts.has('READ_ALL_STATUS') ? 'animate-spin' : ''}`} />
              전체 상태 읽기
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className='rounded-md border overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[80px] text-center'>포트</TableHead>
                <TableHead className='w-[120px] text-center'>설명</TableHead>
                <TableHead className='w-[100px] text-center'>기능 활성화</TableHead>
                <TableHead className='w-[100px] text-center'>접점 상태</TableHead>
                <TableHead className='w-[150px] text-center'>마지막 업데이트</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DI_PORTS.map(port => {
                const portState = portStates.get(port);
                const portInfo = DI_PORT_DESCRIPTIONS[port];

                return (
                  <DIPortTableRow
                    key={port}
                    port={port}
                    portName={portInfo.name}
                    portDescription={portInfo.description}
                    portState={portState}
                    disabled={disabled || isLoading}
                    loadingCommands={Array.from(loadingPorts)
                      .filter(key => key.startsWith(port))
                      .map(key => key.split('-')[1])}
                    onCommand={handleCommand}
                  />
                );
              })}
            </TableBody>
          </Table>
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

export default DIPortTab;
