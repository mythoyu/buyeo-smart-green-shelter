export const LOADING_MESSAGES = {
  userStatistics: '이용자 통계를 불러오는 중입니다...',
  userManagement: '사용자 정보를 불러오는 중입니다...',
  hardwareControl: '직접 제어 상태를 확인하는 중입니다...',
  logFiles: '로그 파일 목록을 불러오는 중입니다...',
  logContent: '로그 내용을 불러오는 중입니다...',
  logSearch: '검색 중입니다...',
} as const;

export type LoadingMessageKey = keyof typeof LOADING_MESSAGES;

