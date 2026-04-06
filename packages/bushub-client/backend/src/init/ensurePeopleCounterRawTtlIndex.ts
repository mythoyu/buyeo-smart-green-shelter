/**
 * people_counter_raw: MongoDB TTL 인덱스 보장.
 * 비-TTL·기간 불일치·기본 이름(timestamp_1) 등은 기동 시 교체한다.
 */
import mongoose from 'mongoose';
import { logInfo, logWarn, logError } from '../logger';
import {
  PeopleCounterRaw,
  PEOPLE_COUNTER_RAW_TIMESTAMP_TTL_INDEX_NAME,
  PEOPLE_COUNTER_RAW_TTL_SECONDS,
} from '../models/schemas/PeopleCounterRawSchema';

/** 컬렉션 네임스페이스가 없으면 listIndexes / createIndexes 가 code 26 으로 실패하므로 먼저 보장 */
async function ensureCollectionNamespace(collectionName: string): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('[people_counter_raw] mongoose.connection.db 가 없습니다 (연결 후 호출하세요)');
  }
  try {
    await db.createCollection(collectionName);
  } catch (e: unknown) {
    const err = e as { code?: number; codeName?: string };
    if (err.code === 48 || err.codeName === 'NamespaceExists') {
      return;
    }
    throw e;
  }
}

function isTimestampAscendingOnly(key: Record<string, unknown> | undefined): boolean {
  if (!key || typeof key !== 'object') return false;
  const entries = Object.entries(key);
  if (entries.length !== 1) return false;
  const [k, v] = entries[0];
  return k === 'timestamp' && v === 1;
}

export async function ensurePeopleCounterRawTtlIndex(): Promise<void> {
  try {
    const coll = PeopleCounterRaw.collection;
    await ensureCollectionNamespace(coll.collectionName);

    const indexes = await coll.indexes();

    const tsOnly = indexes.filter((idx) => isTimestampAscendingOnly(idx.key as Record<string, unknown>));

    const ok = tsOnly.find(
      (idx) =>
        idx.expireAfterSeconds === PEOPLE_COUNTER_RAW_TTL_SECONDS &&
        idx.name === PEOPLE_COUNTER_RAW_TIMESTAMP_TTL_INDEX_NAME,
    );
    if (ok) {
      logInfo('[people_counter_raw] TTL 인덱스 정상');
      await PeopleCounterRaw.createIndexes();
      return;
    }

    for (const idx of tsOnly) {
      if (!idx.name) continue;
      logWarn(
        `[people_counter_raw] TTL 없거나 기간 불일치 인덱스 제거: ${idx.name}, expireAfterSeconds=${idx.expireAfterSeconds ?? '없음'}`,
      );
      await coll.dropIndex(idx.name);
    }

    await coll.createIndex(
      { timestamp: 1 },
      {
        expireAfterSeconds: PEOPLE_COUNTER_RAW_TTL_SECONDS,
        background: true,
        name: PEOPLE_COUNTER_RAW_TIMESTAMP_TTL_INDEX_NAME,
      },
    );
    logInfo(
      `[people_counter_raw] TTL 인덱스 생성 완료 (name=${PEOPLE_COUNTER_RAW_TIMESTAMP_TTL_INDEX_NAME}, expireAfterSeconds=${PEOPLE_COUNTER_RAW_TTL_SECONDS})`,
    );

    await PeopleCounterRaw.createIndexes();
  } catch (e) {
    logError(`[people_counter_raw] TTL 인덱스 보장 실패: ${e}`);
    throw e;
  }
}
