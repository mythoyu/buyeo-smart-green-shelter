import { Type } from '@sinclair/typebox';

export const StatusResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    id: Type.String(),
    devices: Type.Array(
      Type.Object({
        id: Type.String(),
        status: Type.Number(),
        units: Type.Array(
          Type.Object({
            id: Type.String(),
            status: Type.Number(),
          }),
        ),
      }),
    ),
  }),
});

export const STATUS_RESPONSE_EXAMPLE = {
  success: true,
  message: '클라이언트 상태 조회 성공',
  data: {
    id: 'c0101',
    devices: [
      {
        id: 'd021',
        status: 1,
        units: [
          { id: 'u001', status: 0 },
          { id: 'u002', status: 2 },
        ],
      },
    ],
  },
};
