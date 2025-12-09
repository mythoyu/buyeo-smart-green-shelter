import { useGetClient, useGetClientStatus, useGetClientData, useGetClientErrors } from '../api/queries';

import { useClientDataBase } from './useClientDataBase';

/**
 * DashboardPage 전용 데이터 훅
 * - getClient: 5분 캐시 (자주 바뀌지 않는 정보)
 * - getClientStatus: 1초마다 폴링 (실시간 모니터링)
 * - getClientData: 1초마다 폴링 (실시간 모니터링)
 */
export const useDashboardData = () => {
  // DashboardPage용 설정
  const clientInfo = useGetClient({
    staleTime: 5 * 60 * 1000, // 5분 (요구사항)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const clientStatus = useGetClientStatus({
    staleTime: 500, // 0.5초
    refetchInterval: 1000, // 1초마다 폴링
    // refetchInterval: 60000, // 60초마다 폴링
    refetchOnWindowFocus: true,
  });

  const clientData = useGetClientData({
    staleTime: 500, // 0.5초
    refetchInterval: 1000, // 1초마다 폴링
    // refetchInterval: 60000, // 60초마다 폴링
    refetchOnWindowFocus: true,
  });

  const clientErrors = useGetClientErrors({
    staleTime: 30 * 1000, // 30초
    refetchInterval: 10 * 1000, // 10초마다 폴링
    // refetchInterval: 60000, // 60초마다 폴링
    refetchOnWindowFocus: false,
  });

  // 🎯 디버깅: API 호출 상태 확인
  console.log('useDashboardData Debug:', {
    // 인증 상태 확인
    auth: {
      accessToken: sessionStorage.getItem('accessToken'),
      user: sessionStorage.getItem('user'),
    },
    clientInfo: {
      isLoading: clientInfo.isLoading,
      isError: clientInfo.isError,
      error: clientInfo.error,
      data: clientInfo.data,
    },
    clientStatus: {
      isLoading: clientStatus.isLoading,
      isError: clientStatus.isError,
      error: clientStatus.error,
      data: clientStatus.data,
    },
    clientData: {
      isLoading: clientData.isLoading,
      isError: clientData.isError,
      error: clientData.error,
      data: clientData.data,
    },
    clientErrors: {
      isLoading: clientErrors.isLoading,
      isError: clientErrors.isError,
      error: clientErrors.error,
      data: clientErrors.data,
    },
  });

  // 공통 데이터 병합 로직 사용
  return useClientDataBase(clientInfo, clientStatus, clientData, clientErrors);
};
