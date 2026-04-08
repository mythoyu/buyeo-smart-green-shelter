/**
 * People Counter External API (stats, raw, usage-10min)
 * GET /people-counter/stats, GET /people-counter/raw, GET /people-counter/usage-10min
 * @see docs/PEOPLE_COUNTER_SPEC.md
 */

import { DateTime } from 'luxon';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import { ServiceContainer } from '../../../core/container/ServiceContainer';
import { Client as ClientSchema } from '../../../models/schemas/ClientSchema';
import { PeopleCounterRaw } from '../../../models/schemas/PeopleCounterRawSchema';
import { getPeopleCounterHourlyStats } from '../../../core/services/PeopleCounterAggregationService';
import {
  formatKstLocal,
  KST_ZONE,
  parseApiDateTimeToUtc,
  startOfKstDayFromYmd,
} from '../../../shared/utils/kstDateTime';
import { createSuccessResponse, handleRouteError } from '../../../shared/utils/responseHelper';
import logger from '../../../logger';

type Period = 'hour' | 'day' | 'week' | 'month';

/** KST 달력 기준 기간 범위 (통계 등) */
function getDateRange(period: Period): { start: Date; end: Date } {
  const nowZ = DateTime.now().setZone(KST_ZONE);
  const end = nowZ.toJSDate();
  let startDt: DateTime;
  switch (period) {
    case 'hour':
      startDt = nowZ.minus({ hours: 1 });
      break;
    case 'day':
      startDt = nowZ.startOf('day');
      break;
    case 'week': {
      const wd = nowZ.weekday;
      const offset = wd === 7 ? 6 : wd - 1;
      startDt = nowZ.minus({ days: offset }).startOf('day');
      break;
    }
    case 'month':
      startDt = nowZ.startOf('month');
      break;
    default:
      startDt = nowZ.minus({ hours: 1 });
  }
  return { start: startDt.toJSDate(), end };
}

/**
 * usage-10min: start·end 필수. date / period 미지원. 구간 [start, end).
 * 무오프셋 start/end는 KST 벽시계. Z/오프셋 포함 ISO는 호환 파싱.
 */
function getUsage10MinRange(q: {
  date?: string;
  start?: string;
  end?: string;
  period?: string;
}): { start: Date; end: Date } | { error: string } {
  if (q.date != null && String(q.date).trim() !== '') {
    return {
      error: 'usage-10min은 date 파라미터를 지원하지 않습니다. start와 end를 지정하세요.',
    };
  }
  if (q.period != null && String(q.period).trim() !== '') {
    return {
      error: 'usage-10min은 period 파라미터를 지원하지 않습니다. start와 end를 지정하세요.',
    };
  }

  const startStr = q.start != null ? String(q.start).trim() : '';
  const endStr = q.end != null ? String(q.end).trim() : '';
  if (!startStr || !endStr) {
    return { error: 'start와 end 쿼리 파라미터가 필요합니다.' };
  }

  try {
    const start = parseApiDateTimeToUtc(startStr);
    const end = parseApiDateTimeToUtc(endStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { error: '유효한 start, end 값을 입력해주세요.' };
    }
    if (start >= end) return { error: 'start는 end보다 이전이어야 합니다.' };
    return { start, end };
  } catch {
    return { error: '유효한 start, end 값을 입력해주세요.' };
  }
}

/** 구간 [start, end)를 10분 버킷으로 나누고, 문서별 inDelta를 버킷에 합산 */
function bucket10Min(start: Date, end: Date, docs: { timestamp: Date; inDelta?: number; inCumulative?: number }[]) {
  const buckets: { start: Date; end: Date; inCount: number }[] = [];
  let t = new Date(start.getTime());
  while (t < end) {
    const bucketEnd = new Date(t.getTime() + 10 * 60 * 1000);
    buckets.push({ start: new Date(t), end: bucketEnd, inCount: 0 });
    t = bucketEnd;
  }

  for (const d of docs) {
    const ts = d.timestamp instanceof Date ? d.timestamp : new Date(d.timestamp);
    if (ts < start || ts >= end) continue;
    const bucketIndex = Math.floor((ts.getTime() - start.getTime()) / (10 * 60 * 1000));
    if (bucketIndex >= 0 && bucketIndex < buckets.length) {
      const delta = d.inDelta ?? 0;
      buckets[bucketIndex].inCount += delta;
    }
  }

  return buckets.map((b) => ({
    start: formatKstLocal(b.start),
    end: formatKstLocal(b.end),
    inCount: b.inCount,
  }));
}

function toTimestampField(v: unknown): string {
  if (v instanceof Date) return formatKstLocal(v);
  if (typeof v === 'string') {
    try {
      return formatKstLocal(parseApiDateTimeToUtc(v));
    } catch {
      return v;
    }
  }
  return formatKstLocal(new Date());
}

/** d082 Raw 조회: unitId 미지정 시 전 유닛(합산), 지정 시 해당 유닛만 */
function buildPeopleCounterRawFilter(
  clientId: string,
  timeRange: { $gte: Date; $lte?: Date; $lt?: Date },
  unitId?: string,
): Record<string, unknown> {
  const q: Record<string, unknown> = {
    clientId,
    deviceId: 'd082',
    timestamp: timeRange,
  };
  const u = typeof unitId === 'string' ? unitId.trim() : '';
  if (u && /^u\d{3}$/.test(u)) {
    q.unitId = u;
  }
  return q;
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

        const q = request.query as { period?: Period; startDate?: string; endDate?: string; unitId?: string };
        const period = (q.period || 'day') as Period;
        let start: Date;
        let end: Date;
        if (q.startDate && q.endDate) {
          try {
            start = parseApiDateTimeToUtc(q.startDate);
            end = parseApiDateTimeToUtc(q.endDate);
          } catch {
            return reply.code(400).send({
              success: false,
              message: '유효한 startDate, endDate가 필요합니다.',
            });
          }
        } else {
          const range = getDateRange(period);
          start = range.start;
          end = range.end;
        }

        const latest = await ClientSchema.findOne({}).sort({ createdAt: -1 }).lean();
        const clientId = latest?.id ?? 'c0101';

        const docs = await PeopleCounterRaw.find(
          buildPeopleCounterRawFilter(clientId, { $gte: start, $lte: end }, q.unitId),
        )
          .sort({ timestamp: 1 })
          .lean();

        const inCount = docs.reduce((sum, d) => sum + (d.inDelta ?? 0), 0);
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
                timestamp: toTimestampField(d.timestamp),
                inCumulative: d.inCumulative,
                inDelta: d.inDelta,
                inRef: d.inRef,
                outCumulative: d.outCumulative,
                currentCount: d.currentCount,
              }))
            : [];

        return reply.send(
          createSuccessResponse('피플카운터 통계 조회 성공', {
            period,
            startDate: formatKstLocal(start),
            endDate: formatKstLocal(end),
            stats: {
              inCount,
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

        const q = request.query as { date?: string; clientId?: string; unitId?: string };
        if (!q.date) {
          return reply.code(400).send({
            success: false,
            message: 'date(YYYY-MM-DD) 쿼리 파라미터가 필요합니다.',
          });
        }

        let baseDate: Date;
        try {
          baseDate = startOfKstDayFromYmd(q.date.trim());
        } catch {
          return reply.code(400).send({
            success: false,
            message: '유효한 date(YYYY-MM-DD) 값을 입력해주세요.',
          });
        }

        const params: {
          date: Date;
          dateString: string;
          clientId?: string;
          unitId?: string;
        } = { date: baseDate, dateString: q.date };
        if (q.clientId) {
          params.clientId = q.clientId;
        }
        const uid = typeof q.unitId === 'string' ? q.unitId.trim() : '';
        if (uid && /^u\d{3}$/.test(uid)) {
          params.unitId = uid;
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

        const q = request.query as { startDate?: string; endDate?: string; limit?: string; unitId?: string };
        let startDate: Date;
        let endDate: Date;
        try {
          if (!q.startDate || !q.endDate) throw new Error('missing');
          startDate = parseApiDateTimeToUtc(q.startDate);
          endDate = parseApiDateTimeToUtc(q.endDate);
        } catch {
          return reply.code(400).send({
            success: false,
            message: 'startDate, endDate (KST YYYY-MM-DDTHH:mm:ss 또는 호환 ISO)가 필요합니다.',
          });
        }
        const limit = Math.min(parseInt(q.limit || '1000', 10) || 1000, 10000);

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
          return reply.code(400).send({
            success: false,
            message: '유효한 startDate, endDate가 필요합니다.',
          });
        }

        const latest = await ClientSchema.findOne({}).sort({ createdAt: -1 }).lean();
        const clientId = latest?.id ?? 'c0101';

        const docs = await PeopleCounterRaw.find(
          buildPeopleCounterRawFilter(clientId, { $gte: startDate, $lte: endDate }, q.unitId),
        )
          .sort({ timestamp: 1 })
          .limit(limit)
          .lean();

        const items = docs.map((d) => ({
          timestamp: toTimestampField(d.timestamp),
          inCumulative: d.inCumulative,
          inDelta: d.inDelta,
          inRef: d.inRef,
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
            startDate: formatKstLocal(startDate),
            endDate: formatKstLocal(endDate),
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

  app.get(
    '/people-counter/usage-10min',
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

        const q = request.query as { date?: string; start?: string; end?: string; period?: string; unitId?: string };
        const rangeResult = getUsage10MinRange(q);
        if ('error' in rangeResult) {
          return reply.code(400).send({
            success: false,
            message: rangeResult.error,
          });
        }
        const { start, end } = rangeResult;

        const latest = await ClientSchema.findOne({}).sort({ createdAt: -1 }).lean();
        const clientId = latest?.id ?? 'c0101';

        const docs = await PeopleCounterRaw.find(
          buildPeopleCounterRawFilter(clientId, { $gte: start, $lt: end }, q.unitId),
        )
          .sort({ timestamp: 1 })
          .lean();

        const buckets = bucket10Min(start, end, docs);

        return reply.send(
          createSuccessResponse('피플카운터 10분 사용량 조회 성공', {
            range: {
              start: formatKstLocal(start),
              end: formatKstLocal(end),
            },
            bucketSizeMinutes: 10,
            buckets,
          }),
        );
      } catch (error) {
        logger.error(`[People Counter External] usage-10min 오류: ${error}`);
        return handleRouteError(error, reply, 'people-counter', '10분 단위 사용량 조회 중 오류가 발생했습니다.');
      }
    },
  );
}

export default fp(peopleCounterExternalRoutes);
