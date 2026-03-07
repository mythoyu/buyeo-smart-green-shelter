import {
  Home,
  Settings,
  BarChart3,
  Users,
  Database,
  LogOut,
  MessageSquare,
  Menu,
  Leaf,
  Activity,
  Cpu,
  AlertTriangle,
  Info,
  Clock,
  User,
  Train,
  MapPin,
  UserCheck,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useGetClientErrors } from '../../api/queries/client';
import { useGetPollingState, useUpdatePollingState } from '../../api/queries/polling';
import { useAuth } from '../../contexts/AuthContext';
import { useLogContext } from '../../contexts/LogContext';
import { useRightSidebar } from '../../contexts/RightSidebarContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useLayoutData } from '../../hooks/useLayoutData';
import { useWebSocket } from '../../hooks/useWebSocket';
import { canAccessPage, getRoleDisplayName } from '../../lib/permissions';
import { getCurrentUTCTime } from '../../utils/format';
import { getFormattedVersion } from '../../utils/version';
import { ErrorPanel } from '../common/ErrorPanel';
import { ProcessDialog } from '../common/ProcessDialog';
import { RightSidebar } from './RightSidebar';
import { BottomNavigation } from './BottomNavigation';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

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

  // 오른쪽 사이드바 (숨기지 않음, 모바일에서만 오버레이 토글용)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return true; // 기본 표시
    }
    return true;
  });

  const { user } = useAuth();
  const { client } = useLayoutData();
  const { resolvedTheme, setTheme } = useTheme();

  // 현장 타입에 따라 아이콘 반환
  const getClientIcon = () => {
    if (!client?.type) return <MapPin className='h-6 w-6 text-primary' />;

    if (client.type === 'sm-shelter') {
      return <Train className='h-6 w-6 text-primary' />;
    }
    if (client.type === 'sm-restplace') {
      return <Leaf className='h-6 w-6 text-primary' />;
    }
    return <MapPin className='h-6 w-6 text-primary' />; // 기본값
  };

  // 현장 타입에 따라 작은 아이콘 반환 (Popover 내부용)
  const getClientIconSmall = () => {
    if (!client?.type) return <MapPin className='h-5 w-5 text-primary' />;

    if (client.type === 'sm-shelter') {
      return <Train className='h-5 w-5 text-primary' />;
    }
    if (client.type === 'sm-restplace') {
      return <Leaf className='h-5 w-5 text-primary' />;
    }
    return <MapPin className='h-5 w-5 text-primary' />; // 기본값
  };

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

  const { toggleLogPanel, isLogPanelOpen } = useLogContext();
  const { content: rightSidebarContent } = useRightSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  // 모바일에서 좌우 사이드바 상호 배타적 처리
  useEffect(() => {
    if (isMobile) {
      if (sidebarOpen && rightSidebarOpen) {
        // 왼쪽이 열려있으면 오른쪽 닫기
        setRightSidebarOpen(false);
      }
    }
  }, [sidebarOpen, rightSidebarOpen, isMobile]);

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

  // 현재 시간 상태 관리
  const [currentTime, setCurrentTime] = useState<{ date: string; time: string }>({ date: '', time: '' });

  // 시간 업데이트 (1초마다)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateString = now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const timeString = now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false, // 24시간 형식
      });
      setCurrentTime({ date: dateString.replace(/\. /g, '.').replace(/\.$/, ''), time: timeString });
    };

    updateTime(); // 초기 업데이트
    const interval = setInterval(updateTime, 1000); // 1초마다 업데이트

    return () => clearInterval(interval);
  }, []);

  // React Query 데이터와 로컬 상태 동기화 (제거됨)
  // useEffect(() => {
  //   console.log('[MainLayout] currentModeStatus 변경:', currentModeStatus);
  //   if (currentModeStatus?.currentMode) {
  //     console.log('[MainLayout] 모드 설정:', currentModeStatus.currentMode);
  //     setCurrentMode(currentModeStatus.currentMode);
  //   }
  // }, [currentModeStatus]);

  const navigation = [
    { name: '대시보드', label: '대시\n보드', href: '/dashboard', icon: Home },
    { name: '현장 설정', label: '현장\n설정', href: '/device-registration', icon: Database },
    { name: '사용자 관리', label: '사용자\n관리', href: '/users', icon: Users },
    { name: '로그 분석', label: '로그\n분석', href: '/log-analysis', icon: BarChart3 },
    { name: '이용자 통계', label: '이용자\n통계', href: '/user-statistics', icon: UserCheck },
    { name: '시스템 설정', label: '시스템\n설정', href: '/system-settings', icon: Settings },
    { name: '시스템 분석', label: '시스템\n분석', href: '/system-monitoring', icon: Activity },
    // 하드웨어 제어는 superuser, engineer만 접근 가능
    ...(user?.role === 'superuser' || user?.role === 'engineer'
      ? [{ name: '직접 제어', label: '직접\n제어', href: '/hardware-control', icon: Cpu }]
      : []),
  ].filter(item => canAccessPage(user?.role || '', item.href));
  const isActiveRoute = (href: string) => location.pathname === href;

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
      <header className='fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-2 md:pl-0 md:pr-2 bg-card shadow-sm border-b border-border/50'>
        {/* 왼쪽: 햄버거(좌측 네비와 동일 폭 w-20) + 아이콘·현장 주소(pl-4) */}
        <div className='flex items-center min-w-0'>
          {/* 메뉴 버튼 - 데스크탑에서 좌측 네비와 동일 가로(w-20), 모바일에서는 숨김 (하단 네비 사용) */}
          <div className='hidden lg:flex items-center justify-center flex-shrink-0 w-20'>
            <Button onClick={() => setSidebarOpen(!sidebarOpen)} size='icon' variant='ghost'>
              <Menu size={20} />
            </Button>
          </div>

          {/* 모바일: 그린 쉼터 아이콘 (메뉴 버튼 바로 오른쪽) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant='ghost' size='icon' className='md:hidden'>
                {getClientIcon()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-64 p-3' align='start'>
              <div className='text-center space-y-2'>
                <div className='flex items-center justify-center gap-2 mb-2'>
                  {getClientIconSmall()}
                  <span className='text-sm font-medium text-muted-foreground'>클라이언트 정보</span>
                </div>
                <h3 className='font-bold text-lg'>{client?.name || '스마트 그린 쉼터'}</h3>
                <p className='text-sm text-muted-foreground'>{client?.location || '클라이언트'}</p>
              </div>
            </PopoverContent>
          </Popover>

          {/* 데스크탑: 아이콘 + 현장 주소 왼쪽 정렬, 햄버거와 pl-4 간격 */}
          <div className='hidden md:flex items-center gap-3 pl-4'>
            {getClientIcon()}
            <div>
              <h1 className='text-lg font-bold'>{client?.name || '스마트 그린 쉼터'}</h1>
              <p className='text-xs text-muted-foreground'>{client?.location || '클라이언트'}</p>
            </div>
          </div>
        </div>

        {/* 오른쪽: 현재 시간, 사용자 정보, FAB 버튼들 */}
        <div className='flex items-center gap-2 ml-auto'>
          {/* 현재 시간 및 사용자 정보 - 데스크탑 (1줄) */}
          <div className='hidden md:flex items-center gap-3 px-3 py-1.5 rounded-md bg-muted/50 border border-border/50'>
            <div className='flex items-center gap-1.5'>
              <Clock className='h-4 w-4 text-muted-foreground shrink-0' />
              <span className='text-sm font-medium tabular-nums'>
                {currentTime.date} {currentTime.time}
              </span>
            </div>
            {user && (
              <>
                <Separator orientation='vertical' className='h-4' />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant='ghost' size='sm' className='h-auto py-1'>
                      <User className='h-4 w-4 text-muted-foreground shrink-0' />
                      <span className='text-sm font-medium'>{user.name}</span>
                      <Badge variant='secondary' className='h-5 px-1.5 text-xs ml-1'>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-64 p-3' align='end'>
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2 mb-2'>
                        <User className='h-5 w-5 text-primary' />
                        <span className='text-sm font-medium text-muted-foreground'>사용자 정보</span>
                      </div>
                      <h3 className='font-bold text-lg'>{user.name}</h3>
                      <Badge variant='secondary'>{getRoleDisplayName(user.role)}</Badge>
                      {user.id && <p className='text-sm text-muted-foreground'>ID: {user.id}</p>}
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>

          {/* 모바일: 시간 및 사용자 정보 Popover */}
          <div className='md:hidden flex items-center gap-2'>
            <div className='flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50'>
              <Clock className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
              <span className='text-xs font-medium tabular-nums'>{currentTime.time}</span>
            </div>
            {user && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant='ghost' size='icon' className='h-8 w-8'>
                    <User className='h-4 w-4 text-primary' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-64 p-3' align='end'>
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2 mb-2'>
                      <User className='h-5 w-5 text-primary' />
                      <span className='text-sm font-medium text-muted-foreground'>사용자 정보</span>
                    </div>
                    <h3 className='font-bold text-lg'>{user.name}</h3>
                    <Badge variant='secondary'>{getRoleDisplayName(user.role)}</Badge>
                    {user.id && <p className='text-sm text-muted-foreground'>ID: {user.id}</p>}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* 라이트/다크 모드 전환 */}
          <Button
            variant='ghost'
            size='icon'
            className='h-9 w-9 shrink-0'
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            title={resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className='h-4 w-4 text-muted-foreground' />
            ) : (
              <Moon className='h-4 w-4 text-muted-foreground' />
            )}
          </Button>

          {/* FAB 버튼들 - 헤더에 통합 */}
          <div className='flex items-center gap-2'>
            {/* 폴링 버튼 */}
            <Button
              className={`
                rounded-lg shadow-sm w-10 h-10 flex items-center justify-center
                border transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]
                ${
                  pollingState?.pollingEnabled
                    ? 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white border-green-700 dark:border-green-500'
                    : 'bg-gray-400 hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500 text-white border-gray-500 dark:border-gray-500'
                }
              `}
              disabled={pollingStateLoading || updatePollingStateMutation.isPending || pollingState?.applyInProgress}
              onClick={() => handlePollingToggle(!pollingState?.pollingEnabled)}
              title={pollingState?.pollingEnabled ? '폴링 ON' : '폴링 OFF'}
            >
              <Activity size={18} />
            </Button>

            {/* 에러 보기 버튼 */}
            <Button
              className={`
                rounded-lg shadow-sm w-10 h-10 flex items-center justify-center relative border transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]
                ${
                  errorPanelOpen
                    ? 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-500 text-white border-yellow-600 dark:border-yellow-500'
                    : 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/50 dark:hover:bg-yellow-800/50 text-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700'
                }
              `}
              onClick={toggleErrorPanel}
              title={errorPanelOpen ? '에러 패널 닫기' : '에러 패널 열기'}
            >
              <AlertTriangle
                size={18}
                className={errorPanelOpen ? 'text-white' : 'text-yellow-700 dark:text-yellow-300'}
              />
              {errorCount > 0 && (
                <span className='absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium text-[10px]'>
                  {errorCount}
                </span>
              )}
            </Button>

            {/* 실시간 로그 버튼 */}
            <Button
              className={`
                rounded-lg shadow-sm w-10 h-10 flex items-center justify-center border transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]
                ${
                  isLogPanelOpen
                    ? 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white border-blue-600 dark:border-blue-500'
                    : 'bg-blue-50 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-blue-900 dark:text-gray-200 border-blue-200 dark:border-gray-600'
                }
              `}
              onClick={() => {
                console.log('[MainLayout] FAB 로그 버튼 클릭!');
                toggleLogPanel();
              }}
              title={isLogPanelOpen ? '로그 패널 닫기' : '로그 패널 열기'}
            >
              <MessageSquare size={18} className={isLogPanelOpen ? 'text-white' : 'text-blue-700 dark:text-gray-300'} />
            </Button>
          </div>
        </div>
      </header>

      {/* 좌측 사이드바 - 데스크탑에서만 표시 (모바일에서는 BottomNavigation 사용) */}
      <div
        className={`
          hidden lg:flex
          fixed top-16 bottom-0 left-0 z-50 w-20 transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          bg-card border-r border-gray-200 dark:border-gray-600 shadow-lg
          flex-col
        `}
      >
        {/* 네비게이션 메뉴 */}
        <nav className='flex-1 py-4 flex flex-col'>
          <div className='flex flex-col items-center gap-1'>
            {navigation.map(item => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);
              const label = (item as any).label ?? item.name;
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
                  className={`whitespace-nowrap text-sm font-medium duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 w-16 h-16 flex flex-col gap-1 items-center justify-center rounded-lg transition-colors ${
                    !isActive ? 'text-muted-foreground' : ''
                  }`}
                  title={item.name}
                >
                  <Icon className={`h-5 w-5 mb-0.5 ${!isActive ? 'text-muted-foreground' : ''}`} aria-hidden='true' />
                  <span
                    className={`text-xs text-center leading-tight whitespace-pre-line ${
                      !isActive ? 'text-muted-foreground' : ''
                    }`}
                  >
                    {label}
                  </span>
                </Button>
              );
            })}
          </div>

          {/* 하단 버전 정보 및 로그아웃 */}
          <div className='mt-auto pt-4 border-t border-border/50 flex flex-col items-center gap-2'>
            <div className='w-16 h-16 flex flex-col items-center justify-center text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-default'>
              <Info className='h-5 w-5 mb-0.5' aria-hidden='true' />
              <span className='text-center leading-tight whitespace-pre-line'>{getFormattedVersion()}</span>
            </div>
            <Button
              onClick={() => navigate('/logout')}
              variant='ghost'
              className='whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 w-16 h-16 flex flex-col gap-1 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-red-50 dark:hover:bg-red-950/20 hover:shadow-md hover:scale-105 text-red-600 hover:text-red-700 dark:hover:text-red-400'
              title='로그아웃'
            >
              <LogOut className='h-5 w-5 mb-0.5' aria-hidden='true' />
              <span className='text-xs text-center leading-tight whitespace-pre-line'>로그{'\n'}아웃</span>
            </Button>
          </div>
        </nav>
      </div>

      {/* 메인 콘텐츠 - 헤더 밑에서 시작, 모바일에서는 하단 네비 공간 확보 */}
      <div
        className={`pt-16 flex flex-col h-screen transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-20' : ''
        } lg:mr-20 ${isMobile ? 'pb-16' : ''}`}
      >
        {/* 메인 콘텐츠 영역 */}
        <main className='flex-1 overflow-auto bg-background custom-scrollbar'>
          <div className='p-4'>{children || <Outlet />}</div>
        </main>
      </div>

      {/* 오른쪽 사이드바 - 데스크탑에서만 표시 */}
      {!isMobile && (
        <RightSidebar
          isOpen={rightSidebarOpen}
          onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
          isMobile={isMobile}
        >
          {rightSidebarContent}
        </RightSidebar>
      )}

      {/* 하단 네비게이션 - 모바일에서만 표시 */}
      {isMobile && <BottomNavigation navigation={navigation} rightSidebarContent={rightSidebarContent} />}

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
