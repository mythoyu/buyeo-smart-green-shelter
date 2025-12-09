// HTTP_API_SPEC.md 명세 기반 Device 관련 DTO 및 변환 함수

// 1. 장비 상태조회 응답
export interface UnitStatusDTO {
  id: string;
  status: number;
}
export interface DeviceStatusResponseDTO {
  id: string;
  status: number;
  units: UnitStatusDTO[];
}

// 2. 장비 데이터조회 응답
export interface UnitDataDTO {
  id: string;
  data: Record<string, any>;
}
export interface DeviceDataResponseDTO {
  id: string;
  type: string;
  units: UnitDataDTO[];
}

// 3. 장비 에러조회 응답
export interface UnitErrorDTO {
  id: string;
  errorId: string;
  errorDesc: string;
  errorAt: string;
}
export interface DeviceErrorResponseDTO {
  id: string;
  units: UnitErrorDTO[];
}

// Device DTO 및 변환 함수
type DeviceStatus = 'active' | 'inactive' | 'maintenance' | 'error';

export interface DeviceRequestDTO {
  deviceId: string;
  clientId: string;
  name: string;
  type: string;
}

export interface DeviceResponseDTO {
  deviceId: string;
  clientId: string;
  name: string;
  type: string;
}

import { Device } from '../models/Device';

export function toDeviceResponseDTO(device: Device): DeviceResponseDTO {
  return {
    deviceId: device.deviceId,
    clientId: device.clientId,
    name: device.name,
    type: device.type,
  };
}
