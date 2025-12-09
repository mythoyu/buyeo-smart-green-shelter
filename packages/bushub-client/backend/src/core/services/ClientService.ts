import { Client } from '../../models/Client';
import { ILogger } from '../../shared/interfaces/ILogger';
import { HttpNotFoundError, HttpDatabaseError } from '../../shared/utils/responseHelper';
import { IClientRepository, CreateClientDto, UpdateClientDto } from '../repositories/interfaces/IClientRepository';

import { IClientService, ClientInfoDto } from './interfaces/IClientService';
import { IWebSocketService } from './interfaces/IWebSocketService';

export class ClientService implements IClientService {
  constructor(
    private clientRepository: IClientRepository,
    private _webSocketService?: IWebSocketService,
    private logger?: ILogger,
  ) {}

  async getClientInfo(clientId: string): Promise<ClientInfoDto> {
    const client = await this.clientRepository.findById(clientId);
    if (!client) {
      throw new HttpNotFoundError('클라이언트');
    }

    return {
      id: client.id,
      type: client.type,
      region: client.region,
      name: client.name,
      location: client.location,
      latitude: client.latitude,
      longitude: client.longitude,
      updatedAt: client.updatedAt.toISOString(),
      devices: [], // 장비 정보는 별도 조회
    };
  }

  async updateClient(clientId: string, updates: UpdateClientDto) {
    const updatedClient = await this.clientRepository.update(clientId, updates);
    if (!updatedClient) {
      throw new HttpDatabaseError('클라이언트 업데이트에 실패했습니다.');
    }
    return updatedClient;
  }

  async createClient(clientData: CreateClientDto) {
    return await this.clientRepository.create(clientData);
  }

  async getFirstClient(): Promise<Client | null> {
    try {
      const clients = await this.clientRepository.findAll();
      return clients.length > 0 ? clients[0] : null;
    } catch (error) {
      this.logger?.error('첫 번째 클라이언트 조회 실패');
      throw new HttpDatabaseError('클라이언트 조회 중 오류가 발생했습니다.');
    }
  }
}
