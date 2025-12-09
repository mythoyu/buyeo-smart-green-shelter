import { useQuery, useMutation } from '@tanstack/react-query';

import { ApiKey } from '../../types/database';
import { internalApi } from '../axiosInstance';

const getApiKeys = async (): Promise<{ apiKeys: ApiKey[] }> => {
  const res = await internalApi.get('/api-keys');
  console.log('getApiKeys res:', res.data.data);
  return res.data.data;
};

const createApiKey = async (data: {
  type: 'internal' | 'external';
  description?: string;
  createdBy?: string;
}): Promise<{ data: ApiKey }> => {
  const res = await internalApi.post('/api-keys', data);
  return res.data.data;
};

const deleteApiKey = async (key: string): Promise<{ data: { success: boolean } }> => {
  const res = await internalApi.delete(`/api-keys/${key}`);
  return res.data.data;
};

export const useGetApiKeys = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['apiKeys'],
    queryFn: getApiKeys,
    enabled: options?.enabled !== false,
  });
export const useCreateApiKey = () =>
  useMutation({
    mutationFn: createApiKey,
  });
export const useDeleteApiKey = () =>
  useMutation({
    mutationFn: deleteApiKey,
  });
