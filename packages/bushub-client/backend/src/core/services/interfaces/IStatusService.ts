import { IStatus, IUnitStatus } from '../../../models/schemas/StatusSchema';

export interface IStatusService {
  upsertStatus(deviceId: string, status: number, units: IUnitStatus[]): Promise<IStatus>;
  findStatusByDevice(deviceId: string): Promise<IStatus | null>;
  findAllStatuses(): Promise<IStatus[]>;
  deleteStatus(deviceId: string): Promise<boolean>;
  setCommunicationError(): Promise<void>;
  setCommunicationErrorForDevice(deviceId: string, unitId: string): Promise<void>;
  clearCommunicationError(): Promise<void>;
  clearCommunicationErrorForDevice(deviceId: string, unitId: string): Promise<void>;
}
