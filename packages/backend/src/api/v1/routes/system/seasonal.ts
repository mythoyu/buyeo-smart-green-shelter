import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { ServiceContainer } from '../../../../core/container/ServiceContainer';
import { createSuccessResponse, handleRouteError } from '../../../../shared/utils/responseHelper';
import {
  SeasonalResponseSchema,
  SEASONAL_RESPONSE_EXAMPLE,
  SEASONAL_REQUEST_EXAMPLE,
} from '../../schemas/seasonal.schema';

export default async function systemSeasonalRoutes(fastify: FastifyInstance) {
  // 🌸 절기 설정 저장
  fastify.post(
    '/system/seasonal',
    {
      preHandler: [fastify.requireAuth],
      schema: {
        body: {
          type: 'object',
          required: ['seasonal'],
          properties: {
            seasonal: {
              type: 'object',
              required: [
                'january',
                'february',
                'march',
                'april',
                'may',
                'june',
                'july',
                'august',
                'september',
                'october',
                'november',
                'december',
              ],
              properties: {
                january: { type: 'number' },
                february: { type: 'number' },
                march: { type: 'number' },
                april: { type: 'number' },
                may: { type: 'number' },
                june: { type: 'number' },
                july: { type: 'number' },
                august: { type: 'number' },
                september: { type: 'number' },
                october: { type: 'number' },
                november: { type: 'number' },
                december: { type: 'number' },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { seasonal } = request.body as any;

        // ServiceContainer에서 SystemService 가져오기
        const serviceContainer = ServiceContainer.getInstance();
        const systemService = serviceContainer.getSystemService();

        // 🆕 실제 클라이언트 정보 조회
        const clientRepository = serviceContainer.getClientRepository();
        const clients = await clientRepository.findAll();

        if (!clients || clients.length === 0) {
          return reply.code(400).send({
            success: false,
            message: '활성 클라이언트가 없습니다.',
          });
        }

        // 첫 번째 활성 클라이언트 사용
        const activeClient = clients[0];
        const clientId = activeClient.id;

        fastify.log.info(`🌸 절기 설정 저장 대상 클라이언트: ${clientId} (${activeClient.name})`);

        // 절기 설정 저장
        const result = await systemService.saveSeasonal(clientId, seasonal);

        if (result.success) {
          return reply.code(200).send(result);
        }
        return reply.code(400).send(result);
      } catch (error) {
        fastify.log.error(`절기 설정 저장 실패: ${error}`);
        return reply.code(500).send({
          success: false,
          message: `절기 설정 저장 실패: ${error}`,
        });
      }
    },
  );

  // 🌸 절기 설정 조회
  fastify.get(
    '/system/seasonal',
    {
      preHandler: [fastify.requireAuth],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  seasonal: {
                    type: 'object',
                    properties: {
                      season: { type: 'number' },
                      january: { type: 'number' },
                      february: { type: 'number' },
                      march: { type: 'number' },
                      april: { type: 'number' },
                      may: { type: 'number' },
                      june: { type: 'number' },
                      july: { type: 'number' },
                      august: { type: 'number' },
                      september: { type: 'number' },
                      october: { type: 'number' },
                      november: { type: 'number' },
                      december: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // ServiceContainer에서 SystemService 가져오기
        const serviceContainer = ServiceContainer.getInstance();
        const systemService = serviceContainer.getSystemService();

        // 🆕 실제 클라이언트 정보 조회
        const clientRepository = serviceContainer.getClientRepository();
        const clients = await clientRepository.findAll();

        if (!clients || clients.length === 0) {
          return reply.code(400).send({
            success: false,
            message: '활성 클라이언트가 없습니다.',
          });
        }

        // 첫 번째 활성 클라이언트 사용
        const activeClient = clients[0];
        const clientId = activeClient.id;

        fastify.log.info(`🌸 절기 설정 조회 대상 클라이언트: ${clientId} (${activeClient.name})`);

        // 절기 설정 조회
        const seasonal = await systemService.getSeasonal(clientId);

        if (seasonal) {
          return reply.send(createSuccessResponse('절기 설정 조회 성공', { seasonal }));
        }

        // 🆕 절기 설정이 없으면 기본값 생성 후 반환
        fastify.log.warn(`절기 설정이 없어 기본값 생성: ${clientId}`);

        // 기본 절기 설정 (5~10월 하절기) - GET 조회 시에는 season 필드 포함
        const defaultSeasonal = {
          season: 0,
          january: 0,
          february: 0,
          march: 0,
          april: 0,
          may: 1,
          june: 1,
          july: 1,
          august: 1,
          september: 1,
          october: 1,
          november: 0,
          december: 0,
        };

        // 기본값 저장
        await systemService.updateSettings({ seasonal: defaultSeasonal });

        return reply.send(createSuccessResponse('절기 설정 조회 성공 (기본값 생성)', { seasonal: defaultSeasonal }));
      } catch (error) {
        fastify.log.error(`절기 설정 조회 실패: ${error}`);
        return reply.code(500).send({
          success: false,
          message: `절기 설정 조회 실패: ${error}`,
        });
      }
    },
  );

  // 🌸 절기 설정 새로고침
  fastify.post(
    '/system/seasonal/refresh',
    {
      preHandler: [fastify.requireAuth],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  seasonal: {
                    type: 'object',
                    properties: {
                      season: { type: 'number' },
                      january: { type: 'number' },
                      february: { type: 'number' },
                      march: { type: 'number' },
                      april: { type: 'number' },
                      may: { type: 'number' },
                      june: { type: 'number' },
                      july: { type: 'number' },
                      august: { type: 'number' },
                      september: { type: 'number' },
                      october: { type: 'number' },
                      november: { type: 'number' },
                      december: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const serviceContainer = ServiceContainer.getInstance();
        const systemService = serviceContainer.getSystemService();
        const clientRepository = serviceContainer.getClientRepository();
        const clients = await clientRepository.findAll();

        if (!clients || clients.length === 0) {
          return reply.code(400).send({
            success: false,
            message: '활성 클라이언트가 없습니다.',
          });
        }

        const activeClient = clients[0];
        const clientId = activeClient.id;

        fastify.log.info(`🌸 절기 설정 새로고침 대상 클라이언트: ${clientId} (${activeClient.name})`);

        const result = await systemService.refreshSeasonal(clientId);
        return reply.send(result);
      } catch (error) {
        fastify.log.error(`절기 설정 새로고침 실패: ${error}`);
        return reply.code(500).send({
          success: false,
          message: `절기 설정 새로고침 실패: ${error}`,
        });
      }
    },
  );

  // 🌸 절기 설정 스키마 조회
  fastify.get(
    '/system/seasonal/schema',
    {
      preHandler: [fastify.requireAuth],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        reply.send(
          createSuccessResponse('절기 설정 API 스키마', {
            schema: SeasonalResponseSchema,
            requestExample: SEASONAL_REQUEST_EXAMPLE,
            responseExample: SEASONAL_RESPONSE_EXAMPLE,
            description: '절기 설정 조회 및 저장 API의 응답 구조와 예시 데이터입니다.',
            endpoints: [
              {
                path: '/api/v1/external/system/seasonal',
                method: 'GET',
                description: '절기 설정 조회',
              },
              {
                path: '/api/v1/external/system/seasonal',
                method: 'POST',
                description: '절기 설정 저장',
              },
            ],
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'seasonal', '절기 설정 스키마 조회 중 오류가 발생했습니다.');
      }
    },
  );
}
