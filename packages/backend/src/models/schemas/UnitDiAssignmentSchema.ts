import mongoose, { Document, Schema } from 'mongoose';

import type { DiAssignableDeviceType, DiPortKey } from '../../data/portMapping/diPortTypes';

export interface IUnitDiAssignment extends Document {
  clientId: string;
  deviceType: DiAssignableDeviceType;
  unitId: string;
  diPort: DiPortKey;
  updatedBy?: string;
  updatedAt: Date;
  createdAt: Date;
}

const UnitDiAssignmentSchema = new Schema<IUnitDiAssignment>(
  {
    clientId: { type: String, required: true, index: true },
    deviceType: { type: String, required: true },
    unitId: { type: String, required: true },
    diPort: { type: String, required: true },
    updatedBy: { type: String, required: false },
  },
  {
    timestamps: true,
    collection: 'unitDiAssignments',
  },
);

UnitDiAssignmentSchema.index({ clientId: 1, deviceType: 1, unitId: 1 }, { unique: true });

export const UnitDiAssignment = mongoose.model<IUnitDiAssignment>(
  'UnitDiAssignment',
  UnitDiAssignmentSchema,
  'unitDiAssignments',
);

