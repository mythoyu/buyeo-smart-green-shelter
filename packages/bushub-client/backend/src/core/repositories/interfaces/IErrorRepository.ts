import { IError, IUnitError } from '../../../models/schemas/ErrorSchema';

export interface IErrorRepository {
  createError(deviceId: string, units: IUnitError[]): Promise<IError>;
  findErrorByDevice(deviceId: string): Promise<IError | null>;
  findAllErrors(): Promise<IError[]>;
  deleteAllErrorsByDevice(deviceId: string): Promise<boolean>;
}
