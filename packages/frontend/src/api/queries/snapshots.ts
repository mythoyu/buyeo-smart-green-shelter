import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { internalApi } from '../axiosInstance';

// 스냅샷 타입 정의
export interface Snapshot {
  id: string;
  name: string;
  type: 'system' | 'data';
  description?: string;
  createdAt: string;
  createdBy: string;
  size: number;
}

export interface SnapshotListResponse {
  snapshots: Snapshot[];
  total: number;
  limit: number;
  offset: number;
}

export interface SaveSnapshotRequest {
  name: string;
  type: 'system' | 'data';
  description?: string;
}

export interface LoadSnapshotResponse {
  id: string;
  name: string;
  type: 'system' | 'data';
  appliedAt: string;
}

// 스냅샷 목록 조회 (클라이언트별 필터링)
export const useGetSnapshots = (clientId: string, type?: 'system' | 'data', limit = 20, offset = 0) => {
  return useQuery<SnapshotListResponse>({
    queryKey: ['snapshots', 'list', clientId, type, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('clientId', clientId);
      if (type) params.append('type', type);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await internalApi.get(`/snapshots/list?${params}`);
      return response.data.data;
    },
    enabled: !!clientId, // clientId가 있을 때만 쿼리 실행
    staleTime: 30000, // 30초
  });
};

// 스냅샷 저장
export const useSaveSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SaveSnapshotRequest) => {
      const response = await internalApi.post('/snapshots/save', data);
      return response.data;
    },
    onSuccess: () => {
      // 스냅샷 목록 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['snapshots', 'list'] });
    },
  });
};

// 스냅샷 로드/적용
export const useLoadSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await internalApi.post(`/snapshots/load/${id}`);
      return response.data;
    },
    onSuccess: data => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: ['snapshots', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['system', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'data'] });

      // 🆕 성공 메시지에 더 자세한 정보 포함
    },
    onError: error => {
      console.error('[Snapshot Apply] 실패:', error);
    },
  });
};

// 🆕 스냅샷 적용 진행 상황 조회 (간단 버전)
export const useSnapshotApplyProgress = () => {
  return useQuery({
    queryKey: ['snapshots', 'apply-progress'],
    queryFn: async () => {
      const response = await internalApi.get('/snapshots/apply-progress');
      return response.data;
    },
    enabled: false, // 수동으로만 호출
  });
};

// 스냅샷 삭제
export const useDeleteSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await internalApi.delete(`/snapshots/${id}`);
      return response.data;
    },
    onSuccess: () => {
      // 스냅샷 목록 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['snapshots', 'list'] });
    },
    onError: error => {
      console.error('스냅샷 삭제 실패:', error);
    },
  });
};

// 스냅샷 내보내기
export const useExportSnapshot = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await internalApi.get(`/snapshots/export/${id}`);
      return response.data;
    },
  });
};
