import mongoose, { Schema, Document } from 'mongoose';

export interface IPeopleCounterRaw extends Document {
  clientId: string;
  deviceId: string;
  unitId: string;
  timestamp: Date;
  inCumulative: number;
  inDelta?: number; // 1분 동안 입실 증가분 (신규 1분 저장 시 필수)
  inRef?: number; // 해당 분 시점 입실 누적값 (신규 1분 저장 시 필수)
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

/** 로우데이터 TTL(초). `ensurePeopleCounterRawTtlIndex`와 동일 값 유지 */
export const PEOPLE_COUNTER_RAW_TTL_SECONDS = 35 * 24 * 60 * 60; // 35일

/** TTL 인덱스 이름(기본 `timestamp_1` 대신 식별용) */
export const PEOPLE_COUNTER_RAW_TIMESTAMP_TTL_INDEX_NAME = 'people_counter_raw_timestamp_ttl';

const TTL_SECONDS = PEOPLE_COUNTER_RAW_TTL_SECONDS;

const PeopleCounterRawSchema = new Schema<IPeopleCounterRaw>(
  {
    clientId: { type: String, required: true, index: true },
    deviceId: { type: String, required: true, default: 'd082' },
    unitId: { type: String, required: true, default: 'u001' },
    // timestamp 인덱스는 TTL용 스키마 인덱스 한 곳에서만 생성 (필드 index:true 와 중복 시 비-TTL만 남는 문제 방지)
    timestamp: { type: Date, required: true },
    inCumulative: { type: Number, required: true },
    inDelta: { type: Number },
    inRef: { type: Number },
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
PeopleCounterRawSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: TTL_SECONDS, name: PEOPLE_COUNTER_RAW_TIMESTAMP_TTL_INDEX_NAME },
);

export const PeopleCounterRaw = mongoose.model<IPeopleCounterRaw>(
  'PeopleCounterRaw',
  PeopleCounterRawSchema,
  'people_counter_raw',
);
