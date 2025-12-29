import { Type } from '@sinclair/typebox';

// 실제 응답 구조를 기반으로 한 TypeBox 스키마 (API 명세서 기반)
export const ClientResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    id: Type.String(),
    type: Type.String(),
    region: Type.String(),
    name: Type.String(),
    location: Type.String(),
    latitude: Type.Number(),
    longitude: Type.Number(),
    devices: Type.Array(
      Type.Object({
        id: Type.String(),
        name: Type.String(),
        type: Type.String(),
        units: Type.Array(
          Type.Object({
            id: Type.String(),
            name: Type.String(),
          }),
        ),
      }),
    ),
  }),
});

// 실제 응답 예시 데이터 (API 명세서 기반)
export const CLIENT_RESPONSE_EXAMPLE = {
  success: true,
  message: '클라이언트 정보 조회 성공',
  data: {
    id: 'c0101',
    type: 'bushub',
    region: 'gn',
    name: '부여 스마트그린쉼터',
    location: '충청남도 부여군',
    latitude: 37.754692,
    longitude: 128.878805,
    devices: [
      {
        id: 'd021',
        name: '조명',
        type: 'lighting',
        units: [
          {
            id: 'u001',
            name: '내부조명1',
          },
          {
            id: 'u002',
            name: '내부조명2',
          },
        ],
      },
    ],
  },
};
