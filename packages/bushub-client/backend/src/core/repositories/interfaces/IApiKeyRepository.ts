import { IApiKey } from '../../../models/schemas/ApiKeySchema';

export interface CreateApiKeyDto {
  username: string;
  type: 'internal' | 'external' | 'universal';
  permissions?: string[];
  userId?: string;
  companyId?: string;
  expiresAt?: Date;
}

export interface UpdateApiKeyDto {
  username?: string;
  type?: 'internal' | 'external' | 'universal';
  permissions?: string[];
  userId?: string;
  companyId?: string;
  status?: 'active' | 'inactive';
  expiresAt?: Date;
}

export interface IApiKeyRepository {
  findById(id: string): Promise<IApiKey | null>;
  findByKey(key: string): Promise<IApiKey | null>;
  findByUserId(userId: string): Promise<IApiKey[]>;
  findByUserIdAndStatus(userId: string, status: string): Promise<IApiKey | null>;
  findByUsernameAndStatus(username: string, status: string): Promise<IApiKey | null>;
  findAll(
    page?: number,
    limit?: number,
    type?: string,
    status?: string,
  ): Promise<{ apiKeys: IApiKey[]; total: number }>;
  findActiveByKey(key: string): Promise<IApiKey | null>;
  create(data: CreateApiKeyDto): Promise<IApiKey>;
  update(id: string, data: UpdateApiKeyDto): Promise<IApiKey | null>;
  delete(id: string): Promise<boolean>;
  loadActiveToMemory(): Promise<IApiKey[]>;
}
