import crypto from 'crypto';

import { ApiKey as ApiKeySchema, IApiKey } from '../../models/schemas/ApiKeySchema';

import { IApiKeyRepository, CreateApiKeyDto, UpdateApiKeyDto } from './interfaces/IApiKeyRepository';

export class MongoApiKeyRepository implements IApiKeyRepository {
  async findById(id: string): Promise<IApiKey | null> {
    return await ApiKeySchema.findById(id);
  }

  async findByKey(key: string): Promise<IApiKey | null> {
    return await ApiKeySchema.findOne({ key });
  }

  async findAll(page = 1, limit = 10, type?: string, status?: string): Promise<{ apiKeys: IApiKey[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    const [apiKeys, total] = await Promise.all([
      ApiKeySchema.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      ApiKeySchema.countDocuments(query),
    ]);

    return { apiKeys, total };
  }

  async findActiveByKey(key: string): Promise<IApiKey | null> {
    return await ApiKeySchema.findOne({
      key,
      status: 'active',
    });
  }

  /**
   * 안전한 API 키 생성
   * 형식: bs_{type}_{random32hex}
   * 예시: bs_ext_a3f8b9c2d1e4f5a6b7c8d9e0f1a2b3c4
   */
  private generateApiKey(type: 'internal' | 'external' | 'universal'): string {
    const prefix = 'bs';
    const typePrefix = type.substring(0, 3); // ext, int, uni
    const randomPart = crypto.randomBytes(16).toString('hex'); // 32자리 hex
    return `${prefix}_${typePrefix}_${randomPart}`;
  }

  async create(data: CreateApiKeyDto): Promise<IApiKey> {
    // API 키가 제공되지 않으면 자동 생성 (접두사 + 타입 + 랜덤 문자열)
    const key = data.key || this.generateApiKey(data.type);

    const newApiKey = new ApiKeySchema({
      ...data,
      key,
      status: 'active' as const,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });

    return await newApiKey.save();
  }

  async update(id: string, data: UpdateApiKeyDto): Promise<IApiKey | null> {
    const updateData: any = { ...data };

    if (data.expiresAt) {
      updateData.expiresAt = new Date(data.expiresAt);
    }

    return await ApiKeySchema.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await ApiKeySchema.findByIdAndDelete(id);
    return !!result;
  }

  async loadActiveToMemory(): Promise<IApiKey[]> {
    return await ApiKeySchema.find({ status: 'active' });
  }

  async findByUserId(userId: string): Promise<IApiKey[]> {
    return await ApiKeySchema.find({ userId });
  }

  async findByUserIdAndStatus(userId: string, status: string): Promise<IApiKey | null> {
    return await ApiKeySchema.findOne({ userId, status });
  }

  async findByUsernameAndStatus(username: string, status: string): Promise<IApiKey | null> {
    return await ApiKeySchema.findOne({ username, status });
  }
}
