import { CreateApiKeyDto, UpdateApiKeyDto } from '../../repositories/interfaces/IApiKeyRepository';

export interface ApiKeyResponseDto {
  id: string;
  username: string;
  key: string;
  type: 'internal' | 'external' | 'universal';
  permissions: string[];
  userId?: string;
  companyId?: string;
  status: 'active' | 'inactive';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApiKeyService {
  createApiKey(apiKeyData: CreateApiKeyDto): Promise<ApiKeyResponseDto>;
  getApiKeys(
    page?: number,
    limit?: number,
    type?: string,
    status?: string,
  ): Promise<{
    apiKeys: ApiKeyResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  getApiKeyById(id: string): Promise<ApiKeyResponseDto | null>;
  getApiKeyByKey(key: string): Promise<ApiKeyResponseDto | null>;
  getApiKeysByUserId(userId: string): Promise<ApiKeyResponseDto[]>;
  findByUserIdAndStatus(userId: string, status: string): Promise<any>;
  findByUsernameAndStatus(username: string, status: string): Promise<any>;
  updateApiKey(id: string, updates: UpdateApiKeyDto): Promise<ApiKeyResponseDto | null>;
  deleteApiKey(id: string): Promise<boolean>;
  validateApiKey(key: string): Promise<ApiKeyResponseDto | null>;
  loadApiKeysToMemory(): Promise<void>;
  validateApiKeyFromMemory(key: string): ApiKeyResponseDto | null;
}
