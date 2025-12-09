import { Type } from '@sinclair/typebox';

// API 키 목록 조회 응답 스키마
export const ApiKeysResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    apiKeys: Type.Array(
      Type.Object({
        id: Type.String({ description: 'API 키 ID' }),
        name: Type.String({ description: 'API 키 이름' }),
        key: Type.String({ description: 'API 키 값' }),
        type: Type.String({ description: 'API 키 타입 (internal, external, universal)' }),
        permissions: Type.Array(Type.String(), { description: '권한 목록' }),
        status: Type.String({ description: '상태 (active, inactive)' }),
        description: Type.Optional(Type.String({ description: '설명' })),
        createdAt: Type.String({ description: '생성일' }),
        updatedAt: Type.String({ description: '수정일' }),
      }),
    ),
    total: Type.Number({ description: '전체 개수' }),
    page: Type.Number({ description: '현재 페이지' }),
    totalPages: Type.Number({ description: '전체 페이지 수' }),
  }),
});

// API 키 목록 조회 응답 예시
export const APIKEYS_RESPONSE_EXAMPLE = {
  success: true,
  message: 'API 키 목록 조회 성공',
  data: {
    apiKeys: [
      {
        id: '68846d1b6b36c4cb8502b4c8',
        name: 'admin',
        key: 'admin_universal_key_2025',
        type: 'universal',
        permissions: ['read:devices', 'read:status', 'write:commands', 'admin:settings', 'admin:users'],
        status: 'active',
        description: '관리자용 전체 권한 API 키',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: '68846d1b6b36c4cb8502b4d1',
        name: 'admin_dabom',
        key: 'admin_dabom_internal_key_2025',
        type: 'internal',
        permissions: ['read:devices', 'read:status', 'write:commands', 'admin:settings', 'admin:users'],
        status: 'active',
        description: '내부 관리자용 API 키',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: '68846d1b6b36c4cb8502b4e5',
        name: 'youjobs',
        key: 'youjobs_external_key',
        type: 'external',
        permissions: ['read:devices', 'read:status'],
        status: 'active',
        description: 'youjobs 외부 사용자 API 키',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ],
    total: 5,
    page: 1,
    totalPages: 1,
  },
};
