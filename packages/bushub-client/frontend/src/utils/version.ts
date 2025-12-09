/**
 * 버전 정보 관련 유틸리티 함수들
 */

// package.json에서 버전 정보 가져오기 (Vite + TS: resolveJsonModule 필요)
// 프론트엔드 패키지의 package.json을 직접 참조하여 하드코딩 제거
// 개발/빌드 환경에서 VITE_GIT_TAG가 주입되면 태그가 우선 표시됩니다.
// 주입되지 않은 경우 package.json의 version을 사용합니다.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - json import typing
import packageJson from '../../package.json';
const PACKAGE_VERSION: string = (packageJson as { version?: string }).version || '0.0.0';

// Git 태그 정보를 가져오는 함수 (빌드 시점에 주입됨)
export const getAppVersion = (): string => {
  // 환경변수에서 버전 정보를 가져오거나 기본값 사용
  return import.meta.env.VITE_APP_VERSION || PACKAGE_VERSION;
};

// Git 커밋 해시를 가져오는 함수
export const getGitCommitHash = (): string => {
  return import.meta.env.VITE_GIT_COMMIT_HASH || 'unknown';
};

// Git 태그를 가져오는 함수
export const getGitTag = (): string => {
  return import.meta.env.VITE_GIT_TAG || 'unknown';
};

// 빌드 날짜를 가져오는 함수
export const getBuildDate = (): string => {
  return import.meta.env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0];
};

// 전체 버전 정보 객체를 반환하는 함수
export const getVersionInfo = () => {
  return {
    version: getAppVersion(),
    gitTag: getGitTag(),
    gitCommitHash: getGitCommitHash(),
    buildDate: getBuildDate(),
  };
};

// 버전 정보를 포맷된 문자열로 반환하는 함수
export const getFormattedVersion = (): string => {
  const versionInfo = getVersionInfo();

  // Git 태그가 있으면 태그를 우선 표시
  if (versionInfo.gitTag !== 'unknown') {
    return versionInfo.gitTag;
  }

  // 그렇지 않으면 package.json 버전 표시
  return `v${versionInfo.version}`;
};

// 상세 버전 정보를 포맷된 문자열로 반환하는 함수
export const getDetailedVersionInfo = (): string => {
  const versionInfo = getVersionInfo();

  const parts = [];

  // 버전 정보
  if (versionInfo.gitTag !== 'unknown') {
    parts.push(`Tag: ${versionInfo.gitTag}`);
  } else {
    parts.push(`Version: v${versionInfo.version}`);
  }

  // 커밋 해시 (짧은 형태)
  if (versionInfo.gitCommitHash !== 'unknown') {
    parts.push(`Commit: ${versionInfo.gitCommitHash.substring(0, 7)}`);
  }

  // 빌드 날짜
  parts.push(`Build: ${versionInfo.buildDate}`);

  return parts.join(' | ');
};
