import { IStatus, IUnitStatus } from '../../../models/schemas/StatusSchema';

export interface IStatusRepository {
  upsertStatus(deviceId: string, status: number, units: IUnitStatus[]): Promise<IStatus>;
  findStatusByDevice(deviceId: string): Promise<IStatus | null>;
  findAllStatuses(): Promise<IStatus[]>;
  deleteStatus(deviceId: string): Promise<boolean>;
}
