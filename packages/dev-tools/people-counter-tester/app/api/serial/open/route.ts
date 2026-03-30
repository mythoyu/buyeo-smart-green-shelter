import { getSerialState, openSerial } from '@/lib/serial-manager';

export const runtime = 'nodejs';

type Body = { path?: string; baudRate?: number };

export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const path = typeof body.path === 'string' ? body.path.trim() : '';
  if (!path) {
    return Response.json({ ok: false, error: 'path가 필요합니다.' }, { status: 400 });
  }

  let baudRate = 9600;
  if (typeof body.baudRate === 'number' && Number.isFinite(body.baudRate)) {
    baudRate = body.baudRate;
  } else if (typeof body.baudRate === 'string') {
    const n = parseInt(body.baudRate, 10);
    if (Number.isFinite(n) && n > 0) baudRate = n;
  }

  try {
    await openSerial(path, baudRate);
    return Response.json({ ok: true, state: getSerialState() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const hint =
      process.platform === 'win32' && /access|denied|EBUSY|resource busy/i.test(message)
        ? '다른 프로그램(백엔드·터미널 등)이 같은 COM을 쓰고 있을 수 있습니다. 열기에 실패했다면 이 테스트 도구는 COM을 잡고 있지 않습니다. 이 화면의 «닫기»는 다른 프로그램의 점유를 풀지 못합니다 — bushub 백엔드/도커 등을 중지한 뒤 다시 «열기» 하세요.'
        : undefined;
    console.warn('[people-counter-tester] serial/open failed:', message);
    return Response.json(
      { ok: false, error: message, hint, state: getSerialState() },
      { status: 400 },
    );
  }
}
