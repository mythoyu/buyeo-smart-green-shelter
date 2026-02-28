/**
 * System People Counter API Routes
 * 피플카운터 Enable/Disable 설정 API
 */

import { FastifyInstance } from 'fastify';

import { ILogger } from '../../../../core/interfaces/ILogger';
import { getPeopleCounterHourlyStats } from '../../../../core/services/PeopleCounterAggregationService';
import { Data } from '../../../../models/schemas/DataSchema';
import { PeopleCounterRaw } from '../../../../models/schemas/PeopleCounterRawSchema';
import { createSuccessResponse } from '../../../../shared/utils/responseHelper';

export default async function peopleCounterRoutes(fastify: FastifyInstance) {
  const logger: ILogger = fastify.log;
  const { serviceContainer } = fastify;
  const systemService = serviceContainer.getSystemService();

  /**
   * GET /system/people-counter/state
   * 피플카운터 활성화 상태 조회
   */
  fastify.get(
    '/system/people-counter/state',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  peopleCounterEnabled: { type: 'boolean' },
                },
              },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        const state = await systemService.getPeopleCounterState(true);
        if (!state) {
          return (reply as any).code(500).send({
            success: false,
            message: '피플카운터 상태 초기화에 실패했습니다',
          });
        }
        return reply.send({
          success: true,
          data: { peopleCounterEnabled: state.peopleCounterEnabled },
        });
      } catch (error) {
        logger.error(`[People Counter API] 상태 조회 오류: ${error}`);
        return (reply as any).code(500).send({
          success: false,
          message: '내부 서버 오류',
          error: String(error),
        });
      }
    },
  );

  /**
   * POST /system/people-counter
   * 피플카운터 Enable/Disable 설정
   */
  fastify.post(
    '/system/people-counter',
    {
      schema: {
        body: {
          type: 'object',
          required: ['peopleCounterEnabled'],
          properties: {
            peopleCounterEnabled: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  peopleCounterEnabled: { type: 'boolean' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { peopleCounterEnabled } = request.body as { peopleCounterEnabled: boolean };
        if (typeof peopleCounterEnabled !== 'boolean') {
          return (reply as any).code(400).send({
            success: false,
            message: 'peopleCounterEnabled는 boolean 값이어야 합니다',
          });
        }

        const updated = await systemService.updatePeopleCounterState(peopleCounterEnabled);
        if (!updated?.runtime) {
          return (reply as any).code(500).send({
            success: false,
            message: '피플카운터 상태 업데이트에 실패했습니다',
          });
        }

        return reply.send({
          success: true,
          message: peopleCounterEnabled ? '피플카운터가 활성화되었습니다' : '피플카운터가 비활성화되었습니다',
          data: { peopleCounterEnabled: updated.runtime.peopleCounterEnabled ?? false },
        });
      } catch (error) {
        logger.error(`[People Counter API] 상태 업데이트 오류: ${error}`);
        return (reply as any).code(500).send({
          success: false,
          message: '내부 서버 오류',
          error: String(error),
        });
      }
    },
  );

  /**
   * POST /system/people-counter/reset
   * 피플카운터 리셋 (현재 인원, 입실 누적, 퇴실 누적)
   */
  fastify.post(
    '/system/people-counter/reset',
    {
      preHandler: [fastify.requireAuth],
      schema: {
        body: {
          type: 'object',
          required: ['type'],
          properties: {
            type: {
              type: 'string',
              enum: ['current', 'in', 'out', 'all'],
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          409: {
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
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // peopleCounterEnabled 체크
        const state = await systemService.getPeopleCounterState(false);
        if (!state?.peopleCounterEnabled) {
          return (reply as any).code(409).send({
            success: false,
            message: '피플카운터가 비활성화되어 있습니다.',
          });
        }

        // type 검증
        const { type } = request.body as { type: string };
        if (!type || !['current', 'in', 'out', 'all'].includes(type)) {
          return (reply as any).code(400).send({
            success: false,
            message: 'type은 current, in, out, all 중 하나여야 합니다.',
          });
        }

        // QueueService 획득 및 리셋 실행
        const queueService = serviceContainer.getPeopleCounterQueueService();
        if (!queueService) {
          return (reply as any).code(500).send({
            success: false,
            message: '피플카운터 큐 서비스를 찾을 수 없습니다.',
          });
        }

        try {
          await queueService.enqueueReset(type as 'current' | 'in' | 'out' | 'all');
          return reply.send({
            success: true,
            message: '리셋 완료',
          });
        } catch (error) {
          logger.error(`[People Counter API] 리셋 실패: ${error}`);
          return (reply as any).code(500).send({
            success: false,
            message: '피플카운터 리셋에 실패했습니다',
            error: String(error),
          });
        }
      } catch (error) {
        logger.error(`[People Counter API] 리셋 오류: ${error}`);
        return (reply as any).code(500).send({
          success: false,
          message: '내부 서버 오류',
          error: String(error),
        });
      }
    },
  );

  /**
   * POST /system/people-counter/reset-data
   * 피플카운터 데이터 초기화 (people_counter_raw + data.d082)
   */
  fastify.post(
    '/system/people-counter/reset-data',
    {
      preHandler: [fastify.requireAuth],
      schema: {
        description: '피플카운터 데이터 초기화 (people_counter_raw + data.d082)',
        tags: ['System'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  rawDeleted: { type: 'number' },
                  dataDeleted: { type: 'number' },
                },
              },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        const rawResult = await PeopleCounterRaw.deleteMany({});
        const dataResult = await Data.deleteOne({ deviceId: 'd082' });

        logger.info(
          `[People Counter API] reset-data 실행: rawDeleted=${rawResult.deletedCount}, dataDeleted=${dataResult.deletedCount}`,
        );

        return reply.send(
          createSuccessResponse('피플카운터 데이터 초기화가 완료되었습니다.', {
            rawDeleted: rawResult.deletedCount ?? 0,
            dataDeleted: dataResult.deletedCount ?? 0,
          }),
        );
      } catch (error) {
        logger.error(`[People Counter API] reset-data 오류: ${error}`);
        return (reply as any).code(500).send({
          success: false,
          message: '피플카운터 데이터 초기화 중 오류가 발생했습니다.',
          error: String(error),
        });
      }
    },
  );

  /**
   * GET /system/people-counter/hourly-stats
   * 피플카운터 시간대별(1시간 단위) 통계 조회
   */
  fastify.get(
    '/system/people-counter/hourly-stats',
    {
      preHandler: [fastify.requireAuth],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            date: { type: 'string', description: '기준 날짜 (YYYY-MM-DD)', examples: ['2025-01-09'] },
            clientId: { type: 'string', description: '클라이언트 ID (선택)' },
          },
          required: ['date'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  timezone: { type: 'string' },
                  buckets: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        start: { type: 'string' },
                        end: { type: 'string' },
                        inCount: { type: 'number' },
                        outCount: { type: 'number' },
                        peakCount: { type: 'number' },
                        avgCount: { type: 'number' },
                        dataPoints: { type: 'number' },
                      },
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
          404: {
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
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const pcState = await systemService.getPeopleCounterState(false);
        if (!pcState?.peopleCounterEnabled) {
          return (reply as any).code(404).send({
            success: false,
            message: '피플카운터가 비활성화되어 있습니다.',
          });
        }

        const { date, clientId } = request.query as { date?: string; clientId?: string };
        if (!date) {
          return (reply as any).code(400).send({
            success: false,
            message: 'date(YYYY-MM-DD) 쿼리 파라미터가 필요합니다.',
          });
        }

        const baseDate = new Date(`${date}T00:00:00`);
        if (Number.isNaN(baseDate.getTime())) {
          return (reply as any).code(400).send({
            success: false,
            message: '유효한 date(YYYY-MM-DD) 값을 입력해주세요.',
          });
        }

        // internal 라우트에서는 필요 시 clientService를 통해 명시적인 clientId를 사용할 수도 있음
        let resolvedClientId = clientId;
        if (!resolvedClientId) {
          try {
            const clientService = serviceContainer.getClientService();
            const client = await clientService.getFirstClient();
            if (client?.id) {
              resolvedClientId = client.id;
            }
          } catch (e) {
            logger.warn(`[People Counter API] hourly-stats 클라이언트 조회 실패: ${e}`);
          }
        }

        const params: { date: Date; clientId?: string } = { date: baseDate };
        if (resolvedClientId) {
          params.clientId = resolvedClientId;
        }

        const stats = await getPeopleCounterHourlyStats(params);

        return reply.send({
          success: true,
          data: {
            date: stats.date,
            timezone: stats.timezone,
            buckets: stats.buckets,
          },
        });
      } catch (error) {
        logger.error(`[People Counter API] hourly-stats 오류: ${error}`);
        return (reply as any).code(500).send({
          success: false,
          message: '내부 서버 오류',
          error: String(error),
        });
      }
    },
  );
}
