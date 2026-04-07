import bcrypt from 'bcryptjs';
import mongoose, { Document, Schema } from 'mongoose';

import { logInfo } from '../../logger';

export interface IUser extends Document {
  username: string;
  password: string;
  role: 'superuser' | 'user' | 'engineer' | 'ex-user';
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, '사용자명은 필수입니다.'],
      unique: true,
      trim: true,
      minlength: [2, '사용자명은 최소 2자 이상이어야 합니다.'],
      maxlength: [50, '사용자명은 최대 50자까지 가능합니다.'],
    },
    password: {
      type: String,
      required: [true, '비밀번호는 필수입니다.'],
      minlength: [8, '비밀번호는 최소 8자 이상이어야 합니다.'],
    },
    role: {
      type: String,
      enum: ['superuser', 'user', 'engineer', 'ex-user'],
      default: 'ex-user',
      required: true,
    },
    companyId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        if (ret.password) {
          delete ret.password;
        }
        return ret;
      },
    },
  },
);

// 비밀번호 해시화 미들웨어
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    logInfo(`비밀번호 변경 없음 - 해시화 건너뜀: ${this.username}`);
    return next();
  }

  try {
    logInfo(`비밀번호 해시화 시작: ${this.username}`);

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    logInfo(`비밀번호 해시화 완료: ${this.username}`);

    next();
  } catch (error) {
    logInfo(`비밀번호 해시화 실패: ${this.username}`);
    next(error as Error);
  }
});

// 비밀번호 비교 메서드
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// 인덱스 설정 (중복 방지)
UserSchema.index({ companyId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema, 'users');
