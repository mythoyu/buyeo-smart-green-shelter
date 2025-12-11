import { AlertCircle, Cpu } from 'lucide-react';
import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { usePollingStatus } from '../../hooks/usePollingStatus';
import { useUpdatePollingState } from '../../api/queries/polling';
import { HardwareControlTabs } from '../common/HardwareControl/HardwareControlTabs';
import { PollingDialog } from '../common/PollingDialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

import type { HardwareControlError } from '../../types/hardware';

// 상수 분리
const CONSTANTS = {
  TITLES: {
    HARDWARE_CONTROL: '하드웨어 직접 제어',
    ACCESS_DENIED: '접근 권한 없음',
    ERROR: '오류 발생',
    LOADING: '하드웨어 직접 제어',
  },
  MESSAGES: {
    ACCESS_DENIED: '하드웨어 직접 제어 기능은 관리자(superuser) 또는 엔지니어(engineer) 권한이 필요합니다.',
    POLLING_WARNING: '폴링이 활성화되어 있습니다. 하드웨어 직접 제어를 사용하려면 먼저 폴링을 중지해주세요.',
    LOADING_DESCRIPTION: '시스템 상태를 확인하는 중입니다...',
    DESCRIPTION: '폴링 중지 시에만 사용 가능',
    RETRY: '다시 시도',
  },
  USAGE_GUIDE: {
    TITLE: '사용 안내',
    ITEMS: [
      { label: 'DO', desc: '디지털 출력 포트를 통한 전원 제어 및 스케줄 설정' },
      { label: 'DI', desc: '디지털 입력 포트 상태 모니터링 및 기능 활성화' },
      { label: 'HVAC', desc: '냉난방기 및 전열교환기 제어 및 모니터링' },
      { label: '통합센서', desc: '통합센서 데이터 실시간 모니터링 (읽기 전용)' },
      { label: '시스템', desc: '절기 설정 및 DDC 시간 설정' },
      { label: '주의사항', desc: '폴링이 활성화된 상태에서는 하드웨어 직접 제어가 불가능합니다.' },
      { label: '권한', desc: '관리자(superuser) 또는 엔지니어(engineer)만 사용할 수 있습니다.' },
    ],
  },
} as const;

// 접근 거부 카드 컴포넌트
const AccessDeniedCard = React.memo(() => (
  <div className='container mx-auto p-6'>
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-red-600'>
          <AlertCircle className='h-5 w-5' />
          {CONSTANTS.TITLES.ACCESS_DENIED}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-muted-foreground'>{CONSTANTS.MESSAGES.ACCESS_DENIED}</p>
      </CardContent>
    </Card>
  </div>
));

// 로딩 카드 컴포넌트
const LoadingCard = React.memo(() => (
  <div className='container mx-auto p-6'>
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Cpu className='h-5 w-5' />
          {CONSTANTS.TITLES.LOADING}
        </CardTitle>
        <CardDescription>{CONSTANTS.MESSAGES.LOADING_DESCRIPTION}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='flex items-center justify-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
        </div>
      </CardContent>
    </Card>
  </div>
));

// 에러 카드 컴포넌트
const ErrorCard = React.memo<{ error: HardwareControlError; onRetry: () => void }>(({ error, onRetry }) => (
  <div className='container mx-auto p-6'>
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-red-600'>
          <AlertCircle className='h-5 w-5' />
          {CONSTANTS.TITLES.ERROR}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            {error.message}
            {error.details && <div className='mt-2 text-sm text-muted-foreground'>{error.details}</div>}
          </AlertDescription>
        </Alert>
        <div className='mt-4'>
          <button
            onClick={onRetry}
            className='px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90'
          >
            {CONSTANTS.MESSAGES.RETRY}
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
));

// 사용 안내 카드 컴포넌트
const UsageGuideCard = React.memo(() => (
  <Card>
    <CardHeader>
      <CardTitle className='text-lg'>{CONSTANTS.USAGE_GUIDE.TITLE}</CardTitle>
    </CardHeader>
    <CardContent className='space-y-2 text-sm text-muted-foreground'>
      {CONSTANTS.USAGE_GUIDE.ITEMS.map((item, index) => (
        <p key={index}>
          • <strong>{item.label}</strong>: {item.desc}
        </p>
      ))}
    </CardContent>
  </Card>
));

// 페이지 헤더 컴포넌트
const PageHeader = React.memo(() => (
  <div className='flex items-center justify-between'>
    <div>
      <h1 className='text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2'>
        <Cpu className='h-6 w-6' />
        {CONSTANTS.TITLES.HARDWARE_CONTROL}
      </h1>
      <p className='text-muted-foreground mt-2 text-sm'>{CONSTANTS.MESSAGES.DESCRIPTION}</p>
    </div>
  </div>
));

// 폴링 경고 컴포넌트
const PollingWarningAlert = React.memo(() => (
  <Alert variant='destructive'>
    <AlertCircle className='h-4 w-4' />
    <AlertDescription>
      <strong>{CONSTANTS.MESSAGES.POLLING_WARNING}</strong>
    </AlertDescription>
  </Alert>
));

/**
 * 하드웨어 직접 제어 페이지
 * superuser, engineer 권한 사용자만 접근 가능
 */
const HardwareControlPage: React.FC = React.memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 권한 확인: superuser, engineer만 접근 가능 (메모이제이션)
  const canAccessHardwareControl = useMemo(() => user?.role === 'superuser' || user?.role === 'engineer', [user?.role]);

  // 조건부 API 호출: 권한이 있을 때만 폴링 상태 조회
  const { data: pollingStatus, isLoading: pollingLoading } = usePollingStatus({
    enabled: canAccessHardwareControl,
  });

  // 폴링 상태 업데이트 mutation
  const updatePollingMutation = useUpdatePollingState();

  // 폴링 상태 확인 (메모이제이션)
  const isPollingActive = useMemo(() => pollingStatus?.pollingEnabled ?? false, [pollingStatus?.pollingEnabled]);

  // 에러 상태 관리
  const [error, setError] = React.useState<HardwareControlError | null>(null);

  // 폴링 다이얼로그 상태 관리
  const [pollingDialog, setPollingDialog] = useState<{
    isOpen: boolean;
    hasShown: boolean;
  }>({
    isOpen: false,
    hasShown: false,
  });

  // 에러 핸들러들 (메모이제이션)
  const handleError = useCallback((error: HardwareControlError) => {
    setError(error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 페이지 진입 시 폴링 상태 확인
  useEffect(() => {
    if (!pollingLoading && pollingStatus?.pollingEnabled && !pollingDialog.hasShown) {
      // 폴링이 활성화된 상태로 진입한 경우
      setPollingDialog({
        isOpen: true,
        hasShown: true,
      });
    }
  }, [pollingStatus, pollingLoading, pollingDialog.hasShown]);

  // 폴링 상태 변경 감지 (진입 후)
  useEffect(() => {
    if (!pollingLoading && pollingStatus?.pollingEnabled && pollingDialog.hasShown) {
      // 폴링 상태가 변경되어 활성화된 경우
      setPollingDialog(prev => ({
        ...prev,
        isOpen: true,
      }));
    }
  }, [pollingStatus?.pollingEnabled, pollingLoading, pollingDialog.hasShown]);

  // 폴링 다이얼로그 액션 핸들러
  const handlePollingAction = useCallback(
    (action: 'redirect' | 'stop') => {
      switch (action) {
        case 'redirect':
          navigate('/dashboard', { replace: true });
          break;
        case 'stop':
          updatePollingMutation.mutate(false);
          setPollingDialog(prev => ({ ...prev, isOpen: false }));
          break;
      }
    },
    [navigate, updatePollingMutation]
  );

  const handlePollingDialogClose = useCallback(() => {
    setPollingDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 폴링 상태 prop 메모이제이션
  const pollingStatusProp = useMemo(
    () => (pollingStatus ? { pollingEnabled: pollingStatus.pollingEnabled } : { pollingEnabled: false }),
    [pollingStatus?.pollingEnabled]
  );

  // 권한이 없는 경우 접근 거부
  if (!canAccessHardwareControl) {
    return <AccessDeniedCard />;
  }

  // 폴링 로딩 중
  if (pollingLoading) {
    return <LoadingCard />;
  }

  // 에러가 있는 경우
  if (error) {
    return <ErrorCard error={error} onRetry={clearError} />;
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* 페이지 헤더 */}
      <PageHeader />

      {/* 폴링 활성화 경고 */}
      {isPollingActive && <PollingWarningAlert />}

      {/* 하드웨어 제어 탭 */}
      <HardwareControlTabs disabled={isPollingActive} onError={handleError} pollingStatus={pollingStatusProp} />

      {/* 사용 안내 */}
      <UsageGuideCard />

      {/* 폴링 다이얼로그 추가 */}
      <PollingDialog
        isOpen={pollingDialog.isOpen}
        title='폴링이 활성화되어 있습니다'
        message='현재 폴링이 실행 중입니다. 하드웨어 직접 제어는 폴링 중지 시에만 사용 가능합니다.'
        onAction={handlePollingAction}
        onClose={handlePollingDialogClose}
      />
    </div>
  );
});

HardwareControlPage.displayName = 'HardwareControlPage';

export default HardwareControlPage;
