import { useEffect, useRef } from 'react';

import { logEnvironmentInfo, debugAllEnvironmentVariables } from '../utils/environment';
import { nowKstFormatted } from '../utils/kstDateTime';

interface UseEnvironmentLoggerOptions {
  /** 로그 출력 여부 (기본값: true) */
  enabled?: boolean;
  /** 상세 로그 출력 여부 (기본값: false) */
  verbose?: boolean;
  /** 로그 태그 (기본값: 'useEnvironmentLogger') */
  tag?: string;
  /** 추가 정보 포함 여부 (기본값: true) */
  includeExtraInfo?: boolean;
}

/**
 * 환경변수 로그를 출력하는 커스텀 훅
 *
 * @param options - 로그 옵션
 * @returns 로그 함수들
 */
export const useEnvironmentLogger = (options: UseEnvironmentLoggerOptions = {}) => {
  const { enabled = true, verbose = false, tag = 'useEnvironmentLogger', includeExtraInfo = true } = options;

  const hasLogged = useRef(false);

  // 컴포넌트 마운트 시 로그 출력
  useEffect(() => {
    if (!enabled || hasLogged.current) return;

    const timestamp = nowKstFormatted();

    console.log(`🔍 [${tag}] Environment Logger Started:`, {
      timestamp,
      enabled,
      verbose,
      includeExtraInfo,
    });

    // 기본 환경 정보 로그
    logEnvironmentInfo();

    // 상세 로그 (verbose 모드)
    if (verbose) {
      debugAllEnvironmentVariables();
    }

    // 추가 정보 (includeExtraInfo 모드)
    if (includeExtraInfo) {
      console.log(`🔍 [${tag}] Extra Info:`, {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screenResolution: {
          width: window.screen.width,
          height: window.screen.height,
        },
        windowSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        location: {
          href: window.location.href,
          origin: window.location.origin,
          pathname: window.location.pathname,
          search: window.location.search,
        },
        performance: {
          timeOrigin: performance.timeOrigin,
          navigationStart: performance.timing?.navigationStart,
        },
      });
    }

    hasLogged.current = true;
  }, [enabled, verbose, tag, includeExtraInfo]);

  // 수동 로그 함수들
  const logEnvironment = () => {
    if (!enabled) return;
    logEnvironmentInfo();
  };

  const logAllVariables = () => {
    if (!enabled) return;
    debugAllEnvironmentVariables();
  };

  const logCustomInfo = (info: any) => {
    if (!enabled) return;
    console.log(`🔍 [${tag}] Custom Info:`, {
      timestamp: nowKstFormatted(),
      ...info,
    });
  };

  return {
    logEnvironment,
    logAllVariables,
    logCustomInfo,
    hasLogged: hasLogged.current,
  };
};

/**
 * 간단한 환경 로거 훅 (기본 설정)
 */
export const useSimpleEnvironmentLogger = () => {
  return useEnvironmentLogger({
    enabled: true,
    verbose: false,
    tag: 'SimpleLogger',
    includeExtraInfo: false,
  });
};

/**
 * 상세 환경 로거 훅 (모든 정보 포함)
 */
export const useDetailedEnvironmentLogger = () => {
  return useEnvironmentLogger({
    enabled: true,
    verbose: true,
    tag: 'DetailedLogger',
    includeExtraInfo: true,
  });
};
