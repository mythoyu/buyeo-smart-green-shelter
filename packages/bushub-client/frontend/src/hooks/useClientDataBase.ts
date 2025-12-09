import { useMemo } from 'react';

import { DeviceDataDto, UnitDataDto, DeviceStatusDto, UnitStatusDto, DeviceInfoDto, UnitInfoDto } from '../api/dto';

import { useClientCatalog } from './useClientCatalog';

// 타입 정의 추가
interface DeviceCommand {
  key: string;
  name?: string;
  description?: string;
  type?: string;
  options?: Array<{ value: string | number; label: string }>;
  [key: string]: unknown;
}

interface DeviceSpec {
  commands?: DeviceCommand[];
  [key: string]: unknown;
}

interface DeviceStyle {
  [key: string]: unknown;
}

// 상태 정보가 추가된 디바이스 타입
interface DeviceWithStatus extends DeviceInfoDto {
  status?: number;
  units: (UnitInfoDto & { status?: number })[];
}

/**
 * 공통 데이터 병합 로직을 담당하는 훅
 * useClientOverview와 페이지별 전용 훅에서 공통으로 사용
 */
export const useClientDataBase = (clientInfo: any, clientStatus: any, clientData: any, clientErrors: any) => {
  // 정적 메타데이터 (스펙, 스타일)
  const { deviceSpecs, deviceStyles } = useClientCatalog();

  // 로딩 상태 통합
  const isLoading = useMemo(
    () => clientInfo.isLoading || clientStatus.isLoading || clientData.isLoading || clientErrors.isLoading,
    [clientInfo.isLoading, clientStatus.isLoading, clientData.isLoading, clientErrors.isLoading]
  );

  // 에러 상태 통합
  const error = useMemo(
    () => clientInfo.error || clientStatus.error || clientData.error || clientErrors.error,
    [clientInfo.error, clientStatus.error, clientData.error, clientErrors.error]
  );

  // 실제 디바이스 데이터와 메타데이터 병합
  const mergedDevices = useMemo(() => {
    // 디버깅을 위한 로그
    console.log('useClientDataBase Debug:', {
      clientData: clientData.data,
      deviceSpecs,
      deviceStyles,
      clientDataDevices: clientData.data?.devices,
      clientInfoDevices: clientInfo.data?.devices,
      externalswDevices: clientData.data?.devices?.filter((d: DeviceDataDto) => d.type === 'externalsw'),
      externalswInfoDevices: clientInfo.data?.devices?.filter((d: DeviceInfoDto) => d.type === 'externalsw'),
    });

    // clientInfo에서 디바이스 정보를 우선 사용 (name 속성이 있음)
    const devicesToProcess =
      clientInfo.data && Array.isArray(clientInfo.data.devices) && clientInfo.data.devices.length > 0
        ? clientInfo.data.devices
        : clientData.data && Array.isArray(clientData.data.devices) && clientData.data.devices.length > 0
        ? clientData.data.devices
        : [];

    if (!devicesToProcess.length) {
      console.log('useClientDataBase: 디바이스 정보 없음');
      return [];
    }

    // deviceSpecs나 deviceStyles가 없어도 기본 정보는 반환
    if (!deviceSpecs || !deviceStyles) {
      console.log('useClientDataBase: 메타데이터 없음, 기본 정보만 반환', {
        hasDeviceSpecs: !!deviceSpecs,
        hasDeviceStyles: !!deviceStyles,
      });
      return devicesToProcess.map((device: DeviceDataDto | DeviceInfoDto) => ({
        ...device,
        spec: {},
        style: {},
        units:
          device.units?.map((unit: UnitDataDto | UnitInfoDto) => ({
            ...unit,
            spec: {},
            style: {},
          })) || [],
      }));
    }

    return devicesToProcess.map((device: DeviceDataDto | DeviceInfoDto) => {
      // 카탈로그에서 해당 디바이스 타입의 메타데이터 찾기
      const deviceSpec = deviceSpecs[device.type] as DeviceSpec;
      const deviceStyle = deviceStyles[device.type] as DeviceStyle;

      // clientData에서 해당 디바이스의 데이터 찾기
      const dataDevice = clientData.data?.devices?.find((d: DeviceDataDto) => d.id === device.id);

      // 유닛 데이터와 메타데이터 병합
      const mergedUnits =
        device.units?.map((unit: UnitDataDto | UnitInfoDto) => {
          // 디바이스 메타데이터에서 해당 유닛 타입의 스펙 찾기
          const unitSpec = deviceSpec?.commands?.find(cmd => cmd.key === unit.id) || {};

          // clientData에서 해당 유닛의 데이터 찾기
          const dataUnit = dataDevice?.units?.find((u: UnitDataDto) => u.id === unit.id);

          return {
            ...unit,
            spec: unitSpec,
            style: deviceStyle,
            // clientData의 실제 데이터가 있으면 사용, 없으면 기본값
            currentValue: dataUnit?.data?.currentValue ?? ('data' in unit ? unit.data?.currentValue : undefined),
            targetValue: dataUnit?.data?.targetValue ?? ('data' in unit ? unit.data?.targetValue : undefined),
            status: dataUnit?.data?.status ?? ('data' in unit ? unit.data?.status : undefined),
            // data 필드를 제대로 전달
            data: dataUnit?.data ?? ('data' in unit ? unit.data : undefined),
          };
        }) || [];

      return {
        ...device,
        spec: deviceSpec,
        style: deviceStyle,
        units: mergedUnits,
      };
    });
  }, [clientInfo.data, clientData.data, deviceSpecs, deviceStyles]) as DeviceInfoDto[];

  // 상태 데이터와 병합
  const devicesWithStatus = useMemo(() => {
    console.log('devicesWithStatus 재계산:', {
      mergedDevicesLength: mergedDevices?.length,
      clientStatusDevicesLength: clientStatus.data?.devices?.length,
      clientStatusData: clientStatus.data,
      // 디바이스 이름 정보 추가
      mergedDevicesNames:
        (mergedDevices as any[])?.map((d: any) => ({
          id: d.id,
          name: 'name' in d ? d.name : d.id,
          deviceId: 'deviceId' in d ? d.deviceId : d.id,
        })) || [],
    });

    if (!mergedDevices) {
      console.log('devicesWithStatus: mergedDevices 없음');
      return [];
    }

    // clientStatus가 없어도 mergedDevices는 반환
    if (!clientStatus.data?.devices) {
      console.log('useClientDataBase: 상태 정보 없음, mergedDevices 반환');
      return mergedDevices.map((device: DeviceInfoDto) => ({
        ...device,
        status: undefined,
        units:
          device.units?.map((unit: UnitInfoDto) => ({
            ...unit,
            status: undefined,
          })) || [],
      }));
    }

    // clientStatus가 있으면 상태 정보와 병합
    console.log('useClientDataBase: 상태 정보와 병합');
    const result: DeviceWithStatus[] = mergedDevices.map((device: DeviceInfoDto) => {
      const statusDevice = clientStatus.data.devices.find((d: DeviceStatusDto) => d.id === device.id);
      // status를 number 타입으로 변환하여 타입 안전성 보장
      const status = statusDevice?.status !== undefined ? Number(statusDevice.status) : undefined;
      const unitsWithStatus =
        device.units?.map((unit: UnitInfoDto) => {
          const statusUnit = statusDevice?.units?.find((u: UnitStatusDto) => u.id === unit.id);
          // statusUnit의 status를 number 타입으로 변환
          return statusUnit
            ? {
                ...unit,
                status: Number(statusUnit.status),
              }
            : unit;
        }) || [];
      return {
        ...device,
        status, // status를 명시적으로 추가 (number 타입)
        units: unitsWithStatus,
      };
    });

    console.log('devicesWithStatus 결과:', {
      resultLength: result?.length,
      resultNames:
        (result as any[])?.map((d: any) => ({
          id: d.id,
          name: 'name' in d ? d.name : d.id,
          deviceId: 'deviceId' in d ? d.deviceId : d.id,
        })) || [],
    });

    return result;
  }, [mergedDevices, clientStatus.data, clientStatus.dataUpdatedAt]);

  // 통합된 client 정보 생성 (clientInfo를 기본으로 하고 다른 정보들을 병합)
  const mergedClient = useMemo(() => {
    if (!clientInfo.data) return null;

    // clientInfo.data만 반환하여 name이 덮어쓰이지 않도록 함
    return clientInfo.data;
  }, [clientInfo.data]);

  return {
    // 통합된 client 정보 (name이 보존됨)
    client: mergedClient,

    // 개별 정보 (필요시 사용)
    clientInfo: clientInfo.data,
    clientStatus: clientStatus.data,
    clientData: clientData.data,
    clientErrors: clientErrors.data,

    // 카탈로그정보
    deviceSpecs,
    deviceStyles,

    // 병합된 디바이스 데이터 (실제 데이터 + 메타데이터 + 상태)
    devices: devicesWithStatus,

    // 로딩/에러 상태
    isLoading,
    error,

    // 개별 쿼리 상태 (필요시 사용)
    clientInfoLoading: clientInfo.isLoading,
    clientStatusLoading: clientStatus.isLoading,
    clientDataLoading: clientData.isLoading,
    clientErrorsLoading: clientErrors.isLoading,
  };
};
