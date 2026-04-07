import { useEffect, useState } from 'react';

/**
 * 탭 가시성(document.visibilityState)을 React state로 제공하는 훅
 * - hidden일 때 폴링/무거운 작업을 줄이기 위한 용도
 */
export function usePageVisibility(): { isPageVisible: boolean } {
  const [isPageVisible, setIsPageVisible] = useState(() => {
    if (typeof document === 'undefined') return true;
    return document.visibilityState !== 'hidden';
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState !== 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { isPageVisible };
}

