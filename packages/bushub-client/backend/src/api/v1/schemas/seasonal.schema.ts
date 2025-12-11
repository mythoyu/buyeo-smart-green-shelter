import { Type } from '@sinclair/typebox';

// 절기 설정 데이터 스키마
export const SeasonalDataSchema = Type.Object({
  season: Type.Number({ description: '현재 계절 (0: 겨울, 1: 여름)' }),
  january: Type.Number({ description: '1월 절기 설정 (0: 겨울, 1: 여름)' }),
  february: Type.Number({ description: '2월 절기 설정 (0: 겨울, 1: 여름)' }),
  march: Type.Number({ description: '3월 절기 설정 (0: 겨울, 1: 여름)' }),
  april: Type.Number({ description: '4월 절기 설정 (0: 겨울, 1: 여름)' }),
  may: Type.Number({ description: '5월 절기 설정 (0: 겨울, 1: 여름)' }),
  june: Type.Number({ description: '6월 절기 설정 (0: 겨울, 1: 여름)' }),
  july: Type.Number({ description: '7월 절기 설정 (0: 겨울, 1: 여름)' }),
  august: Type.Number({ description: '8월 절기 설정 (0: 겨울, 1: 여름)' }),
  september: Type.Number({ description: '9월 절기 설정 (0: 겨울, 1: 여름)' }),
  october: Type.Number({ description: '10월 절기 설정 (0: 겨울, 1: 여름)' }),
  november: Type.Number({ description: '11월 절기 설정 (0: 겨울, 1: 여름)' }),
  december: Type.Number({ description: '12월 절기 설정 (0: 겨울, 1: 여름)' }),
});

// 절기 설정 조회 응답 스키마
export const SeasonalResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    seasonal: SeasonalDataSchema,
  }),
});

// 절기 설정 저장 요청 스키마
export const SeasonalRequestSchema = Type.Object({
  seasonal: SeasonalDataSchema,
});

// 절기 설정 조회 응답 예시
export const SEASONAL_RESPONSE_EXAMPLE = {
  success: true,
  message: '절기 설정 조회 성공',
  data: {
    seasonal: {
      season: 0,
      january: 0,
      february: 0,
      march: 0,
      april: 0,
      may: 0,
      june: 1,
      july: 1,
      august: 1,
      september: 0,
      october: 0,
      november: 0,
      december: 0,
    },
  },
};

// 절기 설정 저장 요청 예시
export const SEASONAL_REQUEST_EXAMPLE = {
  seasonal: {
    season: 0,
    january: 0,
    february: 0,
    march: 0,
    april: 0,
    may: 0,
    june: 1,
    july: 1,
    august: 1,
    september: 0,
    october: 0,
    november: 0,
    december: 0,
  },
};

