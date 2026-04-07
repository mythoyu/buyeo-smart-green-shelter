import { Type } from '@sinclair/typebox';

// 로그인 요청 스키마
export const LoginRequestSchema = Type.Object({
  username: Type.String({ description: '사용자명' }),
  password: Type.String({ description: '비밀번호' }),
});

// 로그인 응답 스키마
export const LoginResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    user: Type.Object({
      id: Type.String(),
      username: Type.String(),
      role: Type.String(),
      apiKey: Type.Object({
        id: Type.String(),
        name: Type.String(),
        type: Type.String(),
        key: Type.String(),
      }),
    }),
  }),
});

// 로그아웃 응답 스키마
export const LogoutResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
});

// 로그인 요청 예시
export const LOGIN_REQUEST_EXAMPLE = {
  username: 'admin',
  password: 'youjobsA1!S',
};

// 로그인 응답 예시
export const LOGIN_RESPONSE_EXAMPLE = {
  success: true,
  message: '로그인 성공',
  data: {
    user: {
      id: '68846d1b6b36c4cb8502b4c7',
      username: 'admin',
      role: 'admin',
      apiKey: {
        id: '68846d1b6b36c4cb8502b4c8',
        name: 'admin',
        type: 'universal',
        key: 'admin_universal_key_2025',
      },
    },
  },
};

// 로그아웃 응답 예시
export const LOGOUT_RESPONSE_EXAMPLE = {
  success: true,
  message: '로그아웃되었습니다.',
};
