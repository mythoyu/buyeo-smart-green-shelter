// MongoDB 스키마 기반 프론트엔드 타입 정의

export interface DashboardStats {
  totalDevices: number;
  activeDevices: number;
  totalUnits: number;
  normalUnits: number;
  errorUnits: number;
  recentErrors: number;
  recentCommands: number;
  deviceTypeStats: Array<{
    type: string;
    count: number;
    activeCount: number;
  }>;
  errorTrend: Array<{
    date: string;
    errorCount: number;
  }>;
}

export interface Client {
  _id?: string;
  id: string;
  type: string;
  region: string;
  city: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status?: 'active' | 'inactive' | 'maintenance';
  createdAt?: string;
  updatedAt?: string;
}

export interface Device {
  _id?: string;
  deviceId: string;
  clientId: string;
  categoryCode: string;
  name: string;
  type: string;
  location: string;
  description: string;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string;
  lastMaintenanceDate?: string;
  createdAt: string;
  updatedAt: string;
}

// 유닛 값 타입 정의
export type UnitValue = string | number | boolean | null;

export interface Unit {
  _id?: string;
  unitId: string;
  deviceId: string;
  clientId: string;
  name: string;
  type?: string;
  status: number; // 0: 정상, 2: 비정상
  currentValue: UnitValue;
  targetValue: UnitValue;
  minValue?: UnitValue;
  maxValue?: UnitValue;
  unit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  _id?: string;
  clientId: string;
  client: {
    name: string;
    id: string;
    description: string;
    location: string;
  };
  ntp: {
    enabled: boolean;
    server1: string;
    server2: string;
    timezone: string;
  };
  network: {
    dhcp: boolean;
    ip: string;
    subnet: string;
    gateway: string;
    dns1: string;
    dns2: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UnitStatusHistory {
  _id?: string;
  unitId: string;
  deviceId: string;
  clientId: string;
  status: number;
  value: UnitValue;
  timestamp: string;
  source: 'system' | 'manual' | 'api';
}

export interface UnitDataHistory {
  _id?: string;
  unitId: string;
  deviceId: string;
  clientId: string;
  deviceType: string;
  data: Record<string, UnitValue>;
  timestamp: string;
  source: 'sensor' | 'manual' | 'api';
}

export interface UnitError {
  _id?: string;
  unitId: string;
  deviceId: string;
  clientId: string;
  errorId: string;
  errorDesc: string;
  errorType: 'connection' | 'hardware' | 'software' | 'communication';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  errorAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

export interface Command {
  _id?: string;
  requestId: string;
  clientId: string;
  deviceId: string;
  unitId: string;
  action: string;
  value: UnitValue;
  status: 'waiting' | 'success' | 'fail'; // 'pending' → 'waiting'으로 변경
  requestedAt: string;
  finishedAt?: string;
  executedBy: 'api' | 'manual' | 'schedule';
  response?: string;
  errorMessage?: string;
  timeout: number;
  priority: number;
}

export interface ApiKey {
  _id?: string;
  id?: string;
  key: string;
  username: string;
  type: 'external' | 'internal' | 'universal';
  description: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'expired';
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

// 감사 로그 값 타입 정의
export type AuditValue = string | number | boolean | Record<string, unknown> | null;

export interface AuditLog {
  _id?: string;
  clientId: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  userIp: string;
  apiKey: string;
  details: {
    oldValue?: AuditValue;
    newValue?: AuditValue;
  };
  timestamp: string;
  success: boolean;
  httpStatus: number;
  responseTime: number;
}
