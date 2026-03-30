import { getSerialState } from '@/lib/serial-manager';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ ok: true, state: getSerialState() });
}
