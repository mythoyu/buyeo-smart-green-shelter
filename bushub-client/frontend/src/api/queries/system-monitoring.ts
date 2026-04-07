import { useQuery } from '@tanstack/react-query';

import { internalApi } from '../axiosInstance';

export interface SystemMonitoringData {
  server: {
    status: string;
    uptime: number;
    memory: {
      used: number;
      total: number;
      external: number;
      rss: number;
      usagePercent: number;
      maxHeap: number;
    };
    cpu: {
      user: number;
      system: number;
    };
    system: {
      totalMemory: number;
      freeMemory: number;
      usedMemory: number;
      rawTotalMemory: number;
      loadAverage: number[];
      cpuCount: number;
    };
    process: {
      pid: number;
      version: string;
      platform: string;
      arch: string;
    };
    timestamp: string;
  };
  superiorServer?: {
    name: string;
    status: string;
    success?: boolean;
    message?: string;
    responseTime?: number;
    timestamp: string;
  };
  database: {
    status: string;
    readyState: number;
    readyStateText: string;
    collections?: number;
    size?: number;
    indexes?: number;
    objects?: number;
    avgObjSize?: number;
    error?: string;
    timestamp: string;
  };
  services: {
    deviceDomain: Record<string, { available: boolean; status: string }>;
    systemDomain: Record<string, { available: boolean; status: string }>;
    userDomain: Record<string, { available: boolean; status: string }>;
    timestamp: string;
  };
  hardware: {
    ddc: {
      connected: boolean;
      services: Record<string, { status: string }>;
      summary: string;
      error?: string;
      timestamp: string;
    };
    modbus: {
      isConnected: boolean;
      connectionStatus: {
        isConnected: boolean;
        retryCount: number;
        maxRetries: number;
      };
      serviceStatus: {
        mockMode: boolean;
        activeService: string;
      };
      error?: string;
      timestamp: string;
    };
    timestamp: string;
  };
  memory: {
    metrics: Record<string, any>;
    error?: string;
    timestamp: string;
  };
  // 🆕 새로운 모니터링 데이터 추가
  polling: {
    enabled: boolean;
    interval: number;
    applyInProgress: boolean;
    isCycleRunning: boolean;
    stats: {
      totalCalls: number;
      successfulPolls: number;
      failedPolls: number;
      averageResponseTime: number;
      lastCleanup: string;
    };
    error?: string;
    timestamp: string;
  };
  pollingRecovery: {
    isRunning: boolean;
    lastRecoveryTime: string | null;
    recoveryCount: number;
    error?: string;
    timestamp: string;
  };
  ddcTimeSync: {
    isRunning: boolean;
    lastSyncTime: string | null;
    syncCount: number;
    error?: string;
    timestamp: string;
  };
  overall: {
    status: string;
    timestamp: string;
  };
  timestamp: string;
}

export interface DatabaseCollection {
  name: string;
  type: string;
}

export interface CollectionData {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const useGetSystemMonitoring = () => {
  return useQuery({
    queryKey: ['system', 'monitoring'],
    queryFn: async (): Promise<SystemMonitoringData> => {
      const response = await internalApi.get('/system/monitoring');
      // API 응답에서 data.data.data 구조를 올바르게 처리
      return response.data.data.data;
    },
    refetchInterval: 15000, // 15초 간격으로 조정 (성능 개선)
    staleTime: 10000, // 10초 후 stale로 간주
    refetchOnWindowFocus: true, // 윈도우 포커스 시 재요청
    refetchIntervalInBackground: false, // 백그라운드 폴링 비활성화 (배터리 절약)
    retry: 2, // 에러 시 2번 재시도 (빠른 실패)
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // 최대 10초 지연
  });
};

export const useGetDatabaseCollections = () => {
  return useQuery({
    queryKey: ['database', 'collections'],
    queryFn: async (): Promise<DatabaseCollection[]> => {
      const response = await internalApi.get('/database/collections');
      // API 응답에서 data.data 구조를 올바르게 처리
      return response.data.data.data;
    },
    staleTime: 30000, // 30초 후 stale로 간주
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useGetCollectionData = (collectionName: string, page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ['database', 'collection', collectionName, page, limit],
    queryFn: async (): Promise<CollectionData> => {
      const response = await internalApi.get(`/database/collection/${collectionName}?page=${page}&limit=${limit}`);
      // API 응답에서 data.data 구조를 올바르게 처리
      return response.data.data.data;
    },
    enabled: !!collectionName, // collectionName이 있을 때만 실행
    staleTime: 10000, // 10초 후 stale로 간주
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
