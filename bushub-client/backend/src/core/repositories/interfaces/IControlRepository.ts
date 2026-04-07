import { ICommandLog } from '../../../models/schemas/CommandLogSchema';

export interface CreateCommandLogDto {
  deviceId: string;
  unitId: string;
  action: string;
  value: any;
  status?: 'waiting' | 'success' | 'fail';
}

export interface UpdateCommandLogDto {
  status?: 'waiting' | 'success' | 'fail';
  finishedAt?: Date;
  error?: string;
  result?: any;
  value?: any;
}

export interface IControlRepository {
  createCommandLog(data: CreateCommandLogDto): Promise<ICommandLog>;
  updateCommandLog(id: string, data: UpdateCommandLogDto): Promise<ICommandLog | null>;
  findCommandLogById(id: string): Promise<ICommandLog | null>;
  findCommandLogsByDevice(deviceId: string, unitId?: string): Promise<ICommandLog[]>;
  findCommandLogsByStatus(status: 'waiting' | 'success' | 'fail'): Promise<ICommandLog[]>;
  findCommandLogByAction(deviceId: string, unitId: string, action: string): Promise<ICommandLog | null>;
}
