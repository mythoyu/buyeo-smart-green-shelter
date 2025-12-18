import { useMutation, useQuery } from '@tanstack/react-query';

import { internalApi, networkControlApi } from '../axiosInstance';

// 절기 설정 데이터 타입
interface SeasonalData {
  season: number;
  january: number;
  february: number;
  march: number;
  april: number;
  may: number;
  june: number;
  july: number;
  august: number;
  september: number;
  october: number;
  november: number;
  december: number;
}

// 절기 설정 응답 타입
interface SeasonalResponse {
  success: boolean;
  message: string;
  data?: any;
}

// 사용하지 않는 타입들 (주석 처리)
// interface SystemActionParams {
//   action: 'reset' | 'apply' | 'export' | 'import';
//   payload?: any;
// }

// interface ModeToggleParams {
//   mode: 'auto' | 'manual';
// }

interface NtpServerParams {
  ntp_server: string;
}

interface NetworkDhcpParams {
  ifname: string;
  con_name: string;
}

interface NetworkStaticParams {
  ifname: string;
  con_name: string;
  ip_address: string;
  gateway: string;
  dns: string;
}

interface SoftapParams {
  ifname: string;
  ssid: string;
  password: string;
}

interface DdcTimeSyncParams {
  enabled: boolean;
  syncInterval: string;
  ddcTime?: string;
}

// 기존 함수들 (사용하지 않음 - 주석 처리)
// const getSystemAction = async ({ action, payload }: SystemActionParams): Promise<any> => {
//   return internalApi.patch('/system', { action, ...payload }).then(res => res.data.data);
// };

// const toggleMode = async ({ mode }: ModeToggleParams): Promise<any> => {
//   return internalApi.post('/system/mode', { mode }).then(res => res.data.data);
// };

// 모든 유닛의 DO 모드를 스케줄로 변경
const setAllUnitsToScheduleMode = async (): Promise<any> => {
  return internalApi.post('/system/auto-mode', {}).then(res => res.data);
};

// 모든 유닛의 DO 모드를 수동으로 변경
const setAllUnitsToManualMode = async (): Promise<any> => {
  return internalApi.post('/system/manual-mode', {}).then(res => res.data);
};

// 폴링 간격 조회
const getPollingInterval = async (): Promise<any> => {
  return internalApi.get('/system/polling/interval').then(res => res.data);
};

// 폴링 간격 설정
const setPollingInterval = async (pollingInterval: number): Promise<any> => {
  return internalApi.post('/system/polling/interval', { pollingInterval }).then(res => res.data);
};

// 새로운 시스템 API 함수들
const getSystemSettings = async (): Promise<any> => {
  return internalApi.get('/system').then(res => res.data.data);
};

const updateSystemSettings = async (settings: any): Promise<any> => {
  return internalApi.post('/system', settings).then(res => res.data);
};

const getNtpStatus = async (): Promise<any> => {
  return networkControlApi.get('/ntp/status').then(res => res.data.data);
};

const setNtpServer = async (params: NtpServerParams): Promise<any> => {
  return networkControlApi.post('/ntp/configure', params).then(res => res.data);
};

const setNetworkDhcp = async (params: NetworkDhcpParams): Promise<any> => {
  return networkControlApi.post('/configure', params).then(res => res.data);
};

const setNetworkStatic = async (params: NetworkStaticParams): Promise<any> => {
  return networkControlApi.post('/configure', params).then(res => res.data);
};

const getSoftapStatus = async (): Promise<any> => {
  return networkControlApi.get('/softap/status').then(res => res.data.data);
};

const setSoftap = async (params: SoftapParams): Promise<any> => {
  return networkControlApi.post('/softap/configure', params).then(res => res.data);
};

const setDdcTimeSync = async (params: DdcTimeSyncParams): Promise<any> => {
  return internalApi.post('/system/ddc-time-sync', params).then(res => res.data);
};

// 호스트 PC 재기동
const restartHostSystem = async (): Promise<any> => {
  return internalApi.post('/system', { action: 'restart' }).then(res => res.data);
};

// 백엔드 재기동
const restartBackend = async (): Promise<any> => {
  return internalApi.post('/system', { action: 'restart-backend' }).then(res => res.data);
};

// 절기 설정 저장 (season 필드 제외 - readonly)
const saveSeasonal = async (seasonal: Omit<SeasonalData, 'season'>): Promise<SeasonalResponse> => {
  return internalApi
    .post<SeasonalResponse>('/system/seasonal', {
      seasonal,
    })
    .then(res => res.data);
};

// 🌸 절기 설정 조회
const getSeasonal = async (): Promise<SeasonalResponse> => {
  return internalApi.get<SeasonalResponse>('/system/seasonal').then(res => res.data);
};

// 🌸 절기 설정 새로고침
const refreshSeasonal = async (): Promise<SeasonalResponse> => {
  return internalApi.post<SeasonalResponse>('/system/seasonal/refresh').then(res => res.data);
};

// 🕐 DDC 시간 설정 조회
const getDdcTime = async (): Promise<any> => {
  return internalApi.get('/system/ddc-time').then(res => res.data);
};

// 🕐 DDC 시간 동기화 실행
const syncDdcTime = async (): Promise<any> => {
  return internalApi.post('/system/ddc-time-sync/execute').then(res => res.data);
};

// 🕐 DDC 시간 새로고침
const refreshDdcTime = async (): Promise<any> => {
  return internalApi.post('/system/ddc-time/refresh').then(res => res.data);
};

// 기존 훅들
export const useSetAllUnitsToScheduleMode = () =>
  useMutation({
    mutationFn: setAllUnitsToScheduleMode,
  });

export const useSetAllUnitsToManualMode = () =>
  useMutation({
    mutationFn: setAllUnitsToManualMode,
  });

// 새로운 훅들
export const useGetSystemSettings = () =>
  useQuery({
    queryKey: ['system', 'settings'],
    queryFn: getSystemSettings,
  });

export const useUpdateSystemSettings = () =>
  useMutation({
    mutationFn: updateSystemSettings,
  });

export const useGetNtpStatus = () =>
  useQuery({
    queryKey: ['system', 'ntp', 'status'],
    queryFn: getNtpStatus,
  });

export const useSetNtpServer = () =>
  useMutation({
    mutationFn: setNtpServer,
  });

export const useSetNetworkDhcp = () =>
  useMutation({
    mutationFn: setNetworkDhcp,
  });

export const useSetNetworkStatic = () =>
  useMutation({
    mutationFn: setNetworkStatic,
  });

export const useGetSoftapStatus = () =>
  useQuery({
    queryKey: ['system', 'softap', 'status'],
    queryFn: getSoftapStatus,
  });

export const useSetSoftap = () =>
  useMutation({
    mutationFn: setSoftap,
  });

export const useSetDdcTimeSync = () =>
  useMutation({
    mutationFn: setDdcTimeSync,
  });

// 절기 설정 저장 훅 (season 필드 제외 - readonly)
export const useSaveSeasonal = () =>
  useMutation<SeasonalResponse, Error, Omit<SeasonalData, 'season'>>({
    mutationFn: saveSeasonal,
    onSuccess: () => {
      console.log('절기 설정이 성공적으로 저장되었습니다.');
    },
    onError: error => {
      console.error('절기 설정 저장 실패:', error);
    },
  });

// 🌸 절기 설정 조회 훅
export const useGetSeasonal = () =>
  useQuery({
    queryKey: ['system', 'seasonal'],
    queryFn: getSeasonal,
  });

export const useRefreshSeasonal = () =>
  useMutation({
    mutationFn: refreshSeasonal,
    onSuccess: () => {
      console.log('절기 설정이 성공적으로 새로고침되었습니다.');
    },
    onError: error => {
      console.error('절기 설정 새로고침 실패:', error);
    },
  });

// 🕐 DDC 시간 설정 조회 훅
export const useGetDdcTime = () =>
  useQuery({
    queryKey: ['system', 'ddc-time'],
    queryFn: getDdcTime,
  });

// 🕐 DDC 시간 동기화 훅
export const useSyncDdcTime = () =>
  useMutation({
    mutationFn: syncDdcTime,
    onSuccess: () => {
      console.log('DDC 시간 동기화가 성공적으로 실행되었습니다.');
    },
    onError: error => {
      console.error('DDC 시간 동기화 실패:', error);
    },
  });

export const useRefreshDdcTime = () =>
  useMutation({
    mutationFn: refreshDdcTime,
    onSuccess: () => {
      console.log('DDC 시간이 성공적으로 새로고침되었습니다.');
    },
    onError: error => {
      console.error('DDC 시간 새로고침 실패:', error);
    },
  });

// 폴링 간격 조회 훅
export const useGetPollingInterval = () =>
  useQuery({
    queryKey: ['system', 'polling', 'interval'],
    queryFn: getPollingInterval,
    refetchInterval: 5000, // 5초마다 자동 갱신
  });

// 폴링 간격 설정 훅
export const useSetPollingInterval = () =>
  useMutation({
    mutationFn: setPollingInterval,
    onSuccess: () => {
      console.log('폴링 간격이 성공적으로 설정되었습니다.');
    },
    onError: error => {
      console.error('폴링 간격 설정 실패:', error);
    },
  });

// ==================== 🔧 디바이스 상세설정 관련 API ====================

// 디바이스 상세설정 조회
const getDeviceAdvancedSettings = async (): Promise<{
  temp: {
    'fine-tuning-summer': number;
    'fine-tuning-winter': number;
  };
}> => {
  return internalApi.get('/system/device-advanced').then(res => res.data.data);
};

// 디바이스 상세설정 업데이트
const updateDeviceAdvancedSettings = async (settings: {
  temp: {
    'fine-tuning-summer': number;
    'fine-tuning-winter': number;
  };
}): Promise<{
  temp: {
    'fine-tuning-summer': number;
    'fine-tuning-winter': number;
  };
}> => {
  return internalApi.post('/system/device-advanced', settings).then(res => res.data.data);
};

// 디바이스 상세설정 조회 훅
export const useGetDeviceAdvancedSettings = () =>
  useQuery({
    queryKey: ['system', 'device-advanced'],
    queryFn: getDeviceAdvancedSettings,
  });

// 디바이스 상세설정 업데이트 훅
export const useUpdateDeviceAdvancedSettings = () =>
  useMutation({
    mutationFn: updateDeviceAdvancedSettings,
    onSuccess: () => {
      console.log('디바이스 상세설정이 성공적으로 저장되었습니다.');
    },
    onError: error => {
      console.error('디바이스 상세설정 저장 실패:', error);
    },
  });

// 호스트 PC 재기동 훅
export const useRestartHostSystem = () =>
  useMutation({
    mutationFn: restartHostSystem,
    onSuccess: () => {
      console.log('호스트 PC 재기동이 시작되었습니다.');
    },
    onError: error => {
      console.error('호스트 PC 재기동 실패:', error);
    },
  });

// 백엔드 재기동 훅
export const useRestartBackend = () =>
  useMutation({
    mutationFn: restartBackend,
    onSuccess: () => {
      console.log('백엔드 재기동이 시작되었습니다.');
    },
    onError: error => {
      console.error('백엔드 재기동 실패:', error);
    },
  });

// ==================== 🌐 외부 서버 상태 확인 API ====================

// 외부 서버 상태 확인 요청 타입
interface ExternalCheckRequest {
  url: string;
}

// 외부 서버 상태 확인 응답 타입
interface ExternalCheckResponse {
  success: boolean;
  message: string;
  data?: {
    url: string;
    status: number;
    responseTime: number;
    data: any;
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
    data?: {
      url: string;
      status: number;
      responseTime: number;
      error: string;
      timestamp: string;
    };
  };
}

// 외부 서버 상태 확인 함수
const checkExternalServer = async (params: ExternalCheckRequest): Promise<ExternalCheckResponse> => {
  return internalApi.post<ExternalCheckResponse>('/system/external-check', params).then(res => res.data);
};

// 외부 서버 상태 확인 훅
export const useCheckExternalServer = () =>
  useMutation({
    mutationFn: checkExternalServer,
    onSuccess: data => {
      console.log('외부 서버 상태 확인 성공:', data);
    },
    onError: error => {
      console.error('외부 서버 상태 확인 실패:', error);
    },
  });

// ==================== 🏓 Ping 테스트 API ====================

// Ping 테스트 요청 타입
interface PingTestRequest {
  ip: string;
}

// Ping 테스트 응답 타입
interface PingTestResponse {
  success: boolean;
  message: string;
  data?: {
    ip: string;
    success: boolean;
    responseTime: number;
    packetLoss: number;
    minTime: number;
    maxTime: number;
    avgTime: number;
    packetsTransmitted: number;
    packetsReceived: number;
    rawOutput: string;
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// Ping 테스트 함수
const pingTest = async (params: PingTestRequest): Promise<PingTestResponse> => {
  return internalApi.post<PingTestResponse>('/system/ping-test', params).then(res => res.data);
};

// Ping 테스트 훅
export const usePingTest = () =>
  useMutation({
    mutationFn: pingTest,
    onSuccess: data => {
      console.log('Ping 테스트 성공:', data);
    },
    onError: error => {
      console.error('Ping 테스트 실패:', error);
    },
  });
