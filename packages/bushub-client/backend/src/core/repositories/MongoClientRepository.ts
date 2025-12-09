import { Client } from '../../models/Client';
import { Client as ClientSchema } from '../../models/schemas/ClientSchema';

import { IClientRepository, CreateClientDto, UpdateClientDto } from './interfaces/IClientRepository';

export class MongoClientRepository implements IClientRepository {
  async findById(id: string): Promise<Client | null> {
    const client = await ClientSchema.findOne({ id }).lean();
    if (!client) return null;

    return {
      _id: client._id?.toString(),
      id: client.id,
      type: client.type,
      region: client.region,
      city: client.city,
      name: client.name,
      location: client.location,
      latitude: client.latitude,
      longitude: client.longitude,
      status: client.status,
      updatedAt: client.updatedAt,
    } as Client;
  }

  async findAll(): Promise<Client[]> {
    const clients = await ClientSchema.find().lean();
    return clients.map(
      (client) =>
        ({
          _id: client._id?.toString(),
          id: client.id,
          type: client.type,
          region: client.region,
          city: client.city,
          name: client.name,
          location: client.location,
          latitude: client.latitude,
          longitude: client.longitude,
          status: client.status,
          updatedAt: client.updatedAt,
        } as Client),
    );
  }

  async create(data: CreateClientDto): Promise<Client> {
    const newClient = new ClientSchema(data);
    const savedClient = await newClient.save();

    return {
      _id: savedClient._id?.toString(),
      id: savedClient.id,
      type: savedClient.type,
      region: savedClient.region,
      city: savedClient.city,
      name: savedClient.name,
      location: savedClient.location,
      latitude: savedClient.latitude,
      longitude: savedClient.longitude,
      status: savedClient.status,
      updatedAt: savedClient.updatedAt,
    } as Client;
  }

  async update(id: string, data: UpdateClientDto): Promise<Client | null> {
    const updatedClient = await ClientSchema.findOneAndUpdate(
      { id },
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true },
    ).lean();

    if (!updatedClient) return null;

    return {
      _id: updatedClient._id?.toString(),
      id: updatedClient.id,
      type: updatedClient.type,
      region: updatedClient.region,
      name: updatedClient.name,
      location: updatedClient.location,
      latitude: updatedClient.latitude,
      longitude: updatedClient.longitude,
      status: updatedClient.status,
      updatedAt: updatedClient.updatedAt,
    } as Client;
  }

  async delete(id: string): Promise<boolean> {
    const result = await ClientSchema.deleteOne({ id });
    return result.deletedCount > 0;
  }
}
