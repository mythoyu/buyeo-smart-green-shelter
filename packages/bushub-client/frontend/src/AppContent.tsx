import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { ProtectedRoute } from './components/common/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './components/pages/DashboardPage';
import { useAuth } from './contexts/AuthContext';
import { useApi } from './hooks/useApi';
import { useEnvironmentLogger } from './hooks/useEnvironmentLogger';

// 동적 임포트로 큰 페이지들을 지연 로딩
const DeviceRegistrationPage = lazy(() => import('./components/pages/DeviceRegistrationPage'));
const LogAnalysisPage = lazy(() => import('./components/pages/LogAnalysisPage'));
const SystemSettingsPage = lazy(() => import('./components/pages/SystemSettingsPage'));
const SystemMonitoringPage = lazy(() => import('./components/pages/SystemMonitoringPage'));
const UserManagementPage = lazy(() => import('./components/pages/UserManagementPage'));
const ChangePasswordPage = lazy(() => import('./components/pages/ChangePasswordPage'));
const HardwareControlPage = lazy(() => import('./components/pages/HardwareControlPage'));
const LoginPage = lazy(() => import('./components/pages/LoginPage'));
const Logout = lazy(() => import('./components/pages/Logout'));

// 로딩 컴포넌트
const PageLoading = () => (
  <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'>
    <div className='text-center'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
      <p className='text-gray-600'>페이지를 로딩하는 중...</p>
    </div>
  </div>
);

// 페이지 이동 로그를 위한 컴포넌트
function PageLogger() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const timestamp = new Date().toISOString();
    const pageInfo = {
      timestamp,
      path: location.pathname,
      user: user?.name || 'unknown',
      role: user?.role || 'unknown',
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    };

    // 콘솔에 페이지 이동 로그 출력
    console.log('📄 페이지 이동:', {
      시간: timestamp,
      경로: location.pathname,
      사용자: pageInfo.user,
      권한: pageInfo.role,
    });

    // 페이지 이동 로그는 콘솔에만 출력 (서버 전송 제거)
  }, [location.pathname, user]);

  return null;
}

function AppContent() {
  const { isLoggedIn } = useAuth();
  const [showDeviceRegistration, setShowDeviceRegistration] = useState(false);

  // 환경 로거 훅 사용
  const { logEnvironment, logCustomInfo } = useEnvironmentLogger({
    enabled: true,
    verbose: false,
    tag: 'AppContent',
    includeExtraInfo: true,
  });

  // 추가 디버그 정보
  useEffect(() => {
    logCustomInfo({
      isLoggedIn,
      showDeviceRegistration,
      component: 'AppContent',
    });
  }, [isLoggedIn, showDeviceRegistration, logCustomInfo]);

  // 클라이언트 정보 조회
  const { data: clientInfo, isLoading: clientLoading } = useApi().client.info({
    enabled: isLoggedIn,
  });

  // 로그인 후 클라이언트 정보 확인
  useEffect(() => {
    if (isLoggedIn && !clientLoading) {
      // 클라이언트 정보가 없거나 devices가 비어있으면 장비등록 페이지 표시
      if (!clientInfo || !clientInfo.devices || clientInfo.devices.length === 0) {
        setShowDeviceRegistration(true);
      } else {
        setShowDeviceRegistration(false);
      }
    }
  }, [isLoggedIn, clientLoading, clientInfo]);

  // 로그아웃 후 세션/토큰이 없으면 로그인 폼으로
  useEffect(() => {
    if (!sessionStorage.getItem('accessToken')) {
      // AuthContext에서 처리하므로 여기서는 제거
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <Suspense fallback={<PageLoading />}>
        <LoginPage onLoginSuccess={() => {}} />
      </Suspense>
    );
  }

  // 클라이언트 정보 로딩 중
  if (clientLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>클라이언트 정보를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 클라이언트 정보가 없으면 장비등록 페이지를 전체화면으로 표시
  // Router는 항상 유지하고, 라우트 단에서 등록 필요 여부를 제어

  // 로그인 후: MainLayout + 라우터 구조
  return (
    <BrowserRouter>
      <PageLogger />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path='/' element={<Navigate to='/dashboard' />} />
          <Route
            path='/dashboard'
            element={
              <ProtectedRoute path='/dashboard' requiresClient>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/device-registration'
            element={
              <ProtectedRoute path='/device-registration'>
                <Suspense fallback={<PageLoading />}>
                  <DeviceRegistrationPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path='/log-analysis'
            element={
              <ProtectedRoute path='/log-analysis'>
                <Suspense fallback={<PageLoading />}>
                  <LogAnalysisPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path='/system-settings'
            element={
              <ProtectedRoute path='/system-settings' requiresClient={false}>
                <Suspense fallback={<PageLoading />}>
                  <SystemSettingsPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path='/system-monitoring'
            element={
              <ProtectedRoute path='/system-monitoring' requiresClient={false}>
                <Suspense fallback={<PageLoading />}>
                  <SystemMonitoringPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path='/users'
            element={
              <ProtectedRoute path='/users'>
                <Suspense fallback={<PageLoading />}>
                  <UserManagementPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path='/hardware-control'
            element={
              <ProtectedRoute path='/hardware-control' requiresClient>
                <Suspense fallback={<PageLoading />}>
                  <HardwareControlPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path='/change-password'
            element={
              <Suspense fallback={<PageLoading />}>
                <ChangePasswordPage />
              </Suspense>
            }
          />
          <Route
            path='/logout'
            element={
              <Suspense fallback={<PageLoading />}>
                <Logout />
              </Suspense>
            }
          />
          {/* 필요한 페이지 추가 */}
          <Route path='*' element={<Navigate to='/dashboard' />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppContent;
