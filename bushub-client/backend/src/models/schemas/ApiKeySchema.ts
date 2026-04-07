import crypto from 'crypto';

import mongoose, { Document, Schema } from 'mongoose';

export interface IApiKey extends Document {
  username: string;
  key: string;
  type: 'internal' | 'external' | 'universal';
  permissions?: string[];
  userId?: mongoose.Types.ObjectId; // 사용자와 연결
  companyId?: string;
  status: 'active' | 'inactive';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    username: {
      type: String,
      required: [true, 'API 키 사용자명은 필수입니다.'],
      trim: true,
      maxlength: [100, 'API 키 사용자명은 최대 100자까지 가능합니다.'],
    },
    key: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
    type: {
      type: String,
      enum: ['internal', 'external', 'universal'],
      required: true,
      default: 'internal',
    },
    permissions: [
      {
        type: String,
        required: false,
      },
    ],
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    companyId: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// 만료된 API 키 필터링을 위한 인덱스
ApiKeySchema.index({ status: 1, expiresAt: 1 });
ApiKeySchema.index({ companyId: 1 });
ApiKeySchema.index({ type: 1 });
ApiKeySchema.index({ userId: 1 }); // 사용자별 API 키 조회를 위한 인덱스

// 만료 여부 확인 메서드
ApiKeySchema.methods.isExpired = function (): boolean {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// 권한 확인 메서드
ApiKeySchema.methods.hasPermission = function (permission: string): boolean {
  return this.permissions.includes(permission);
};

export const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
