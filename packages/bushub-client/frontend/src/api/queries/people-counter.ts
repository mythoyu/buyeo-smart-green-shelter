import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { externalApi, internalApi } from '../axiosInstance';

export interface PeopleCounterState {
  peopleCounterEnabled: boolean;
}

export type Period = 'hour' | 'day' | 'week' | 'month';
export type ResetType = 'current' | 'in' | 'out' | 'all';

export interface PeopleCounterStats {
  period: Period;
  startDate: string;
  endDate: string;
  stats: {
    inCount: number;
    outCount: number;
    peakCount: number;
    avgCount: number;
    dataPoints: number;
  };
  rawData: Array<{
    timestamp: string;
    inCumulative: number;
    outCumulative: number;
    currentCount: number;
  }>;
}

export interface PeopleCounterRawData {
  timestamp: string;
  inCumulative: number;
  outCumulative: number;
  currentCount: number;
  output1: number;
  output2: number;
  countSetting: number;
  buttonPressed: number;
  sensorStatus: number;
  personLimit: number;
  limitStatus: number;
}

export interface PeopleCounterHourlyBucket {
  start: string;
  end: string;
  inCount: number;
  outCount: number;
  peakCount: number;
  avgCount: number;
  dataPoints: number;
}

export interface PeopleCounterHourlyStats {
  date: string;
  timezone: string;
  buckets: PeopleCounterHourlyBucket[];
}

export const useGetPeopleCounterState = (options?: { enabled?: boolean }) => {
  return useQuery<PeopleCounterState>({
    queryKey: ['people-counter', 'state'],
    queryFn: async () => {
      const response = await internalApi.get('/system/people-counter/state');
      return response.data.data;
    },
    staleTime: 5000,
    enabled: options?.enabled ?? true,
  });
};

export const useUpdatePeopleCounterState = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (peopleCounterEnabled: boolean) => {
      const response = await internalApi.post('/system/people-counter', {
        peopleCounterEnabled,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people-counter', 'state'] });
    },
  });
};

export const useGetPeopleCounterStats = (options?: {
  period?: Period;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}) => {
  return useQuery<PeopleCounterStats>({
    queryKey: ['people-counter', 'stats', options?.period, options?.startDate, options?.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.period) params.append('period', options.period);
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);
      const response = await externalApi.get(`/people-counter/stats?${params.toString()}`);
      return response.data.data;
    },
    staleTime: 10000, // 10초
    enabled: options?.enabled ?? true,
  });
};

export const useGetPeopleCounterHourlyStats = (options: {
  date: string;
  enabled?: boolean;
}) => {
  return useQuery<PeopleCounterHourlyStats>({
    queryKey: ['people-counter', 'hourly-stats', options.date],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('date', options.date);
      const response = await externalApi.get(`/people-counter/hourly-stats?${params.toString()}`);
      return response.data.data;
    },
    staleTime: 10000,
    enabled: (options.enabled ?? true) && !!options.date,
  });
};

export const useGetPeopleCounterRaw = (options?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery<{ data: PeopleCounterRawData[]; total: number }>({
    queryKey: ['people-counter', 'raw', options?.startDate, options?.endDate, options?.limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);
      if (options?.limit) params.append('limit', options.limit.toString());
      const response = await externalApi.get(`/people-counter/raw?${params.toString()}`);
      return response.data.data;
    },
    staleTime: 10000, // 10초
    enabled: options?.enabled ?? true,
  });
};

export const useResetPeopleCounterData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await internalApi.post('/system/people-counter/reset-data');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people-counter', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['people-counter', 'hourly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['people-counter', 'raw'] });
      queryClient.invalidateQueries({ queryKey: ['clientData'] });
    },
  });
};

export const useResetPeopleCounter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (type: ResetType) => {
      const response = await internalApi.post('/system/people-counter/reset', { type });
      return response.data;
    },
    onSuccess: () => {
      // 즉시 refetch로 UX 개선
      queryClient.invalidateQueries({ queryKey: ['clientData'] });
    },
  });
};
