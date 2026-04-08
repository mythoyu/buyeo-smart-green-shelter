/**
 * d082(Data 컬렉션)에서 legacy 필드 완전 제거용 스크립트
 *
 * 제거 대상:
 * - units[].data.currentCount
 * - units[].data.inCumulative
 * - units[].data.outCumulative
 *
 * 실행 예시:
 * - (backend 작업 디렉토리에서) `pnpm ts-node src/scripts/unsetPeopleCounterDataFields.ts`
 *
 * 주의:
 * - MongoDB 접속 정보는 기존 백엔드와 동일하게 env(MONGODB_URI, DB_NAME)를 사용합니다.
 * - people_counter_raw 컬렉션은 건드리지 않습니다.
 */

import { connectToDatabase, disconnectFromDatabase } from '../database/mongoose';
import { Data } from '../models/schemas/DataSchema';

async function main() {
  await connectToDatabase();

  const res = await Data.updateMany(
    { deviceId: 'd082' },
    {
      $unset: {
        'units.$[].data.currentCount': '',
        'units.$[].data.inCumulative': '',
        'units.$[].data.outCumulative': '',
      },
    },
  );

  // mongoose UpdateResult는 환경에 따라 형태가 다를 수 있어 보수적으로 출력
  // eslint-disable-next-line no-console
  console.log('[unsetPeopleCounterDataFields] updateMany result', res);

  await disconnectFromDatabase();
}

main().catch(async (e) => {
  // eslint-disable-next-line no-console
  console.error('[unsetPeopleCounterDataFields] failed', e);
  try {
    await disconnectFromDatabase();
  } catch {
    // ignore
  }
  process.exitCode = 1;
});

