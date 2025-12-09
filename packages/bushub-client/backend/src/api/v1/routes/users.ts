import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// API 엔드포인트 상수
const USERS_ENDPOINTS = {
  USERS: '/users',
  USER_BY_ID: '/users/:userId',
  CHANGE_PASSWORD: '/users/:userId/change-password',
  SCHEMA: '/users/schema',
} as const;

import { ServiceContainer } from '../../../core/container/ServiceContainer';
import { logInfo, logError } from '../../../logger';
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  HttpValidationError,
  HttpNotFoundError,
  HttpSystemError,
  handleRouteError,
  handleHttpError,
} from '../../../shared/utils/responseHelper';
import { validatePassword } from '../../middleware/security';
import { UsersResponseSchema, USERS_RESPONSE_EXAMPLE } from '../schemas/users.schema';

async function usersRoutes(app: FastifyInstance) {
  const serviceContainer = ServiceContainer.getInstance();

  // User 도메인 서비스들 가져오기
  const userServices = serviceContainer.getUserDomainServices();
  const { userService } = userServices;
  const { userConfigService } = userServices;
  const { apiKeyService } = userServices;
  const { clientService } = userServices;

  // GET /users
  app.get(
    USERS_ENDPOINTS.USERS,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logInfo('[GET /api/v1/internal/users] 사용자 목록 조회 요청');

        // 서비스를 통한 사용자 목록 조회
        const { users } = await userService.getUsers();

        // 명세서 구조에 맞게 변환
        const result = users.map((u: any) => ({
          id: u.username,
          name: u.username,
          role: u.role,
          status: 'active', // 기본값으로 설정
        }));

        logInfo('[GET /api/v1/internal/users] 응답 완료');

        reply.header('Cache-Control', 'no-store');
        return createSuccessResponse('사용자 목록 조회 성공', result);
      } catch (error) {
        logError(`[GET /api/v1/internal/users] 사용자 목록 조회 실패: ${error}`);
        return handleRouteError(error, reply, 'users', '사용자 목록 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // POST /users - 새로운 사용자 생성
  app.post(
    USERS_ENDPOINTS.USERS,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { username, password, role, apiKey } = (request.body as any) || {};

        logInfo(`[POST /api/v1/internal/users] 사용자 생성 요청: ${username}`);

        // 필수 필드 검증
        if (!username || !password) {
          return handleHttpError(new HttpValidationError('사용자명과 비밀번호는 필수입니다.'), reply);
        }

        // API 키 검증
        if (!apiKey) {
          return handleHttpError(new HttpValidationError('API 키는 필수입니다.'), reply);
        }

        // 비밀번호 강도 검증
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          return handleHttpError(
            new HttpValidationError(passwordValidation.error || '비밀번호가 너무 약합니다.'),
            reply,
          );
        }

        // 중복 사용자명 검증
        const existingUser = await userService.getUserByUsername(username);
        if (existingUser) {
          return handleHttpError(new HttpValidationError('이미 존재하는 사용자명입니다.'), reply);
        }

        // 사용자 생성
        const newUser = await userService.createUser({
          username,
          password,
          role: role || 'ex-user', // 기본값을 ex-user로 변경
        });

        // 사용자 생성 후 API 키 생성 (사용자 입력값 사용)
        try {
          const apiKeyType = role === 'superuser' || role === 'engineer' ? 'universal' : 'external';
          await apiKeyService.createApiKey({
            username,
            key: apiKey,
            type: apiKeyType,
            permissions:
              role === 'superuser'
                ? ['read:devices', 'read:status', 'write:commands', 'admin:settings', 'admin:users']
                : ['read:devices', 'read:status'],
            status: 'active',
            description: `${username} 사용자 API 키`,
            userId: newUser.id,
          });
          logInfo(`[POST /api/v1/internal/users] API 키 생성 완료: ${username}`);
        } catch (apiKeyError) {
          logError(`[POST /api/v1/internal/users] API 키 생성 실패: ${apiKeyError}`);
          // API 키 생성 실패해도 사용자 생성은 성공으로 처리
        }

        if (role === 'ex-user') {
          logInfo(`[POST /api/v1/internal/users] External 사용자 생성 완료: ${username}, role: ${newUser.role}`);
        }

        logInfo(`[POST /api/v1/internal/users] 사용자 생성 완료: ${username}`);

        return createSuccessResponse('사용자 생성 성공', {
          id: newUser.username,
          name: newUser.username,
          role: newUser.role,
          status: 'active',
        });
      } catch (error) {
        logError(`[POST /api/v1/internal/users] 사용자 생성 실패: ${error}`);
        return handleRouteError(error, reply, 'users', '사용자 생성 중 오류가 발생했습니다.');
      }
    },
  );

  // PUT /users/{userId} - 사용자 정보 수정
  app.put(
    USERS_ENDPOINTS.USER_BY_ID,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };
        const { role, email, apiKey } = (request.body as any) || {};

        logInfo(`[PUT /api/v1/internal/users/${userId}] 사용자 수정 요청`);

        // 사용자 존재 확인
        const existingUser = await userService.getUserByUsername(userId);
        if (!existingUser) {
          return handleHttpError(new HttpNotFoundError('사용자'), reply);
        }

        // 사용자 정보 수정
        const updatedUser = await userService.updateUser(userId, {
          role: role || existingUser.role,
          email: email || existingUser.email,
        });

        if (!updatedUser) {
          return reply
            .status(500)
            .send(createErrorResponse(ErrorCodes.INTERNAL_ERROR, '사용자 정보 수정에 실패했습니다.'));
        }

        // API 키 변경이 있는 경우 처리
        if (apiKey) {
          try {
            // 사용자의 API 키 찾기
            const userApiKey = await apiKeyService.findByUsernameAndStatus(userId, 'active');
            if (userApiKey) {
              // 기존 API 키 업데이트
              await apiKeyService.updateApiKey(userApiKey.id, { key: apiKey });
              logInfo(`[PUT /api/v1/internal/users/${userId}] API 키 업데이트 완료`);
            } else {
              // API 키가 없으면 새로 생성
              const apiKeyType =
                updatedUser.role === 'superuser' || updatedUser.role === 'engineer' ? 'universal' : 'external';
              await apiKeyService.createApiKey({
                username: userId,
                key: apiKey,
                type: apiKeyType,
                permissions:
                  updatedUser.role === 'superuser'
                    ? ['read:devices', 'read:status', 'write:commands', 'admin:settings', 'admin:users']
                    : ['read:devices', 'read:status'],
                status: 'active',
                description: `${userId} 사용자 API 키`,
                userId: updatedUser.id,
              });
              logInfo(`[PUT /api/v1/internal/users/${userId}] API 키 생성 완료`);
            }
          } catch (apiKeyError) {
            logError(`[PUT /api/v1/internal/users/${userId}] API 키 처리 실패: ${apiKeyError}`);
            // API 키 처리 실패해도 사용자 수정은 성공으로 처리
          }
        }

        logInfo(`[PUT /api/v1/internal/users/${userId}] 사용자 수정 완료`);

        return createSuccessResponse('사용자 수정 성공', {
          id: updatedUser.username,
          name: updatedUser.username,
          role: updatedUser.role,
          status: 'active',
        });
      } catch (error) {
        logError(`[PUT /api/v1/internal/users] 사용자 수정 실패: ${error}`);
        return handleRouteError(error, reply, 'users', '사용자 수정 중 오류가 발생했습니다.');
      }
    },
  );

  // POST /users/{userId}/change-password - 비밀번호 변경
  app.post(
    USERS_ENDPOINTS.CHANGE_PASSWORD,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };
        const { currentPassword, newPassword } = (request.body as any) || {};

        logInfo(`[POST /api/v1/internal/users/${userId}/change-password] 비밀번호 변경 요청`);

        // 필수 필드 검증
        if (!currentPassword || !newPassword) {
          return reply
            .status(400)
            .send(createErrorResponse(ErrorCodes.BAD_REQUEST, '현재 비밀번호와 새 비밀번호는 필수입니다.'));
        }

        // 사용자 존재 확인
        const existingUser = await userService.getUserByUsername(userId);
        if (!existingUser) {
          return handleHttpError(new HttpNotFoundError('사용자'), reply);
        }

        // 현재 비밀번호 검증
        const isValidPassword = await userService.validatePassword(userId, currentPassword);
        if (!isValidPassword) {
          return handleHttpError(new HttpValidationError('현재 비밀번호가 올바르지 않습니다.'), reply);
        }

        // 새 비밀번호 유효성 검증
        if (newPassword.length < 8) {
          return handleHttpError(new HttpValidationError('새 비밀번호는 최소 8자 이상이어야 합니다.'), reply);
        }

        // 비밀번호 변경
        await userService.changePassword(userId, currentPassword, newPassword);

        logInfo(`[POST /api/v1/internal/users/${userId}/change-password] 비밀번호 변경 완료`);

        return createSuccessResponse('비밀번호 변경 성공');
      } catch (error) {
        logInfo('[POST /api/v1/internal/users/change-password] 에러 발생');
        // HttpNotFoundError와 HttpValidationError는 그대로 전달, 나머지는 시스템 에러로 처리
        if (error instanceof HttpNotFoundError || error instanceof HttpValidationError) {
          return handleHttpError(error, reply);
        }
        return handleHttpError(new HttpSystemError('서버 내부 오류가 발생했습니다.'), reply);
      }
    },
  );

  // DELETE /users/{userId} - 사용자 삭제
  app.delete(
    '/users/:userId',
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };

        logInfo(`[DELETE /api/v1/internal/users/${userId}] 사용자 삭제 요청`);

        // 사용자 존재 확인
        const existingUser = await userService.getUserByUsername(userId);
        if (!existingUser) {
          return handleHttpError(new HttpNotFoundError('사용자'), reply);
        }

        // admin 사용자는 삭제 불가
        if (userId === 'admin') {
          return handleHttpError(new HttpValidationError('admin 사용자는 삭제할 수 없습니다.'), reply);
        }

        // 사용자 삭제 전 관련 API 키 삭제
        try {
          const userApiKeys = await apiKeyService.getApiKeysByUserId(existingUser._id?.toString() || existingUser.id);
          for (const apiKey of userApiKeys) {
            await apiKeyService.deleteApiKey(apiKey.key);
          }
          logInfo(`[DELETE /api/v1/internal/users/${userId}] 관련 API 키 삭제 완료`);
        } catch (apiKeyError) {
          logError(`[DELETE /api/v1/internal/users/${userId}] API 키 삭제 실패: ${apiKeyError}`);
          // API 키 삭제 실패해도 사용자 삭제는 계속 진행
        }

        // 사용자 삭제
        await userService.deleteUser(userId);

        logInfo(`[DELETE /api/v1/internal/users/${userId}] 사용자 삭제 완료`);

        return createSuccessResponse('사용자 삭제 성공');
      } catch (error) {
        logError(`[DELETE /api/v1/internal/users] 사용자 삭제 실패: ${error}`);
        return handleRouteError(error, reply, 'users', '사용자 삭제 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /users/schema (사용자 관리 API 스키마)
  app.get('/users/schema', { preHandler: [app.requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      reply.send(
        createSuccessResponse('사용자 관리 API 스키마', {
          schema: UsersResponseSchema,
          example: USERS_RESPONSE_EXAMPLE,
          description: '관리자 사용자 관리 API의 요청/응답 구조입니다.',
          endpoints: [
            {
              path: '/api/v1/internal/users',
              method: 'GET',
              description: '사용자 목록 조회',
            },
            {
              path: '/api/v1/internal/users',
              method: 'POST',
              description: '새로운 사용자 생성',
            },
            {
              path: '/api/v1/internal/users/{userId}',
              method: 'PUT',
              description: '사용자 정보 수정',
            },
            {
              path: '/api/v1/internal/users/{userId}/change-password',
              method: 'POST',
              description: '사용자 비밀번호 변경',
            },
            {
              path: '/api/v1/internal/users/{userId}',
              method: 'DELETE',
              description: '사용자 삭제',
            },
          ],
        }),
      );
    } catch (error) {
      return handleRouteError(error, reply, 'users', '사용자 관리 스키마 조회 중 오류가 발생했습니다.');
    }
  });

  // GET /users/domain/status (User 도메인 서비스 상태 조회)
  app.get(
    '/users/domain/status',
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logInfo('[GET /users/domain/status] User 도메인 서비스 상태 조회 요청');

        // 각 서비스의 상태 확인
        const userServiceStatus = await userService.getStatus();
        const userConfigServiceStatus = await userConfigService.getStatus();
        const apiKeyServiceStatus = await apiKeyService.getStatus();
        const clientServiceStatus = await clientService.getStatus();

        const result = {
          userService: userServiceStatus,
          userConfigService: userConfigServiceStatus,
          apiKeyService: apiKeyServiceStatus,
          clientService: clientServiceStatus,
          timestamp: new Date().toISOString(),
        };

        return createSuccessResponse('User 도메인 서비스 상태 조회 성공', result);
      } catch (error) {
        logError(`[GET /users/domain/status] User 도메인 서비스 상태 조회 실패: ${error}`);
        return handleRouteError(error, reply, 'users', 'User 도메인 서비스 상태 조회 중 오류가 발생했습니다.');
      }
    },
  );
}

export default fp(usersRoutes);
