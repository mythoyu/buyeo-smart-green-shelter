import { Users, TrendingUp, TrendingDown, BarChart3, Calendar, RefreshCw, X, AlertCircle } from 'lucide-react';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { toast } from 'sonner';

import { useGetPeopleCounterState, useGetPeopleCounterStats, type Period } from '../../api/queries/people-counter';
import { useRightSidebarContent } from '../../hooks/useRightSidebarContent';
import {
  aggregateByDay,
  aggregateByWeek,
  aggregateByMonth,
  findPeakHours,
  calculateHourlyNetIn,
  type RawDataPoint,
} from '../../utils/peopleCounterHelpers';
import { RightSidebarItem } from '../layout/RightSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui';
import { DatePickerField } from '../common/DatePickerField';
import { TimeSelect } from '../common/TimeSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Label } from '../ui';

/** YYYY-MM-DDTHH:mm 형식 */
function toDateTimeString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function datePart(dt: string): string {
  if (!dt) return '';
  return dt.slice(0, 10);
}

function timePart(dt: string): string {
  if (!dt || !dt.includes('T')) return '00:00';
  return dt.slice(11, 16);
}

function fromDateAndTime(date: string, time: string): string {
  if (!date) return '';
  const [h, min] = time ? time.split(':') : ['00', '00'];
  return `${date}T${(h ?? '00').padStart(2, '0')}:${(min ?? '00').padStart(2, '0')}`;
}

/** 조회기간 표시용 "YYYY-MM-DD HH:mm" */
function formatDateTimeDisplay(dt: string): string {
  if (!dt) return '';
  const d = datePart(dt);
  const t = timePart(dt);
  return t ? `${d} ${t}` : d;
}

const UserStatisticsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('day');
  const [customStartDateTime, setCustomStartDateTime] = useState<string>('');
  const [customEndDateTime, setCustomEndDateTime] = useState<string>('');
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [tempStartDateTime, setTempStartDateTime] = useState<string>('');
  const [tempEndDateTime, setTempEndDateTime] = useState<string>('');

  // 피플카운터 활성화 상태 확인
  const { data: pcState, isLoading: pcStateLoading } = useGetPeopleCounterState();

  // 통계 데이터 조회
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useGetPeopleCounterStats({
    ...(customStartDateTime && customEndDateTime
      ? { startDate: customStartDateTime, endDate: customEndDateTime }
      : { period: selectedPeriod }),
    enabled: pcState?.peopleCounterEnabled === true,
  });

  // 기간별 날짜+시간 계산 (YYYY-MM-DDTHH:mm)
  const getDateRangeForPeriod = useCallback((period: Period): { start: string; end: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'hour': {
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        return { start: toDateTimeString(oneHourAgo), end: toDateTimeString(now) };
      }
      case 'day': {
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { start: toDateTimeString(start), end: toDateTimeString(end) };
      }
      case 'week': {
        const d = now.getDay();
        const mon = d === 0 ? -6 : 1 - d;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mon);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        return { start: toDateTimeString(monday), end: toDateTimeString(sunday) };
      }
      case 'month': {
        const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start: toDateTimeString(first), end: toDateTimeString(last) };
      }
      default: {
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        return { start: toDateTimeString(start), end: toDateTimeString(start) };
      }
    }
  }, []);

  // 기간 선택 핸들러
  const handlePeriodChange = useCallback(
    (period: Period) => {
      setSelectedPeriod(period);
      const { start, end } = getDateRangeForPeriod(period);
      setCustomStartDateTime(start);
      setCustomEndDateTime(end);
    },
    [getDateRangeForPeriod]
  );

  const handleOpenDateDialog = useCallback(() => {
    setTempStartDateTime(customStartDateTime || '');
    setTempEndDateTime(customEndDateTime || '');
    setIsDateDialogOpen(true);
  }, [customStartDateTime, customEndDateTime]);

  const handleApplyCustomDate = useCallback(() => {
    if (!tempStartDateTime || !tempEndDateTime) {
      toast.error('시작일시와 종료일시를 모두 선택해주세요.');
      return;
    }
    if (new Date(tempStartDateTime) > new Date(tempEndDateTime)) {
      toast.error('시작일시는 종료일시보다 이전이어야 합니다.');
      return;
    }
    setCustomStartDateTime(tempStartDateTime);
    setCustomEndDateTime(tempEndDateTime);
    setSelectedPeriod('day');
    setIsDateDialogOpen(false);
    toast.success('선택한 기간으로 데이터를 조회합니다.');
  }, [tempStartDateTime, tempEndDateTime]);

  const handleClearCustomDate = useCallback(() => {
    const { start, end } = getDateRangeForPeriod('day');
    setCustomStartDateTime(start);
    setCustomEndDateTime(end);
    setSelectedPeriod('day');
    toast.info('기본 기간(오늘)으로 변경되었습니다.');
  }, [getDateRangeForPeriod]);

  // 최초 마운트 시 오늘 00:00~23:59로 조회기간 초기화
  useEffect(() => {
    if (!customStartDateTime && !customEndDateTime) {
      const { start, end } = getDateRangeForPeriod('day');
      setCustomStartDateTime(start);
      setCustomEndDateTime(end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 집계된 데이터 계산
  const rawData: RawDataPoint[] = useMemo(() => {
    return (
      statsData?.rawData?.map((d) => ({
        timestamp: d.timestamp,
        inCumulative: d.inCumulative,
        outCumulative: d.outCumulative,
        currentCount: d.currentCount,
      })) || []
    );
  }, [statsData?.rawData]);

  const dailyData = useMemo(() => aggregateByDay(rawData), [rawData]);
  const weeklyData = useMemo(() => aggregateByWeek(rawData), [rawData]);
  const monthlyData = useMemo(() => aggregateByMonth(rawData), [rawData]);
  const peakHours = useMemo(() => findPeakHours(rawData, 5), [rawData]);
  const hourlyNetIn = useMemo(() => calculateHourlyNetIn(rawData), [rawData]);

  // 오른쪽 사이드바 설정
  const sidebarContent = useMemo(
    () => (
      <>
        <RightSidebarItem
          icon={RefreshCw}
          label='새로\n고침'
          onClick={() => refetchStats()}
          title='데이터 새로고침'
        />
        <RightSidebarItem
          icon={Calendar}
          label='기간\n선택'
          onClick={handleOpenDateDialog}
          title='기간 선택'
        />
      </>
    ),
    [refetchStats, handleOpenDateDialog]
  );

  useRightSidebarContent(sidebarContent, [refetchStats]);

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
  if (pcStateLoading || statsLoading) {
    return (
      <div className='p-6'>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
            <p className='text-gray-600'>데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (statsError) {
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

  const stats = statsData?.stats;

  return (
    <div className='p-6 space-y-6'>
      {/* 페이지 헤더 */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div>
          <h1 className='text-2xl font-bold'>이용자 통계</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            피플카운터 데이터를 기반으로 한 이용자 통계를 확인할 수 있습니다.
          </p>
        </div>
        <div className='flex items-center gap-2 flex-wrap'>
          <Button
            variant={selectedPeriod === 'hour' ? 'default' : 'outline'}
            size='sm'
            className={selectedPeriod !== 'hour' ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600' : undefined}
            onClick={() => handlePeriodChange('hour')}
          >
            1시간
          </Button>
          <Button
            variant={selectedPeriod === 'day' ? 'default' : 'outline'}
            size='sm'
            className={selectedPeriod !== 'day' ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600' : undefined}
            onClick={() => handlePeriodChange('day')}
          >
            오늘
          </Button>
          <Button
            variant={selectedPeriod === 'week' ? 'default' : 'outline'}
            size='sm'
            className={selectedPeriod !== 'week' ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600' : undefined}
            onClick={() => handlePeriodChange('week')}
          >
            이번 주
          </Button>
          <Button
            variant={selectedPeriod === 'month' ? 'default' : 'outline'}
            size='sm'
            className={selectedPeriod !== 'month' ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600' : undefined}
            onClick={() => handlePeriodChange('month')}
          >
            이번 달
          </Button>
          <div className='flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700 flex-wrap'>
            <div className='flex items-center gap-1'>
              <DatePickerField
                value={datePart(customStartDateTime)}
                onChange={(newDate) => {
                  const next = fromDateAndTime(newDate, timePart(customStartDateTime));
                  setCustomStartDateTime(next);
                  if (next && customEndDateTime && new Date(next) > new Date(customEndDateTime)) {
                    toast.error('시작일시는 종료일시보다 이전이어야 합니다.');
                    return;
                  }
                  setSelectedPeriod('day');
                  if (next && customEndDateTime) toast.success('기간이 적용되었습니다.');
                }}
                placeholder='시작일'
              />
              <TimeSelect
                value={timePart(customStartDateTime)}
                onChange={(newTime) => {
                  const next = fromDateAndTime(datePart(customStartDateTime), newTime);
                  setCustomStartDateTime(next);
                  if (next && customEndDateTime && new Date(next) > new Date(customEndDateTime)) {
                    toast.error('시작일시는 종료일시보다 이전이어야 합니다.');
                    return;
                  }
                  setSelectedPeriod('day');
                  if (next && customEndDateTime) toast.success('기간이 적용되었습니다.');
                }}
                interval={1}
                className='w-28'
              />
            </div>
            <span className='text-sm text-muted-foreground'>~</span>
            <div className='flex items-center gap-1'>
              <DatePickerField
                value={datePart(customEndDateTime)}
                onChange={(newDate) => {
                  const next = fromDateAndTime(newDate, timePart(customEndDateTime));
                  setCustomEndDateTime(next);
                  if (customStartDateTime && next && new Date(customStartDateTime) > new Date(next)) {
                    toast.error('시작일시는 종료일시보다 이전이어야 합니다.');
                    return;
                  }
                  setSelectedPeriod('day');
                  if (customStartDateTime && next) toast.success('기간이 적용되었습니다.');
                }}
                placeholder='종료일'
              />
              <TimeSelect
                value={timePart(customEndDateTime)}
                onChange={(newTime) => {
                  const next = fromDateAndTime(datePart(customEndDateTime), newTime);
                  setCustomEndDateTime(next);
                  if (customStartDateTime && next && new Date(customStartDateTime) > new Date(next)) {
                    toast.error('시작일시는 종료일시보다 이전이어야 합니다.');
                    return;
                  }
                  setSelectedPeriod('day');
                  if (customStartDateTime && next) toast.success('기간이 적용되었습니다.');
                }}
                interval={1}
                className='w-28'
              />
            </div>
            {(customStartDateTime || customEndDateTime) && (
              <Button variant='ghost' size='sm' onClick={handleClearCustomDate} className='h-9 px-2'>
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 조회기간 표시 (날짜+시간) */}
      {(customStartDateTime || customEndDateTime) && (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <span className='font-medium text-foreground'>조회기간</span>
          <span>
            {formatDateTimeDisplay(customStartDateTime)} ~ {formatDateTimeDisplay(customEndDateTime)}
          </span>
        </div>
      )}

      {/* 요약 통계 카드 */}
      <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>현재 인원</CardTitle>
            <Users className='h-3 w-3 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold'>
              {statsData?.rawData && statsData.rawData.length > 0
                ? statsData.rawData[statsData.rawData.length - 1].currentCount
                : 0}
            </div>
            <p className='text-[10px] text-muted-foreground mt-1'>실시간 현재 인원</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>입실 누적</CardTitle>
            <TrendingUp className='h-3 w-3 text-green-600' />
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold'>{stats?.inCount ?? 0}</div>
            <p className='text-[10px] text-muted-foreground mt-1'>입실 인원</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>퇴실 누적</CardTitle>
            <TrendingDown className='h-3 w-3 text-red-600' />
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold'>{stats?.outCount ?? 0}</div>
            <p className='text-[10px] text-muted-foreground mt-1'>퇴실 인원</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>피크 인원</CardTitle>
            <BarChart3 className='h-3 w-3 text-blue-600' />
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold'>{stats?.peakCount ?? 0}</div>
            <p className='text-[10px] text-muted-foreground mt-1'>최대 동시 인원</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>데이터 포인트</CardTitle>
            <BarChart3 className='h-3 w-3 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold'>{stats?.dataPoints ?? 0}</div>
            <p className='text-[10px] text-muted-foreground mt-1'>수집된 데이터</p>
          </CardContent>
        </Card>
      </div>


      {/* 차트 영역: 모바일 1열, md 이상 2열 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      {/* 실시간 현재 인원 추이 */}
      {statsData?.rawData && statsData.rawData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>실시간 현재 인원 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <LineChart data={statsData.rawData.map((d) => ({
                time: new Date(d.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                count: d.currentCount,
              }))}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='time' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type='monotone' dataKey='count' stroke='#2563eb' strokeWidth={2} name='현재 인원' />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 입실/퇴실 누적 추이 */}
      {statsData?.rawData && statsData.rawData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>입실/퇴실 누적 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <AreaChart data={statsData.rawData.map((d) => ({
                time: new Date(d.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                입실: d.inCumulative,
                퇴실: d.outCumulative,
              }))}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='time' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type='monotone' dataKey='입실' stackId='1' stroke='#10b981' fill='#10b981' fillOpacity={0.6} />
                <Area type='monotone' dataKey='퇴실' stackId='1' stroke='#ef4444' fill='#ef4444' fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 시간대별 입실/퇴실 차트 */}
      {hourlyNetIn.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>시간대별 입실/퇴실</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={hourlyNetIn}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='hour' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey='입실' fill='#10b981' />
                <Bar dataKey='퇴실' fill='#ef4444' />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 피크 시간대 분석 */}
      {peakHours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>피크 시간대 분석 (상위 5개)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={peakHours} layout='vertical'>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis type='number' />
                <YAxis dataKey='시간' type='category' width={60} />
                <Tooltip />
                <Legend />
                <Bar dataKey='인원' fill='#2563eb' />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 일별 통계 */}
      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>일별 통계</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='day' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type='monotone' dataKey='입실' stackId='1' stroke='#10b981' fill='#10b981' fillOpacity={0.6} />
                <Area type='monotone' dataKey='퇴실' stackId='1' stroke='#ef4444' fill='#ef4444' fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 요일별 통계 */}
      {weeklyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>요일별 통계</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='day' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey='입실' fill='#10b981' />
                <Bar dataKey='퇴실' fill='#ef4444' />
                <Bar dataKey='평균인원' fill='#2563eb' />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 월별 통계 */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>월별 통계</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='month' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey='입실' fill='#10b981' />
                <Bar dataKey='퇴실' fill='#ef4444' />
                <Bar dataKey='평균인원' fill='#2563eb' />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 데이터 없음 안내 */}
      {(!statsData?.rawData || statsData.rawData.length === 0) && (
        <Card className='md:col-span-2'>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>차트 데이터</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground text-center py-8'>
              선택한 기간에 데이터가 없습니다. 다른 기간을 선택해주세요.
            </p>
          </CardContent>
        </Card>
      )}
      </div>

      {/* 커스텀 날짜 선택 Dialog */}
      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기간 선택</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>시작일시</Label>
              <div className='flex gap-2'>
                <DatePickerField
                  value={datePart(tempStartDateTime)}
                  onChange={(d) => setTempStartDateTime(fromDateAndTime(d, timePart(tempStartDateTime)))}
                  placeholder='시작일'
                />
                <TimeSelect
                  value={timePart(tempStartDateTime)}
                  onChange={(newTime) =>
                    setTempStartDateTime(fromDateAndTime(datePart(tempStartDateTime), newTime))
                  }
                  interval={1}
                  className='w-28'
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label>종료일시</Label>
              <div className='flex gap-2'>
                <DatePickerField
                  value={datePart(tempEndDateTime)}
                  onChange={(d) => setTempEndDateTime(fromDateAndTime(d, timePart(tempEndDateTime)))}
                  placeholder='종료일'
                />
                <TimeSelect
                  value={timePart(tempEndDateTime)}
                  onChange={(newTime) =>
                    setTempEndDateTime(fromDateAndTime(datePart(tempEndDateTime), newTime))
                  }
                  interval={1}
                  className='w-28'
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              className='border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              onClick={() => setIsDateDialogOpen(false)}
            >
              취소
            </Button>
            <Button onClick={handleApplyCustomDate}>적용</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserStatisticsPage;
