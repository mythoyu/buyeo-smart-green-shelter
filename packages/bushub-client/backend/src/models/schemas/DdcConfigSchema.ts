import mongoose, { Document, Schema } from 'mongoose';

export interface IDdcConfig extends Document {
  clientId: string;

  // 🎯 DDC 시스템 시간 설정
  ddcTime?: {
    year?: number; // GET_YEAR
    month?: number; // GET_MONTH
    day?: number; // GET_DAY
    dow?: number; // GET_DOW (Day of Week)
    hour?: number; // GET_HOUR
    minute?: number; // GET_MINUTE
    second?: number; // GET_SECOND
  };

  // 🌸 절기 설정 (월별 여름 설정)
  seasonal?: {
    season?: number; // GET_SEASON
    january?: number; // GET_JAN_SUMMER
    february?: number; // GET_FEB_SUMMER
    march?: number; // GET_MAR_SUMMER
    april?: number; // GET_APR_SUMMER
    may?: number; // GET_MAY_SUMMER
    june?: number; // GET_JUN_SUMMER
    july?: number; // GET_JUL_SUMMER
    august?: number; // GET_AUG_SUMMER
    september?: number; // GET_SEP_SUMMER
    october?: number; // GET_OCT_SUMMER
    november?: number; // GET_NOV_SUMMER
    december?: number; // GET_DEC_SUMMER
  };

  createdAt: Date;
  updatedAt: Date;
}

const DdcConfigSchema = new Schema<IDdcConfig>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // 🎯 DDC 시스템 시간 설정
    ddcTime: {
      year: { type: Number, min: 2000, max: 2100 },
      month: { type: Number, min: 1, max: 12 },
      day: { type: Number, min: 1, max: 31 },
      dow: { type: Number, min: 0, max: 6 }, // 0=일요일, 6=토요일
      hour: { type: Number, min: 0, max: 23 },
      minute: { type: Number, min: 0, max: 59 },
      second: { type: Number, min: 0, max: 59 },
    },

    // 🌸 절기 설정 (월별 여름 설정)
    seasonal: {
      season: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
      january: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
      february: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
      march: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
      april: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
      may: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
      june: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
      july: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
      august: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
      september: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
      october: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
      november: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
      december: { type: Number, min: 0, max: 1 }, // 0=겨울, 1=여름
    },
  },
  {
    timestamps: true,
    collection: 'ddcConfigs',
  },
);

// 인덱스 설정
DdcConfigSchema.index({ clientId: 1 });
DdcConfigSchema.index({ createdAt: -1 });

export const DdcConfig = mongoose.model<IDdcConfig>('DdcConfig', DdcConfigSchema);
