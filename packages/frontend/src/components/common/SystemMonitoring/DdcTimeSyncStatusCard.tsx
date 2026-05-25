import { Clock } from 'lucide-react';

import { formatToKoreanTime } from '../../../utils/format';
import { Badge } from '../../ui/badge';
import { MonitoringCard } from './MonitoringCard';

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
      <MonitoringCard icon={Clock} title='DDC 시간 동기화'>
        <div className='text-sm text-muted-foreground'>데이터를 불러오는 중...</div>
      </MonitoringCard>
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
      return formatToKoreanTime(timestamp, { showDate: true, showSeconds: true });
    } catch {
      return '알 수 없음';
    }
  };

  const statusBadge = (
    <Badge variant={getStatusVariant(data.isRunning)} className='text-xs'>
      {getStatusText(data.isRunning)}
    </Badge>
  );

  const footer = data.error ? (
    <div className='text-xs text-red-600 bg-red-50 p-2 rounded'>
      <strong>에러:</strong> {data.error}
    </div>
  ) : null;

  return (
    <MonitoringCard icon={Clock} title='DDC 시간 동기화' headerRight={statusBadge} footer={footer}>
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

      <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
        <div className='text-xs text-muted-foreground'>24시간마다 DDC 장비의 시간을 동기화합니다.</div>
      </div>
    </MonitoringCard>
  );
};

export default DdcTimeSyncStatusCard;
