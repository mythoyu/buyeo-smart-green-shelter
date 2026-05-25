import mongoose, { Document, Schema } from 'mongoose';

import type { DoAssignableDeviceType, DoPortKey } from '../../data/portMapping/doPortTypes';

export interface IUnitDoAssignment extends Document {
  clientId: string;
  deviceType: DoAssignableDeviceType;
  unitId: string;
  doPort: DoPortKey;
  updatedBy?: string;
  updatedAt: Date;
  createdAt: Date;
}

const UnitDoAssignmentSchema = new Schema<IUnitDoAssignment>(
  {
    clientId: { type: String, required: true, index: true },
    deviceType: { type: String, required: true },
    unitId: { type: String, required: true },
    doPort: { type: String, required: true },
    updatedBy: { type: String, required: false },
  },
  {
    timestamps: true,
    collection: 'unitDoAssignments',
  },
);

UnitDoAssignmentSchema.index({ clientId: 1, deviceType: 1, unitId: 1 }, { unique: true });

export const UnitDoAssignment = mongoose.model<IUnitDoAssignment>(
  'UnitDoAssignment',
  UnitDoAssignmentSchema,
  'unitDoAssignments',
);

