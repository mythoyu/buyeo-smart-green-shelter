import { closeSerial, getSerialState } from '@/lib/serial-manager';

export const runtime = 'nodejs';

export async function POST() {
  const before = getSerialState();
  await closeSerial();
  return Response.json({
    ok: true,
    hadOpenPort: before.open,
    closedPath: before.path ?? null,
    state: getSerialState(),
  });
}
