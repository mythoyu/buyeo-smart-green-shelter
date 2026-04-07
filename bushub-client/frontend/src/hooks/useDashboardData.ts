import { useGetClient, useGetClientStatus, useGetClientData, useGetClientErrors } from '../api/queries';

import { useClientDataBase } from './useClientDataBase';
import { usePageVisibility } from './usePageVisibility';

/**
 * DashboardPage 전용 데이터 훅
 * - getClient: 5분 캐시 (자주 바뀌지 않는 정보)
 * - getClientStatus: 1초마다 폴링 (실시간 모니터링)
 * - getClientData: 1초마다 폴링 (실시간 모니터링)
 */
export const useDashboardData = () => {
  const { isPageVisible } = usePageVisibility();

  // DashboardPage용 설정
  const clientInfo = useGetClient({
    staleTime: 5 * 60 * 1000, // 5분 (요구사항)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const clientStatus = useGetClientStatus({
    staleTime: 500, // 0.5초
    refetchInterval: isPageVisible ? 1000 : false, // 탭 비가시성일 때 폴링 중지
    // refetchInterval: 60000, // 60초마다 폴링
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const clientData = useGetClientData({
    staleTime: 500, // 0.5초
    refetchInterval: isPageVisible ? 1000 : false, // 탭 비가시성일 때 폴링 중지
    // refetchInterval: 60000, // 60초마다 폴링
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const clientErrors = useGetClientErrors({
    staleTime: 30 * 1000, // 30초
    refetchInterval: isPageVisible ? 10 * 1000 : false, // 탭 비가시성일 때 폴링 중지
    // refetchInterval: 60000, // 60초마다 폴링
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  // 공통 데이터 병합 로직 사용
  return useClientDataBase(clientInfo, clientStatus, clientData, clientErrors);
};
