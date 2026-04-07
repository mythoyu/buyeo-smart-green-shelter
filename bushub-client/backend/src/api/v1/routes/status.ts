import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// API 엔드포인트 상수
const STATUS_ENDPOINTS = {
  STATUS: '/status',
  SCHEMA: '/status/schema',
} as const;

import logger from '../../../logger';
import { Client as ClientSchema } from '../../../models/schemas/ClientSchema';
import { Status as StatusSchema } from '../../../models/schemas/StatusSchema';
import {
  createSuccessResponse,
  handleRouteError,
  createErrorResponse,
  ErrorCodes,
} from '../../../shared/utils/responseHelper';
import { StatusResponseSchema, STATUS_RESPONSE_EXAMPLE } from '../schemas/status.schema';

async function statusRoutes(app: FastifyInstance) {
  // GET /status
  app.get(
    STATUS_ENDPOINTS.STATUS,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // logger.info('[GET /api/v1/external/status] External 클라이언트 상태 조회 요청');

        // 데이터베이스에서 클라이언트 조회
        const latestClient = await ClientSchema.findOne({}).sort({ createdAt: -1 }).lean();
        if (!latestClient) {
          logger.warn(
            `[GET /api/v1/internal/status] 클라이언트가 설정되지 않았습니다. POST /client API로 클라이언트를 생성해주세요.`,
          );
          return reply
            .code(503)
            .send(
              createErrorResponse(
                ErrorCodes.CLIENT_NOT_CONFIGURED,
                '클라이언트가 설정되지 않았습니다. POST /client API로 클라이언트를 생성해주세요.',
              ),
            );
        }

        const currentClientId = latestClient.id;
        // logger.info(`[GET /api/v1/internal/status] 데이터베이스에서 클라이언트 조회: ${currentClientId}`);

        // 모든 장비 상태 조회 (단일 클라이언트)
        const statuses = await StatusSchema.find({}).lean();
        // logger.info(`[GET /api/v1/internal/status] 조회된 상태 수: ${statuses.length}`);
        const devices = statuses.map((status) => ({
          id: status.deviceId,
          status: status.status,
          units: status.units.map((u: any) => ({ id: u.unitId, status: u.status })),
        }));

        const result = {
          id: currentClientId,
          devices,
        };
        // logger.debug(`[GET /api/v1/external/status] External 클라이언트 상태 조회 응답: ${JSON.stringify(result)}`);
        reply.header('Cache-Control', 'no-store');
        return createSuccessResponse('클라이언트 상태 조회 성공', result);
      } catch (error) {
        logger.error(
          `[GET /api/v1/external/status] External 클라이언트 상태 조회 실패: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
        return handleRouteError(error, reply, 'status', '클라이언트 상태 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /status/schema (상태 API 스키마)
  app.get(
    STATUS_ENDPOINTS.SCHEMA,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        reply.send(
          createSuccessResponse('상태 API 스키마', {
            schema: StatusResponseSchema,
            example: STATUS_RESPONSE_EXAMPLE,
            description: '클라이언트 상태 조회 API의 응답 구조와 예시 데이터입니다.',
            endpoints: [
              {
                path: '/api/v1/external/status',
                method: 'GET',
                description: '클라이언트 상태 조회',
              },
            ],
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'status', '상태 스키마 조회 중 오류가 발생했습니다.');
      }
    },
  );
}

export default fp(statusRoutes);
