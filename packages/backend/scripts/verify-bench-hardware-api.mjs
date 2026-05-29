#!/usr/bin/env node
/**
 * 온열벤치 하드웨어 API 현장 검증
 * - 폴링 중지 → cont_temp -20 set → read_after_set raw/value 확인
 *
 * 사용:
 *   node packages/backend/scripts/verify-bench-hardware-api.mjs
 *   BASE_URL=http://127.0.0.1:13031 API_KEY=... node packages/backend/scripts/verify-bench-hardware-api.mjs
 */

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:13031').replace(/\/$/, '');
const API_KEY = process.env.API_KEY || '';

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (API_KEY) {
    h.Authorization = `Bearer ${API_KEY}`;
  }
  return h;
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

async function main() {
  console.log(`[bench-verify] BASE_URL=${BASE_URL}`);

  const pollOff = await post('/api/v1/internal/system/polling', { pollingEnabled: false });
  console.log('[bench-verify] polling off:', pollOff.status, pollOff.json?.message ?? pollOff.json);
  if (pollOff.status >= 400 && pollOff.status !== 401) {
    console.warn('[bench-verify] 폴링 중지 실패 — 이미 중지됐을 수 있음');
  }

  const setRes = await post('/api/v1/internal/hardware/system/bench', {
    action: 'set',
    cont_temp: -20,
  });
  console.log('[bench-verify] set:', setRes.status, JSON.stringify(setRes.json, null, 2));

  if (setRes.status === 409) {
    throw new Error('폴링이 활성 상태입니다. UI 또는 polling API로 중지 후 재실행하세요.');
  }

  assert(setRes.status === 200, `set HTTP ${setRes.status} 기대 200`);
  assert(setRes.json?.success === true, 'set success !== true');

  const written = setRes.json?.data?.written;
  const after = setRes.json?.data?.read_after_set?.cont_temp;

  assert(Array.isArray(written) && written.some(w => w.command === 'CONT_TEMP' && w.register === 1800), 'written CONT_TEMP register !== 1800');
  assert(after?.raw === 1800 && after?.value === -20, `read_after_set cont_temp 기대 raw=1800 value=-20, got ${JSON.stringify(after)}`);

  const readRes = await post('/api/v1/internal/hardware/system/bench', { action: 'read' });
  console.log('[bench-verify] read cont_temp:', readRes.json?.data?.cont_temp);
  if (readRes.status === 200 && readRes.json?.data?.cont_temp) {
    assert(readRes.json.data.cont_temp.raw === 1800, 'read raw !== 1800');
    assert(readRes.json.data.cont_temp.value === -20, 'read value !== -20');
  }

  console.log('[bench-verify] OK — wire 1800 / 논리 -20°C 일치');
}

main().catch(err => {
  console.error('[bench-verify] FAIL:', err.message);
  process.exit(1);
});
