import { useGetPollingState } from '../api/queries/polling';

interface UsePollingStatusOptions {
  enabled?: boolean;
}

/**
 * 폴링 상태 조회 훅
 * 기존 useGetPollingState를 래핑하여 일관된 인터페이스 제공
 * 조건부 호출 지원
 */
export const usePollingStatus = (options?: UsePollingStatusOptions) => {
  return useGetPollingState(options);
};
