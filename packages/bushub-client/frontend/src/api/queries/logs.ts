import { useQuery } from '@tanstack/react-query';

import { internalApi } from '../axiosInstance';

const getLogs = async (params: {
  logType?: string;
  deviceId?: string;
  unitId?: string;
  limit?: number;
  skip?: number;
}): Promise<any[]> => {
  const urlParams = new URLSearchParams();
  if (params.logType) urlParams.append('logType', params.logType);
  if (params.deviceId) urlParams.append('deviceId', params.deviceId);
  if (params.unitId) urlParams.append('unitId', params.unitId);
  urlParams.append('limit', String(params.limit ?? 100));
  urlParams.append('skip', String(params.skip ?? 0));

  const response = await internalApi.get(`/logs?${urlParams.toString()}`);
  // 백엔드의 표준 응답 구조에 맞춰 data를 반환
  return response.data.data || [];
};

// 로그 파일 목록 조회
const getLogFiles = async (): Promise<{
  success: boolean;
  files: string[];
}> => {
  const response = await internalApi.get('/logs/files');
  // 백엔드의 표준 응답 구조에 맞춰 data.files를 반환
  return {
    success: response.data.success,
    files: response.data.data?.files || [],
  };
};

// 로그 파일 내용 조회
const getLogContent = async (params: {
  filename: string;
  lines?: number;
  search?: string;
}): Promise<{
  success: boolean;
  filename: string;
  lines: string[];
  totalLines: number;
}> => {
  const urlParams = new URLSearchParams();
  urlParams.append('filename', params.filename);
  if (params.lines) urlParams.append('lines', String(params.lines));
  if (params.search) urlParams.append('search', params.search);

  const response = await internalApi.get(`/logs/content?${urlParams.toString()}`);
  // 백엔드의 표준 응답 구조에 맞춰 data를 반환
  return {
    success: response.data.success,
    filename: response.data.data?.filename || params.filename,
    lines: response.data.data?.lines || [],
    totalLines: response.data.data?.totalLines || 0,
  };
};

// 로그 검색
const searchLogs = async (params: {
  query: string;
  filename?: string;
}): Promise<{
  success: boolean;
  query: string;
  filename?: string;
  results: string[];
  totalResults: number;
}> => {
  const urlParams = new URLSearchParams();
  urlParams.append('query', params.query);
  if (params.filename) urlParams.append('filename', params.filename);

  const response = await internalApi.get(`/logs/search?${urlParams.toString()}`);
  // 백엔드의 표준 응답 구조에 맞춰 data를 반환
  return {
    success: response.data.success,
    query: response.data.data?.query || params.query,
    filename: response.data.data?.filename || params.filename,
    results: response.data.data?.results || [],
    totalResults: response.data.data?.totalResults || 0,
  };
};

// 로그 통계 조회
const getLogStats = async (): Promise<{
  success: boolean;
  stats: {
    totalFiles: number;
    totalSize: number;
    totalLines: number;
    currentFile: string | null;
    rotationConfig: any;
  };
}> => {
  const response = await internalApi.get('/logs/stats');
  // 백엔드의 표준 응답 구조에 맞춰 data를 반환
  return {
    success: response.data.success,
    stats: response.data.data?.stats || {
      totalFiles: 0,
      totalSize: 0,
      totalLines: 0,
      currentFile: null,
      rotationConfig: {},
    },
  };
};

// 압축 파일 정보 조회
const getCompressionInfo = async (params: {
  filename: string;
}): Promise<{
  success: boolean;
  filename: string;
  isCompressed: boolean;
  compressionType: string;
  compressedSize: number;
  originalSize: number | null;
  compressionRatio: string | null;
  modified: string;
  created: string;
}> => {
  const urlParams = new URLSearchParams();
  urlParams.append('filename', params.filename);

  const response = await internalApi.get(`/logs/compression-info?${urlParams.toString()}`);
  // 백엔드의 표준 응답 구조에 맞춰 data를 반환
  return {
    success: response.data.success,
    filename: response.data.data?.filename || params.filename,
    isCompressed: response.data.data?.isCompressed || false,
    compressionType: response.data.data?.compressionType || 'NONE',
    compressedSize: response.data.data?.compressedSize || 0,
    originalSize: response.data.data?.originalSize || null,
    compressionRatio: response.data.data?.compressionRatio || null,
    modified: response.data.data?.modified || '',
    created: response.data.data?.created || '',
  };
};

export function useGetLogs(params: {
  logType?: string;
  deviceId?: string;
  unitId?: string;
  limit?: number;
  skip?: number;
  enabled?: boolean;
}) {
  const { enabled, ...rest } = params;
  return useQuery({
    queryKey: ['logs', rest],
    queryFn: () => getLogs(rest),
    enabled: enabled !== false,
  });
}

export function useGetLogFiles(options?: {
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  retry?: number;
  retryDelay?: (attemptIndex: number) => number;
}) {
  return useQuery({
    queryKey: ['logFiles'],
    queryFn: getLogFiles,
    ...options,
  });
}

export function useGetLogContent(params: {
  filename: string;
  lines?: number;
  search?: string;
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  retry?: number;
  retryDelay?: (attemptIndex: number) => number;
}) {
  const { enabled, staleTime, refetchOnWindowFocus, retry, retryDelay, ...rest } = params;
  return useQuery({
    queryKey: ['logContent', rest],
    queryFn: () => getLogContent(rest),
    enabled: enabled !== false && !!rest.filename,
    staleTime,
    refetchOnWindowFocus,
    retry,
    retryDelay,
  });
}

export function useSearchLogs(params: {
  query: string;
  filename?: string;
  enabled?: boolean;
  staleTime?: number;
  retry?: number;
  retryDelay?: (attemptIndex: number) => number;
}) {
  const { enabled, staleTime, retry, retryDelay, ...rest } = params;
  return useQuery({
    queryKey: ['searchLogs', rest],
    enabled: enabled !== false && !!rest.query,
    queryFn: () => searchLogs(rest),
    staleTime,
    retry,
    retryDelay,
  });
}

export function useGetLogStats() {
  return useQuery({
    queryKey: ['logStats'],
    queryFn: getLogStats,
  });
}

export function useGetCompressionInfo(params: { filename: string; enabled?: boolean }) {
  const { enabled, ...rest } = params;
  return useQuery({
    queryKey: ['compressionInfo', rest],
    queryFn: () => getCompressionInfo(rest),
    enabled: enabled !== false && !!rest.filename,
  });
}

// 로그 파일 다운로드
const downloadLogFile = async (params: {
  filename: string;
  lines?: number;
}): Promise<{
  success: boolean;
  data: string;
}> => {
  const urlParams = new URLSearchParams();
  urlParams.append('filename', params.filename);
  if (params.lines) urlParams.append('lines', String(params.lines));

  const response = await internalApi.get(`/logs/content?${urlParams.toString()}`);

  if (response.data?.success && response.data.data?.lines) {
    const content = response.data.data.lines.join('\n');
    return {
      success: true,
      data: content,
    };
  }

  throw new Error('로그 파일 다운로드에 실패했습니다.');
};

// 직접 호출용 함수들
export { getLogFiles, getLogContent, searchLogs, getLogStats, getCompressionInfo, downloadLogFile };
