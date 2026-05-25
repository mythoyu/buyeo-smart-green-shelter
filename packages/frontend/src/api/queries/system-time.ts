import { useQuery } from '@tanstack/react-query';

import { internalApi } from '../axiosInstance';

export interface SystemTimeKst {
  year: number;
  month: number;
  day: number;
  dow: number;
  hour: number;
  minute: number;
  second: number;
}

export interface SystemTimeData {
  nowIso: string;
  kst: SystemTimeKst;
}

export const useGetSystemTime = (options?: { enabled?: boolean; refetchInterval?: number }) => {
  return useQuery<SystemTimeData>({
    queryKey: ['system', 'time'],
    queryFn: async () => {
      const response = await internalApi.get<{ success: boolean; data: SystemTimeData }>('/system/time');
      return response.data.data;
    },
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? 60_000,
    enabled: options?.enabled ?? true,
  });
};
