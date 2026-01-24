/**
 * System People Counter API Routes
 * 피플카운터 Enable/Disable 설정 API
 */

import { FastifyInstance } from 'fastify';

import { ILogger } from '../../../../core/interfaces/ILogger';

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
}
