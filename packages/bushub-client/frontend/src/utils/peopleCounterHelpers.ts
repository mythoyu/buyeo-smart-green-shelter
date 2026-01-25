/**
 * 피플카운터 데이터 집계 유틸리티 함수
 */

export interface RawDataPoint {
  timestamp: string;
  inCumulative: number;
  outCumulative: number;
  currentCount: number;
}

/**
 * 시간대별 입실/퇴실 집계 (0-23시)
 */
export const aggregateByHour = (data: RawDataPoint[]) => {
  const hourlyData: Record<number, { in: number; out: number; count: number; samples: number }> = {};

  data.forEach((point) => {
    const hour = new Date(point.timestamp).getHours();
    if (!hourlyData[hour]) {
      hourlyData[hour] = { in: 0, out: 0, count: 0, samples: 0 };
    }
    hourlyData[hour].in += point.inCumulative;
    hourlyData[hour].out += point.outCumulative;
    hourlyData[hour].count += point.currentCount;
    hourlyData[hour].samples += 1;
  });

  return Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}시`,
    입실: hourlyData[hour] ? Math.round(hourlyData[hour].in / hourlyData[hour].samples) : 0,
    퇴실: hourlyData[hour] ? Math.round(hourlyData[hour].out / hourlyData[hour].samples) : 0,
    평균인원: hourlyData[hour] ? Math.round(hourlyData[hour].count / hourlyData[hour].samples) : 0,
  }));
};

/**
 * 일별 집계
 */
export const aggregateByDay = (data: RawDataPoint[]) => {
  const dailyData: Record<string, { in: number; out: number; count: number; samples: number }> = {};

  data.forEach((point) => {
    const date = new Date(point.timestamp);
    const dayKey = `${date.getMonth() + 1}/${date.getDate()}`;
    if (!dailyData[dayKey]) {
      dailyData[dayKey] = { in: 0, out: 0, count: 0, samples: 0 };
    }
    dailyData[dayKey].in += point.inCumulative;
    dailyData[dayKey].out += point.outCumulative;
    dailyData[dayKey].count += point.currentCount;
    dailyData[dayKey].samples += 1;
  });

  return Object.entries(dailyData)
    .map(([day, stats]) => ({
      day,
      입실: Math.round(stats.in / stats.samples),
      퇴실: Math.round(stats.out / stats.samples),
      평균인원: Math.round(stats.count / stats.samples),
    }))
    .sort((a, b) => {
      const [aMonth, aDate] = a.day.split('/').map(Number);
      const [bMonth, bDate] = b.day.split('/').map(Number);
      if (aMonth !== bMonth) return aMonth - bMonth;
      return aDate - bDate;
    });
};

/**
 * 주별 집계 (월~일요일)
 */
export const aggregateByWeek = (data: RawDataPoint[]) => {
  const weeklyData: Record<number, { in: number; out: number; count: number; samples: number }> = {};

  data.forEach((point) => {
    const date = new Date(point.timestamp);
    const dayOfWeek = date.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    if (!weeklyData[dayOfWeek]) {
      weeklyData[dayOfWeek] = { in: 0, out: 0, count: 0, samples: 0 };
    }
    weeklyData[dayOfWeek].in += point.inCumulative;
    weeklyData[dayOfWeek].out += point.outCumulative;
    weeklyData[dayOfWeek].count += point.currentCount;
    weeklyData[dayOfWeek].samples += 1;
  });

  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return Array.from({ length: 7 }, (_, day) => ({
    day: dayNames[day],
    입실: weeklyData[day] ? Math.round(weeklyData[day].in / weeklyData[day].samples) : 0,
    퇴실: weeklyData[day] ? Math.round(weeklyData[day].out / weeklyData[day].samples) : 0,
    평균인원: weeklyData[day] ? Math.round(weeklyData[day].count / weeklyData[day].samples) : 0,
  }));
};

/**
 * 월별 집계
 */
export const aggregateByMonth = (data: RawDataPoint[]) => {
  const monthlyData: Record<number, { in: number; out: number; count: number; samples: number }> = {};

  data.forEach((point) => {
    const month = new Date(point.timestamp).getMonth(); // 0-11
    if (!monthlyData[month]) {
      monthlyData[month] = { in: 0, out: 0, count: 0, samples: 0 };
    }
    monthlyData[month].in += point.inCumulative;
    monthlyData[month].out += point.outCumulative;
    monthlyData[month].count += point.currentCount;
    monthlyData[month].samples += 1;
  });

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  return Object.entries(monthlyData)
    .map(([month, stats]) => ({
      month: monthNames[parseInt(month)],
      입실: Math.round(stats.in / stats.samples),
      퇴실: Math.round(stats.out / stats.samples),
      평균인원: Math.round(stats.count / stats.samples),
    }))
    .sort((a, b) => {
      const aIndex = monthNames.indexOf(a.month);
      const bIndex = monthNames.indexOf(b.month);
      return aIndex - bIndex;
    });
};

/**
 * 피크 시간대 찾기 (현재 인원 기준)
 */
export const findPeakHours = (data: RawDataPoint[], topN: number = 5) => {
  const hourlyPeaks: Record<number, number[]> = {};

  data.forEach((point) => {
    const hour = new Date(point.timestamp).getHours();
    if (!hourlyPeaks[hour]) {
      hourlyPeaks[hour] = [];
    }
    hourlyPeaks[hour].push(point.currentCount);
  });

  const hourlyAverages = Object.entries(hourlyPeaks).map(([hour, counts]) => ({
    hour: parseInt(hour),
    hourLabel: `${hour}시`,
    averageCount: Math.round(counts.reduce((a, b) => a + b, 0) / counts.length),
  }));

  return hourlyAverages
    .sort((a, b) => b.averageCount - a.averageCount)
    .slice(0, topN)
    .map((item) => ({
      시간: item.hourLabel,
      인원: item.averageCount,
    }));
};

/**
 * 시간대별 입실/퇴실 차이 계산 (순 입실)
 */
export const calculateHourlyNetIn = (data: RawDataPoint[]) => {
  const hourlyData: Record<number, { in: number; out: number; samples: number }> = {};

  data.forEach((point) => {
    const hour = new Date(point.timestamp).getHours();
    if (!hourlyData[hour]) {
      hourlyData[hour] = { in: 0, out: 0, samples: 0 };
    }
    hourlyData[hour].in += point.inCumulative;
    hourlyData[hour].out += point.outCumulative;
    hourlyData[hour].samples += 1;
  });

  return Array.from({ length: 24 }, (_, hour) => {
    const avgIn = hourlyData[hour] ? hourlyData[hour].in / hourlyData[hour].samples : 0;
    const avgOut = hourlyData[hour] ? hourlyData[hour].out / hourlyData[hour].samples : 0;
    return {
      hour: `${hour}시`,
      입실: Math.round(avgIn),
      퇴실: Math.round(avgOut),
      순입실: Math.round(avgIn - avgOut),
    };
  });
};
