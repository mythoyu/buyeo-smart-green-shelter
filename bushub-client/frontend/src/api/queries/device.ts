import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { internalApi } from '../axiosInstance';

interface ClientRegistrationData {
  id?: string;
  initialize: boolean;
}

interface DeviceInfoDto {
  id: string;
  name: string;
  type: string;
  status: number;
  units: UnitDto[];
}

interface UnitDto {
  id: string;
  name: string;
  type: string;
  status: number;
  config: Record<string, any>;
  modbus?: ModbusConfigDto;
}

interface ModbusConfigDto {
  slaveId: number;
  baudRate: number;
  port: string;
  deviceType: string;
  commands: any[];
}

interface UnitCommandRequestDto {
  action: string;
  value: any;
}

interface UnitBulkCommandRequestDto {
  action: string;
  value?: any;
}

interface UnitBulkCommandResponseDto {
  action: string;
  requestId: string;
}

interface UnitBulkCommandStatusDto {
  requestId: string;
  action: string;
  status: 'success' | 'fail' | 'pending';
  finishedAt?: string;
}

const getDevices = async (): Promise<DeviceInfoDto[]> => {
  const res = await internalApi.get('/devices');
  return res.data.data;
};

const getExternalDevices = async (apiKey: string): Promise<DeviceInfoDto[]> => {
  return internalApi
    .get('/devices', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })
    .then((res: { data: { data: DeviceInfoDto[] } }) => res.data.data);
};

const registerDevice = async (clientData: ClientRegistrationData): Promise<{ id: string }> => {
  const res = await internalApi.post('/client', clientData);
  return res.data.data;
};

const handleUnitCommand = async (
  params: UnitCommandRequestDto & { deviceId: string; unitId: string }
): Promise<boolean> => {
  try {
    // 단일 명령을 대량제어 형식으로 변환하여 /commands 엔드포인트 사용
    await internalApi.post(`/devices/${params.deviceId}/units/${params.unitId}/commands`, [
      {
        action: params.action,
        value: params.value,
      },
    ]);
    return true;
  } catch (e) {
    return false;
  }
};

// 특정 유닛 대량제어
const handleUnitBulkCommands = async (params: {
  deviceId: string;
  unitId: string;
  commands: UnitBulkCommandRequestDto[];
}): Promise<UnitBulkCommandResponseDto[]> => {
  try {
    const res = await internalApi.post(`/devices/${params.deviceId}/units/${params.unitId}/commands`, params.commands);
    // Backend wraps with { success, message, data }
    // data contains: [{ action, requestId, deviceName, unitName }]
    return res.data?.data ?? [];
  } catch (e) {
    console.error('Bulk command error:', e);
    throw e;
  }
};

// 특정 유닛 대량제어 상태조회
const getUnitBulkCommandStatus = async (params: {
  deviceId: string;
  unitId: string;
  requestIds: string[];
}): Promise<UnitBulkCommandStatusDto[]> => {
  try {
    const res = await internalApi.get(`/devices/${params.deviceId}/units/${params.unitId}/commands`, {
      params: { ids: params.requestIds.join(',') },
    });
    // Backend wraps with { success, message, data }
    return res.data?.data ?? [];
  } catch (e) {
    console.error('Bulk command status error:', e);
    throw e;
  }
};

// react-query용 훅들
export const useGetDevices = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['devices'],
    queryFn: getDevices,
    ...options,
  });

export const useGetExternalDevices = (apiKey: string) =>
  useQuery({
    queryKey: ['external-devices', apiKey],
    queryFn: () => getExternalDevices(apiKey),
  });

export const useRegisterDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

export const useSendUnitCommand = () =>
  useMutation({
    mutationFn: handleUnitCommand,
  });

export const useSendUnitBulkCommands = () =>
  useMutation({
    mutationFn: handleUnitBulkCommands,
  });

export const useGetUnitBulkCommandStatus = (
  deviceId: string,
  unitId: string,
  requestIds: string[],
  options?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: ['unit-bulk-command-status', deviceId, unitId, requestIds],
    queryFn: () => getUnitBulkCommandStatus({ deviceId, unitId, requestIds }),
    ...options,
  });

// Auto 모드 변경 API
const changeAutoMode = async (params: {
  deviceId: string;
  unitId: string;
  autoMode: boolean;
}): Promise<UnitBulkCommandResponseDto[]> => {
  try {
    const res = await internalApi.post(`/devices/${params.deviceId}/units/${params.unitId}/commands`, [
      {
        action: 'SET_AUTO',
        value: params.autoMode,
      },
    ]);
    return res.data;
  } catch (e) {
    console.error('Auto mode change error:', e);
    throw e;
  }
};

// Auto 모드 변경 훅
export const useChangeAutoMode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: changeAutoMode,
    onSuccess: (data, variables) => {
      console.log('Auto 모드 변경 성공:', data);
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['unit-bulk-command-status', variables.deviceId, variables.unitId] });
    },
    onError: error => {
      console.error('Auto 모드 변경 실패:', error);
    },
  });
};

// Action 실행을 위한 mutation 훅 추가
export const useExecuteDeviceAction = () => {
  return useMutation({
    mutationFn: async ({
      deviceId,
      unitId,
      action,
      value,
    }: {
      deviceId: string;
      unitId: string;
      action: string;
      value?: any;
    }) => {
      // 실제 API 호출 (현재는 임시로 성공 처리)
      console.log(`Action 실행: ${deviceId}/${unitId} - ${action} = ${value}`);

      // TODO: 실제 API 엔드포인트 구현
      // const response = await internalApi.post('/device/action', {
      //   deviceId,
      //   unitId,
      //   action,
      //   value,
      // });
      // return response.data;

      // 임시로 성공 응답 반환
      return { success: true, message: 'Action 실행 완료' };
    },
    onSuccess: (data, variables) => {
      console.log('Action 실행 성공:', { data, variables });
    },
    onError: (error, variables) => {
      console.error('Action 실행 실패:', { error, variables });
    },
  });
};
