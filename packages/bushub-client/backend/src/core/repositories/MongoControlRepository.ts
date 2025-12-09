import { CommandLog as CommandLogSchema, ICommandLog } from '../../models/schemas/CommandLogSchema';

import { IControlRepository, CreateCommandLogDto, UpdateCommandLogDto } from './interfaces/IControlRepository';

export class MongoControlRepository implements IControlRepository {
  async createCommandLog(data: CreateCommandLogDto): Promise<ICommandLog> {
    console.log(`🔍 MongoControlRepository.createCommandLog 호출:`, data);

    const commandLog = new CommandLogSchema({
      ...data,
      status: data.status || 'waiting', // 'pending' → 'waiting'으로 변경
      requestedAt: new Date(),
    });

    const savedLog = await commandLog.save();
    console.log(`🔍 CommandLog 생성 완료:`, {
      _id: savedLog._id,
      status: savedLog.status,
      deviceId: savedLog.deviceId,
      unitId: savedLog.unitId,
      action: savedLog.action,
    });

    return savedLog;
  }

  async updateCommandLog(id: string, data: UpdateCommandLogDto): Promise<ICommandLog | null> {
    console.log(`🔍 MongoControlRepository.updateCommandLog 호출:`, { id, data });

    const updatedLog = await CommandLogSchema.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true },
    );

    console.log(
      `🔍 CommandLog 업데이트 완료:`,
      updatedLog
        ? {
            _id: updatedLog._id,
            status: updatedLog.status,
            deviceId: updatedLog.deviceId,
            unitId: updatedLog.unitId,
            action: updatedLog.action,
          }
        : 'null',
    );

    return updatedLog;
  }

  async findCommandLogById(id: string): Promise<ICommandLog | null> {
    return await CommandLogSchema.findById(id);
  }

  async findCommandLogsByDevice(deviceId: string, unitId?: string): Promise<ICommandLog[]> {
    const query: any = { deviceId };
    if (unitId) {
      query.unitId = unitId;
    }
    return await CommandLogSchema.find(query).sort({ requestedAt: -1 });
  }

  async findCommandLogsByStatus(status: 'waiting' | 'success' | 'fail'): Promise<ICommandLog[]> {
    return await CommandLogSchema.find({ status }).sort({ requestedAt: -1 });
  }

  async findCommandLogByAction(deviceId: string, unitId: string, action: string): Promise<ICommandLog | null> {
    // 가장 최근의 해당 action을 가진 CommandLog 찾기
    return await CommandLogSchema.findOne({ deviceId, unitId, action }, {}, { sort: { requestedAt: -1 } });
  }
}
