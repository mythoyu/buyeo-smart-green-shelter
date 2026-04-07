import { Schema, model, Document } from 'mongoose';

import { NetworkSettings, NtpSettings, SoftapSettings } from '../../core/services/interfaces/ILinuxSystemService';

export interface ISystem extends Document {
  // mode: 'auto' | 'manual'; // 제거됨
  // pollingInterval: number; // runtime으로 이동됨
  network?: NetworkSettings;
  ntp?: NtpSettings;
  softap?: SoftapSettings;

  // 🔄 런타임 상태 관리
  runtime?: {
    pollingEnabled: boolean;
    pollingInterval: number; // 이동됨
    applyInProgress: boolean;
    peopleCounterEnabled?: boolean;
  };

  // 🌸 절기 설정
  seasonal?: {
    season: number;
    january: number;
    february: number;
    march: number;
    april: number;
    may: number;
    june: number;
    july: number;
    august: number;
    september: number;
    october: number;
    november: number;
    december: number;
  };

  // 🔧 디바이스 고급 설정
  'device-advanced'?: {
    temp?: {
      'fine-tuning-summer'?: number;
      'fine-tuning-winter'?: number;
    };
  };
}

export interface UnitValue {
  value: number;
  unit: string;
}

const SystemSchema = new Schema<ISystem>(
  {
    // mode: { // 제거됨
    //   type: String,
    //   enum: ['auto', 'manual'],
    //   default: 'auto',
    //   description: '시스템 모드 (auto: 자동, manual: 수동)',
    // },
    // pollingInterval: { // runtime으로 이동됨
    //   type: Number,
    //   default: 1000, // 기본 1초
    //   min: [100, '폴링 간격은 최소 100ms 이상이어야 합니다.'],
    //   max: [3600000, '폴링 간격은 최대 3600000ms(1시간)까지 가능합니다.'],
    // },
    network: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ntp: {
      type: Schema.Types.Mixed,
      default: {},
    },
    softap: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // 🔄 런타임 상태 관리
    runtime: {
      pollingEnabled: { type: Boolean }, // 기본값 제거 - 사용자 설정 보존
      pollingInterval: {
        type: Number,
        default: 20000, // 기본 20초
        min: [100, '폴링 간격은 최소 100ms 이상이어야 합니다.'],
        max: [3600000, '폴링 간격은 최대 3600000ms(1시간)까지 가능합니다.'],
      },
      applyInProgress: { type: Boolean, default: false },
      peopleCounterEnabled: { type: Boolean },
    },
    // 🌸 절기 설정
    seasonal: {
      season: { type: Number, default: 0 }, // 0: 겨울, 1: 여름
      january: { type: Number, default: 0 }, // 0: 겨울, 1: 여름
      february: { type: Number, default: 0 },
      march: { type: Number, default: 0 },
      april: { type: Number, default: 0 },
      may: { type: Number, default: 0 },
      june: { type: Number, default: 1 },
      july: { type: Number, default: 1 },
      august: { type: Number, default: 1 },
      september: { type: Number, default: 0 },
      october: { type: Number, default: 0 },
      november: { type: Number, default: 0 },
      december: { type: Number, default: 0 },
    },
    // 🔧 디바이스 고급 설정
    'device-advanced': {
      temp: {
        'fine-tuning-summer': { type: Number, default: 0, min: -5, max: 5 },
        'fine-tuning-winter': { type: Number, default: 0, min: -5, max: 5 },
      },
    },
  },
  {
    timestamps: true,
  },
);

// 기본 설정을 반환하는 정적 메서드
SystemSchema.statics.getDefaultSettings = function () {
  return {
    // mode: 'auto', // 제거됨
    // pollingInterval: 1000, // runtime으로 이동됨
    network: {},
    ntp: {},
    softap: {},
    // 🔄 런타임 상태 관리 기본값
    runtime: {
      pollingEnabled: false, // 새로운 시스템 초기화 시에만 사용
      pollingInterval: 20000,
      applyInProgress: false,
      peopleCounterEnabled: false,
    },
    // 🌸 절기 설정 기본값
    seasonal: {
      season: 0, // 0: 겨울, 1: 여름
      january: 0, // 0: 겨울, 1: 여름
      february: 0,
      march: 0,
      april: 0,
      may: 0,
      june: 1,
      july: 1,
      august: 1,
      september: 0,
      october: 0,
      november: 0,
      december: 0,
    },
    // 🔧 디바이스 고급 설정 기본값
    'device-advanced': {
      temp: {
        'fine-tuning-summer': 0,
        'fine-tuning-winter': 0,
      },
    },
  };
};

export default model<ISystem>('System', SystemSchema);

// SystemSchema도 export (기존 코드와의 호환성을 위해)
export const System = model<ISystem>('System', SystemSchema);
