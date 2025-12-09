// HTTP_API_SPEC.md 명세 기반 Client DTO 및 변환 함수
export interface UnitSummaryDTO {
  id: string;
  name: string;
}

export interface DeviceSummaryDTO {
  id: string;
  name: string;
  type: string;
  units: UnitSummaryDTO[];
}

export interface ClientResponseDTO {
  id: string;
  type: string;
  region: string;
  city: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  devices: DeviceSummaryDTO[];
}

export function toUnitSummaryDTO(unit: Record<string, unknown>): UnitSummaryDTO {
  return {
    id: (unit.unitId || unit.id) as string,
    name: unit.name as string,
  };
}

export function toDeviceSummaryDTO(device: Record<string, unknown>): DeviceSummaryDTO {
  return {
    id: (device.deviceId || device.id) as string,
    name: device.name as string,
    type: device.type as string,
    units: ((device.units || []) as Record<string, unknown>[]).map(toUnitSummaryDTO),
  };
}

export function toClientResponseDTO(client: Record<string, unknown>): ClientResponseDTO {
  return {
    id: (client.clientId || client.id) as string,
    type: client.type as string,
    region: client.region as string,
    city: client.city as string,
    name: client.name as string,
    location: client.location as string,
    latitude: client.latitude as number,
    longitude: client.longitude as number,
    updatedAt: client.updatedAt instanceof Date ? client.updatedAt.toISOString() : (client.updatedAt as string),
    devices: ((client.devices || []) as Record<string, unknown>[]).map(toDeviceSummaryDTO),
  };
}
