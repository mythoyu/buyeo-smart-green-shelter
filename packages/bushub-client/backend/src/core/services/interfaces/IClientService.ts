import { Client } from '../../../models/Client';
import { CreateClientDto, UpdateClientDto } from '../../repositories/interfaces/IClientRepository';

export interface ClientInfoDto {
  id: string;
  type: string;
  region: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  devices: Record<string, unknown>[]; // 장비 정보는 별도 조회
}

export interface IClientService {
  getClientInfo(clientId: string): Promise<ClientInfoDto>;
  getFirstClient(): Promise<Client | null>;
  updateClient(clientId: string, updates: UpdateClientDto): Promise<Client>;
  createClient(clientData: CreateClientDto): Promise<Client>;
}
