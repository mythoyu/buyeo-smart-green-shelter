import { Type } from '@sinclair/typebox';

// 로그 파일 목록 조회 응답 스키마
export const LogFilesResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Array(Type.String({ description: '로그 파일명' })),
});

// 로그 파일 내용 조회 응답 스키마
export const LogContentResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    filename: Type.String({ description: '파일명' }),
    lines: Type.Array(Type.String({ description: '로그 라인' })),
    totalLines: Type.Number({ description: '전체 라인 수' }),
  }),
});

// 로그 검색 응답 스키마
export const LogSearchResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    query: Type.String({ description: '검색 쿼리' }),
    results: Type.Array(Type.String({ description: '검색 결과' })),
    totalResults: Type.Number({ description: '전체 결과 수' }),
  }),
});

// 로그 통계 응답 스키마
export const LogStatsResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    totalFiles: Type.Number({ description: '전체 파일 수' }),
    totalSize: Type.Number({ description: '전체 크기 (bytes)' }),
    totalLines: Type.Number({ description: '전체 라인 수' }),
    currentFile: Type.Optional(Type.String({ description: '현재 로그 파일' })),
    rotationConfig: Type.Object({
      frequency: Type.String({ description: '로테이션 주기' }),
      size: Type.String({ description: '최대 파일 크기' }),
      limit: Type.Object({
        count: Type.Number({ description: '보관 파일 수' }),
      }),
      compress: Type.Boolean({ description: '압축 여부' }),
    }),
  }),
});

// 로그 파일 목록 조회 응답 예시
export const LOG_FILES_RESPONSE_EXAMPLE = {
  success: true,
  message: '로그 파일 목록 조회 성공',
  data: ['app.log', 'app.log.1.gz', 'app.log.2.gz', 'error.log', 'error.log.1.gz'],
};

// 로그 파일 내용 조회 응답 예시
export const LOG_CONTENT_RESPONSE_EXAMPLE = {
  success: true,
  message: '로그 파일 내용 조회 성공',
  data: {
    filename: 'app.log',
    lines: [
      '[2025-07-31 12:54:32] INFO: 🚀 서버 시작 중...',
      '[2025-07-31 12:54:32] INFO: 📡 MongoDB 연결 시도 중...',
      '[2025-07-31 12:54:32] INFO: 🎉 MongoDB 연결 완료!',
    ],
    totalLines: 3,
  },
};

// 로그 검색 응답 예시
export const LOG_SEARCH_RESPONSE_EXAMPLE = {
  success: true,
  message: '로그 검색 성공',
  data: {
    query: 'MongoDB',
    results: [
      '[2025-07-31 12:54:32] INFO: 📡 MongoDB 연결 시도 중...',
      '[2025-07-31 12:54:32] INFO: 🎉 MongoDB 연결 완료!',
    ],
    totalResults: 2,
  },
};

// 로그 통계 응답 예시
export const LOG_STATS_RESPONSE_EXAMPLE = {
  success: true,
  message: '로그 통계를 조회했습니다.',
  data: {
    totalFiles: 5,
    totalSize: 1024000,
    totalLines: 1500,
    currentFile: 'app.log',
    rotationConfig: {
      frequency: 'daily',
      size: '100m',
      limit: { count: 60 },
      compress: true,
    },
  },
};
