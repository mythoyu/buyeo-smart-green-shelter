import { ILogger } from '../../shared/interfaces/ILogger';
import { IApiKeyRepository, CreateApiKeyDto, UpdateApiKeyDto } from '../repositories/interfaces/IApiKeyRepository';

import { IApiKeyService, ApiKeyResponseDto } from './interfaces/IApiKeyService';
import { IWebSocketService } from './interfaces/IWebSocketService';

// 메모리 기반 API 키 저장소
class ApiKeyMemoryStore {
  private static instance: ApiKeyMemoryStore;
  private apiKeyStore: Map<string, ApiKeyResponseDto> = new Map();

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): ApiKeyMemoryStore {
    if (!ApiKeyMemoryStore.instance) {
      ApiKeyMemoryStore.instance = new ApiKeyMemoryStore();
    }
    return ApiKeyMemoryStore.instance;
  }

  public setApiKey(key: string, apiKeyData: ApiKeyResponseDto | null): void {
    if (apiKeyData) {
      this.apiKeyStore.set(key, apiKeyData);
    } else {
      this.apiKeyStore.delete(key);
    }
  }

  public getApiKey(key: string): ApiKeyResponseDto | null {
    return this.apiKeyStore.get(key) || null;
  }

  public clearAll(): void {
    this.apiKeyStore.clear();
  }

  public getSize(): number {
    return this.apiKeyStore.size;
  }

  public validateApiKey(key: string): ApiKeyResponseDto | null {
    const apiKey = this.getApiKey(key);

    if (!apiKey) {
      return null;
    }

    // 만료일 체크
    if (apiKey.expiresAt && new Date() > new Date(apiKey.expiresAt)) {
      return null;
    }

    // 상태 체크
    if (apiKey.status !== 'active') {
      return null;
    }

    return apiKey;
  }
}

export class ApiKeyService implements IApiKeyService {
  private memoryStore = ApiKeyMemoryStore.getInstance();

  constructor(
    private apiKeyRepository: IApiKeyRepository,
    private _webSocketService?: IWebSocketService,
    private logger?: ILogger,
  ) {}

  private toApiKeyResponseDto(apiKey: any): ApiKeyResponseDto {
    return {
      id: apiKey._id?.toString() || apiKey.id,
      username: apiKey.username,
      key: apiKey.key,
      type: apiKey.type,
      permissions: apiKey.permissions || [],
      userId: apiKey.userId?.toString(),
      companyId: apiKey.companyId,
      status: apiKey.status,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    };
  }

  async createApiKey(apiKeyData: CreateApiKeyDto): Promise<ApiKeyResponseDto> {
    const newApiKey = await this.apiKeyRepository.create(apiKeyData);
    const responseDto = this.toApiKeyResponseDto(newApiKey);

    // 메모리에 새 API 키 추가
    this.memoryStore.setApiKey(newApiKey.key, responseDto);

    this.logger?.info(`API 키 생성 완료: ${newApiKey.username}`);

    return responseDto;
  }

  async getApiKeys(
    page = 1,
    limit = 10,
    type?: string,
    status?: string,
  ): Promise<{ apiKeys: ApiKeyResponseDto[]; total: number; page: number; totalPages: number }> {
    const { apiKeys, total } = await this.apiKeyRepository.findAll(page, limit, type, status);

    return {
      apiKeys: apiKeys.map(this.toApiKeyResponseDto),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getApiKeyById(id: string): Promise<ApiKeyResponseDto | null> {
    const apiKey = await this.apiKeyRepository.findById(id);
    return apiKey ? this.toApiKeyResponseDto(apiKey) : null;
  }

  async getApiKeyByKey(key: string): Promise<ApiKeyResponseDto | null> {
    const apiKey = await this.apiKeyRepository.findByKey(key);
    return apiKey ? this.toApiKeyResponseDto(apiKey) : null;
  }

  async updateApiKey(id: string, updates: UpdateApiKeyDto): Promise<ApiKeyResponseDto | null> {
    const updatedApiKey = await this.apiKeyRepository.update(id, updates);

    if (updatedApiKey) {
      const responseDto = this.toApiKeyResponseDto(updatedApiKey);

      // 메모리 업데이트
      this.memoryStore.setApiKey(updatedApiKey.key, responseDto);

      this.logger?.info(`API 키 업데이트 완료: ${updatedApiKey.key}`);

      return responseDto;
    }

    return null;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const apiKey = await this.apiKeyRepository.findById(id);
    if (!apiKey) {
      return false;
    }

    const result = await this.apiKeyRepository.delete(id);

    if (result) {
      // 메모리에서 제거
      this.memoryStore.setApiKey(apiKey.key, null);

      this.logger?.info(`API 키 삭제 완료: ${apiKey.key}`);
    }

    return result;
  }

  async validateApiKey(key: string): Promise<ApiKeyResponseDto | null> {
    const apiKey = await this.apiKeyRepository.findActiveByKey(key);

    if (!apiKey) {
      return null;
    }

    // 만료일 체크
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return null;
    }

    return this.toApiKeyResponseDto(apiKey);
  }

  async loadApiKeysToMemory(): Promise<void> {
    try {
      this.logger?.info('API 키를 메모리에 로드 중...');

      this.memoryStore.clearAll();
      const apiKeys = await this.apiKeyRepository.loadActiveToMemory();

      apiKeys.forEach((apiKey) => {
        const responseDto = this.toApiKeyResponseDto(apiKey);
        this.memoryStore.setApiKey(apiKey.key, responseDto);
      });

      this.logger?.info(`${apiKeys.length}개의 API 키를 메모리에 로드 완료`);
    } catch (error) {
      this.logger?.error('API 키 메모리 로드 실패');
      throw error;
    }
  }

  validateApiKeyFromMemory(key: string): ApiKeyResponseDto | null {
    return this.memoryStore.validateApiKey(key);
  }

  async findByUserIdAndStatus(userId: string, status: string): Promise<any> {
    try {
      const apiKey = await this.apiKeyRepository.findByUserIdAndStatus(userId, status);
      this.logger?.info('사용자 ID와 상태로 API 키 조회 완료');
      return apiKey;
    } catch (error) {
      this.logger?.error('사용자 ID와 상태로 API 키 조회 실패');
      throw error;
    }
  }

  async findByUsernameAndStatus(username: string, status: string): Promise<any> {
    try {
      const apiKey = await this.apiKeyRepository.findByUsernameAndStatus(username, status);
      this.logger?.info('사용자명과 상태로 API 키 조회 완료');
      return apiKey;
    } catch (error) {
      this.logger?.error('사용자명과 상태로 API 키 조회 실패');
      throw error;
    }
  }

  async getApiKeysByUserId(userId: string): Promise<ApiKeyResponseDto[]> {
    try {
      const apiKeys = await this.apiKeyRepository.findByUserId(userId);
      this.logger?.info(`사용자 ID ${userId}의 API 키 조회 완료: ${apiKeys.length}개`);
      return apiKeys.map(this.toApiKeyResponseDto);
    } catch (error) {
      this.logger?.error(`사용자 ID ${userId}의 API 키 조회 실패`);
      throw error;
    }
  }
}
