import { Client } from '../../models/Client';
import { MemoryMetrics } from '../utils/MemoryMetrics';

import { IClientRepository, CreateClientDto, UpdateClientDto } from './interfaces/IClientRepository';

export class MemoryClientRepository implements IClientRepository {
  private clients: Map<string, Client> = new Map();
  private metrics = MemoryMetrics.getInstance();

  async findById(id: string): Promise<Client | null> {
    const client = this.clients.get(id);
    if (client) {
      this.metrics.recordHit('MemoryClientRepository');
      return client;
    }
    this.metrics.recordMiss('MemoryClientRepository');
    return null;
  }

  async findAll(): Promise<Client[]> {
    const clients = Array.from(this.clients.values());
    this.metrics.recordHit('MemoryClientRepository');
    this.metrics.updateSize('MemoryClientRepository', this.clients.size);
    return clients;
  }

  async create(data: CreateClientDto): Promise<Client> {
    const client: Client = {
      _id: this.generateId(),
      id: data.id,
      type: data.type,
      region: data.region,
      city: data.city,
      name: data.name,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      status: data.status || 'active',
      updatedAt: new Date(),
    };

    this.clients.set(client.id, client);
    this.metrics.updateSize('MemoryClientRepository', this.clients.size);
    return client;
  }

  async update(id: string, data: UpdateClientDto): Promise<Client | null> {
    const existing = this.clients.get(id);
    if (!existing) return null;

    const updated: Client = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    this.clients.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.clients.delete(id);
    if (deleted) {
      this.metrics.updateSize('MemoryClientRepository', this.clients.size);
    }
    return deleted;
  }

  private generateId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
