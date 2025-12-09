import { Activity, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useGetSystemMonitoring } from '../../api/queries/system-monitoring';
import {
  ServerStatusCard,
  DatabaseStatusCard,
  ServicesStatusCard,
  HardwareStatusCard,
  SuperiorServerStatusCard,
  // 🆕 새로운 모니터링 카드들 추가
  PollingStatusCard,
  PollingRecoveryStatusCard,
  DdcTimeSyncStatusCard,
} from '../common/SystemMonitoring';
import PingTestCard from '../common/SystemMonitoring/PingTestCard';
import DatabaseExplorerModal from '../common/SystemMonitoring/DatabaseExplorerModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const SystemMonitoringPage = () => {
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);

  const { data, isLoading, error, refetch } = useGetSystemMonitoring();

  // 전체 시스템 상태 계산
  const overallStatus = useMemo(() => {
    if (!data) return 'unknown';

    const serverHealthy = data.server?.status === 'healthy';
    const dbHealthy = data.database?.status === 'connected';
    const servicesHealthy = data.services
      ? Object.values(data.services).every(domain =>
          Object.values(domain).every(service => service && service.available !== false)
        )
      : false;
    const hardwareHealthy = data.hardware?.ddc?.connected && data.hardware?.modbus?.isConnected;

    // 🆕 새로운 모니터링 데이터 반영
    const pollingHealthy = data.polling ? !data.polling.error : true;
    const pollingRecoveryHealthy = data.pollingRecovery ? !data.pollingRecovery.error : true;
    const ddcTimeSyncHealthy = data.ddcTimeSync ? !data.ddcTimeSync.error : true;

    if (
      serverHealthy &&
      dbHealthy &&
      servicesHealthy &&
      hardwareHealthy &&
      pollingHealthy &&
      pollingRecoveryHealthy &&
      ddcTimeSyncHealthy
    ) {
      return 'healthy';
    } else if (serverHealthy && dbHealthy) {
      return 'degraded';
    }
    return 'critical';
  }, [data]);

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
        return '모든 시스템 정상';
      case 'degraded':
        return '일부 시스템 문제';
      case 'critical':
        return '심각한 시스템 장애';
      default:
        return '상태 확인 중';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '🟢';
      case 'degraded':
        return '🟡';
      case 'critical':
        return '🔴';
      default:
        return '⚪';
    }
  };

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>시스템 모니터링 데이터를 로딩하는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Card className='w-96'>
          <CardHeader>
            <CardTitle className='text-center text-red-600'>데이터 로드 실패</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-center text-muted-foreground mb-4'>
              시스템 모니터링 데이터를 불러오는 중 오류가 발생했습니다.
            </p>
            <div className='text-center text-xs text-muted-foreground mb-4'>
              {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
            </div>
            <div className='flex justify-center'>
              <Button onClick={() => refetch()} variant='outline'>
                <RefreshCw className='h-4 w-4 mr-2' />
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 데이터가 없으면 로딩 상태 유지
  if (!data) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>데이터를 준비하는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* 헤더 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Activity className='h-8 w-8 text-primary' />
          <div>
            <h1 className='text-2xl font-bold'>시스템 모니터링</h1>
            <p className='text-muted-foreground'>실시간 시스템 상태 및 성능 모니터링</p>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <Badge variant={getStatusVariant(overallStatus)} className='text-sm'>
            <span className='mr-1'>{getStatusIcon(overallStatus)}</span>
            {getStatusText(overallStatus)}
          </Badge>
          <Button onClick={() => refetch()} variant='outline' size='sm'>
            <RefreshCw className='h-4 w-4 mr-2' />
            새로고침
          </Button>
        </div>
      </div>

      {/* 상태 카드 그리드 */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <SuperiorServerStatusCard />
        <PingTestCard />
        {data?.server && <ServerStatusCard data={data.server} />}
        {data?.database && <DatabaseStatusCard data={data.database} onViewData={() => setIsDatabaseModalOpen(true)} />}
        {data?.services && <ServicesStatusCard data={data.services} />}
        {data?.hardware && <HardwareStatusCard data={data.hardware} />}
        {/* 🆕 새로운 모니터링 카드들 추가 */}
        {data?.polling && <PollingStatusCard data={data.polling} />}
        {data?.pollingRecovery && <PollingRecoveryStatusCard data={data.pollingRecovery} />}
        {data?.ddcTimeSync && <DdcTimeSyncStatusCard data={data.ddcTimeSync} />}
        {/* 시스템 정보 (그리드 카드 크기 맞춤) */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>시스템 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span>마지막 업데이트</span>
                <span className='text-muted-foreground'>
                  {data?.timestamp ? new Date(data.timestamp).toLocaleString('ko-KR') : '알 수 없음'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>전체 상태</span>
                <Badge variant={getStatusVariant(overallStatus)} className='text-xs'>
                  {getStatusText(overallStatus)}
                </Badge>
              </div>
              <div className='flex justify-between'>
                <span>서버 상태</span>
                <Badge variant={data?.server.status === 'healthy' ? 'default' : 'destructive'} className='text-xs'>
                  {data?.server.status === 'healthy' ? '정상' : '문제'}
                </Badge>
              </div>
              <div className='flex justify-between'>
                <span>데이터베이스</span>
                <Badge variant={data?.database.status === 'connected' ? 'default' : 'destructive'} className='text-xs'>
                  {data?.database.status === 'connected' ? '연결됨' : '연결안됨'}
                </Badge>
              </div>
              <div className='pt-2 border-t text-xs text-muted-foreground space-y-1'>
                <div className='flex justify-between'>
                  <span>전체 메모리</span>
                  <span>{data?.server?.system?.totalMemory}GB</span>
                </div>
                <div className='flex justify-between'>
                  <span>사용 메모리</span>
                  <span>{data?.server?.system?.usedMemory}GB</span>
                </div>
                <div className='flex justify-between'>
                  <span>여유 메모리</span>
                  <span>{data?.server?.system?.freeMemory}GB</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 데이터베이스 탐색 모달 */}
      <DatabaseExplorerModal isOpen={isDatabaseModalOpen} onClose={() => setIsDatabaseModalOpen(false)} />

      {/* 자동 새로고침 정보 */}
      <div className='text-center text-xs text-muted-foreground'>데이터는 15초마다 자동으로 새로고침됩니다.</div>
    </div>
  );
};

export default SystemMonitoringPage;
