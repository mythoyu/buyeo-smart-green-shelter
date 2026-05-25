import { useQuery, useMutation } from '@tanstack/react-query';

import { internalApi } from '../axiosInstance';

// User 타입 정의
export interface User {
  id: string;
  username: string;
  name?: string;
  role: 'superuser' | 'user' | 'engineer' | 'ex-user';
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: 'superuser' | 'user' | 'engineer' | 'ex-user';
  apiKey?: string;
}

export interface UpdateUserRequest {
  username?: string;
  role?: 'superuser' | 'user' | 'engineer' | 'ex-user';
}

// API 함수들
const getUsers = async (): Promise<{ users: User[] }> => {
  const res = await internalApi.get('/users');
  console.log('getUsers res:', res.data);
  return { users: res.data.data || [] };
};

const createUser = async (data: CreateUserRequest): Promise<{ data: User }> => {
  const res = await internalApi.post('/users', data);
  return { data: res.data.data };
};

const updateUser = async ({
  userId,
  userData,
}: {
  userId: string;
  userData: UpdateUserRequest;
}): Promise<{ data: User }> => {
  const res = await internalApi.put(`/users/${userId}`, userData);
  return { data: res.data.data };
};

const deleteUser = async (userId: string): Promise<{ data: { success: boolean } }> => {
  const res = await internalApi.delete(`/users/${userId}`);
  return { data: { success: true } };
};

// React Query 훅들
export const useGetUsers = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: options?.enabled !== false,
  });

export const useCreateUser = () =>
  useMutation({
    mutationFn: createUser,
  });

export const useUpdateUser = () =>
  useMutation({
    mutationFn: updateUser,
  });

export const useDeleteUser = () =>
  useMutation({
    mutationFn: deleteUser,
  });
