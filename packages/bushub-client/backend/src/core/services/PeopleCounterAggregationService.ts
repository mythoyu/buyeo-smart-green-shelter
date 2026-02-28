import { Client as ClientSchema } from '../../models/schemas/ClientSchema';
import { PeopleCounterRaw } from '../../models/schemas/PeopleCounterRawSchema';

export interface PeopleCounterHourlyBucket {
  start: string;
  end: string;
  inCount: number;
  outCount: number;
  peakCount: number;
  avgCount: number;
  dataPoints: number;
}

export interface PeopleCounterHourlyStats {
  date: string;
  timezone: string;
  buckets: PeopleCounterHourlyBucket[];
}

interface GetHourlyStatsParams {
  /**
   * 기준 날짜 (로컬 타임존 기준, 시/분/초는 무시)
   */
  date: Date;
  /**
   * 명시적인 clientId가 없으면 최신 클라이언트를 사용
   */
  clientId?: string;
}

export async function getPeopleCounterHourlyStats(
  params: GetHourlyStatsParams,
): Promise<PeopleCounterHourlyStats> {
  const { date, clientId: explicitClientId } = params;

  // 기준 날짜의 0시~다음날 0시 범위 계산 (로컬 타임존 기준)
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // clientId 결정: 명시적 값 > 최신 클라이언트 > 기본값
  let clientId = explicitClientId;
  if (!clientId) {
    const latest = await ClientSchema.findOne({}).sort({ createdAt: -1 }).lean();
    clientId = latest?.id ?? 'c0101';
  }

  // 하루 범위의 Raw 데이터 조회 (clientId + timestamp 인덱스 사용)
  const docs = await PeopleCounterRaw.find({
    clientId,
    timestamp: { $gte: startOfDay, $lt: endOfDay },
  })
    .sort({ timestamp: 1 })
    .lean();

  // 24개 버킷 초기화
  const bucketsInternal: {
    start: Date;
    end: Date;
    inMin: number | null;
    inMax: number | null;
    outMin: number | null;
    outMax: number | null;
    peak: number | null;
    sumCurrent: number;
    count: number;
  }[] = [];

  for (let h = 0; h < 24; h += 1) {
    const bucketStart = new Date(startOfDay);
    bucketStart.setHours(h, 0, 0, 0);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setHours(h + 1, 0, 0, 0);

    bucketsInternal.push({
      start: bucketStart,
      end: bucketEnd,
      inMin: null,
      inMax: null,
      outMin: null,
      outMax: null,
      peak: null,
      sumCurrent: 0,
      count: 0,
    });
  }

  // 문서들을 24개 버킷에 분배
  for (const d of docs) {
    const ts = d.timestamp instanceof Date ? d.timestamp : new Date(d.timestamp);
    // startOfDay ~ endOfDay 범위 내라고 가정
    const hour = ts.getHours(); // 로컬 타임존 기준 시각
    if (hour < 0 || hour > 23) {
      continue;
    }

    const bucket = bucketsInternal[hour];
    const { inCumulative, outCumulative, currentCount } = d;

    // inCumulative
    if (bucket.inMin === null || inCumulative < bucket.inMin) {
      bucket.inMin = inCumulative;
    }
    if (bucket.inMax === null || inCumulative > bucket.inMax) {
      bucket.inMax = inCumulative;
    }

    // outCumulative
    if (bucket.outMin === null || outCumulative < bucket.outMin) {
      bucket.outMin = outCumulative;
    }
    if (bucket.outMax === null || outCumulative > bucket.outMax) {
      bucket.outMax = outCumulative;
    }

    // peak / avg
    if (bucket.peak === null || currentCount > bucket.peak) {
      bucket.peak = currentCount;
    }
    bucket.sumCurrent += currentCount;
    bucket.count += 1;
  }

  const timezone = 'Asia/Seoul';
  const isoDate = startOfDay.toISOString().slice(0, 10);

  const buckets: PeopleCounterHourlyBucket[] = bucketsInternal.map((b) => {
    if (!b.count || b.inMin === null || b.inMax === null || b.outMin === null || b.outMax === null) {
      return {
        start: b.start.toISOString(),
        end: b.end.toISOString(),
        inCount: 0,
        outCount: 0,
        peakCount: 0,
        avgCount: 0,
        dataPoints: 0,
      };
    }

    const inCount = b.inMax - b.inMin;
    const outCount = b.outMax - b.outMin;
    const peakCount = b.peak ?? 0;
    const avgCount = Math.round(((b.sumCurrent / b.count) || 0) * 100) / 100;

    return {
      start: b.start.toISOString(),
      end: b.end.toISOString(),
      inCount,
      outCount,
      peakCount,
      avgCount,
      dataPoints: b.count,
    };
  });

  return {
    date: isoDate,
    timezone,
    buckets,
  };
}

