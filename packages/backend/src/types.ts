// Shared types used across backend

// Generic unit value used in logs, websocket payloads, and schemas
// Note: avoid recursive conditional types to prevent TS2589 with mongoose generics
export type UnitValue = string | number | boolean | null | undefined | any[] | Record<string, any>;

// API Key type used in auth/permission checks
export interface ApiKey {
  key: string;
  name?: string;
  type?: 'internal' | 'external' | 'universal';
  permissions?: string[];
  userId?: string;
  companyId?: string;
  status?: 'active' | 'inactive';
  expiresAt?: string | Date;
}

// Permission helper
export function hasPermission(apiKey: ApiKey, permission: string): boolean {
  if (!apiKey) return false;
  if (!apiKey.permissions || apiKey.permissions.length === 0) return false;
  return apiKey.permissions.includes(permission);
}

