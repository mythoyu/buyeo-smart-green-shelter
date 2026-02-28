import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { getKstNowParts } from '../../../../utils/time';
import { logError } from '../../../../logger';
import { createSuccessResponse } from '../../../../shared/utils/responseHelper';

export default async function systemTimeRoutes(app: FastifyInstance) {
  /**
   * GET /system/time
   * - Bushub 백엔드 서버가 인식하는 현재 시간을 조회
   * - nowIso: 서버 OS 시간 기준 ISO 문자열
   * - kst: Asia/Seoul 기준으로 분해된 시각 정보
   */
  app.get(
    '/system/time',
    {
      preHandler: [app.requireAuth],
      schema: {
        description: '서버 현재 시간 조회',
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
                  nowIso: { type: 'string' },
                  kst: {
                    type: 'object',
                    properties: {
                      year: { type: 'number' },
                      month: { type: 'number' },
                      day: { type: 'number' },
                      dow: { type: 'number' },
                      hour: { type: 'number' },
                      minute: { type: 'number' },
                      second: { type: 'number' },
                    },
                    required: ['year', 'month', 'day', 'dow', 'hour', 'minute', 'second'],
                  },
                },
                required: ['nowIso', 'kst'],
              },
            },
            required: ['success', 'message', 'data'],
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
            required: ['success', 'message'],
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const now = new Date();
        const nowIso = now.toISOString();
        const kst = getKstNowParts();

        return reply.send(
          createSuccessResponse('시스템 시간 조회 성공', {
            nowIso,
            kst,
          }),
        );
      } catch (error) {
        logError(`시스템 시간 조회 실패: ${error}`);

        return reply.code(500).send({
          success: false,
          message: '시스템 시간 조회 실패',
        });
      }
    },
  );
}

