import mongoose, { Schema, Document } from 'mongoose';

import { UnitValue } from '../../types';

export interface ICommandLog extends Document {
  deviceId: string;
  unitId: string;
  action: string;
  value: UnitValue;
  status: 'waiting' | 'success' | 'fail'; // 'pending' → 'waiting'으로 변경
  requestedAt: Date;
  finishedAt?: Date;
  error?: string;
  result?: UnitValue;
  createdAt: Date;
  updatedAt: Date;
}

const CommandLogSchema = new Schema<ICommandLog>(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    unitId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: ['waiting', 'success', 'fail'], // 'pending' → 'waiting'으로 변경
      default: 'waiting', // 기본값도 'waiting'으로 변경
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
      index: true,
    },
    error: {
      type: String,
      // 에러 메시지는 500자로 제한
      maxlength: 500,
    },
    result: {
      type: Schema.Types.Mixed,
      // 결과 데이터는 1000자로 제한
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: 'command_logs',
    // JSON 직렬화 시 불필요한 필드 제외
    toJSON: {
      transform(_doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
  },
);

// 복합 인덱스 추가
CommandLogSchema.index({ deviceId: 1, unitId: 1 });
CommandLogSchema.index({ deviceId: 1, unitId: 1, status: 1 });
CommandLogSchema.index({ requestedAt: -1 });

// TTL 인덱스: 10일 후 자동 삭제
CommandLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 10 * 24 * 60 * 60 });

export const CommandLog = mongoose.model<ICommandLog>('CommandLog', CommandLogSchema);
