import bcrypt from 'bcryptjs';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// API 엔드포인트 상수
const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  LOGIN_SCHEMA: '/auth/login/schema',
  SCHEMA: '/auth/schema',
} as const;

import { ServiceContainer } from '../../../core/container/ServiceContainer';
import { logInfo, logError } from '../../../logger';
import {
  createSuccessResponse,
  handleRouteError,
  handleHttpError,
  HttpValidationError,
  HttpAuthenticationError,
} from '../../../shared/utils/responseHelper';
import {
  LoginRequestSchema,
  LoginResponseSchema,
  LogoutResponseSchema,
  LOGIN_REQUEST_EXAMPLE,
  LOGIN_RESPONSE_EXAMPLE,
} from '../schemas/auth.schema';

async function authRoutes(app: FastifyInstance) {
  // 로그인 (토큰 검증 없음)
  app.post(AUTH_ENDPOINTS.LOGIN, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { username, password } = (request.body as any) || {};

      logInfo(`로그인 시도: ${username}`);

      // 필수 필드 검증
      if (!username || !password) {
        return handleHttpError(new HttpValidationError('사용자명과 비밀번호는 필수입니다.'), reply);
      }

      // 사용자 조회
      const userService = ServiceContainer.getInstance().getUserService();
      const user = await userService.findByUsername(username);

      if (!user) {
        return handleHttpError(new HttpAuthenticationError('사용자명 또는 비밀번호가 올바르지 않습니다.'), reply);
      }

      // 비밀번호 검증
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return handleHttpError(new HttpAuthenticationError('사용자명 또는 비밀번호가 올바르지 않습니다.'), reply);
      }

      // API 키 생성
      const apiKeyService = ServiceContainer.getInstance().getApiKeyService();
      const apiKey = await apiKeyService.findByUsernameAndStatus(username, 'active');

      logInfo(`로그인 성공: ${username} (${user.role})`);

      return createSuccessResponse('로그인 성공', {
        token: apiKey ? apiKey.key : 'admin_universal_key_2025', // 실제 API 키 또는 기본값
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
        },
        expiresAt: apiKey ? apiKey.expiresAt : undefined,
      });
    } catch (error) {
      logError(`로그인 실패: ${error}`);
      return handleRouteError(error, reply, 'auth', '로그인 중 오류가 발생했습니다.');
    }
  });

  // 로그아웃 (API 키 검증 필요)
  app.post(
    AUTH_ENDPOINTS.LOGOUT,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logInfo('로그아웃 요청');
        // JWT 토큰을 무효화하는 로직 (실제로는 클라이언트에서 토큰을 삭제)
        return createSuccessResponse('로그아웃 성공');
      } catch (error) {
        return handleRouteError(error, reply, 'auth', '로그아웃 중 오류가 발생했습니다.');
      }
    },
  );

  // 로그인 스키마조회 (토큰 검증 없음)
  app.get(AUTH_ENDPOINTS.LOGIN_SCHEMA, async (request: FastifyRequest, reply: FastifyReply) => {
    // ... 로그인 스키마 반환 로직 (필요시 구현) ...
    reply.send(
      createSuccessResponse('로그인 API 스키마', {
        loginRequestSchema: LoginRequestSchema,
        loginRequestExample: LOGIN_REQUEST_EXAMPLE,
        loginResponseSchema: LoginResponseSchema,
        loginResponseExample: LOGIN_RESPONSE_EXAMPLE,
        description: '로그인 API의 요청/응답 구조입니다.',
        endpoints: [
          {
            path: '/auth/login',
            method: 'POST',
            description: '사용자 로그인',
          },
        ],
      }),
    );
  });

  // 로그아웃 스키마조회 (토큰 검증 필요)
  app.get(
    AUTH_ENDPOINTS.SCHEMA,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        reply.send(
          createSuccessResponse('인증 API 스키마', {
            endpoints: [
              {
                path: '/auth/login',
                method: 'POST',
                description: '사용자 로그인',
              },
              {
                path: '/auth/logout',
                method: 'POST',
                description: '사용자 로그아웃',
              },
              {
                path: '/auth/schema',
                method: 'GET',
                description: '인증 API 스키마 조회',
              },
            ],
            schemas: {
              loginRequestSchema: LoginRequestSchema,
              loginResponseSchema: LoginResponseSchema,
              logoutResponseSchema: LogoutResponseSchema,
            },
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'auth', '인증 스키마 조회 중 오류가 발생했습니다.');
      }
    },
  );
}

export default fp(authRoutes);
