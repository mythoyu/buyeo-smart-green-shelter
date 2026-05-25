import { Status, IStatus, IUnitStatus } from '../../models/schemas/StatusSchema';

import { IStatusRepository } from './interfaces/IStatusRepository';

export class MongoStatusRepository implements IStatusRepository {
  async upsertStatus(deviceId: string, status: number, units: IUnitStatus[]): Promise<IStatus> {
    const filter = { deviceId };
    const replacement = {
      deviceId,
      status,
      units,
      updatedAt: new Date(),
    };
    const options = { upsert: true, new: true };

    const result = (await Status.findOneAndReplace(filter, replacement, options)) as IStatus;

    return result;
  }

  async findStatusByDevice(deviceId: string): Promise<IStatus | null> {
    return await Status.findOne({ deviceId });
  }

  async findAllStatuses(): Promise<IStatus[]> {
    return await Status.find({});
  }

  async deleteStatus(deviceId: string): Promise<boolean> {
    const result = await Status.deleteOne({ deviceId });
    return result.deletedCount > 0;
  }
}
