/**
 * System People Counter API Routes
 * 피플카운터 Enable/Disable 설정 API
 */

import { FastifyInstance } from 'fastify';

import { ILogger } from '../../../../core/interfaces/ILogger';
import { getPeopleCounterHourlyStats } from '../../../../core/services/PeopleCounterAggregationService';
import { Client as ClientSchema } from '../../../../models/schemas/ClientSchema';
import { Data } from '../../../../models/schemas/DataSchema';
import { PeopleCounterRaw } from '../../../../models/schemas/PeopleCounterRawSchema';
import { isPeopleCounterMockEnabled } from '../../../../config/mock.config';
import { createSuccessResponse } from '../../../../shared/utils/responseHelper';
import { startOfKstDayFromYmd } from '../../../../shared/utils/kstDateTime';

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
   * GET /system/people-counter/units
   * PEOPLE_COUNTER_PORTS 기준으로 등록된 유닛 ID 목록 (직접 제어 APC 테스트용)
   */
  fastify.get(
    '/system/people-counter/units',
    {
      preHandler: [fastify.requireAuth],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  unitIds: { type: 'array', items: { type: 'string' } },
                },
              },
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
    async (_request, reply) => {
      try {
        const map = serviceContainer.getPeopleCounterQueueServices?.();
        const unitIds =
          map && typeof map.keys === 'function'
            ? Array.from(map.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            : ['u001'];
        return reply.send({
          success: true,
          data: { unitIds },
        });
      } catch (error) {
        logger.error(`[People Counter API] units 조회 오류: ${error}`);
        return (reply as any).code(500).send({
          success: false,
          message: '내부 서버 오류',
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
            /** PEOPLE_COUNTER_PORTS 유닛(예: u001). 미지정 시 u001 큐 */
            unitId: { type: 'string' },
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
        const body = request.body as { type?: string; unitId?: string };
        const { type } = body;
        if (!type || !['current', 'in', 'out', 'all'].includes(type)) {
          return (reply as any).code(400).send({
            success: false,
            message: 'type은 current, in, out, all 중 하나여야 합니다.',
          });
        }

        const unitId =
          typeof body.unitId === 'string' && body.unitId.trim() !== '' ? body.unitId.trim() : 'u001';
        const pcMap = serviceContainer.getPeopleCounterQueueServices?.();
        if (pcMap && pcMap.size > 0 && !pcMap.has(unitId)) {
          const available = Array.from(pcMap.keys())
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .join(', ');
          return (reply as any).code(400).send({
            success: false,
            message: `유효하지 않은 unitId입니다. 사용 가능: ${available}`,
          });
        }

        // QueueService 획득 및 리셋 실행
        const queueService =
          pcMap && pcMap.size > 0 ? pcMap.get(unitId) : serviceContainer.getPeopleCounterQueueService(unitId);
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
        body: {
          type: 'object',
          properties: {
            /** 지정 시 해당 유닛 Raw 삭제 + data.d082.units.<unitId> 제거. 미지정 시 전체 삭제 */
            unitId: { type: 'string' },
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
                  rawDeleted: { type: 'number' },
                  dataDeleted: { type: 'number' },
                  unitId: { type: 'string' },
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
    async (request, reply) => {
      try {
        // 운영 환경에서 필요 시 전체 삭제를 ENV로 차단할 수 있게 한다. (기본값: 허용 → 기존 동작 보존)
        const resetDisabled = String(process.env.PEOPLE_COUNTER_RESET_DATA_DISABLED || '').toLowerCase() === 'true';
        if (resetDisabled) {
          logger.warn('[People Counter API] reset-data가 ENV로 차단되었습니다 (PEOPLE_COUNTER_RESET_DATA_DISABLED=true)');
          return (reply as any).code(403).send({
            success: false,
            message: '피플카운터 데이터 초기화가 차단되어 있습니다.',
          });
        }

        const body = (request.body as { unitId?: string } | undefined) ?? {};
        const uid = typeof body.unitId === 'string' ? body.unitId.trim() : '';

        if (uid && /^u\d{3}$/.test(uid)) {
          const latest = await ClientSchema.findOne({}).sort({ createdAt: -1 }).lean();
          const clientId = latest?.id ?? 'c0101';
          const rawResult = await PeopleCounterRaw.deleteMany({ clientId, deviceId: 'd082', unitId: uid });
          const dataResult = await Data.updateOne({ deviceId: 'd082' }, { $unset: { [`units.${uid}`]: '' } });

          logger.info(
            `[People Counter API] reset-data(유닛 ${uid}): rawDeleted=${rawResult.deletedCount}, dataModified=${dataResult.modifiedCount}`,
          );

          return reply.send(
            createSuccessResponse(`피플카운터 유닛 ${uid} 데이터 초기화가 완료되었습니다.`, {
              rawDeleted: rawResult.deletedCount ?? 0,
              dataDeleted: 0,
              unitId: uid,
            }),
          );
        }

        if (uid) {
          return (reply as any).code(400).send({
            success: false,
            message: 'unitId는 u001 형식이어야 합니다.',
          });
        }

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
            unitId: { type: 'string', description: '유닛(예: u001). 미지정 시 전 유닛 합산' },
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

        const { date, clientId, unitId: unitIdQ } = request.query as {
          date?: string;
          clientId?: string;
          unitId?: string;
        };
        if (!date) {
          return (reply as any).code(400).send({
            success: false,
            message: 'date(YYYY-MM-DD) 쿼리 파라미터가 필요합니다.',
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

        let kstBaseDate: Date;
        try {
          kstBaseDate = startOfKstDayFromYmd(date.trim());
        } catch {
          return (reply as any).code(400).send({
            success: false,
            message: '유효한 date(YYYY-MM-DD) 값을 입력해주세요.',
          });
        }

        const params: { date: Date; dateString: string; clientId?: string; unitId?: string } = {
          date: kstBaseDate,
          dateString: date,
        };
        if (resolvedClientId) {
          params.clientId = resolvedClientId;
        }
        const uid = typeof unitIdQ === 'string' ? unitIdQ.trim() : '';
        if (uid && /^u\d{3}$/.test(uid)) {
          params.unitId = uid;
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

  /**
   * POST /system/people-counter/apc-test
   * PEOPLE_COUNTER_PORTS 유닛별 APC 수동 송수신 (폴링과 큐로 직렬화). Modbus와 무관.
   * — Mock 모드 비허용, DDC 폴링 활성 시 비허용(직접 제어 페이지 정책과 동일).
   */
  fastify.post(
    '/system/people-counter/apc-test',
    {
      preHandler: [fastify.requireAuth],
      schema: {
        body: {
          type: 'object',
          required: ['data'],
          properties: {
            data: { type: 'string' },
            /** PEOPLE_COUNTER_PORTS 순서에 대응하는 유닛 (예: u001, u002). 미지정 시 u001 */
            unitId: { type: 'string' },
            timeoutMs: { type: 'number' },
            waitForClosingBracket: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (isPeopleCounterMockEnabled()) {
          return (reply as any).code(503).send({
            success: false,
            message: '피플카운터 Mock 모드에서는 APC 테스트를 사용할 수 없습니다.',
          });
        }

        const pollingState = await systemService.getPollingState(false);
        if (pollingState?.pollingEnabled === true) {
          return (reply as any).code(409).send({
            success: false,
            message: 'DDC 폴링이 켜져 있으면 APC 테스트를 사용할 수 없습니다. 시스템 설정에서 폴링을 먼저 중지하세요.',
          });
        }

        const body = request.body as {
          data?: string;
          unitId?: string;
          timeoutMs?: number;
          waitForClosingBracket?: boolean;
        };
        const data = typeof body.data === 'string' ? body.data.trim() : '';
        if (!data) {
          return (reply as any).code(400).send({
            success: false,
            message: 'data(송신 문자열)가 필요합니다.',
          });
        }

        const unitId =
          typeof body.unitId === 'string' && body.unitId.trim() !== '' ? body.unitId.trim() : 'u001';
        const pcMap = serviceContainer.getPeopleCounterQueueServices?.();
        if (pcMap && pcMap.size > 0 && !pcMap.has(unitId)) {
          const available = Array.from(pcMap.keys())
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .join(', ');
          return (reply as any).code(400).send({
            success: false,
            message: `유효하지 않은 unitId입니다. 사용 가능: ${available}`,
          });
        }

        let timeoutMs = typeof body.timeoutMs === 'number' && Number.isFinite(body.timeoutMs) ? body.timeoutMs : 1000;
        timeoutMs = Math.min(30000, Math.max(100, timeoutMs));
        const waitForClosingBracket = body.waitForClosingBracket !== false;

        const apiKey = (request as any).apiKey;
        const keyLabel = apiKey?.name ?? apiKey?.id ?? 'unknown';
        logger.info(
          `[People Counter APC-TEST] apiKey=${keyLabel} unitId=${unitId} wait=${waitForClosingBracket} timeoutMs=${timeoutMs} dataLen=${data.length}`,
        );

        const queueService = pcMap && pcMap.size > 0 ? pcMap.get(unitId) : serviceContainer.getPeopleCounterQueueService(unitId);
        if (!queueService) {
          return (reply as any).code(500).send({
            success: false,
            message: '피플카운터 큐 서비스를 찾을 수 없습니다.',
          });
        }

        const result = await queueService.enqueueManualApc(data, timeoutMs, waitForClosingBracket);
        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error(`[People Counter API] apc-test 오류: ${error}`);
        return (reply as any).code(500).send({
          success: false,
          message: error instanceof Error ? error.message : 'APC 테스트 실패',
          error: String(error),
        });
      }
    },
  );
}
