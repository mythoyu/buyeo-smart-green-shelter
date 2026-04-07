import { useState, useEffect, useCallback } from 'react';

import { UnitBulkCommandStatusDto } from '../../../api/dto/Device.dto';
import { useSendUnitBulkCommands, useGetUnitBulkCommandStatus } from '../../../api/queries/device';

export interface Command {
  action: string;
  value: any;
}

// API 응답 타입 정의
export interface CommandStatusResponse {
  success: boolean;
  message: string;
  data: CommandStatusItem[];
}

export interface CommandStatusItem {
  requestId: string;
  action: string;
  status: 'waiting' | 'success' | 'fail'; // 'pending' → 'waiting'으로 변경
  error?: string;
  finishedAt?: string;
}

// 명령 전송 응답 타입
export interface CommandSendResponse {
  success: boolean;
  message: string;
  data: Array<{
    requestId: string;
    action: string;
    [key: string]: any;
  }>;
}

export interface CommandManagerProps {
  deviceId: string;
  unitId: string;
  onCommandComplete?: (success: boolean, result?: any) => void;
  onStatusChange?: (status: CommandStatus) => void;
}

export type CommandStatus = 'idle' | 'loading' | 'success' | 'error';

export const useCommandManager = (deviceId: string, unitId: string) => {
  const [commandStatus, setCommandStatus] = useState<CommandStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [requestIds, setRequestIds] = useState<string[]>([]);
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // 폴링 설정 상수
  const POLLING_INTERVAL = 300; // 300ms (0.3초)
  const POLLING_TIMEOUT = 30000; // 30초 타임아웃
  const AUTO_RESET_DELAY = 1000; // 1초 후 자동 초기화

  // API 훅들
  const sendCommandMutation = useSendUnitBulkCommands();
  const getStatusQuery = useGetUnitBulkCommandStatus(deviceId, unitId, requestIds, {
    enabled: requestIds.length > 0,
  });

  // 명령 상태 폴링
  useEffect(() => {
    if (requestIds.length === 0 || commandStatus === 'idle') return;

    console.log(`🔄 폴링 시작 - 간격: ${POLLING_INTERVAL}ms, requestIds: ${requestIds.length}개`);

    const pollInterval = setInterval(async () => {
      const pollStartTime = Date.now();
      console.log(`🕐 폴링 실행 시작: ${new Date(pollStartTime).toISOString()}`);

      try {
        console.log('🔄 명령 상태 폴링 중...', { requestIds, currentData: getStatusQuery.data });

        // 강제로 새로운 API 요청 (캐시 무효화)
        console.log('🔄 강제 API 요청 시작...');
        const refetchResult = await getStatusQuery.refetch();
        console.log('🔄 API 요청 결과:', refetchResult);

        // 현재 상태 데이터 확인
        const currentStatusData = refetchResult.data as UnitBulkCommandStatusDto[] | undefined;

        console.log('🔍 폴링 데이터 확인:', {
          currentStatusData,
          dataLength: currentStatusData?.length,
          data: currentStatusData,
        });

        if (currentStatusData && currentStatusData.length > 0) {
          console.log('🔍 현재 상태 데이터:', currentStatusData);

          // 완료된 명령 수 계산
          const completedCount = currentStatusData.filter(
            item => item.status === 'success' || item.status === 'fail'
          ).length;

          // 진행률 업데이트 (Progress Bar용)
          setProgress(prev => ({
            ...prev,
            current: completedCount,
          }));

          console.log('📊 Progress Bar 업데이트:', {
            current: completedCount,
            total: currentStatusData.length,
            percentage: Math.round((completedCount / currentStatusData.length) * 100),
          });

          // 모든 명령이 완료되었는지 확인
          const allCompleted = currentStatusData.every(item => item.status === 'success' || item.status === 'fail');

          console.log('🔍 명령 완료 상태:', {
            total: currentStatusData.length,
            completed: completedCount,
            allCompleted,
            statuses: currentStatusData.map(item => ({ requestId: item.requestId, status: item.status })),
            waitingCount: currentStatusData.filter(item => item.status === 'waiting').length,
            successCount: currentStatusData.filter(item => item.status === 'success').length,
            failCount: currentStatusData.filter(item => item.status === 'fail').length,
          });

          if (allCompleted) {
            console.log('🎯 모든 명령이 완료되었습니다. 폴링을 중지합니다.');
            // 모든 명령이 완료됨 - 폴링 중지
            const hasError = currentStatusData.some(item => item.status === 'fail');

            if (hasError && commandStatus !== 'error') {
              console.log('❌ 일부 명령 실행 실패:', currentStatusData);
              setCommandStatus('error');
              setError('일부 명령 실행에 실패했습니다.');
            } else if (!hasError && commandStatus !== 'success') {
              console.log('✅ 모든 명령 실행 성공:', currentStatusData);
              setCommandStatus('success');
              setError(null);
            }

            // 폴링 중지 및 상태 정리
            clearInterval(pollInterval);
            setPollingStartTime(null);
            console.log('🛑 폴링 중지됨 - 모든 명령 완료');

            // success 상태는 유지하고, 1초 후에만 idle로 전환
            if (!hasError) {
              // 1초 후에 idle로 전환 (다이얼로그가 0.5초간 표시되도록)
              setTimeout(() => {
                setCommandStatus('idle');
              }, 1000);

              // 3초 후 완전 초기화
              setTimeout(() => {
                resetStatus();
              }, AUTO_RESET_DELAY);
            } else {
              // 에러가 있는 경우 즉시 초기화
              setTimeout(() => {
                resetStatus();
              }, AUTO_RESET_DELAY);
            }

            return;
          }
          // 아직 완료되지 않은 명령이 있음 (waiting 상태 포함)
          console.log('⏳ 아직 완료되지 않은 명령이 있습니다. 폴링을 계속합니다:', {
            waiting: currentStatusData.filter(item => item.status === 'waiting').length,
            completed: completedCount,
            total: currentStatusData.length,
          });
        } else {
          // 데이터가 빈 배열인 경우 - 계속 대기 (waiting 상태)
          console.log('⏳ 명령 상태 데이터가 아직 준비되지 않음, 계속 대기... (waiting 상태)');

          // 폴링 타임아웃 체크
          if (pollingStartTime && Date.now() - pollingStartTime > POLLING_TIMEOUT) {
            console.log(`⏰ 폴링 타임아웃 (${POLLING_TIMEOUT / 1000}초), 상태를 error로 설정`);
            setCommandStatus('error');
            setError(`명령 실행 시간이 초과되었습니다. (${POLLING_TIMEOUT / 1000}초)`);
            clearInterval(pollInterval);
            setRequestIds([]);
            setPollingStartTime(null);
            return;
          }
        }

        const pollEndTime = Date.now();
        const pollDuration = pollEndTime - pollStartTime;
        console.log(`🕐 폴링 실행 완료: ${new Date(pollEndTime).toISOString()}, 소요시간: ${pollDuration}ms`);
      } catch (error) {
        console.error('❌ 상태 폴링 중 오류:', error);
        setError('상태 조회 중 오류가 발생했습니다.');

        // 에러 발생 시 폴링 중지
        clearInterval(pollInterval);
        setRequestIds([]);
        setPollingStartTime(null);

        const pollEndTime = Date.now();
        const pollDuration = pollEndTime - pollStartTime;
        console.log(`🕐 폴링 실행 완료 (에러): ${new Date(pollEndTime).toISOString()}, 소요시간: ${pollDuration}ms`);
      }
    }, POLLING_INTERVAL);

    // 정리 함수에서 확실하게 인터벌 정리
    return () => {
      console.log('🛑 폴링 정리됨');
      clearInterval(pollInterval);
    };
  }, [requestIds, commandStatus]); // getStatusQuery 의존성 제거

  // 명령 실행 함수
  const executeCommand = useCallback(
    async (commands: Command[]): Promise<void> => {
      try {
        // deviceId와 unitId 유효성 검사
        if (!deviceId || !unitId) {
          console.error('❌ CommandManager: deviceId 또는 unitId가 유효하지 않습니다:', { deviceId, unitId });
          setError('디바이스 ID 또는 유닛 ID가 유효하지 않습니다.');
          setCommandStatus('error');
          return;
        }

        console.log('🚀 CommandManager.executeCommand 시작:', { commands, deviceId, unitId });

        setCommandStatus('loading');
        setError(null);
        setProgress({ current: 0, total: commands.length });

        const result = await sendCommandMutation.mutateAsync({
          deviceId,
          unitId,
          commands,
        });

        console.log('🚀 명령 전송 결과:', result);

        // requestIds 추출 (result는 UnitBulkCommandResponseDto[] 배열)
        let newRequestIds: string[] = [];
        if (Array.isArray(result)) {
          newRequestIds = result.map((item: any) => {
            console.log('🔍 응답 아이템:', item);
            return item.requestId;
          });
        }

        console.log('🚀 추출된 requestIds:', newRequestIds);

        if (newRequestIds.length > 0) {
          setRequestIds(newRequestIds);
          setPollingStartTime(Date.now());
          console.log('🚀 폴링 시작:', {
            requestIds: newRequestIds,
            pollingStartTime: Date.now(),
            interval: `${POLLING_INTERVAL}ms`,
            totalCommands: commands.length,
          });
        } else {
          console.error('❌ requestIds를 추출할 수 없습니다:', result);
          setError('명령 ID를 추출할 수 없습니다.');
          setCommandStatus('error');
        }
      } catch (error) {
        console.error('❌ 명령 실행 실패:', error);
        setError(error instanceof Error ? error.message : '명령 실행에 실패했습니다.');
        setCommandStatus('error');
      }
    },
    [deviceId, unitId, sendCommandMutation]
  );

  // 명령 상태 초기화
  const resetStatus = useCallback(() => {
    console.log('🎯 명령 완료됨, CommandManager 상태 초기화');
    setCommandStatus('idle');
    setRequestIds([]); // 명령 완료 후 requestIds 초기화
    setError(null);
    setPollingStartTime(null);
    setProgress({ current: 0, total: 0 }); // Progress Bar 초기화
  }, []);

  // 현재 상태에 따른 UI 표시용 데이터
  const getStatusInfo = () => {
    switch (commandStatus) {
      case 'loading':
        return {
          text: '명령 실행 중...',
          className: 'text-blue-600',
          icon: '🔄',
        };
      case 'success':
        return {
          text: '명령 완료',
          className: 'text-green-600',
          icon: '✅',
        };
      case 'error':
        return {
          text: error || '명령 실패',
          className: 'text-red-600',
          icon: '❌',
        };
      default:
        return {
          text: '대기 중',
          className: 'text-gray-500',
          icon: '⏳',
        };
    }
  };

  return {
    // 상태
    commandStatus,
    error,
    isLoading: commandStatus === 'loading',
    isProcessing: commandStatus === 'loading' || (requestIds.length > 0 && commandStatus === 'idle'),

    // 진행률
    progress,
    totalCommands: progress.total,
    completedCommands: progress.current,

    // 명령 실행
    executeCommand,
    resetStatus,

    // 상태 정보
    getStatusInfo,

    // 디버깅
    requestIds,
    pollingStartTime,
  };
};
