import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// API 엔드포인트 상수
const DATA_ENDPOINTS = {
  DATA: '/data',
  SCHEMA: '/data/schema',
  META_SCHEMA: '/meta/schema',
} as const;

import { ServiceContainer } from '../../../core/container/ServiceContainer';
import logger from '../../../logger';
import { Client as ClientSchema } from '../../../models/schemas/ClientSchema';
import { Data as DataSchema } from '../../../models/schemas/DataSchema';
import {
  createSuccessResponse,
  handleRouteError,
  createErrorResponse,
  ErrorCodes,
} from '../../../shared/utils/responseHelper';
import { DataResponseSchema, DATA_RESPONSE_EXAMPLE } from '../schemas/data.schema';

async function dataRoutes(app: FastifyInstance) {
  // GET /data
  app.get(
    DATA_ENDPOINTS.DATA,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // 데이터베이스에서 클라이언트 조회
        const latestClient = await ClientSchema.findOne({}).sort({ createdAt: -1 }).lean();
        if (!latestClient) {
          logger.warn(
            `[GET /api/v1/internal/data] 클라이언트가 설정되지 않았습니다. POST /client API로 클라이언트를 생성해주세요.`,
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
        // logger.info(`[GET /api/v1/internal/data] 데이터베이스에서 클라이언트 조회: ${currentClientId}`);

        // 모든 장비 데이터 조회 (단일 클라이언트)
        const datas = await DataSchema.find({}).lean();
        let devices = datas.map((data) => ({
          id: data.deviceId,
          type: data.type,
          units: data.units.map((u: any) => ({ id: u.unitId, data: u.data })),
        }));

        const systemService = ServiceContainer.getInstance().getSystemService();
        const pcState = await systemService.getPeopleCounterState(false);
        if (!pcState?.peopleCounterEnabled) {
          devices = devices.filter((d) => d.id !== 'd082');
        }

        const result = {
          id: currentClientId,
          devices,
        };
        reply.header('Cache-Control', 'no-store');
        return createSuccessResponse('클라이언트 데이터 조회 성공', result);
      } catch (error) {
        logger.error(
          `[GET /api/v1/external/data] External 클라이언트 데이터 조회 실패: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
        return handleRouteError(error, reply, 'data', '클라이언트 데이터 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /data/schema (데이터 API 스키마)
  app.get(
    DATA_ENDPOINTS.SCHEMA,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        reply.send(
          createSuccessResponse('데이터 API 스키마', {
            schema: DataResponseSchema,
            example: DATA_RESPONSE_EXAMPLE,
            description: '클라이언트 데이터 조회 API의 응답 구조와 예시 데이터입니다.',
            endpoints: [
              {
                path: '/api/v1/external/data',
                method: 'GET',
                description: '클라이언트 데이터 조회',
              },
            ],
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'data', '데이터 스키마 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /meta/schema (메타 API 스키마)
  app.get(
    DATA_ENDPOINTS.META_SCHEMA,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        reply.send(
          createSuccessResponse('메타 API 스키마', {
            description: 'API 메타데이터 스키마입니다.',
            endpoints: [
              {
                path: '/api/v1/external/meta/schema',
                method: 'GET',
                description: 'API 메타데이터 스키마 조회',
              },
            ],
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'data', '메타 스키마 조회 중 오류가 발생했습니다.');
      }
    },
  );
}

export default fp(dataRoutes);
