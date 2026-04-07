import { Shield } from 'lucide-react';

import { formatToKoreanTime } from '../../../utils/format';
import { Badge } from '../../ui/badge';
import { MonitoringCard } from './MonitoringCard';

interface PollingRecoveryStatusCardProps {
  data?: {
    isRunning: boolean;
    lastRecoveryTime: string | null;
    recoveryCount: number;
    error?: string;
    timestamp: string;
  };
}

const PollingRecoveryStatusCard: React.FC<PollingRecoveryStatusCardProps> = ({ data }) => {
  if (!data) {
    return (
      <MonitoringCard icon={Shield} title='폴링 자동 복구'>
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

  const formatLastRecoveryTime = (timestamp: string | null): string => {
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
    <MonitoringCard icon={Shield} title='폴링 자동 복구' headerRight={statusBadge} footer={footer}>
      {/* 복구 횟수 */}
      <div className='flex justify-between items-center'>
        <span className='text-sm font-medium'>복구 횟수</span>
        <span className='text-sm text-muted-foreground'>{data.recoveryCount}회</span>
      </div>

      {/* 마지막 복구 시간 */}
      <div className='flex justify-between items-center'>
        <span className='text-sm font-medium'>마지막 복구</span>
        <span className='text-sm text-muted-foreground'>{formatLastRecoveryTime(data.lastRecoveryTime)}</span>
      </div>

      <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
        <div className='text-xs text-muted-foreground'>폴링이 비활성화된 경우 자동으로 활성화합니다.</div>
      </div>
    </MonitoringCard>
  );
};

export default PollingRecoveryStatusCard;
