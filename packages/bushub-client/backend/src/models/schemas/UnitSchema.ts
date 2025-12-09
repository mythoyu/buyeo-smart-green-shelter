import mongoose, { Schema, Document } from 'mongoose';

import { UnitValue } from '../../types';

export interface IUnit extends Document {
  unitId: string;
  deviceId: string;
  clientId: string;
  name: string;
  type: string;
  status: number; // 0: normal, 1: warning, 2: error
  data: Record<string, UnitValue>;
  updatedAt?: Date;
}

const UnitSchema = new Schema<IUnit>(
  {
    unitId: {
      type: String,
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    clientId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: false,
    },
    status: {
      type: Number,
      required: true,
      default: 0,
      enum: [0, 1, 2], // 0: normal, 1: warning, 2: error
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'units',
  },
);

// 복합 인덱스
UnitSchema.index({ clientId: 1, deviceId: 1 });
UnitSchema.index({ clientId: 1, status: 1 });
// clientId+deviceId+unitId 복합 unique 인덱스 추가
UnitSchema.index({ clientId: 1, deviceId: 1, unitId: 1 }, { unique: true });

export const Unit = mongoose.model<IUnit>('Unit', UnitSchema);
