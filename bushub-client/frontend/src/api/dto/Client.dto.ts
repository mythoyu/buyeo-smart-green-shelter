// 클라이언트 정보조회 응답 DTO
export interface ClientInfoDto {
  id: string;
  type: string;
  region: string;
  city: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  updatedAt?: string;
  devices: DeviceInfoDto[];
}

export interface DeviceInfoDto {
  id: string;
  name: string;
  type: string;
  units: UnitInfoDto[];
}

export interface UnitInfoDto {
  id: string;
  name: string;
}

// 클라이언트 상태조회 응답 DTO
export interface ClientStatusDto {
  id: string;
  devices: DeviceStatusDto[];
}

export interface DeviceStatusDto {
  id: string;
  status: number; // 0: 전체정상, 1: 일부정상, 2: 전체비정상
  units: UnitStatusDto[];
}

export interface UnitStatusDto {
  id: string;
  status: number; // 0: 정상, 2: 비정상
}

// 클라이언트 데이터조회 응답 DTO
export interface ClientDataDto {
  id: string;
  devices: DeviceDataDto[];
}

export interface DeviceDataDto {
  id: string;
  type: string;
  units: UnitDataDto[];
}

export interface UnitDataDto {
  id: string;
  data: Record<string, any>;
}

// 클라이언트 에러조회 응답 DTO
export interface ClientErrorDto {
  id: string;
  devices: DeviceErrorDto[];
}

export interface DeviceErrorDto {
  id: string;
  units: UnitErrorDto[];
}

export interface UnitErrorDto {
  id: string;
  errorId: string;
  errorDesc: string;
  errorAt: string;
}
