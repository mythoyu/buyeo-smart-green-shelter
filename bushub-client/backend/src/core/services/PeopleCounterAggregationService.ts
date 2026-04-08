import { Client as ClientSchema } from '../../models/schemas/ClientSchema';
import { PeopleCounterRaw } from '../../models/schemas/PeopleCounterRawSchema';
import { formatKstLocal, getKstHourOfDay } from '../../shared/utils/kstDateTime';

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
   * 기준 날짜.
   * 라우트 계층에서 KST 달력일 00:00의 instant(`startOfKstDayFromYmd`)를 전달한다.
   */
  date: Date;
  /**
   * 요청으로 들어온 date(YYYY-MM-DD). KST 달력일 문자열을 그대로 보존하기 위해 사용한다.
   */
  dateString: string;
  /**
   * 명시적인 clientId가 없으면 최신 클라이언트를 사용
   */
  clientId?: string;
  /** 미지정 시 d082 전 유닛 합산(필터 없음과 동일 목적) */
  deviceId?: string;
  /** 예: u001. 지정 시 해당 유닛 Raw만 집계 */
  unitId?: string;
}

export async function getPeopleCounterHourlyStats(
  params: GetHourlyStatsParams,
): Promise<PeopleCounterHourlyStats> {
  const { date, dateString, clientId: explicitClientId, deviceId = 'd082', unitId } = params;

  // KST 달력일(00:00~24:00) 기준 범위. date는 이미 KST 00:00을 가리키는 UTC Date로 들어온다.
  const startOfDay = new Date(date);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // clientId 결정: 명시적 값 > 최신 클라이언트 > 기본값
  let clientId = explicitClientId;
  if (!clientId) {
    const latest = await ClientSchema.findOne({}).sort({ createdAt: -1 }).lean();
    clientId = latest?.id ?? 'c0101';
  }

  // 하루 범위의 Raw 데이터 조회
  const rawQuery: Record<string, unknown> = {
    clientId,
    deviceId,
    timestamp: { $gte: startOfDay, $lt: endOfDay },
  };
  if (unitId && /^u\d{3}$/.test(unitId)) {
    rawQuery.unitId = unitId;
  }

  const docs = await PeopleCounterRaw.find(rawQuery).sort({ timestamp: 1 }).lean();

  // 24개 버킷 초기화
  const bucketsInternal: {
    start: Date;
    end: Date;
    inCountSum: number;
    outMin: number | null;
    outMax: number | null;
    peak: number | null;
    sumCurrent: number;
    count: number;
  }[] = [];

  for (let h = 0; h < 24; h += 1) {
    // startOfDay는 "KST 00:00" 시각의 UTC Date이므로, 단순 ms 덧셈으로도 KST 시간 버킷 경계가 유지된다.
    const bucketStart = new Date(startOfDay.getTime() + h * 60 * 60 * 1000);
    const bucketEnd = new Date(bucketStart.getTime() + 60 * 60 * 1000);

    bucketsInternal.push({
      start: bucketStart,
      end: bucketEnd,
      inCountSum: 0,
      outMin: null,
      outMax: null,
      peak: null,
      sumCurrent: 0,
      count: 0,
    });
  }

  // 문서들을 24개 버킷에 분배 (1분 문서: inDelta 합산, 나머지는 out/current 유지)
  for (const d of docs) {
    const ts = d.timestamp instanceof Date ? d.timestamp : new Date(d.timestamp);
    const hour = getKstHourOfDay(ts);
    if (hour < 0 || hour > 23) {
      continue;
    }

    const bucket = bucketsInternal[hour];
    bucket.inCountSum += d.inDelta ?? 0;

    const { outCumulative, currentCount } = d;
    if (bucket.outMin === null || outCumulative < bucket.outMin) {
      bucket.outMin = outCumulative;
    }
    if (bucket.outMax === null || outCumulative > bucket.outMax) {
      bucket.outMax = outCumulative;
    }
    if (bucket.peak === null || currentCount > bucket.peak) {
      bucket.peak = currentCount;
    }
    bucket.sumCurrent += currentCount;
    bucket.count += 1;
  }

  const timezone = 'Asia/Seoul';
  const isoDate = dateString;

  const buckets: PeopleCounterHourlyBucket[] = bucketsInternal.map((b) => {
    const outCount =
      b.outMin !== null && b.outMax !== null ? b.outMax - b.outMin : 0;
    const peakCount = b.peak ?? 0;
    const avgCount = Math.round(((b.sumCurrent / b.count) || 0) * 100) / 100;

    return {
      start: formatKstLocal(b.start),
      end: formatKstLocal(b.end),
      inCount: b.inCountSum,
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

