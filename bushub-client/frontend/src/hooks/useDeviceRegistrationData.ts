import { useGetClient, useGetClients } from '../api/queries';
import { usePageVisibility } from './usePageVisibility';

/**
 * DeviceRegistrationPage 전용 데이터 훅
 * - getClient: 2초마다 폴링 (빠른 업데이트)
 * - getClients: 1분마다 폴링 (적절한 주기)
 */
export const useDeviceRegistrationData = () => {
  const { isPageVisible } = usePageVisibility();

  // DeviceRegistrationPage용 설정
  const currentClient = useGetClient({
    staleTime: 1000, // 1초
    refetchInterval: isPageVisible ? 2000 : false, // 탭 비가시성일 때 폴링 중지
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    refetchIntervalInBackground: false,
  });

  const clients = useGetClients({
    staleTime: 5 * 60 * 1000, // 5분
    refetchInterval: isPageVisible ? 60 * 1000 : false, // 탭 비가시성일 때 폴링 중지
    refetchOnWindowFocus: false,
    retry: 2,
    refetchIntervalInBackground: false,
  });

  return {
    currentClient: currentClient.data,
    clients: clients.data || [],
    isLoading: currentClient.isLoading || clients.isLoading,
    error: currentClient.error || clients.error,
    refetchCurrentClient: currentClient.refetch,
    refetchClients: clients.refetch,
  };
};
