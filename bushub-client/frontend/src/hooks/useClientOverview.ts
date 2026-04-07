import { useGetClient, useGetClientStatus, useGetClientData, useGetClientErrors } from '../api/queries';

import { useClientDataBase } from './useClientDataBase';
import { usePageVisibility } from './usePageVisibility';

/**
 * 클라이언트별 실제 디바이스/유닛 데이터와 상태, 메타데이터를 포함하는 훅
 * 실제 운영 데이터를 반환합니다.
 */
export const useClientOverview = () => {
  const { isPageVisible } = usePageVisibility();

  // API 쿼리들 - 기본값 사용 (DashboardPage 요구사항에 맞춤)
  const clientInfo = useGetClient({
    staleTime: 5 * 60 * 1000, // 5분 (DashboardPage 요구사항)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const clientStatus = useGetClientStatus({
    staleTime: 500, // 0.5초
    refetchInterval: isPageVisible ? 1000 : false, // 탭 비가시성일 때 폴링 중지
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const clientData = useGetClientData({
    staleTime: 500, // 0.5초
    refetchInterval: isPageVisible ? 1000 : false, // 탭 비가시성일 때 폴링 중지
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const clientErrors = useGetClientErrors({
    staleTime: 30 * 1000, // 30초
    refetchInterval: isPageVisible ? 10 * 1000 : false, // 탭 비가시성일 때 폴링 중지
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  // 공통 데이터 병합 로직 사용
  return useClientDataBase(clientInfo, clientStatus, clientData, clientErrors);
};
