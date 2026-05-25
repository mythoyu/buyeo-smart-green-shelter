import React, { useRef } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { canAccessPage } from '../../lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ProtectedRouteProps {
  children: React.ReactNode;
  path: string;
  fallback?: React.ReactNode;
  requiresClient?: boolean;
}

import { Navigate, useNavigate } from 'react-router-dom';
import { useGetClient } from '../../api/queries/client';

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, path, fallback, requiresClient }) => {
  const { user } = useAuth();
  const { data: clientData, error: clientError } = useGetClient({ retry: false, refetchOnWindowFocus: false });
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  if (!user) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Card className='w-96'>
          <CardHeader>
            <CardTitle className='text-center text-red-600'>인증 필요</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-center text-muted-foreground'>로그인이 필요합니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canAccessPage(user.role, path)) {
    return (
      fallback || (
        <div className='min-h-screen flex items-center justify-center'>
          <Card className='w-96'>
            <CardHeader>
              <CardTitle className='text-center text-red-600'>접근 권한 없음</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-center text-muted-foreground'>
                이 페이지에 접근할 권한이 없습니다. (사용자 역할: {user.role}, 요청 경로: {path})
              </p>
            </CardContent>
          </Card>
        </div>
      )
    );
  }

  // 등록 필요 라우트 가드: 클라이언트 미등록 시 즉시 이동 (<Navigate>)
  const noClient = requiresClient ? !clientData || !clientData.id || !!clientError : false;
  if (requiresClient && noClient && path !== '/device-registration') {
    if (!redirectedRef.current) {
      redirectedRef.current = true;
    }
    return <Navigate to='/device-registration' replace state={{ from: path, reason: 'client_missing' }} />;
  }

  return <>{children}</>;
};
