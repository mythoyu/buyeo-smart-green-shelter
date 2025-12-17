import {
  Home,
  Settings,
  BarChart3,
  Users,
  Database,
  LogOut,
  MessageSquare,
  Menu,
  Bus,
  Activity,
  Cpu,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
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
import { getFormattedVersion } from '../../utils/version';
import { ErrorPanel } from '../common/ErrorPanel';
import { ProcessDialog } from '../common/ProcessDialog';
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

  // ✅ FAB 표시 상태 관리
  const [fabVisible, setFabVisible] = useState(true);
  const [shouldAnimate, setShouldAnimate] = useState(true);

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

  // 페이지 이동 시 FAB 애니메이션 재생
  useEffect(() => {
    setShouldAnimate(false);
    const timer = setTimeout(() => {
      setShouldAnimate(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

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
    { name: '로그 분석', label: '로그\n분석', href: '/log-analysis', icon: BarChart3 },
    { name: '시스템 설정', label: '시스템\n설정', href: '/system-settings', icon: Settings },
    { name: '시스템 분석', label: '시스템\n분석', href: '/system-monitoring', icon: Activity },
    { name: '사용자 관리', label: '사용자\n관리', href: '/users', icon: Users },
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
                <h3 className='font-bold text-lg'>{client?.name || '스마트 그린 쉼터'}</h3>
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
              <h1 className='text-lg font-bold'>{client?.name || '스마트 그린 쉼터'}</h1>
              <p className='text-xs text-muted-foreground'>{client?.location || '클라이언트'}</p>
            </div>
          </div>
        </div>

        {/* 오른쪽: 현재 시간 및 사용자 정보 */}
        <div className='flex items-center gap-3'>
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
                <div className='flex items-center gap-1.5'>
                  <User className='h-4 w-4 text-muted-foreground shrink-0' />
                  <span className='text-sm font-medium'>{user.name}</span>
                  <Badge variant='secondary' className='h-5 px-1.5 text-xs'>
                    {getRoleDisplayName(user.role)}
                  </Badge>
                </div>
              </>
            )}
          </div>

          {/* 모바일: 시간 및 사용자 정보 */}
          <div className='md:hidden flex items-center gap-2'>
            <div className='flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50'>
              <Clock className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
              <span className='text-xs font-medium tabular-nums'>{currentTime.time}</span>
            </div>
            {user && (
              <div className='flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50'>
                <User className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                <span className='text-xs font-medium'>{user.name}</span>
                <Badge variant='secondary' className='h-4 px-1.5 text-[10px]'>
                  {getRoleDisplayName(user.role)}
                </Badge>
              </div>
            )}
          </div>
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

      {/* 반응형 사이드바 - 헤더 밑에서 시작, 브라우저 하단까지 전체 채우기 */}
      <div
        className={`
          fixed top-16 bottom-0 left-0 z-50 w-20 transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          bg-card border-r border-gray-200 shadow-lg
          flex flex-col
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
                  className='whitespace-nowrap text-sm font-medium duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 w-16 h-16 flex flex-col gap-1 items-center justify-center rounded-lg transition-colors'
                  title={item.name}
                >
                  <Icon className='h-5 w-5 mb-0.5' aria-hidden='true' />
                  <span className='text-xs text-center leading-tight whitespace-pre-line'>{label}</span>
                </Button>
              );
            })}
          </div>

          {/* 하단 버전 정보 및 로그아웃 */}
          <div className='mt-auto pt-4 border-t flex flex-col items-center gap-2'>
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

      {/* 메인 콘텐츠 - 헤더 밑에서 시작 */}
      <div className={`pt-16 flex flex-col h-screen transition-all duration-300 ${sidebarOpen ? 'lg:ml-20' : ''}`}>
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

      {/* 플로팅 액션 버튼 (FAB) - 오른쪽 하단 */}
      <div
        className={`
          fixed right-4 z-[60] flex flex-col gap-3
          transition-all duration-300
          ${shouldAnimate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          ${import.meta.env.DEV ? 'bottom-20' : 'bottom-4'}
        `}
      >
        {/* 숨김 가능한 버튼들 */}
        <div
          className={`
            flex flex-col gap-3 transition-all duration-300
            ${
              fabVisible
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-4 pointer-events-none h-0 overflow-hidden'
            }
          `}
        >
          {/* 폴링 버튼 */}
          <Button
            className={`
              rounded-full shadow-lg w-14 h-14 flex flex-col items-center justify-center gap-0.5
              border-2 transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]
              ${
                pollingState?.pollingEnabled
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-700'
                  : 'bg-gray-400 hover:bg-gray-500 text-white border-gray-500'
              }
            `}
            disabled={pollingStateLoading || updatePollingStateMutation.isPending || pollingState?.applyInProgress}
            onClick={() => handlePollingToggle(!pollingState?.pollingEnabled)}
            title={pollingState?.pollingEnabled ? '폴링 ON' : '폴링 OFF'}
          >
            <Activity size={20} />
            <span className='text-[11px] font-medium'>{pollingState?.pollingEnabled ? 'ON' : 'OFF'}</span>
          </Button>

          {/* 에러 보기 버튼 */}
          <Button
            className={`
              rounded-full shadow-lg w-14 h-14 flex flex-col items-center justify-center gap-0.5 relative border-2 transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]
              ${
                errorPanelOpen
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 dark:border-yellow-700'
                  : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border-yellow-200 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800'
              }
            `}
            onClick={toggleErrorPanel}
            title={errorPanelOpen ? '에러 패널 닫기' : '에러 패널 열기'}
          >
            <AlertTriangle
              size={20}
              className={errorPanelOpen ? 'text-white' : 'text-yellow-700 dark:text-yellow-300'}
            />
            <span className='text-[11px] font-medium'>{errorPanelOpen ? 'ON' : 'OFF'}</span>
            {errorCount > 0 && (
              <span className='absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium'>
                {errorCount}
              </span>
            )}
          </Button>

          {/* 실시간 로그 버튼 */}
          <Button
            className={`
              rounded-full shadow-lg w-14 h-14 flex flex-col items-center justify-center gap-0.5 border-2 transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]
              ${
                isLogPanelOpen
                  ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 dark:border-blue-700'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
              }
            `}
            onClick={() => {
              console.log('[MainLayout] FAB 로그 버튼 클릭!');
              toggleLogPanel();
            }}
            title={isLogPanelOpen ? '로그 패널 닫기' : '로그 패널 열기'}
          >
            <MessageSquare size={20} className={isLogPanelOpen ? 'text-white' : 'text-blue-700 dark:text-blue-300'} />
            <span className='text-[11px] font-medium'>{isLogPanelOpen ? 'ON' : 'OFF'}</span>
          </Button>
        </div>

        {/* 숨김 토글 버튼 - 항상 표시 */}
        <Button
          size='icon'
          variant='ghost'
          className='rounded-full shadow-lg w-14 h-14 bg-muted hover:bg-muted/80 border-2 border-border transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]'
          onClick={() => setFabVisible(!fabVisible)}
          title={fabVisible ? 'FAB 숨기기' : 'FAB 보이기'}
        >
          {fabVisible ? <ChevronDown size={22} /> : <ChevronUp size={22} />}
        </Button>
      </div>
    </div>
  );
};

export default MainLayout;
