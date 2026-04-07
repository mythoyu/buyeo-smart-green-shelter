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
  create(data: CreateClientDto): Promise<Client>;
  update(id: string, data: UpdateClientDto): Promise<Client | null>;
  delete(id: string): Promise<boolean>;
}
