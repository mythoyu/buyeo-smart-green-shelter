import mongoose, { Schema, Document } from 'mongoose';

export interface IUnitStatus {
  unitId: string;
  status: number; // 0: 정상, 2: 통신에러
}

export interface IStatus extends Document {
  deviceId: string;
  status: number;
  units: IUnitStatus[];
  updatedAt: Date;
}

const UnitStatusSchema = new Schema<IUnitStatus>(
  {
    unitId: { type: String, required: true },
    status: { type: Number, required: true },
  },
  { _id: false },
);

const StatusSchema = new Schema<IStatus>({
  deviceId: { type: String, required: true, index: true },
  status: { type: Number, required: true },
  units: { type: [UnitStatusSchema], required: true },
  updatedAt: { type: Date, default: Date.now },
});

export const Status = mongoose.model<IStatus>('Status', StatusSchema, 'status');
