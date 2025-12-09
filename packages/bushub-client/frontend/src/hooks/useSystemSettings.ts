import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { networkControlApi } from '../api/axiosInstance';

import type { NtpSettings, NetworkSettings, SoftapSettings } from '../types/systemSettings';

// NTP 상태 조회 (Network Control API 연동)
export const useGetNtpStatus = () => {
  return useQuery({
    queryKey: ['ntp', 'status'],
    queryFn: async () => (await networkControlApi.get('/ntp/status')).data,
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false,
  });
};

// SoftAP 상태 조회 (Network Control API 연동)
export const useGetSoftapStatus = () => {
  return useQuery({
    queryKey: ['softap', 'status'],
    queryFn: async () => (await networkControlApi.get('/softap/status')).data,
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false,
  });
};

// 네트워크 인터페이스 목록 조회 (Network Control API 연동)
export const useGetNetworkInterfaces = () => {
  return useQuery({
    queryKey: ['network', 'interfaces'],
    queryFn: async () => (await networkControlApi.get('/interfaces')).data,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useGetWifiInterfaces = () => {
  return useQuery({
    queryKey: ['wifi', 'interfaces'],
    queryFn: async () => (await networkControlApi.get('/wifi/interfaces')).data,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

// 현재 네트워크 설정 조회 (Network Control API 연동)

// NTP 설정 (Network Control API 연동)
export const useSetNtp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NtpSettings) => networkControlApi.post('/ntp/configure', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ntp'] });
    },
  });
};

// 네트워크 설정 (Network Control API 연동)
export const useSetNetwork = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NetworkSettings) => networkControlApi.post('/configure', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network'] });
    },
  });
};

// SoftAP 설정 (Network Control API 연동)
export const useSetSoftap = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SoftapSettings) => networkControlApi.post('/softap/configure', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['softap'] });
    },
  });
};

// NTP 연결 확인 (Network Control API)
export const useCheckNtpConnectivity = () => {
  return useMutation({
    mutationFn: async (ip: string) => (await networkControlApi.post('/ntp/check', { ip })).data,
  });
};
