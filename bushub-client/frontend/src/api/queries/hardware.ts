import { useMutation } from '@tanstack/react-query';

import { internalApi } from '../axiosInstance';

// 하드웨어 직접 제어 요청 타입
export interface HardwareDirectCommandRequest {
  port: string;
  command: string;
  value: boolean | number;
}

// 하드웨어 직접 제어 응답 타입
export interface HardwareDirectCommandResponse {
  success: boolean;
  message: string;
  data?: { commandId: string; value: number | null };
  error?: { code: string; message: string };
}

// 하드웨어 상태 읽기 요청 타입
export interface HardwareReadStatusRequest {
  port: string;
  command: string;
}

// 하드웨어 상태 읽기 응답 타입
export interface HardwareReadStatusResponse {
  success: boolean;
  message: string;
  data?: { commandId: string; values: number[] };
  error?: { code: string; message: string };
}

// 하드웨어 전체 상태 읽기 요청 타입
export interface HardwareReadAllStatusRequest {
  commands: string[];
}

// 하드웨어 전체 상태 읽기 응답 타입
export interface HardwareReadAllStatusResponse {
  success: boolean;
  message: string;
  data?: {
    commandId: string;
    results: {
      [port: string]: {
        [command: string]: number[];
      };
    };
  };
  error?: { code: string; message: string };
}

/**
 * 하드웨어 직접 제어 명령 전송 함수
 */
const sendDirectHardwareCommand = async (params: HardwareDirectCommandRequest): Promise<boolean> => {
  try {
    console.log('[HardwareDirectCommand] 요청 데이터:', params);
    const response = await internalApi.post<HardwareDirectCommandResponse>('/hardware/direct-command', params);
    console.log('[HardwareDirectCommand] 응답 데이터:', response.data);

    return response.data.success;
  } catch (error: any) {
    console.error('[HardwareDirectCommand] API 호출 실패:', error);
    console.error('[HardwareDirectCommand] 에러 응답:', error.response?.data);

    // 에러 응답에서 메시지 추출
    if (error.response?.data?.error?.message) {
      throw new Error(error.response.data.error.message);
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error('하드웨어 제어 중 오류가 발생했습니다');
  }
};

/**
 * 하드웨어 직접 제어 명령 전송 훅
 */
export const useSendDirectHardwareCommand = () => {
  return useMutation({
    mutationFn: sendDirectHardwareCommand,
    onSuccess: success => {
      if (success) {
        console.log('[HardwareDirectCommand] 명령 실행 성공');
      }
    },
    onError: (error: Error) => {
      console.error('[HardwareDirectCommand] 명령 실행 실패:', error.message);
    },
  });
};

/**
 * 하드웨어 상태 읽기 함수
 */
const readHardwareStatus = async (params: HardwareReadStatusRequest): Promise<HardwareReadStatusResponse> => {
  try {
    console.log('[HardwareReadStatus] 요청 데이터:', params);
    const response = await internalApi.post<HardwareReadStatusResponse>('/hardware/read-status', params);
    console.log('[HardwareReadStatus] 응답 데이터:', response.data);

    return response.data;
  } catch (error: any) {
    console.error('[HardwareReadStatus] API 호출 실패:', error);
    console.error('[HardwareReadStatus] 에러 응답:', error.response?.data);

    // 에러 응답에서 메시지 추출
    if (error.response?.data?.error?.message) {
      throw new Error(error.response.data.error.message);
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error('하드웨어 상태 읽기 중 오류가 발생했습니다');
  }
};

/**
 * 하드웨어 상태 읽기 훅
 */
export const useReadHardwareStatus = () => {
  return useMutation({
    mutationFn: readHardwareStatus,
    onSuccess: data => {
      console.log('[HardwareReadStatus] 상태 읽기 성공:', data);
    },
    onError: (error: Error) => {
      console.error('[HardwareReadStatus] 상태 읽기 실패:', error.message);
    },
  });
};

/**
 * 하드웨어 전체 상태 읽기 함수
 */
const readAllHardwareStatus = async (params: HardwareReadAllStatusRequest): Promise<HardwareReadAllStatusResponse> => {
  try {
    console.log('[HardwareReadAllStatus] 요청 데이터:', params);
    const response = await internalApi.post<HardwareReadAllStatusResponse>('/hardware/read-all-status', params);
    console.log('[HardwareReadAllStatus] 응답 데이터:', response.data);

    return response.data;
  } catch (error: any) {
    console.error('[HardwareReadAllStatus] API 호출 실패:', error);
    console.error('[HardwareReadAllStatus] 에러 응답:', error.response?.data);

    // 에러 응답에서 메시지 추출
    if (error.response?.data?.error?.message) {
      throw new Error(error.response.data.error.message);
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error('하드웨어 전체 상태 읽기 중 오류가 발생했습니다');
  }
};

/**
 * 하드웨어 전체 상태 읽기 훅
 */
export const useReadAllHardwareStatus = () => {
  return useMutation({
    mutationFn: readAllHardwareStatus,
    onSuccess: data => {
      console.log('[HardwareReadAllStatus] 전체 상태 읽기 성공:', data);
    },
    onError: (error: Error) => {
      console.error('[HardwareReadAllStatus] 전체 상태 읽기 실패:', error.message);
    },
  });
};

// ==================== System Seasonal / DDC Time (New simple endpoints) ====================

// Seasonal
type SeasonalReadResponse = {
  success: boolean;
  message: string;
  data?: { season: boolean; monthlySummer: Record<string, boolean> };
};

type SeasonalSetRequest = {
  season?: boolean;
  monthlySummer?: Record<string, boolean>;
};

const seasonalRead = async (): Promise<SeasonalReadResponse> => {
  const { data } = await internalApi.post<SeasonalReadResponse>('/hardware/system/seasonal', { action: 'read' });
  return data;
};

const seasonalSet = async (params: SeasonalSetRequest): Promise<boolean> => {
  const { data } = await internalApi.post('/hardware/system/seasonal', { action: 'set', ...params });
  return !!(data as any)?.success;
};

export const useSeasonalRead = () => useMutation({ mutationFn: seasonalRead });
export const useSeasonalSet = () => useMutation({ mutationFn: seasonalSet });

// DDC Time
type DdcTime = { year: number; month: number; day: number; hour: number; minute: number; second: number };
type DdcTimeReadResponse = { success: boolean; message: string; data?: DdcTime };

const ddcTimeRead = async (): Promise<DdcTimeReadResponse> => {
  const { data } = await internalApi.post<DdcTimeReadResponse>('/hardware/system/ddc-time', { action: 'read' });
  return data;
};

const ddcTimeSet = async (time: DdcTime): Promise<boolean> => {
  const { data } = await internalApi.post('/hardware/system/ddc-time', { action: 'set', ...time });
  return !!(data as any)?.success;
};

export const useDdcTimeRead = () => useMutation({ mutationFn: ddcTimeRead });
export const useDdcTimeSet = () => useMutation({ mutationFn: ddcTimeSet });
