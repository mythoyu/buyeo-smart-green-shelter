import { Activity } from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface PollingStatusCardProps {
  data?: {
    enabled: boolean;
    interval: number;
    applyInProgress: boolean;
    isCycleRunning: boolean;
    stats: {
      totalCalls: number;
      successfulPolls: number;
      failedPolls: number;
      averageResponseTime: number;
      lastCleanup: string;
    };
    error?: string;
    timestamp: string;
  };
}

const PollingStatusCard: React.FC<PollingStatusCardProps> = ({ data }) => {
  if (!data) {
    return (
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>폴링 상태</CardTitle>
          <Activity className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-sm text-muted-foreground'>데이터를 불러오는 중...</div>
        </CardContent>
      </Card>
    );
  }

  const getStatusVariant = (enabled: boolean, isCycleRunning: boolean) => {
    if (!enabled) return 'secondary';
    if (isCycleRunning) return 'default';
    return 'outline';
  };

  const getStatusText = (enabled: boolean, isCycleRunning: boolean) => {
    if (!enabled) return '비활성화';
    if (isCycleRunning) return '실행 중';
    return '대기 중';
  };

  const formatInterval = (interval: number): string => {
    if (interval < 1000) return `${interval}ms`;
    if (interval < 60000) return `${Math.round(interval / 1000)}초`;
    return `${Math.round(interval / 60000)}분`;
  };

  const formatLastCleanup = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('ko-KR');
    } catch {
      return '알 수 없음';
    }
  };

  const successRate =
    data.stats.totalCalls > 0 ? Math.round((data.stats.successfulPolls / data.stats.totalCalls) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Activity className='h-5 w-5' />
          폴링 상태
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {/* 상태 정보 */}
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>상태</span>
            <Badge variant={getStatusVariant(data.enabled, data.isCycleRunning)} className='text-xs'>
              {getStatusText(data.enabled, data.isCycleRunning)}
            </Badge>
          </div>

          {/* 폴링 간격 */}
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>간격</span>
            <span className='text-sm text-muted-foreground'>{formatInterval(data.interval)}</span>
          </div>

          {/* 적용 진행 중 */}
          {data.applyInProgress && (
            <div className='flex justify-between items-center'>
              <span className='text-sm font-medium'>적용 진행</span>
              <Badge variant='outline' className='text-xs'>
                진행 중
              </Badge>
            </div>
          )}

          {/* 통계 정보 */}
          <div className='pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2'>
            <div className='flex justify-between items-center'>
              <span className='text-xs text-muted-foreground'>총 호출</span>
              <span className='text-xs font-medium'>{data.stats.totalCalls.toLocaleString()}</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-xs text-muted-foreground'>성공률</span>
              <span className='text-xs font-medium'>{successRate}%</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-xs text-muted-foreground'>평균 응답시간</span>
              <span className='text-xs font-medium'>{data.stats.averageResponseTime.toFixed(1)}ms</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-xs text-muted-foreground'>마지막 정리</span>
              <span className='text-xs text-muted-foreground'>{formatLastCleanup(data.stats.lastCleanup)}</span>
            </div>
          </div>

          {/* 에러 표시 */}
          {data.error && (
            <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
              <div className='text-xs text-red-600 bg-red-50 p-2 rounded'>
                <strong>에러:</strong> {data.error}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PollingStatusCard;
