import { Clock } from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface DdcTimeSyncStatusCardProps {
  data?: {
    isRunning: boolean;
    lastSyncTime: string | null;
    syncCount: number;
    error?: string;
    timestamp: string;
  };
}

const DdcTimeSyncStatusCard: React.FC<DdcTimeSyncStatusCardProps> = ({ data }) => {
  if (!data) {
    return (
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>DDC 시간 동기화</CardTitle>
          <Clock className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-sm text-muted-foreground'>데이터를 불러오는 중...</div>
        </CardContent>
      </Card>
    );
  }

  const getStatusVariant = (isRunning: boolean) => {
    return isRunning ? 'default' : 'secondary';
  };

  const getStatusText = (isRunning: boolean) => {
    return isRunning ? '실행 중' : '중지됨';
  };

  const formatLastSyncTime = (timestamp: string | null): string => {
    if (!timestamp) return '없음';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('ko-KR');
    } catch {
      return '알 수 없음';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Clock className='h-5 w-5' />
          DDC 시간 동기화
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {/* 상태 정보 */}
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>상태</span>
            <Badge variant={getStatusVariant(data.isRunning)} className='text-xs'>
              {getStatusText(data.isRunning)}
            </Badge>
          </div>

          {/* 동기화 횟수 */}
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>동기화 횟수</span>
            <span className='text-sm text-muted-foreground'>{data.syncCount}회</span>
          </div>

          {/* 마지막 동기화 시간 */}
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>마지막 동기화</span>
            <span className='text-sm text-muted-foreground'>{formatLastSyncTime(data.lastSyncTime)}</span>
          </div>

          {/* 설명 */}
          <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
            <div className='text-xs text-muted-foreground'>24시간마다 DDC 장비의 시간을 동기화합니다.</div>
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

export default DdcTimeSyncStatusCard;
