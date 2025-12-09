import { Type } from '@sinclair/typebox';

export const ErrorsResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    id: Type.String(),
    devices: Type.Array(
      Type.Object({
        id: Type.String(),
        units: Type.Array(
          Type.Object({
            id: Type.String(),
            errorId: Type.String(),
            errorDesc: Type.String(),
            errorAt: Type.String(),
          }),
        ),
      }),
    ),
  }),
});

export const ERRORS_RESPONSE_EXAMPLE = {
  success: true,
  message: '클라이언트 에러 조회 성공',
  data: {
    id: 'c0101',
    devices: [
      {
        id: 'd021',
        units: [
          {
            id: 'u001',
            errorId: 'e001',
            errorDesc: '통신에러',
            errorAt: '2025-06-29T10:09:55Z',
          },
        ],
      },
    ],
  },
};
