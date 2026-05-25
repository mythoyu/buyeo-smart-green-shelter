import mongoose, { Schema, Document } from 'mongoose';

export interface IUnitData {
  unitId: string;
  data: Record<string, any>;
}

export interface IData extends Document {
  clientId: string;
  deviceId: string;
  type: string;
  /**
   * units 저장 구조:
   * - 레거시/일반 장비: IUnitData[] (배열)
   * - 피플카운터(d082): Record<unitId, IUnitData> (맵)
   * 두 형태를 모두 허용한다(점진적 전환).
   */
  units: IUnitData[] | Record<string, IUnitData>;
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
  units: { type: Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export const Data = mongoose.model<IData>('Data', DataSchema, 'data');
