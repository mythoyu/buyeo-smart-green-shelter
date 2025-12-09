// User 및 API Key 관리 DTO
import { UnitValue } from '../types';

export interface UserRequestDTO {
  username: string;
  password: string;
  role: 'superuser' | 'user' | 'engineer' | 'ex-user';
  companyId?: string;
}

export interface UserResponseDTO {
  id: string;
  username: string;
  role: 'superuser' | 'user' | 'engineer' | 'ex-user';
  companyId?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyRequestDTO {
  name: string;
  type: 'internal' | 'external' | 'universal';
  permissions: string[];
  companyId?: string;
  status?: 'active' | 'inactive';
  expiresAt?: string;
}

export interface ApiKeyResponseDTO {
  id: string;
  name: string;
  key: string;
  type: 'internal' | 'external' | 'universal';
  permissions: string[];
  companyId?: string | undefined;
  status: 'active' | 'inactive';
  createdAt: string;
  expiresAt?: string | undefined;
}

export interface ChangePasswordRequestDTO {
  currentPassword: string;
  newPassword: string;
}

export interface SystemRequestDTO {
  systemName: string;
  maintenanceMode: boolean;
  notificationSettings: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  dataRetentionDays: number;
  network?: Record<string, UnitValue>;
  ntp?: Record<string, UnitValue>;
  softap?: Record<string, UnitValue>;
  client?: Record<string, UnitValue>;
}

export interface SystemResponseDTO {
  id: string;
  systemName: string;
  maintenanceMode: boolean;
  notificationSettings: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  dataRetentionDays: number;
  network?: Record<string, UnitValue>;
  ntp?: Record<string, UnitValue>;
  softap?: Record<string, UnitValue>;
  client?: Record<string, UnitValue>;
  updatedAt: string;
}

// 변환 함수들
export function toUserResponseDTO(user: Record<string, unknown>): UserResponseDTO {
  return {
    id: (user._id?.toString() || user.id) as string,
    username: user.username as string,
    role: user.role as 'superuser' | 'user' | 'engineer' | 'ex-user',
    companyId: user.companyId as string | undefined,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : (user.createdAt as string),
    updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : (user.updatedAt as string),
  };
}

export function toApiKeyResponseDTO(apiKey: Record<string, unknown>): ApiKeyResponseDTO {
  return {
    id: (apiKey._id?.toString() || apiKey.id) as string,
    name: apiKey.name as string,
    key: apiKey.key as string,
    type: apiKey.type as 'internal' | 'external' | 'universal',
    permissions: (apiKey.permissions || []) as string[],
    companyId: apiKey.companyId as string | undefined,
    status: (apiKey.status || 'active') as 'active' | 'inactive',
    createdAt: apiKey.createdAt instanceof Date ? apiKey.createdAt.toISOString() : (apiKey.createdAt as string),
    expiresAt: apiKey.expiresAt instanceof Date ? apiKey.expiresAt.toISOString() : (apiKey.expiresAt as string),
  };
}

export function toSystemResponseDTO(settings: Record<string, unknown>): SystemResponseDTO {
  const notificationSettings = settings.notificationSettings as Record<string, unknown> | undefined;

  return {
    id: (settings._id?.toString() || settings.id) as string,
    systemName: settings.systemName as string,
    maintenanceMode: (settings.maintenanceMode || false) as boolean,
    notificationSettings: {
      email: (notificationSettings?.email || false) as boolean,
      sms: (notificationSettings?.sms || false) as boolean,
      push: (notificationSettings?.push || false) as boolean,
    },
    dataRetentionDays: (settings.dataRetentionDays || 30) as number,
    network: (settings.network || {}) as Record<string, UnitValue>,
    ntp: (settings.ntp || {}) as Record<string, UnitValue>,
    softap: (settings.softap || {}) as Record<string, UnitValue>,
    client: (settings.client || {}) as Record<string, UnitValue>,
    updatedAt: settings.updatedAt instanceof Date ? settings.updatedAt.toISOString() : (settings.updatedAt as string),
  };
}
