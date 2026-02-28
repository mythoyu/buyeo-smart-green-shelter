/**
 * People Counter External API (stats, raw)
 * GET /people-counter/stats, GET /people-counter/raw
 * @see docs/PEOPLE_COUNTER_SPEC.md
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import { ServiceContainer } from '../../../core/container/ServiceContainer';
import { Client as ClientSchema } from '../../../models/schemas/ClientSchema';
import { PeopleCounterRaw } from '../../../models/schemas/PeopleCounterRawSchema';
import { getPeopleCounterHourlyStats } from '../../../core/services/PeopleCounterAggregationService';
import { createSuccessResponse, handleRouteError } from '../../../shared/utils/responseHelper';
import logger from '../../../logger';

type Period = 'hour' | 'day' | 'week' | 'month';

function getDateRange(period: Period): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  switch (period) {
    case 'hour':
      start.setHours(start.getHours() - 1);
      break;
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week': {
      const d = start.getDay();
      const mon = d === 0 ? -6 : 1 - d;
      start.setDate(start.getDate() + mon);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setHours(start.getHours() - 1);
  }
  return { start, end };
}

async function peopleCounterExternalRoutes(app: FastifyInstance) {
  app.get(
    '/people-counter/stats',
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const systemService = ServiceContainer.getInstance().getSystemService();
        const pcState = await systemService.getPeopleCounterState(false);
        if (!pcState?.peopleCounterEnabled) {
          return reply.code(404).send({
            success: false,
            message: '피플카운터가 비활성화되어 있습니다.',
          });
        }

        const q = request.query as { period?: Period; startDate?: string; endDate?: string };
        const period = (q.period || 'day') as Period;
        let start: Date;
        let end: Date;
        if (q.startDate && q.endDate) {
          start = new Date(q.startDate);
          end = new Date(q.endDate);
        } else {
          const range = getDateRange(period);
          start = range.start;
          end = range.end;
        }

        const latest = await ClientSchema.findOne({}).sort({ createdAt: -1 }).lean();
        const clientId = latest?.id ?? 'c0101';

        const docs = await PeopleCounterRaw.find({
          clientId,
          timestamp: { $gte: start, $lte: end },
        })
          .sort({ timestamp: 1 })
          .lean();

        const inVals = docs.map((d) => d.inCumulative);
        const outVals = docs.map((d) => d.outCumulative);
        const currentVals = docs.map((d) => d.currentCount);
        const inMin = inVals.length ? Math.min(...inVals) : 0;
        const inMax = inVals.length ? Math.max(...inVals) : 0;
        const outMin = outVals.length ? Math.min(...outVals) : 0;
        const outMax = outVals.length ? Math.max(...outVals) : 0;
        const peak = currentVals.length ? Math.max(...currentVals) : 0;
        const avg =
          currentVals.length ? currentVals.reduce((a, b) => a + b, 0) / currentVals.length : 0;

        const rawData =
          docs.length <= 200
            ? docs.map((d) => ({
                timestamp: d.timestamp,
                inCumulative: d.inCumulative,
                outCumulative: d.outCumulative,
                currentCount: d.currentCount,
              }))
            : [];

        return reply.send(
          createSuccessResponse('피플카운터 통계 조회 성공', {
            period,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            stats: {
              inCount: inMax - inMin,
              outCount: outMax - outMin,
              peakCount: peak,
              avgCount: Math.round(avg * 100) / 100,
              dataPoints: docs.length,
            },
            rawData,
          }),
        );
      } catch (error) {
        logger.error(`[People Counter External] stats 오류: ${error}`);
        return handleRouteError(error, reply, 'people-counter', '통계 조회 중 오류가 발생했습니다.');
      }
    },
  );

  app.get(
    '/people-counter/hourly-stats',
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const systemService = ServiceContainer.getInstance().getSystemService();
        const pcState = await systemService.getPeopleCounterState(false);
        if (!pcState?.peopleCounterEnabled) {
          return reply.code(404).send({
            success: false,
            message: '피플카운터가 비활성화되어 있습니다.',
          });
        }

        const q = request.query as { date?: string; clientId?: string };
        if (!q.date) {
          return reply.code(400).send({
            success: false,
            message: 'date(YYYY-MM-DD) 쿼리 파라미터가 필요합니다.',
          });
        }

        // YYYY-MM-DD 형식을 기준으로 로컬 타임존의 0시를 계산
        const baseDate = new Date(`${q.date}T00:00:00`);
        if (Number.isNaN(baseDate.getTime())) {
          return reply.code(400).send({
            success: false,
            message: '유효한 date(YYYY-MM-DD) 값을 입력해주세요.',
          });
        }

        const params: { date: Date; clientId?: string } = { date: baseDate };
        if (q.clientId) {
          params.clientId = q.clientId;
        }

        const stats = await getPeopleCounterHourlyStats(params);

        return reply.send(
          createSuccessResponse('피플카운터 시간대별 통계 조회 성공', {
            date: stats.date,
            timezone: stats.timezone,
            buckets: stats.buckets,
          }),
        );
      } catch (error) {
        logger.error(`[People Counter External] hourly-stats 오류: ${error}`);
        return handleRouteError(error, reply, 'people-counter', '시간대별 통계 조회 중 오류가 발생했습니다.');
      }
    },
  );

  app.get(
    '/people-counter/raw',
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const systemService = ServiceContainer.getInstance().getSystemService();
        const pcState = await systemService.getPeopleCounterState(false);
        if (!pcState?.peopleCounterEnabled) {
          return reply.code(404).send({
            success: false,
            message: '피플카운터가 비활성화되어 있습니다.',
          });
        }

        const q = request.query as { startDate?: string; endDate?: string; limit?: string };
        const startDate = q.startDate ? new Date(q.startDate) : null;
        const endDate = q.endDate ? new Date(q.endDate) : null;
        const limit = Math.min(parseInt(q.limit || '1000', 10) || 1000, 10000);

        if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
          return reply.code(400).send({
            success: false,
            message: 'startDate, endDate (ISO 8601)가 필요합니다.',
          });
        }

        const latest = await ClientSchema.findOne({}).sort({ createdAt: -1 }).lean();
        const clientId = latest?.id ?? 'c0101';

        const docs = await PeopleCounterRaw.find({
          clientId,
          timestamp: { $gte: startDate, $lte: endDate },
        })
          .sort({ timestamp: 1 })
          .limit(limit)
          .lean();

        const items = docs.map((d) => ({
          timestamp: d.timestamp,
          inCumulative: d.inCumulative,
          outCumulative: d.outCumulative,
          currentCount: d.currentCount,
          output1: d.output1,
          output2: d.output2,
          countEnabled: d.countEnabled,
          buttonStatus: d.buttonStatus,
          sensorStatus: d.sensorStatus,
          limitExceeded: d.limitExceeded,
        }));

        return reply.send(
          createSuccessResponse('피플카운터 로우데이터 조회 성공', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            count: items.length,
            data: items,
          }),
        );
      } catch (error) {
        logger.error(`[People Counter External] raw 오류: ${error}`);
        return handleRouteError(error, reply, 'people-counter', '로우데이터 조회 중 오류가 발생했습니다.');
      }
    },
  );
}

export default fp(peopleCounterExternalRoutes);
