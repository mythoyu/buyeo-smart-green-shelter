import { getSerialState, sendAscii } from '@/lib/serial-manager';

export const runtime = 'nodejs';

type Body = {
  data?: string;
  timeoutMs?: number;
  /** false면 응답 대기 없이 전송만 (리셋 등) */
  waitForClosingBracket?: boolean;
};

export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const data = typeof body.data === 'string' ? body.data : '';
  if (!data) {
    return Response.json({ ok: false, error: 'data가 필요합니다.' }, { status: 400 });
  }

  const timeoutMs =
    typeof body.timeoutMs === 'number' && Number.isFinite(body.timeoutMs) ? body.timeoutMs : 1000;
  const waitForClosingBracket = body.waitForClosingBracket !== false;

  try {
    const result = await sendAscii(data, timeoutMs, waitForClosingBracket);
    return Response.json({
      ok: true,
      ...result,
      state: getSerialState(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json(
      { ok: false, error: message, state: getSerialState() },
      { status: 400 },
    );
  }
}
