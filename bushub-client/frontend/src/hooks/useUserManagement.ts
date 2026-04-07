// database.ts의 ApiKey 타입 사용
import type { ApiKey as DatabaseApiKey } from '../types/database';

// 타입 정의
export interface User {
  id: string;
  username: string;
  name?: string;
  role: 'superuser' | 'user' | 'engineer' | 'ex-user';
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: 'superuser' | 'user' | 'engineer' | 'ex-user';
  apiKey?: string;
}

export interface UpdateUserRequest {
  username?: string;
  role?: 'superuser' | 'user' | 'engineer' | 'ex-user';
  apiKey?: string;
}

// database.ts의 ApiKey 타입을 사용
export type ApiKey = DatabaseApiKey;

export interface CreateApiKeyRequest {
  type: 'internal' | 'external';
  description: string;
}
