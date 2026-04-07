import mongoose, { Schema, Document } from 'mongoose';

export interface IUnitError {
  unitId: string;
  errorId: string;
  errorDesc: string;
  errorAt: Date;
}

export interface IError extends Document {
  deviceId: string;
  units: IUnitError[];
  updatedAt: Date;
}

const UnitErrorSchema = new Schema<IUnitError>(
  {
    unitId: { type: String, required: true },
    errorId: { type: String, required: true },
    errorDesc: { type: String, required: true },
    errorAt: { type: Date, required: true },
  },
  { _id: false },
);

const ErrorSchema = new Schema<IError>({
  deviceId: { type: String, required: true, index: true },
  units: { type: [UnitErrorSchema], required: true },
  updatedAt: { type: Date, default: Date.now },
});

export const Error = mongoose.model<IError>('Error', ErrorSchema, 'errors');
