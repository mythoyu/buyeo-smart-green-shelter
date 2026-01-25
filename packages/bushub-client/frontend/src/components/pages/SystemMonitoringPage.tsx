import { RefreshCw, Server, Wifi, Database, Package, Cpu, Activity, BarChart2, Network } from 'lucide-react';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import { useGetSystemMonitoring } from '../../api/queries/system-monitoring';
import { useRightSidebarContent } from '../../hooks/useRightSidebarContent';
import { MONITOR_NAV } from '../../constants/sidebarConfig';
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
import { RightSidebarItem } from '../layout/RightSidebar';

const SystemMonitoringPage = () => {
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  // 오른쪽 사이드바에서 선택된 모니터링 그룹 ('all'이면 모든 카드 표시, 그 외에는 해당 그룹의 카드만)
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>('all');

  // 모니터링 그룹 정의
  const MONITOR_GROUPS = [
    { id: 'all', label: '전체', icon: Activity },
    { id: 'connection', label: '연결', icon: Network, cardIds: ['monitor-superior-server', 'monitor-ping-test'] },
    { id: 'system', label: '시스템', icon: Server, cardIds: ['monitor-server', 'monitor-database', 'monitor-services', 'monitor-hardware'] },
    { id: 'monitoring', label: '모니\n터링', icon: BarChart2, cardIds: ['monitor-polling', 'monitor-polling-recovery', 'monitor-ddc-time-sync', 'monitor-system-summary'] },
  ] as const;

  const { data, isLoading, error, refetch } = useGetSystemMonitoring();

  // 백엔드 calculateOverallStatus 사용 (server, db, services, hardware, polling, pollingRecovery, ddcTimeSync 반영)
  const overallStatus = data?.overall?.status ?? 'unknown';

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

  // 모니터링 그룹 선택 핸들러 (해당 그룹의 카드만 표시)
  const handleSelectMonitor = useCallback((groupId: string) => {
    setSelectedMonitorId(groupId);
  }, []);

  // 선택된 그룹에 해당하는 카드 ID 목록
  const visibleCardIds = useMemo(() => {
    if (selectedMonitorId === 'all') {
      return ['monitor-superior-server', 'monitor-ping-test', 'monitor-server', 'monitor-database', 'monitor-services', 'monitor-hardware', 'monitor-polling', 'monitor-polling-recovery', 'monitor-ddc-time-sync', 'monitor-system-summary'];
    }
    const group = MONITOR_GROUPS.find(g => g.id === selectedMonitorId);
    return group?.cardIds || [];
  }, [selectedMonitorId]);

  // 사이드바 컨텐츠
  const sidebarContent = useMemo(() => {
    if (isLoading || error || !data) {
      return null;
    }
    return (
      <>
        {MONITOR_GROUPS.map(({ id, label, icon: Icon }) => (
          <RightSidebarItem
            key={id}
            icon={Icon}
            label={label}
            active={selectedMonitorId === id}
            onClick={() => handleSelectMonitor(id)}
            title={label}
          />
        ))}
      </>
    );
  }, [isLoading, error, data, selectedMonitorId, handleSelectMonitor]);

  // 오른쪽 사이드바 설정
  useRightSidebarContent(sidebarContent, [isLoading, error, data, selectedMonitorId, handleSelectMonitor]);

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
              <Button
                onClick={() => refetch()}
                variant='outline'
                className='border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              >
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

  const cardEntries: { id: string; card: React.ReactNode }[] = [
    { id: 'monitor-superior-server', card: <SuperiorServerStatusCard key='superior-server' /> },
    { id: 'monitor-ping-test', card: <PingTestCard key='ping-test' /> },
    ...(data?.server ? [{ id: 'monitor-server', card: <ServerStatusCard key='server' data={data.server} /> }] : []),
    ...(data?.database
      ? [
          {
            id: 'monitor-database',
            card: (
              <DatabaseStatusCard key='database' data={data.database} onViewData={() => setIsDatabaseModalOpen(true)} />
            ),
          },
        ]
      : []),
    ...(data?.services ? [{ id: 'monitor-services', card: <ServicesStatusCard key='services' data={data.services} /> }] : []),
    ...(data?.hardware ? [{ id: 'monitor-hardware', card: <HardwareStatusCard key='hardware' data={data.hardware} /> }] : []),
    ...(data?.polling ? [{ id: 'monitor-polling', card: <PollingStatusCard key='polling' data={data.polling} /> }] : []),
    ...(data?.pollingRecovery
      ? [
          {
            id: 'monitor-polling-recovery',
            card: <PollingRecoveryStatusCard key='polling-recovery' data={data.pollingRecovery} />,
          },
        ]
      : []),
    ...(data?.ddcTimeSync
      ? [
          {
            id: 'monitor-ddc-time-sync',
            card: <DdcTimeSyncStatusCard key='ddc-time-sync' data={data.ddcTimeSync} />,
          },
        ]
      : []),
    {
      id: 'monitor-system-summary',
      card: (
        <Card key='system-summary'>
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
                <Badge variant={data?.server?.status === 'healthy' ? 'default' : 'destructive'} className='text-xs'>
                  {data?.server?.status === 'healthy' ? '정상' : '문제'}
                </Badge>
              </div>
              <div className='flex justify-between'>
                <span>데이터베이스</span>
                <Badge variant={data?.database?.status === 'connected' ? 'default' : 'destructive'} className='text-xs'>
                  {data?.database?.status === 'connected' ? '연결됨' : '연결안됨'}
                </Badge>
              </div>
              <div className='pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-muted-foreground space-y-1'>
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
      ),
    },
  ];

  return (
    <div className='w-full p-6 space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {cardEntries
          .filter(({ id }) => visibleCardIds.includes(id))
          .map(({ id, card }, index) => (
            <div
              key={id}
              id={id}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.6s ease-out forwards',
              }}
            >
              {card}
            </div>
          ))}
      </div>

      {/* 데이터베이스 탐색 모달 */}
      <DatabaseExplorerModal isOpen={isDatabaseModalOpen} onClose={() => setIsDatabaseModalOpen(false)} />
    </div>
  );
};

export default SystemMonitoringPage;
