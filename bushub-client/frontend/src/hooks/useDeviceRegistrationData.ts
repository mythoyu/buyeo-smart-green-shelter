import { useGetClient, useGetClients } from '../api/queries';

/**
 * DeviceRegistrationPage 전용 데이터 훅
 * - getClient: 2초마다 폴링 (빠른 업데이트)
 * - getClients: 1분마다 폴링 (적절한 주기)
 */
export const useDeviceRegistrationData = () => {
  // DeviceRegistrationPage용 설정
  const currentClient = useGetClient({
    staleTime: 1000, // 1초
    refetchInterval: 2000, // 2초마다 폴링 (요구사항)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const clients = useGetClients({
    staleTime: 5 * 60 * 1000, // 5분
    refetchInterval: 60 * 1000, // 1분마다 폴링
    refetchOnWindowFocus: false,
    retry: 2,
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
