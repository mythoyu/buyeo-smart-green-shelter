/**
 * people_counter_raw: MongoDB TTL 인덱스 보장.
 * 비-TTL·기간 불일치·기본 이름(timestamp_1) 등은 기동 시 교체한다.
 */
import { logInfo, logWarn, logError } from '../logger';
import {
  PeopleCounterRaw,
  PEOPLE_COUNTER_RAW_TIMESTAMP_TTL_INDEX_NAME,
  PEOPLE_COUNTER_RAW_TTL_SECONDS,
} from '../models/schemas/PeopleCounterRawSchema';

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
