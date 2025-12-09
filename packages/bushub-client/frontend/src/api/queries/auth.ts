import { useMutation } from '@tanstack/react-query';

import { sampleUserApiResponses } from '../../mock/sampleData';
import { authApi, internalApi } from '../axiosInstance';

interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      username: string;
      role: 'superuser' | 'user' | 'engineer' | 'ex-user';
      companyId?: string;
    };
    token: string; // API 키가 token 필드로 전송됨
  };
  message?: string;
}

interface UserData {
  username: string;
  password: string;
  role: 'superuser' | 'user' | 'engineer' | 'ex-user';
  companyId?: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const simulateDelay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const getSampleUsers = () => sampleUserApiResponses.map(r => r.data.user);

const changePassword = async ({ userId, passwordData }: { userId: string; passwordData: PasswordData }) => {
  const res = await internalApi.post(`/users/${userId}/change-password`, passwordData);
  return res.data.data;
};

const loginUser = async (credentials: LoginRequest): Promise<LoginResponse | undefined> => {
  try {
    const response = await authApi.post<LoginResponse>('/auth/login', credentials);
    console.log('🔍 로그인 응답:', response.data);
    if (response.data.success && response.data.data) {
      const { token } = response.data.data;
      sessionStorage.setItem('accessToken', token || '');
      sessionStorage.setItem('user', JSON.stringify(response.data.data.user));
      return response.data;
    }
    return response.data;
  } catch (error: unknown) {
    console.error('🔍 로그인 오류:', error);
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'data' in error.response
    ) {
      console.log('🔍 오류 응답:', error.response.data);
      return error.response.data as LoginResponse;
    }
    throw new Error('로그인 중 오류가 발생했습니다.');
  }
};

const logoutUser = async (): Promise<void> => {
  try {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
    await authApi.post('/auth/logout');
  } catch (error) {
    console.error('로그아웃 오류:', error);
  }
};

// react-query용 훅들 - 인증 관련만 유지
export const useChangePassword = () =>
  useMutation({
    mutationFn: changePassword,
  });
export const useLogin = (options?: {
  onSuccess?: (response: LoginResponse | undefined) => void;
  onError?: (error: Error) => void;
}) => {
  return useMutation({
    mutationFn: loginUser,
    ...(options?.onSuccess && { onSuccess: options.onSuccess }),
    ...(options?.onError && { onError: options.onError }),
  });
};
export const useLogout = () =>
  useMutation({
    mutationFn: logoutUser,
  });
