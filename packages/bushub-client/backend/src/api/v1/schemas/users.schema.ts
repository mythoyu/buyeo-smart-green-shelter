import { Type } from '@sinclair/typebox';

// 사용자 목록 조회 응답 스키마
export const UsersResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Array(
    Type.Object({
      id: Type.String({ description: '사용자 ID (username)' }),
      name: Type.String({ description: '사용자명' }),
      role: Type.String({ description: '사용자 역할' }),
      status: Type.String({ description: '사용자 상태' }),
    }),
  ),
});

// 사용자 목록 조회 응답 예시
export const USERS_RESPONSE_EXAMPLE = {
  success: true,
  message: '사용자 목록 조회 성공',
  data: [
    {
      id: 'admin',
      name: 'admin',
      role: 'admin',
      status: 'active',
    },
    {
      id: 'admin_dabom',
      name: 'admin_dabom',
      role: 'internal',
      status: 'active',
    },
    {
      id: 'testuser',
      name: 'testuser',
      role: 'internal',
      status: 'active',
    },
    {
      id: 'sinwoo',
      name: 'sinwoo',
      role: 'external',
      status: 'active',
    },
    {
      id: 'nzero',
      name: 'nzero',
      role: 'external',
      status: 'active',
    },
  ],
};
