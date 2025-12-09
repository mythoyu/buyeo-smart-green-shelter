import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// API 엔드포인트 상수
const API_KEYS_ENDPOINTS = {
  API_KEYS: '/api-keys',
  SCHEMA: '/api-keys/schema',
} as const;

import { ServiceContainer } from '../../../core/container/ServiceContainer';
import { logInfo } from '../../../logger';
import { createSuccessResponse, handleRouteError } from '../../../shared/utils/responseHelper';
import { ApiKeysResponseSchema, APIKEYS_RESPONSE_EXAMPLE } from '../schemas/apiKeys.schema';

async function apiKeysRoutes(fastify: FastifyInstance) {
  const serviceContainer = ServiceContainer.getInstance();
  const apiKeyService = serviceContainer.getApiKeyService();

  // GET /api-keys
  fastify.get(
    API_KEYS_ENDPOINTS.API_KEYS,
    { preHandler: [fastify.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logInfo('API 키 목록 조회 요청');

        const apiKeyService = serviceContainer.getApiKeyService();
        const { apiKeys } = await apiKeyService.getApiKeys();

        const result = apiKeys.map((key: any) => ({
          id: key._id,
          name: key.name,
          type: key.type,
          status: key.status,
          createdAt: key.createdAt.toISOString(),
          expiresAt: key.expiresAt?.toISOString(),
        }));

        logInfo('API 키 목록 조회 응답 완료');

        return createSuccessResponse('API 키 목록 조회 성공', result);
      } catch (error) {
        return handleRouteError(error, reply, 'apiKeys', 'API 키 목록 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /api-keys/schema (API 키 관리 스키마)
  fastify.get(
    API_KEYS_ENDPOINTS.SCHEMA,
    { preHandler: [fastify.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        reply.send(
          createSuccessResponse('API 키 관리 스키마', {
            schema: ApiKeysResponseSchema,
            example: APIKEYS_RESPONSE_EXAMPLE,
            description: 'API 키 관리 API의 요청/응답 구조입니다.',
            endpoints: [
              {
                path: '/api/v1/internal/api-keys',
                method: 'GET',
                description: 'API 키 목록 조회',
              },
            ],
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'apikey', 'API 키 관리 스키마 조회 중 오류가 발생했습니다.');
      }
    },
  );
}

export default fp(apiKeysRoutes);
