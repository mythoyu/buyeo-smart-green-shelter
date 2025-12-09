import mongoose, { Document, Schema } from 'mongoose';

export interface IDevice extends Document {
  deviceId: string;
  clientId: string;
  name: string;
  type: string;
}

const DeviceSchema = new Schema<IDevice>(
  {
    deviceId: {
      type: String,
      required: [true, '장비 ID는 필수입니다.'],
      unique: true,
      trim: true,
    },
    clientId: {
      type: String,
      required: [true, '클라이언트 ID는 필수입니다.'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, '장비 이름은 필수입니다.'],
      trim: true,
      maxlength: [100, '장비 이름은 최대 100자까지 가능합니다.'],
    },
    type: {
      type: String,
      required: [true, '장비 타입은 필수입니다.'],
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// 인덱스 설정
DeviceSchema.index({ clientId: 1 });
DeviceSchema.index({ type: 1 });

// 가상 필드: 장비 정보 요약
DeviceSchema.virtual('deviceSummary').get(function (this: IDevice) {
  return {
    id: this.deviceId,
    name: this.name,
    type: this.type,
  };
});

// JSON 변환 시 가상 필드 포함
DeviceSchema.set('toJSON', { virtuals: true });

// 클라이언트와의 관계 설정
DeviceSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: 'clientId',
  justOne: true,
});

// 장비와 유닛의 관계 설정 (virtual)
DeviceSchema.virtual('units', {
  ref: 'Unit',
  localField: 'deviceId',
  foreignField: 'deviceId',
  justOne: false,
});

export const Device = mongoose.model<IDevice>('Device', DeviceSchema, 'devices');
