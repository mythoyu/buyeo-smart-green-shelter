import { Device as DeviceSchema, IDevice } from './schemas/DeviceSchema';

export interface Device {
  _id?: string;
  deviceId: string;
  clientId: string;
  name: string;
  type: string;
}

export class DeviceModel {
  async findByClientId(clientId: string): Promise<Device[]> {
    const devices = await DeviceSchema.find({ clientId }).lean();
    return devices.map(
      (doc: IDevice) =>
        ({
          _id: doc._id?.toString(),
          deviceId: doc.deviceId,
          clientId: doc.clientId,
          name: doc.name,
          type: doc.type,
        } as any),
    );
  }

  async findById(deviceId: string): Promise<Device | null> {
    const device = await DeviceSchema.findOne({ deviceId }).lean();
    if (!device) return null;

    return {
      _id: device._id?.toString(),
      deviceId: device.deviceId,
      clientId: device.clientId,
      name: device.name,
      type: device.type,
    } as any;
  }

  async findByIdWithUnits(deviceId: string): Promise<any> {
    const device = await DeviceSchema.findOne({ deviceId })
      .populate({
        path: 'units',
        select: 'unitId name type status data',
      })
      .lean();

    if (!device) return null;

    return {
      _id: device._id?.toString(),
      deviceId: device.deviceId,
      clientId: device.clientId,
      name: device.name,
      type: device.type,
      units: (device as any).units || [],
    };
  }

  async findAll(): Promise<Device[]> {
    const devices = await DeviceSchema.find().lean();
    return devices.map(
      (doc: IDevice) =>
        ({
          _id: doc._id?.toString(),
          deviceId: doc.deviceId,
          clientId: doc.clientId,
          name: doc.name,
          type: doc.type,
        } as any),
    );
  }

  async create(device: Omit<Device, '_id'>): Promise<Device> {
    const newDevice = new DeviceSchema(device);
    const savedDevice = await newDevice.save();

    return {
      _id: savedDevice._id?.toString(),
      deviceId: savedDevice.deviceId,
      clientId: savedDevice.clientId,
      name: savedDevice.name,
      type: savedDevice.type,
    } as any;
  }

  async update(deviceId: string, updates: Partial<Device>): Promise<Device | null> {
    const updatedDevice = await DeviceSchema.findOneAndUpdate(
      { deviceId },
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true },
    ).lean();

    if (!updatedDevice) return null;

    return {
      _id: updatedDevice._id?.toString(),
      deviceId: updatedDevice.deviceId,
      clientId: updatedDevice.clientId,
      name: updatedDevice.name,
      type: updatedDevice.type,
    } as any;
  }

  async delete(deviceId: string): Promise<boolean> {
    const result = await DeviceSchema.deleteOne({ deviceId });
    return result.deletedCount > 0;
  }
}
