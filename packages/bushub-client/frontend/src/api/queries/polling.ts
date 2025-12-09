import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { internalApi } from '../axiosInstance';

// 폴링 상태 타입
export interface PollingState {
  pollingEnabled: boolean;
  applyInProgress: boolean;
}

// 폴링 상태 조회 옵션
interface UseGetPollingStateOptions {
  enabled?: boolean;
}

// 폴링 상태 조회
export const useGetPollingState = (options?: UseGetPollingStateOptions) => {
  return useQuery<PollingState>({
    queryKey: ['polling', 'state'],
    queryFn: async () => {
      const response = await internalApi.get('/system/polling/state');
      return response.data.data;
    },
    refetchInterval: 5000, // 5초마다 상태 확인
    staleTime: 3000,
    enabled: options?.enabled ?? true, // 기본값 true, 조건부 호출 지원
  });
};

// 폴링 상태 변경
export const useUpdatePollingState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pollingEnabled: boolean) => {
      console.log(`[useUpdatePollingState] API 호출 시작: pollingEnabled=${pollingEnabled}`);
      const response = await internalApi.post('/system/polling', {
        pollingEnabled,
      });
      console.log(`[useUpdatePollingState] API 응답:`, response.data);
      return response.data;
    },
    onSuccess: () => {
      console.log('[useUpdatePollingState] 성공 - 쿼리 무효화');
      // 폴링 상태 쿼리 무효화하여 최신 상태 가져오기
      queryClient.invalidateQueries({ queryKey: ['polling', 'state'] });
    },
    onError: error => {
      console.error('[useUpdatePollingState] 오류:', error);
    },
  });
};
