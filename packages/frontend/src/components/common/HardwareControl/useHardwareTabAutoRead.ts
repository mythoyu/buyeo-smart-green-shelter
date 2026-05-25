import { useEffect, useRef } from 'react';

/**
 * 폴링 중지 후 탭 진입(또는 활성 탭 전환) 시 1회 전체 상태 읽기
 */
export function useHardwareTabAutoRead(
  autoReadToken: number | undefined,
  options: {
    disabled?: boolean;
    pollingEnabled?: boolean;
    onRead: () => void | Promise<void>;
  },
): void {
  const lastTokenRef = useRef(0);
  const onReadRef = useRef(options.onRead);
  onReadRef.current = options.onRead;

  const disabled = options.disabled ?? false;
  const pollingEnabled = options.pollingEnabled ?? false;

  useEffect(() => {
    if (!autoReadToken || autoReadToken <= 0) {
      return;
    }
    if (disabled || pollingEnabled) {
      return;
    }
    if (lastTokenRef.current === autoReadToken) {
      return;
    }
    lastTokenRef.current = autoReadToken;
    void onReadRef.current();
  }, [autoReadToken, disabled, pollingEnabled]);
}
