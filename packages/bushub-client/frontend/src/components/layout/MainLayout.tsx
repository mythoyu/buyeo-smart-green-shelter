import {
  Home,
  Settings,
  BarChart3,
  Users,
  Database,
  User,
  LogOut,
  Crown,
  Wrench,
  Globe,
  MessageSquare,
  Menu,
  Bus,
  Activity,
  Cpu,
  AlertTriangle,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useGetClientErrors } from '../../api/queries/client';
import { useGetPollingState, useUpdatePollingState } from '../../api/queries/polling';
import { useAuth } from '../../contexts/AuthContext';
import { useLogContext } from '../../contexts/LogContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useLayoutData } from '../../hooks/useLayoutData';
import { useWebSocket } from '../../hooks/useWebSocket';
import { canAccessPage, getRoleDisplayName } from '../../lib/permissions';
import { getCurrentUTCTime } from '../../utils/format';
import { ErrorPanel } from '../common/ErrorPanel';
import { ProcessDialog } from '../common/ProcessDialog';
import VersionInfo from '../common/VersionInfo';
import { Card, CardContent } from '../ui';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface MainLayoutProps {
  children?: React.ReactNode;
}

// ProcessDialog 상태 타입 정의
interface ProcessDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  progress: number;
  status: 'processing' | 'completed' | 'error';
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // useIsMobile 훅 사용 (1024px 기준)
  const isMobile = useIsMobile(1024);

  // 데스크탑에서는 기본적으로 열린 상태, 모바일에서는 닫힌 상태
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // 클라이언트 사이드에서만 실행 (SSR 방지)
    if (typeof window !== 'undefined') {
      return !isMobile; // 모바일이 아니면 열린 상태
    }
    return false; // SSR 기본값
  });

  const { isAdmin, user } = useAuth();
  const { client } = useLayoutData();

  // 디버깅용 로그
  console.log('[MainLayout] isAdmin:', isAdmin);
  console.log('[MainLayout] user:', user);

  // React Query로 현재 모드 상태 관리 (제거됨)
  // const { data: currentModeStatus } = useGetCurrentModeStatus();

  // 폴링 상태 관리
  const { data: pollingState, isLoading: pollingStateLoading } = useGetPollingState();
  const updatePollingStateMutation = useUpdatePollingState();

  // ✅ 에러 관련 상태 및 훅
  const [errorPanelOpen, setErrorPanelOpen] = useState(false);
  const { data: clientErrorsData } = useGetClientErrors({
    staleTime: 0, // ✅ 항상 최신 데이터
    refetchInterval: 5000, // ✅ 5초마다 새로고침
    refetchOnWindowFocus: true, // ✅ 포커스 시 새로고침
  });

  // ✅ 에러 개수 계산
  const errorCount =
    clientErrorsData?.devices?.reduce((total, device) => {
      return total + (device.units?.length || 0);
    }, 0) || 0;

  const toggleErrorPanel = () => {
    setErrorPanelOpen(!errorPanelOpen);
  };

  // 로컬 상태는 UI 업데이트용으로만 사용 (제거됨)
  // const [currentMode, setCurrentMode] = useState<'auto' | 'manual' | 'mixed' | 'unknown'>('unknown');

  // ProcessDialog 상태 추가
  const [processDialog] = useState<ProcessDialogState>({
    isOpen: false,
    title: '',
    description: '',
    progress: 0,
    status: 'processing',
  });

  const { toggleLogPanel } = useLogContext();
  const location = useLocation();
  const navigate = useNavigate();

  // WebSocket 연결을 MainLayout에서 미리 설정
  const { addLog } = useLogContext();
  const {} = useWebSocket({
    onLog: message => {
      console.log('📝 로그 메시지 수신:', message);
      addLog(message);
    },
    onCommandStatus: message => {
      console.log('⚡ 명령 상태 메시지 수신:', message);
      addLog(message);
    },
    onConnect: () => {
      const timestamp = getCurrentUTCTime();
      const connectLog: any = {
        type: 'log' as const,
        level: 'info',
        service: 'websocket',
        message: 'WebSocket 연결이 성공적으로 설정되었습니다.',
        timestamp,
      };
      addLog(connectLog);
    },
    onDisconnect: (code?: number, reason?: string) => {
      const timestamp = getCurrentUTCTime();
      const disconnectLog: any = {
        type: 'log' as const,
        level: 'warn',
        service: 'websocket',
        message: `WebSocket 연결이 해제되었습니다. (코드: ${code}, 이유: ${reason || '알 수 없음'})`,
        timestamp,
      };
      addLog(disconnectLog);
    },
    onError: error => {
      const timestamp = new Date().toISOString();
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorLog: any = {
        type: 'log' as const,
        level: 'error',
        service: 'websocket',
        message: `WebSocket 오류: ${errorMessage}`,
        timestamp,
        data: error,
      };
      addLog(errorLog);
    },
  });

  // 바깥 클릭 시 드롭다운 닫기 (현재 사용하지 않음)
  useEffect(() => {
    function handleClickOutside() {
      // 현재 사용하지 않는 기능
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 화면 크기 변경 시 사이드바 상태 조정
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // React Query 데이터와 로컬 상태 동기화 (제거됨)
  // useEffect(() => {
  //   console.log('[MainLayout] currentModeStatus 변경:', currentModeStatus);
  //   if (currentModeStatus?.currentMode) {
  //     console.log('[MainLayout] 모드 설정:', currentModeStatus.currentMode);
  //     setCurrentMode(currentModeStatus.currentMode);
  //   }
  // }, [currentModeStatus]);

  const navigation = [
    { name: '대시보드', href: '/dashboard', icon: Home },
    { name: '현장설정', href: '/device-registration', icon: Database },
    { name: '로그분석', href: '/log-analysis', icon: BarChart3 },
    { name: '시스템설정', href: '/system-settings', icon: Settings },
    { name: '시스템모니터링', href: '/system-monitoring', icon: Activity },
    { name: '사용자관리', href: '/users', icon: Users },
    // 하드웨어 제어는 superuser, engineer만 접근 가능
    ...(user?.role === 'superuser' || user?.role === 'engineer'
      ? [{ name: '하드웨어제어', href: '/hardware-control', icon: Cpu }]
      : []),
  ].filter(item => canAccessPage(user?.role || '', item.href));
  const isActiveRoute = (href: string) => location.pathname === href;

  // 사용자 권한별 아이콘 반환 함수
  const getUserIcon = (role?: string, size: number = 20, colorClass = 'text-primary') => {
    switch (role) {
      case 'superuser':
        return <Crown size={size} className={colorClass} />;
      case 'engineer':
        return <Wrench size={size} className={colorClass} />;
      case 'user':
        return <User size={size} className={colorClass} />;
      case 'ex-user':
        return <Globe size={size} className={colorClass} />;
      default:
        return <User size={size} className={colorClass} />;
    }
  };

  // 사용자 권한별 라이트 배경색 반환 함수
  const getUserLightBgColor = (role?: string) => {
    switch (role) {
      case 'superuser':
        return 'bg-purple-100';
      case 'engineer':
        return 'bg-orange-100';
      case 'user':
        return 'bg-blue-100';
      case 'ex-user':
        return 'bg-green-100';
      default:
        return 'bg-blue-100';
    }
  };

  // 사용자 권한별 진한 아이콘 컬러 반환 함수
  const getUserIconColor = (role?: string) => {
    switch (role) {
      case 'superuser':
        return 'text-purple-600';
      case 'engineer':
        return 'text-orange-600';
      case 'user':
        return 'text-blue-600';
      case 'ex-user':
        return 'text-green-600';
      default:
        return 'text-blue-600';
    }
  };

  // 폴링 상태 변경 핸들러
  const handlePollingToggle = async (pollingEnabled: boolean) => {
    console.log(`[MainLayout] 폴링 스위치 클릭: ${pollingEnabled ? 'ON' : 'OFF'}`);
    try {
      console.log('[MainLayout] updatePollingStateMutation.mutateAsync 호출 시작');
      await updatePollingStateMutation.mutateAsync(pollingEnabled);
      console.log('[MainLayout] updatePollingStateMutation.mutateAsync 호출 완료');
    } catch (error) {
      console.error('폴링 상태 변경 실패:', error);
    }
  };

  return (
    <div className='min-h-screen bg-background'>
      {/* 헤더 */}
      <header className='fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-card shadow-sm border-b'>
        {/* 왼쪽: 네비게이션 버튼과 모바일 버스 아이콘 */}
        <div className='flex items-center gap-4'>
          {/* 메뉴 버튼 */}
          <Button onClick={() => setSidebarOpen(!sidebarOpen)} size='icon' variant='ghost'>
            <Menu size={20} />
          </Button>

          {/* 모바일: 버스 아이콘 (메뉴 버튼 바로 오른쪽) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant='ghost' size='icon' className='md:hidden'>
                <Bus className='h-6 w-6 text-primary' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-64 p-3' align='start'>
              <div className='text-center space-y-2'>
                <div className='flex items-center justify-center gap-2 mb-2'>
                  <Bus className='h-5 w-5 text-primary' />
                  <span className='text-sm font-medium text-muted-foreground'>클라이언트 정보</span>
                </div>
                <h3 className='font-bold text-lg'>{client?.name || '버스환승센터'}</h3>
                <p className='text-sm text-muted-foreground'>{client?.location || '클라이언트'}</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* 가운데: 데스크탑 버스 이름 표시 */}
        <div className='flex items-center gap-3 flex-1 justify-center'>
          {/* 데스크탑: 전체 정보 표시 */}
          <div className='hidden md:flex items-center gap-3'>
            <Bus className='h-6 w-6 text-primary' />
            <div className='text-center'>
              <h1 className='text-lg font-bold'>{client?.name || '버스환승센터'}</h1>
              <p className='text-xs text-muted-foreground'>{client?.location || '클라이언트'}</p>
            </div>
          </div>
        </div>

        {/* 오른쪽: 에러 버튼, 폴링 스위치, 실시간 로그 버튼 */}
        <div className='flex items-center space-x-2'>
          <div className='flex items-center gap-2 mr-2'>
            <span className='text-sm text-muted-foreground'>폴링</span>
            <Switch
              checked={pollingState?.pollingEnabled ?? false}
              disabled={pollingStateLoading || updatePollingStateMutation.isPending || pollingState?.applyInProgress}
              onCheckedChange={handlePollingToggle}
              className='data-[state=checked]:bg-green-600'
            />
            <span className='text-xs text-muted-foreground'>{pollingState?.pollingEnabled ? 'ON' : 'OFF'}</span>
          </div>
          {/* ✅ 에러 보기 버튼 */}
          <Button size='icon' variant='ghost' onClick={toggleErrorPanel} className='relative'>
            <AlertTriangle size={20} />
            {errorCount > 0 && (
              <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center'>
                {errorCount}
              </span>
            )}
          </Button>
          {/* 실시간 로그 버튼 */}
          <Button
            size='icon'
            variant='ghost'
            onClick={() => {
              console.log('[MainLayout] 헤더 로그 버튼 클릭!');
              toggleLogPanel();
            }}
          >
            <MessageSquare size={20} />
          </Button>
        </div>
      </header>

      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden'
          onClick={() => {
            console.log('오버레이 클릭됨 - 사이드바 닫기');
            setSidebarOpen(false);
          }}
        />
      )}

      {/* 반응형 사이드바 - 헤더 밑에서 시작 */}
      <div
        className={`
          fixed top-16 left-0 z-50 w-64 h-[calc(100vh-4rem)] transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          bg-card border-r border-gray-200 shadow-lg
        `}
      >
        {/* 네비게이션 메뉴 */}
        <nav className='p-4'>
          <div className='space-y-2'>
            {navigation.map(item => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);
              return (
                <Button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href);
                    // 모바일에서만 사이드바 닫기
                    if (isMobile) {
                      setSidebarOpen(false);
                    }
                  }}
                  variant={isActive ? 'default' : 'ghost'}
                  className='w-full justify-start'
                >
                  <Icon size={20} className='mr-3' />
                  {item.name}
                </Button>
              );
            })}
          </div>
        </nav>

        {/* 하단 사용자 정보 */}
        <div className='absolute bottom-0 left-0 right-0 p-4'>
          <Card>
            <CardContent className='flex items-center space-x-3'>
              <Avatar>
                <AvatarFallback className={`w-10 h-10 ${getUserLightBgColor(user?.role)}`}>
                  {getUserIcon(user?.role, 20, getUserIconColor(user?.role))}
                </AvatarFallback>
              </Avatar>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-foreground truncate'>{user?.name || '사용자'}</p>
                <p className='text-xs text-muted-foreground truncate'>{getRoleDisplayName(user?.role || 'user')}</p>
                <div className='mt-1'>
                  <VersionInfo />
                </div>
              </div>
              <Button onClick={() => navigate('/logout')} size='icon' variant='ghost'>
                <LogOut size={16} />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 메인 콘텐츠 - 헤더 밑에서 시작 */}
      <div className={`pt-16 flex flex-col h-screen transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        {/* 메인 콘텐츠 영역 */}
        <main className='flex-1 overflow-auto bg-background custom-scrollbar'>
          <div className='p-4'>{children || <Outlet />}</div>
        </main>
      </div>

      {/* ✅ 에러 패널 렌더링 */}
      <ErrorPanel isOpen={errorPanelOpen} onClose={() => setErrorPanelOpen(false)} errors={clientErrorsData} />

      {/* ProcessDialog 렌더링 */}
      <ProcessDialog
        isOpen={processDialog.isOpen}
        title={processDialog.title}
        description={processDialog.description}
        progress={processDialog.progress}
        status={processDialog.status}
      />
    </div>
  );
};

export default MainLayout;
