import { useMutation, useQuery } from '@tanstack/react-query';

import { internalApi } from '../axiosInstance';

export interface PortAssignmentRowBase {
  deviceType: string;
  deviceId: string;
  deviceName: string;
  unitId: string;
  unitName: string;
  source: 'db' | 'file';
}

export interface DoAssignmentRow extends PortAssignmentRowBase {
  doPort: string | null;
}

export interface DiAssignmentRow extends PortAssignmentRowBase {
  diPort: string | null;
}

export interface PortAssignmentsResponse {
  clientId: string;
  pollingActive: boolean;
  doAssignments: DoAssignmentRow[];
  diAssignments: DiAssignmentRow[];
  doPortKeys: string[];
  diPortKeys: string[];
}

const fetchPortAssignments = async (clientId: string): Promise<PortAssignmentsResponse> => {
  const res = await internalApi.get(`/clients/${clientId}/port-assignments`);
  return res.data?.data as PortAssignmentsResponse;
};

const savePortAssignments = async (params: {
  clientId: string;
  doAssignments?: Array<{ deviceType: string; unitId: string; doPort: string }>;
  diAssignments?: Array<{ deviceType: string; unitId: string; diPort: string }>;
}): Promise<PortAssignmentsResponse> => {
  const res = await internalApi.put(`/clients/${params.clientId}/port-assignments`, {
    doAssignments: params.doAssignments ?? [],
    diAssignments: params.diAssignments ?? [],
  });
  return res.data?.data as PortAssignmentsResponse;
};

const resetPortAssignments = async (clientId: string) => {
  const res = await internalApi.post(`/clients/${clientId}/port-assignments/reset`);
  return res.data?.data as { clientId: string; doInserted: number; diInserted: number };
};

export const useGetPortAssignments = (clientId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: ['port-assignments', clientId],
    enabled: Boolean(clientId) && enabled,
    queryFn: () => fetchPortAssignments(clientId!),
  });

export const useSavePortAssignments = () =>
  useMutation({
    mutationFn: savePortAssignments,
  });

export const useResetPortAssignments = () =>
  useMutation({
    mutationFn: resetPortAssignments,
  });

export const DO_PORT_OPTIONS = [
  'DO1',
  'DO2',
  'DO3',
  'DO4',
  'DO5',
  'DO6',
  'DO7',
  'DO8',
  'DO9',
  'DO10',
  'DO11',
  'DO12',
  'DO13',
  'DO14',
  'DO15',
  'DO16',
] as const;

export const DI_PORT_OPTIONS = [
  'DI1',
  'DI2',
  'DI3',
  'DI4',
  'DI5',
  'DI6',
  'DI7',
  'DI8',
  'DI9',
  'DI10',
  'DI11',
  'DI12',
  'DI13',
  'DI14',
  'DI15',
  'DI16',
] as const;

export type DoPortOption = (typeof DO_PORT_OPTIONS)[number];
export type DiPortOption = (typeof DI_PORT_OPTIONS)[number];

export type DoAssignmentRowInput = Pick<DoAssignmentRow, 'deviceType' | 'unitId'> & { doPort: DoPortOption };
export type DiAssignmentRowInput = Pick<DiAssignmentRow, 'deviceType' | 'unitId'> & { diPort: DiPortOption };

