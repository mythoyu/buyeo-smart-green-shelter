import { Type } from '@sinclair/typebox';

export const DataResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    id: Type.String(),
    devices: Type.Array(
      Type.Object({
        id: Type.String(),
        type: Type.String(),
        units: Type.Array(
          Type.Object({
            id: Type.String(),
            data: Type.Object({}), // 실제 필드는 동적으로 변동될 수 있음
          }),
        ),
      }),
    ),
  }),
});

export const DATA_RESPONSE_EXAMPLE = {
  success: true,
  message: '클라이언트 데이터 조회 성공',
  data: {
    id: 'c0101',
    devices: [
      {
        id: 'd021',
        type: 'lighting',
        units: [
          {
            id: 'u001',
            data: {
              power: true,
              connection: true,
              start_time: '08:00',
              end_time: '22:00',
            },
          },
        ],
      },
    ],
  },
};
