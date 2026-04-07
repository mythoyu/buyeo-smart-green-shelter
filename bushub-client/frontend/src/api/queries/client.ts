import { useQuery, UseQueryResult, useMutation, UseQueryOptions } from '@tanstack/react-query';

import { internalApi } from '../axiosInstance';
import { ClientInfoDto, ClientStatusDto, ClientDataDto, ClientErrorDto } from '../dto';

const getClient = async (): Promise<ClientInfoDto> => {
  const res = await internalApi.get('/client');
  return res.data.data;
};

const getClientStatus = async (): Promise<ClientStatusDto> => {
  const res = await internalApi.get('/status');
  return res.data.data;
};

const getClientData = async (): Promise<ClientDataDto> => {
  const res = await internalApi.get('/data');
  return res.data.data;
};

const getClientErrors = async (): Promise<ClientErrorDto> => {
  const res = await internalApi.get('/errors');
  return res.data.data;
};

const getClients = async (): Promise<ClientInfoDto[]> => {
  const res = await internalApi.get('/clients');
  // API 응답 구조: { success: true, message: "...", data: { data: [...] } }
  return res.data.data.data || res.data.data || [];
};

const selectClient = async (clientId: string): Promise<{ client: ClientInfoDto; message: string }> => {
  const res = await internalApi.post('/client', { id: clientId });
  return res.data.data;
};

// React Query 옵션을 받을 수 있도록 개선 (Partial 사용)
export const useGetClient = (options?: Partial<UseQueryOptions<ClientInfoDto>>): UseQueryResult<ClientInfoDto> =>
  useQuery({
    queryKey: ['client'],
    queryFn: getClient,
    ...options,
  });

export const useGetClientStatus = (options?: Partial<UseQueryOptions<ClientStatusDto>>) =>
  useQuery({
    queryKey: ['clientStatus'],
    queryFn: getClientStatus,
    ...options,
  });

export const useGetClientData = (options?: Partial<UseQueryOptions<ClientDataDto>>) =>
  useQuery({
    queryKey: ['clientData'],
    queryFn: getClientData,
    ...options,
  });

export const useGetClientErrors = (options?: Partial<UseQueryOptions<ClientErrorDto>>) =>
  useQuery({
    queryKey: ['clientErrors'],
    queryFn: getClientErrors,
    ...options,
  });

export const useGetClients = (options?: Partial<UseQueryOptions<ClientInfoDto[]>>) =>
  useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
    ...options,
  });

export const useSelectClient = () => {
  return useMutation({
    mutationFn: selectClient,
  });
};
