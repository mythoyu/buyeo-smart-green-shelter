import { Type } from '@sinclair/typebox';

export const CommandRequestSchema = Type.Object({
  action: Type.String(),
  value: Type.Optional(Type.String()),
});

export const CommandResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    clientId: Type.String(),
    deviceId: Type.String(),
    unitId: Type.String(),
    action: Type.String(),
    value: Type.String(),
    requestedAt: Type.String(),
    result: Type.String(),
  }),
});

export const COMMAND_REQUEST_EXAMPLE = {
  action: 'SET_START_TIME',
  value: '08:00',
};

export const COMMAND_RESPONSE_EXAMPLE = {
  success: true,
  message: '유닛 제어 명령 실행 성공',
  data: {
    clientId: 'c0101',
    deviceId: 'd021',
    unitId: 'u001',
    action: 'SET_START_TIME',
    value: '08:00',
    requestedAt: '2025-06-29T10:15:00Z',
    result: 'success',
  },
};
