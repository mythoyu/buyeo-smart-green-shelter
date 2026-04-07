import { Error, IError, IUnitError } from '../../models/schemas/ErrorSchema';

import { IErrorRepository } from './interfaces/IErrorRepository';

export class MongoErrorRepository implements IErrorRepository {
  async createError(deviceId: string, units: IUnitError[]): Promise<IError> {
    const error = new Error({
      deviceId,
      units,
      updatedAt: new Date(),
    });

    return await error.save();
  }

  async findErrorByDevice(deviceId: string): Promise<IError | null> {
    return await Error.findOne({ deviceId });
  }

  async findAllErrors(): Promise<IError[]> {
    return await Error.find({});
  }

  async deleteAllErrorsByDevice(deviceId: string): Promise<boolean> {
    const result = await Error.deleteOne({ deviceId });
    return result.deletedCount > 0;
  }
}
