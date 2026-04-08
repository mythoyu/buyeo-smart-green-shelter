import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

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
  /** 미지정 시 전 유닛 합산 */
  unitId?: string;
  enabled?: boolean;
}) => {
  return useQuery<PeopleCounterStats>({
    queryKey: [
      'people-counter',
      'stats',
      options?.period,
      options?.startDate,
      options?.endDate,
      options?.unitId,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.period) params.append('period', options.period);
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);
      if (options?.unitId) params.append('unitId', options.unitId);
      const response = await externalApi.get(`/people-counter/stats?${params.toString()}`);
      return response.data.data;
    },
    staleTime: 10000, // 10초
    enabled: options?.enabled ?? true,
  });
};

export const useGetPeopleCounterHourlyStats = (options: {
  date: string;
  unitId?: string;
  enabled?: boolean;
}) => {
  return useQuery<PeopleCounterHourlyStats>({
    queryKey: ['people-counter', 'hourly-stats', options.date, options.unitId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('date', options.date);
      if (options.unitId) params.append('unitId', options.unitId);
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
  unitId?: string;
  enabled?: boolean;
}) => {
  return useQuery<{ data: PeopleCounterRawData[]; total: number }>({
    queryKey: ['people-counter', 'raw', options?.startDate, options?.endDate, options?.limit, options?.unitId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.unitId) params.append('unitId', options.unitId);
      const response = await externalApi.get(`/people-counter/raw?${params.toString()}`);
      return response.data.data;
    },
    staleTime: 10000, // 10초
    enabled: options?.enabled ?? true,
  });
};

export interface PeopleCounterUsage10MinBucket {
  start: string;
  end: string;
  inCount: number;
}

export interface PeopleCounterUsage10Min {
  range: {
    start: string;
    end: string;
  };
  bucketSizeMinutes: number;
  buckets: PeopleCounterUsage10MinBucket[];
}

export const useGetPeopleCounterUsage10Min = (options: {
  start: string;
  end: string;
  unitId?: string;
  enabled?: boolean;
}) => {
  return useQuery<PeopleCounterUsage10Min>({
    queryKey: ['people-counter', 'usage-10min', options.start, options.end, options.unitId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('start', options.start);
      params.append('end', options.end);
      if (options.unitId) params.append('unitId', options.unitId);
      const response = await externalApi.get(`/people-counter/usage-10min?${params.toString()}`);
      return response.data.data;
    },
    staleTime: 10000,
    enabled: (options.enabled ?? true) && !!options.start && !!options.end,
  });
};

export const useResetPeopleCounterData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: { unitId?: string }) => {
      const response = await internalApi.post('/system/people-counter/reset-data', payload ?? {});
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
    mutationFn: async (payload: ResetType | { type: ResetType; unitId?: string }) => {
      const body =
        typeof payload === 'string'
          ? { type: payload }
          : { type: payload.type, ...(payload.unitId ? { unitId: payload.unitId } : {}) };
      const response = await internalApi.post('/system/people-counter/reset', body);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientData'] });
      queryClient.invalidateQueries({ queryKey: ['people-counter'] });
    },
  });
};

/** PEOPLE_COUNTER_PORTS 유닛별 APC 수동 송수신 (`POST /system/people-counter/apc-test`) */
export interface PeopleCounterApcTestPayload {
  data: string;
  /** 서버에 등록된 유닛(예: u001, u002). 미지정 시 백엔드 기본 u001 */
  unitId?: string;
  timeoutMs?: number;
  waitForClosingBracket?: boolean;
}

export interface PeopleCounterApcTestResult {
  sent: string;
  received: string | null;
  timedOut: boolean;
  writeOnly: boolean;
}

export const useGetPeopleCounterUnits = (options?: { enabled?: boolean }) => {
  return useQuery<{ unitIds: string[] }>({
    queryKey: ['people-counter', 'units'],
    queryFn: async () => {
      const response = await internalApi.get<{ success: boolean; data: { unitIds: string[] } }>(
        '/system/people-counter/units',
      );
      return response.data.data;
    },
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
};

export const usePeopleCounterApcTest = () => {
  return useMutation({
    mutationFn: async (payload: PeopleCounterApcTestPayload): Promise<PeopleCounterApcTestResult> => {
      try {
        const response = await internalApi.post<{ success: boolean; data: PeopleCounterApcTestResult }>(
          '/system/people-counter/apc-test',
          payload,
        );
        if (!response.data?.success || !response.data.data) {
          throw new Error('APC 테스트 응답이 올바르지 않습니다.');
        }
        return response.data.data;
      } catch (e) {
        if (axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ||
            e.message ||
            'APC 테스트 요청에 실패했습니다.';
          throw new Error(msg);
        }
        throw e;
      }
    },
  });
};
