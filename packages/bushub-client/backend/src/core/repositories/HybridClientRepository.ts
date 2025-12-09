import { Client } from '../../models/Client';

import { IClientRepository, CreateClientDto, UpdateClientDto } from './interfaces/IClientRepository';
import { MemoryClientRepository } from './MemoryClientRepository';
import { MongoClientRepository } from './MongoClientRepository';

export class HybridClientRepository implements IClientRepository {
  constructor(private memoryRepo: MemoryClientRepository, private mongoRepo: MongoClientRepository) {}

  async findById(id: string): Promise<Client | null> {
    // 먼저 메모리에서 조회
    let client = await this.memoryRepo.findById(id);

    // 메모리에 없으면 MongoDB에서 조회하고 메모리에 캐시
    if (!client) {
      client = await this.mongoRepo.findById(id);
      if (client) {
        await this.memoryRepo.create({
          id: client.id,
          type: client.type,
          region: client.region,
          city: client.city,
          name: client.name,
          location: client.location,
          latitude: client.latitude,
          longitude: client.longitude,
          status: client.status || 'active',
        });
      }
    }

    return client;
  }

  async findAll(): Promise<Client[]> {
    // 메모리에서 조회 (전체 데이터가 메모리에 있다고 가정)
    return this.memoryRepo.findAll();
  }

  async create(data: CreateClientDto): Promise<Client> {
    // 메모리와 MongoDB에 동시 생성
    const [memoryClient, mongoClient] = await Promise.all([this.memoryRepo.create(data), this.mongoRepo.create(data)]);

    return memoryClient;
  }

  async update(id: string, data: UpdateClientDto): Promise<Client | null> {
    // 메모리와 MongoDB에 동시 업데이트
    const [memoryResult, mongoResult] = await Promise.all([
      this.memoryRepo.update(id, data),
      this.mongoRepo.update(id, data),
    ]);

    return memoryResult;
  }

  async delete(id: string): Promise<boolean> {
    // 메모리와 MongoDB에서 동시 삭제
    const [memoryResult, mongoResult] = await Promise.all([this.memoryRepo.delete(id), this.mongoRepo.delete(id)]);

    return memoryResult && mongoResult;
  }
}
