import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { internalApi } from '../axiosInstance';

export interface PollingRecoveryPromptState {
  promptId: string;
  issuedAt: string;
  expiresAt: string;
  status: string;
}

export interface PollingState {
  pollingEnabled: boolean;
  applyInProgress: boolean;
  modbusPollingActive?: boolean;
  recoveryPrompt?: PollingRecoveryPromptState;
  autoDismissSec?: number;
}

interface UseGetPollingStateOptions {
  enabled?: boolean;
}

export const useGetPollingState = (options?: UseGetPollingStateOptions) => {
  return useQuery<PollingState>({
    queryKey: ['polling', 'state'],
    queryFn: async () => {
      const response = await internalApi.get('/system/polling/state');
      return response.data.data;
    },
    refetchInterval: 5000,
    staleTime: 3000,
    enabled: options?.enabled ?? true,
  });
};

export const useUpdatePollingState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pollingEnabled: boolean) => {
      const response = await internalApi.post('/system/polling', {
        pollingEnabled,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polling', 'state'] });
    },
    onError: error => {
      console.error('[useUpdatePollingState] 오류:', error);
    },
  });
};

export const useRespondToPollingRecovery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { promptId: string; action: 'accept' | 'dismiss' }) => {
      const response = await internalApi.post('/system/polling/recovery/respond', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polling', 'state'] });
    },
  });
};
