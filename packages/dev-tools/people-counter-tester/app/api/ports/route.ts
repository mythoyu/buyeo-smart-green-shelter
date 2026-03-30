import { SerialPort } from 'serialport';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const list = await SerialPort.list();
    return Response.json({
      ok: true,
      ports: list.map((p) => ({
        path: p.path,
        friendlyName: p.friendlyName ?? null,
        manufacturer: p.manufacturer ?? null,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
