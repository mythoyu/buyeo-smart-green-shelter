import mongoose, { Schema, Document } from 'mongoose';

export interface IUnitData {
  unitId: string;
  data: Record<string, any>;
}

export interface IData extends Document {
  clientId: string;
  deviceId: string;
  type: string;
  units: IUnitData[];
  updatedAt: Date;
}

const UnitDataSchema = new Schema<IUnitData>(
  {
    unitId: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const DataSchema = new Schema<IData>({
  clientId: { type: String, required: true, index: true },
  deviceId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  units: { type: [UnitDataSchema], required: true },
  updatedAt: { type: Date, default: Date.now },
});

export const Data = mongoose.model<IData>('Data', DataSchema, 'data');
