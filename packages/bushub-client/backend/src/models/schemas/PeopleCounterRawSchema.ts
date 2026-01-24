import mongoose, { Schema, Document } from 'mongoose';

export interface IPeopleCounterRaw extends Document {
  clientId: string;
  deviceId: string;
  unitId: string;
  timestamp: Date;
  inCumulative: number;
  outCumulative: number;
  currentCount: number;
  output1: boolean;
  output2: boolean;
  countEnabled: boolean;
  buttonStatus: boolean;
  sensorStatus: boolean;
  limitExceeded: boolean;
  createdAt: Date;
}

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30일

const PeopleCounterRawSchema = new Schema<IPeopleCounterRaw>(
  {
    clientId: { type: String, required: true, index: true },
    deviceId: { type: String, required: true, default: 'd082' },
    unitId: { type: String, required: true, default: 'u001' },
    timestamp: { type: Date, required: true, index: true },
    inCumulative: { type: Number, required: true },
    outCumulative: { type: Number, required: true },
    currentCount: { type: Number, required: true },
    output1: { type: Boolean, required: true },
    output2: { type: Boolean, required: true },
    countEnabled: { type: Boolean, required: true },
    buttonStatus: { type: Boolean, required: true },
    sensorStatus: { type: Boolean, required: true },
    limitExceeded: { type: Boolean, required: true },
  },
  {
    timestamps: true,
  },
);

PeopleCounterRawSchema.index({ clientId: 1, timestamp: -1 });
PeopleCounterRawSchema.index({ timestamp: 1 }, { expireAfterSeconds: TTL_SECONDS });

export const PeopleCounterRaw = mongoose.model<IPeopleCounterRaw>(
  'PeopleCounterRaw',
  PeopleCounterRawSchema,
  'people_counter_raw',
);
