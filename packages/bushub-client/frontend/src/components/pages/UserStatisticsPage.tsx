import { Users, TrendingUp, BarChart3, Calendar, RefreshCw, X, AlertCircle } from 'lucide-react';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

import {
  useGetPeopleCounterState,
  useGetPeopleCounterUsage10Min,
} from '../../api/queries/people-counter';
import { useRightSidebarContent } from '../../hooks/useRightSidebarContent';
import { RightSidebarItem } from '../layout/RightSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui';
import { DatePickerField } from '../common/DatePickerField';
import { PageSectionLoading } from '../common/PageSectionLoading';
import { LOADING_MESSAGES } from '../../constants/loadingMessages';
import {
  formatKstHm,
  getKstHour,
  kstDayExclusiveEndRange,
  parseApiDateTimeSafe,
  todayYmdKst,
} from '../../utils/kstDateTime';

function datePart(dt: string): string {
  if (!dt) return '';
  return dt.slice(0, 10);
}

/** Recharts 툴팁 다크 모드 대응 */
const chartTooltipStyles = {
  contentStyle: {
    backgroundColor: 'var(--background)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    borderRadius: '6px',
    padding: '8px 12px',
  },
  wrapperStyle: {},
  labelStyle: { color: 'var(--foreground)' },
  itemStyle: { color: 'var(--foreground)' },
};

const UserStatisticsPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');

  // 피플카운터 활성화 상태 확인
  const { data: pcState, isLoading: pcStateLoading } = useGetPeopleCounterState();

  // 오늘 날짜 (YYYY-MM-DD)
  const todayDate = useMemo(() => todayYmdKst(), []);

  // 최초 마운트 시 오늘 날짜로 초기화
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(todayDate);
    }
  }, [selectedDate, todayDate]);

  const usage10MinRange = useMemo(() => {
    const ymd = selectedDate || todayDate;
    try {
      return kstDayExclusiveEndRange(ymd);
    } catch {
      return { start: '', end: '' };
    }
  }, [selectedDate, todayDate]);

  // 10분 단위 사용량 조회 (usage-10min)
  const {
    data: usage10MinData,
    isLoading: usageLoading,
    error: usageError,
    refetch: refetchUsage,
  } = useGetPeopleCounterUsage10Min({
    start: usage10MinRange.start,
    end: usage10MinRange.end,
    enabled:
      pcState?.peopleCounterEnabled === true && !!usage10MinRange.start && !!usage10MinRange.end,
  });

  // 통계 계산 (입실 총합, 피크, 데이터 포인트)
  const stats = useMemo(() => {
    if (!usage10MinData?.buckets) {
      return { totalIn: 0, peakIn: 0, dataPoints: 0 };
    }
    const buckets = usage10MinData.buckets;
    const totalIn = buckets.reduce((sum, b) => sum + b.inCount, 0);
    const peakIn = buckets.length > 0 ? Math.max(...buckets.map(b => b.inCount)) : 0;
    return { totalIn, peakIn, dataPoints: buckets.length };
  }, [usage10MinData]);

  // 차트 데이터: 10분 단위 입실
  const chartData = useMemo(() => {
    if (!usage10MinData?.buckets) return [];
    return usage10MinData.buckets.map(b => {
      return {
        time: formatKstHm(parseApiDateTimeSafe(b.start)),
        입실: b.inCount,
      };
    });
  }, [usage10MinData]);

  // 시간대별 합계 (1시간 단위로 집계)
  const hourlyData = useMemo(() => {
    if (!usage10MinData?.buckets) return [];
    const hourMap: Record<number, number> = {};
    for (const b of usage10MinData.buckets) {
      const hour = getKstHour(parseApiDateTimeSafe(b.start));
      hourMap[hour] = (hourMap[hour] || 0) + b.inCount;
    }
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      입실: hourMap[i] || 0,
    }));
  }, [usage10MinData]);

  // 날짜 변경 핸들러
  const handleDateChange = useCallback((newDate: string) => {
    setSelectedDate(newDate);
    toast.success(`${newDate} 데이터를 조회합니다.`);
  }, []);

  const handleClearDate = useCallback(() => {
    setSelectedDate(todayDate);
    toast.info('오늘 날짜로 변경되었습니다.');
  }, [todayDate]);

  // 오른쪽 사이드바 설정
  const sidebarContent = useMemo(
    () => (
      <>
        <RightSidebarItem
          icon={RefreshCw}
          label='새로\n고침'
          onClick={() => refetchUsage()}
          title='데이터 새로고침'
        />
        <RightSidebarItem
          icon={Calendar}
          label='오늘'
          onClick={handleClearDate}
          title='오늘 날짜로 이동'
        />
      </>
    ),
    [refetchUsage, handleClearDate]
  );

  useRightSidebarContent(sidebarContent, [refetchUsage]);

  // 피플카운터 비활성화 상태
  if (!pcStateLoading && pcState?.peopleCounterEnabled === false) {
    return (
      <div className='p-6'>
        <Alert>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            피플카운터가 비활성화되어 있습니다. 시스템 설정에서 활성화해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 로딩 상태
  if (pcStateLoading || usageLoading) {
    return <PageSectionLoading message={LOADING_MESSAGES.userStatistics} />;
  }

  // 에러 상태
  if (usageError) {
    return (
      <div className='p-6'>
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            데이터를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className='p-6 space-y-6'>
      {/* 페이지 헤더 */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div>
          <h1 className='text-2xl font-bold'>이용자 통계</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            피플카운터 10분 단위 입실 데이터를 확인할 수 있습니다.
          </p>
        </div>
        <div className='flex items-center gap-2 flex-wrap'>
          <DatePickerField
            value={datePart(selectedDate)}
            onChange={handleDateChange}
            placeholder='날짜 선택'
          />
          {selectedDate && selectedDate !== todayDate && (
            <Button variant='ghost' size='sm' onClick={handleClearDate} className='h-9 px-2'>
              <X className='h-4 w-4' />
            </Button>
          )}
        </div>
      </div>

      {/* 조회 날짜 표시 */}
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <span className='font-medium text-foreground'>조회 날짜</span>
        <span>{selectedDate || todayDate}</span>
        {usage10MinData?.range && (
          <span className='text-xs'>
            ({formatKstHm(parseApiDateTimeSafe(usage10MinData.range.start))}{' '}
            ~ {formatKstHm(parseApiDateTimeSafe(usage10MinData.range.end))}
            )
          </span>
        )}
      </div>

      {/* 요약 통계 카드 */}
      <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>총 입실</CardTitle>
            <TrendingUp className='h-3 w-3 text-green-600' />
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold'>{stats.totalIn}</div>
            <p className='text-[10px] text-muted-foreground mt-1'>하루 입실 인원</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>피크 입실</CardTitle>
            <BarChart3 className='h-3 w-3 text-blue-600' />
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold'>{stats.peakIn}</div>
            <p className='text-[10px] text-muted-foreground mt-1'>10분간 최대 입실</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>데이터 포인트</CardTitle>
            <Users className='h-3 w-3 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold'>{stats.dataPoints}</div>
            <p className='text-[10px] text-muted-foreground mt-1'>10분 버킷 수</p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* 시간대별 입실 (1시간 단위) */}
        {hourlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className='text-sm font-medium'>시간대별 입실 (1시간 단위)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width='100%' height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='hour' tick={{ fontSize: 10 }} interval={2} />
                  <YAxis />
                  <Tooltip
                    contentStyle={chartTooltipStyles.contentStyle}
                    wrapperStyle={chartTooltipStyles.wrapperStyle}
                    labelStyle={chartTooltipStyles.labelStyle}
                    itemStyle={chartTooltipStyles.itemStyle}
                  />
                  <Legend />
                  <Bar dataKey='입실' fill='#10b981' />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 10분 단위 입실 상세 */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className='text-sm font-medium'>10분 단위 입실 상세</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width='100%' height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='time' tick={{ fontSize: 8 }} interval={11} />
                  <YAxis />
                  <Tooltip
                    contentStyle={chartTooltipStyles.contentStyle}
                    wrapperStyle={chartTooltipStyles.wrapperStyle}
                    labelStyle={chartTooltipStyles.labelStyle}
                    itemStyle={chartTooltipStyles.itemStyle}
                  />
                  <Legend />
                  <Bar dataKey='입실' fill='#10b981' />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 데이터 없음 안내 */}
        {(!usage10MinData?.buckets || usage10MinData.buckets.length === 0) && (
          <Card className='md:col-span-2'>
            <CardHeader>
              <CardTitle className='text-sm font-medium'>차트 데이터</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground text-center py-8'>
                선택한 날짜에 데이터가 없습니다. 다른 날짜를 선택해주세요.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* API 응답 미리보기 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-sm font-medium'>API 응답 미리보기 (usage-10min)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-xs text-muted-foreground mb-2'>
            <code className='bg-muted px-1 py-0.5 rounded text-[10px]'>GET /api/v1/people-counter/usage-10min</code> 응답 (상위 플랫폼 연동용)
          </p>
          <pre className='bg-muted rounded-md p-2 text-[10px] overflow-x-auto max-h-[200px]'>
            {JSON.stringify(
              {
                range: usage10MinData?.range ?? null,
                bucketSizeMinutes: usage10MinData?.bucketSizeMinutes ?? null,
                buckets: usage10MinData?.buckets?.slice(0, 3).map(b => ({
                  start: b.start,
                  end: b.end,
                  inCount: b.inCount,
                })) ?? [],
                _note: usage10MinData?.buckets && usage10MinData.buckets.length > 3 ? `... 외 ${usage10MinData.buckets.length - 3}개 버킷` : undefined,
              },
              null,
              2,
            )}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserStatisticsPage;
