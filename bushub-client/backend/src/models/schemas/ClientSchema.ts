import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
  id: string;
  type: string;
  region: string;
  city: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status?: 'active' | 'inactive' | 'maintenance';
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    id: {
      type: String,
      required: [true, '클라이언트 ID는 필수입니다.'],
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: [true, '클라이언트 타입은 필수입니다.'],
      trim: true,
    },
    region: {
      type: String,
      required: [true, '행정자치구는 필수입니다.'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, '시군구는 필수입니다.'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, '클라이언트 이름은 필수입니다.'],
      trim: true,
      maxlength: [100, '클라이언트 이름은 최대 100자까지 가능합니다.'],
    },
    location: {
      type: String,
      required: [true, '위치는 필수입니다.'],
      trim: true,
    },
    latitude: {
      type: Number,
      required: [true, '위도는 필수입니다.'],
      min: [-90, '위도는 -90에서 90 사이여야 합니다.'],
      max: [90, '위도는 -90에서 90 사이여야 합니다.'],
    },
    longitude: {
      type: Number,
      required: [true, '경도는 필수입니다.'],
      min: [-180, '경도는 -180에서 180 사이여야 합니다.'],
      max: [180, '경도는 -180에서 180 사이여야 합니다.'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// 인덱스 설정
ClientSchema.index({ type: 1 });
ClientSchema.index({ region: 1 });
ClientSchema.index({ city: 1 });
ClientSchema.index({ status: 1 });

// 가상 필드: 위치 정보
ClientSchema.virtual('locationInfo').get(function (this: IClient) {
  return {
    address: this.location,
    coordinates: [this.longitude, this.latitude],
  };
});

// JSON 변환 시 가상 필드 포함
ClientSchema.set('toJSON', { virtuals: true });

export const Client = mongoose.model<IClient>('Client', ClientSchema, 'client');
