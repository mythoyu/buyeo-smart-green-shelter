import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// API 엔드포인트 상수
const ERRORS_ENDPOINTS = {
  ERRORS: '/errors',
  SCHEMA: '/errors/schema',
} as const;

import logger from '../../../logger';
import { Client as ClientSchema } from '../../../models/schemas/ClientSchema';
import { Error as ErrorSchema } from '../../../models/schemas/ErrorSchema';
import {
  createSuccessResponse,
  handleRouteError,
  createErrorResponse,
  ErrorCodes,
} from '../../../shared/utils/responseHelper';
import { ErrorsResponseSchema, ERRORS_RESPONSE_EXAMPLE } from '../schemas/errors.schema';

async function errorsRoutes(app: FastifyInstance) {
  // GET /errors
  app.get(
    ERRORS_ENDPOINTS.ERRORS,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // 데이터베이스에서 클라이언트 조회
        const latestClient = await ClientSchema.findOne({}).sort({ createdAt: -1 }).lean();
        if (!latestClient) {
          logger.warn(
            `[GET /api/v1/internal/errors] 클라이언트가 설정되지 않았습니다. POST /client API로 클라이언트를 생성해주세요.`,
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
        // logger.info(`[GET /api/v1/internal/errors] 데이터베이스에서 클라이언트 조회: ${currentClientId}`);

        // 모든 장비 에러 조회 (단일 클라이언트)
        const errors = await ErrorSchema.find({}).lean();
        const devices = errors.map((error: any) => ({
          id: error.deviceId,
          units: error.units.map((u: any) => ({
            id: u.unitId,
            errorId: u.errorId,
            errorDesc: u.errorDesc,
            errorAt: u.errorAt,
          })),
        }));

        const result = {
          id: currentClientId,
          devices,
        };
        reply.header('Cache-Control', 'no-store');
        return createSuccessResponse('클라이언트 에러 조회 성공', result);
      } catch (error) {
        logger.error(
          `[GET /api/v1/external/errors] External 클라이언트 에러 조회 실패: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
        return handleRouteError(error, reply, 'errors', '클라이언트 에러 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /errors/schema (에러 API 스키마)
  app.get(
    ERRORS_ENDPOINTS.SCHEMA,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        reply.send(
          createSuccessResponse('에러 API 스키마', {
            schema: ErrorsResponseSchema,
            example: ERRORS_RESPONSE_EXAMPLE,
            description: '클라이언트 에러 조회 API의 응답 구조와 예시 데이터입니다.',
            endpoints: [
              {
                path: '/api/v1/external/errors',
                method: 'GET',
                description: '클라이언트 에러 조회',
              },
            ],
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'errors', '에러 스키마 조회 중 오류가 발생했습니다.');
      }
    },
  );
}

export default fp(errorsRoutes);
