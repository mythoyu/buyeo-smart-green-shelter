import { Shield } from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

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
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>폴링 자동 복구</CardTitle>
          <Shield className='h-4 w-4 text-muted-foreground' />
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

  const formatLastRecoveryTime = (timestamp: string | null): string => {
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
          <Shield className='h-5 w-5' />
          폴링 자동 복구
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

          {/* 설명 */}
          <div className='pt-2 border-t'>
            <div className='text-xs text-muted-foreground'>폴링이 비활성화된 경우 자동으로 활성화합니다.</div>
          </div>

          {/* 에러 표시 */}
          {data.error && (
            <div className='pt-2 border-t'>
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

export default PollingRecoveryStatusCard;
