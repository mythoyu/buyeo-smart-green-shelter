import { Server } from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';

interface ServerStatusCardProps {
  data?: {
    status: string;
    uptime: number;
    memory: {
      used: number;
      total: number;
      external: number;
      rss: number;
      usagePercent: number;
      maxHeap: number;
    };
    cpu: {
      user: number;
      system: number;
    };
    system: {
      totalMemory: number;
      freeMemory: number;
      loadAverage: number[];
      cpuCount: number;
    };
    process: {
      pid: number;
      version: string;
      platform: string;
      arch: string;
    };
    timestamp: string;
  };
}

const ServerStatusCard: React.FC<ServerStatusCardProps> = ({ data }) => {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Server className='h-5 w-5' />
            서버 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center h-20'>
            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600'></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const memoryUsagePercent = data.memory.usagePercent;
  const uptimeHours = Math.floor(data.uptime / 3600);
  const uptimeMinutes = Math.floor((data.uptime % 3600) / 60);
  const uptimeSeconds = Math.floor(data.uptime % 60);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return '정상';
      case 'degraded':
        return '부분 장애';
      case 'critical':
        return '심각한 장애';
      default:
        return '알 수 없음';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Server className='h-5 w-5' />
          서버 상태
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {/* 상태 */}
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>상태</span>
            <Badge variant={getStatusVariant(data.status)}>{getStatusText(data.status)}</Badge>
          </div>

          {/* 가동시간 */}
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>가동시간</span>
            <span className='text-sm text-muted-foreground'>
              {uptimeHours}시간 {uptimeMinutes}분 {uptimeSeconds}초
            </span>
          </div>

          {/* 메모리 사용량 */}
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='font-medium'>힙 메모리</span>
              <span className='text-muted-foreground'>
                {data.memory.used}MB / {data.memory.total}MB
              </span>
            </div>
            <Progress value={memoryUsagePercent} className='h-2' />
            <div className='text-xs text-muted-foreground'>사용률: {memoryUsagePercent}%</div>

            {/* 힙 메모리 최대값 */}
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>최대 힙 메모리</span>
              <span>{data.memory.maxHeap}MB</span>
            </div>

            {/* RSS 메모리 */}
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>RSS 메모리</span>
              <span>{data.memory.rss}MB</span>
            </div>

            {/* 외부 메모리 */}
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>외부 메모리</span>
              <span>{data.memory.external}MB</span>
            </div>
          </div>

          {/* 시스템 정보 */}
          <div className='space-y-1'>
            <div className='flex justify-between text-xs'>
              <span>시스템 메모리</span>
              <span>{data.system.totalMemory}GB</span>
            </div>
            <div className='flex justify-between text-xs'>
              <span>사용 가능</span>
              <span>{data.system.freeMemory}GB</span>
            </div>
            <div className='flex justify-between text-xs'>
              <span>CPU 코어</span>
              <span>{data.system.cpuCount}개</span>
            </div>
          </div>

          {/* 프로세스 정보 */}
          <div className='pt-2 border-t'>
            <div className='text-xs text-muted-foreground space-y-1'>
              <div>PID: {data.process.pid}</div>
              <div>Node.js {data.process.version}</div>
              <div>
                {data.process.platform} ({data.process.arch})
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerStatusCard;
