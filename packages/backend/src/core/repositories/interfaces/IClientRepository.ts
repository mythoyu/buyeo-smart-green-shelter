import { Client } from '../../../models/Client';

export interface CreateClientDto {
  id: string;
  type: string;
  region: string;
  city: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status?: 'active' | 'inactive' | 'maintenance';
}

export interface UpdateClientDto {
  type?: string;
  region?: string;
  city?: string;
  name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  status?: 'active' | 'inactive' | 'maintenance';
}

export interface IClientRepository {
  findById(id: string): Promise<Client | null>;
  findAll(): Promise<Client[]>;
  /** GET /data 와 동일: createdAt 최신 1건 (활성 현장 클라이언트) */
  findActiveClient(): Promise<Client | null>;
  create(data: CreateClientDto): Promise<Client>;
  update(id: string, data: UpdateClientDto): Promise<Client | null>;
  delete(id: string): Promise<boolean>;
}
