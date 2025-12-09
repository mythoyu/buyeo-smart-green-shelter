import { useGetClient } from '../api/queries';

/**
 * MainLayout 전용 데이터 훅
 * - 레이아웃에서 필요한 최소한의 데이터만 로드
 * - 적절한 캐시 전략으로 성능 최적화
 * - 다른 페이지 훅과 독립적으로 동작
 */
export const useLayoutData = () => {
  // 레이아웃용 설정: 클라이언트 기본 정보만 필요
  const clientInfo = useGetClient({
    staleTime: 10 * 60 * 1000, // 10분 (자주 바뀌지 않는 정보)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false, // 자동 폴링 비활성화
  });

  return {
    client: clientInfo.data,
    isLoading: clientInfo.isLoading,
    error: clientInfo.error,
  };
};
