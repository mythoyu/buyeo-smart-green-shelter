import { useEffect, useMemo, DependencyList } from 'react';

import { useRightSidebar } from '../contexts/RightSidebarContext';

/**
 * 오른쪽 사이드바 컨텐츠를 설정하는 공통 Hook
 * 메모이제이션과 cleanup을 자동으로 처리합니다.
 *
 * @param content - 사이드바에 표시할 컨텐츠
 * @param deps - 컨텐츠가 변경될 때 재생성해야 하는 의존성 배열 (참조 동일 시 스킵)
 */
export const useRightSidebarContent = (content: React.ReactNode, deps: DependencyList) => {
  const { setContent } = useRightSidebar();

  // 컨텐츠 메모이제이션 (deps는 shallow compare되므로 내부 값 기준으로 비교)
  const memoizedContent = useMemo(() => content, deps);

  // 사이드바 컨텐츠 설정 및 cleanup
  useEffect(() => {
    setContent(memoizedContent);
    return () => {
      setContent(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedContent]);
};
