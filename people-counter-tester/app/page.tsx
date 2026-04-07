'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

type PortRow = { path: string; friendlyName: string | null; manufacturer: string | null };

/** text: 일반 로그 / sent·received: 시리얼 송수신 구분 표시 */
type LogLine = {
  id: string;
  at: string;
  kind: 'info' | 'ok' | 'err';
  text?: string;
  sent?: string;
  /** null = 응답 없음(무응답 모드), 빈 문자열 = 대기했으나 미수신 */
  received?: string | null;
  detail?: string;
};

/** Fast Refresh 시 모듈 변수가 초기화돼도 로그 state와 키가 충돌하지 않도록 */
function newLogId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type PresetCommand = { label: string; cmd: string; wait: boolean };

const PRESETS: PresetCommand[] = [
  { label: '상태 조회 (BTR)', cmd: 'BTR', wait: true },
  { label: '카운트 증가 (BTN)', cmd: 'BTN', wait: false },
  { label: '카운트 감소 (BTF)', cmd: 'BTF', wait: false },
  { label: '리셋 현재 (BTC)', cmd: 'BTC', wait: false },
  { label: '리셋 입실 (BTI)', cmd: 'BTI', wait: false },
  { label: '리셋 퇴실 (BTD)', cmd: 'BTD', wait: false },
  { label: '보턴 차단 (BTZ1)', cmd: 'BTZ1', wait: false },
  { label: '보턴 해제 (BTZ0)', cmd: 'BTZ0', wait: false },
];

/** 수신 전 플레이스홀더 (실제 장비 응답과 충돌하지 않도록 내부용 문자열) */
const SERIAL_RX_PENDING = '__serial_rx_pending__';

function normalizeDeviceId(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.padStart(4, '0');
}

function buildApcCommand(deviceId: string, commandSuffix: string): string {
  return `[${normalizeDeviceId(deviceId)}${commandSuffix}]`;
}

type BtwFieldRow = { label: string; value: string; hint: string };

/** 상태 응답 `[xxxxBTW,...]` 를 필드별로 풀어 쓴다. */
function parseBtwStatusFields(raw: string | null | undefined): BtwFieldRow[] | null {
  if (raw == null || raw === '' || raw === SERIAL_RX_PENDING) return null;
  const s = raw.trim();
  if (!s.startsWith('[') || !s.includes(']')) return null;
  const end = s.indexOf(']');
  const inner = s.slice(1, end);
  const parts = inner.split(',').map((p) => p.trim());
  if (parts.length < 10) return null;
  if (!/^\d{4}BTW$/i.test(parts[0] ?? '')) return null;

  const v = (i: number) => parts[i] ?? '';

  const modeHint = (x: string) => {
    const n = parseInt(x, 10);
    if (n === 1) return '입실 감지';
    if (n === 2) return '퇴실 감지';
    if (n === 3) return '양방향';
    return '—';
  };
  const secHint = (x: string) => {
    const n = parseInt(x, 10);
    const m: Record<number, string> = {
      0: '없음',
      1: '퇴실',
      2: '취소',
      3: '리셋',
      4: '차단',
    };
    return m[n] ?? `코드 ${x}`;
  };
  const onoff = (x: string) => (x === '1' ? 'ON' : x === '0' ? 'OFF' : x);

  return [
    { label: '헤더', value: v(0), hint: 'ID+BTW' },
    { label: '입실 누적', value: v(1), hint: '6자리' },
    { label: '퇴실 누적', value: v(2), hint: '6자리' },
    { label: '현재 인원', value: v(3), hint: '6자리' },
    { label: '출력1 (A접점)', value: onoff(v(4)), hint: `원시값 ${v(4)}` },
    { label: '출력2 (B접점)', value: onoff(v(5)), hint: `원시값 ${v(5)}` },
    { label: '카운트 인식 모드', value: v(6), hint: modeHint(v(6)) },
    { label: '보안(보턴)', value: v(7), hint: secHint(v(7)) },
    { label: '센서', value: v(8), hint: v(8) === '0' ? '정상' : v(8) === '1' ? '간섭 등' : `코드 ${v(8)}` },
    { label: '인원 제한', value: v(9), hint: v(9) === '0' ? '이내' : v(9) === '1' ? '초과' : `코드 ${v(9)}` },
    ...(parts.length > 10 ? [{ label: 'Reserve 1', value: v(10), hint: '예약' }] : []),
    ...(parts.length > 11 ? [{ label: 'Reserve 2', value: v(11), hint: '예약' }] : []),
  ];
}

export default function Page() {
  const [ports, setPorts] = useState<PortRow[]>([]);
  const [portsError, setPortsError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState('');
  const [baudRate, setBaudRate] = useState('9600');
  const [serialOpen, setSerialOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customData, setCustomData] = useState('');
  const [customWait, setCustomWait] = useState(true);
  const [timeoutMs, setTimeoutMs] = useState('1000');
  /** 4자리 장비 ID — 프리셋·「BTR 넣기」에만 사용, 커스텀은 직접 입력 */
  const [deviceId, setDeviceId] = useState('0000');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [logFollowLatest, setLogFollowLatest] = useState(true);
  const logScrollRef = useRef<HTMLDivElement>(null);

  const pushLog = useCallback((kind: LogLine['kind'], text: string) => {
    const at = new Date().toLocaleTimeString('ko-KR');
    setLogs((prev: LogLine[]) => [...prev, { id: newLogId(), at, kind, text }].slice(-200));
  }, []);

  const pushSerialExchange = useCallback(
    (
      kind: LogLine['kind'],
      payload: { sent: string; received: string | null; detail?: string },
    ) => {
      const at = new Date().toLocaleTimeString('ko-KR');
      setLogs((prev: LogLine[]) =>
        [
          ...prev,
          {
            id: newLogId(),
            at,
            kind,
            sent: payload.sent,
            received: payload.received,
            detail: payload.detail,
          },
        ].slice(-200),
      );
    },
    [],
  );

  useLayoutEffect(() => {
    if (!logFollowLatest || !logScrollRef.current) return;
    const el = logScrollRef.current;
    el.scrollTop = el.scrollHeight;
  }, [logs, logFollowLatest]);

  const refreshPorts = useCallback(async () => {
    setPortsError(null);
    try {
      const res = await fetch('/api/ports');
      const j = await res.json();
      if (!j.ok) {
        setPortsError(j.error ?? '목록 조회 실패');
        return;
      }
      setPorts(j.ports ?? []);
      pushLog('info', `포트 ${j.ports?.length ?? 0}개 조회`);
    } catch (e) {
      setPortsError(e instanceof Error ? e.message : String(e));
    }
  }, [pushLog]);

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/serial/state');
      const j = await res.json();
      if (j.state?.open) setSerialOpen(true);
      else setSerialOpen(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshPorts();
    void refreshState();
  }, [refreshPorts, refreshState]);

  const parseBaud = () => {
    const n = parseInt(baudRate, 10);
    return Number.isFinite(n) && n > 0 ? n : 9600;
  };

  const parseTimeout = () => {
    const n = parseInt(timeoutMs, 10);
    return Number.isFinite(n) && n > 0 ? n : 1000;
  };

  const handleOpen = async () => {
    const path = selectedPath.trim();
    if (!path) {
      pushLog('err', 'COM 포트를 선택하세요.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/serial/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, baudRate: parseBaud() }),
      });
      const j = await res.json();
      if (j.ok) {
        setSerialOpen(true);
        pushLog('ok', `열림: ${path} (${parseBaud()} bps)`);
      } else {
        const msg = [j.error ?? '열기 실패', typeof j.hint === 'string' ? j.hint : null]
          .filter(Boolean)
          .join(' — ');
        pushLog('err', msg);
      }
    } catch (e) {
      pushLog('err', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/serial/close', { method: 'POST' });
      const j = await res.json();
      setSerialOpen(false);
      if (j.hadOpenPort) {
        pushLog('info', j.closedPath ? `이 도구에서 연 ${j.closedPath} 닫음` : '이 도구에서 연 포트 닫음');
      } else {
        pushLog(
          'info',
          '이 도구에 열린 COM 없음 — 열기가 Access denied였다면 bushub 백엔드 등이 COM을 쓰는 중입니다. 그쪽을 끈 뒤 «열기» 하세요.',
        );
      }
    } catch (e) {
      pushLog('err', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const sendPayload = async (data: string, waitForClosingBracket: boolean) => {
    if (!serialOpen) {
      pushSerialExchange('err', {
        sent: data,
        received: null,
        detail: '포트가 열려 있지 않아 전송하지 않았습니다.',
      });
      return;
    }

    const exchangeId = newLogId();
    const at = new Date().toLocaleTimeString('ko-KR');
    setLogs((prev: LogLine[]) =>
      [
        ...prev,
        {
          id: exchangeId,
          at,
          kind: 'info' as const,
          sent: data,
          received: waitForClosingBracket ? SERIAL_RX_PENDING : null,
          detail: waitForClosingBracket ? '응답 대기 중' : '전송 중',
        },
      ].slice(-200),
    );

    setBusy(true);
    try {
      const res = await fetch('/api/serial/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          timeoutMs: parseTimeout(),
          waitForClosingBracket,
        }),
      });
      const j = await res.json();
      setLogs((prev: LogLine[]) =>
        prev.map((line) => {
          if (line.id !== exchangeId) return line;
          if (j.ok) {
            if (j.writeOnly) {
              return {
                ...line,
                kind: 'ok' as const,
                received: null,
                detail: '응답 대기 없음',
              };
            }
            if (j.timedOut) {
              return {
                ...line,
                kind: 'err' as const,
                received: j.received ?? '',
                detail: '타임아웃',
              };
            }
            return {
              ...line,
              kind: 'ok' as const,
              received: j.received ?? '',
              detail: undefined,
            };
          }
          return {
            ...line,
            kind: 'err' as const,
            received: null,
            detail: j.error ?? '송신 실패',
          };
        }),
      );
    } catch (e) {
      setLogs((prev: LogLine[]) =>
        prev.map((line) =>
          line.id !== exchangeId
            ? line
            : {
                ...line,
                kind: 'err' as const,
                received: line.received === SERIAL_RX_PENDING ? null : line.received,
                detail: e instanceof Error ? e.message : String(e),
              },
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const card: CSSProperties = {
    border: '1px solid #ccd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    background: '#fafbfd',
  };

  const cardLast: CSSProperties = {
    ...card,
    marginBottom: 0,
  };

  const btn: CSSProperties = {
    padding: '8px 14px',
    marginRight: 8,
    marginBottom: 8,
    cursor: busy ? 'not-allowed' : 'pointer',
    opacity: busy ? 0.6 : 1,
  };

  return (
    <main
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: 24,
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: 24,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ flex: '1 1 480px', minWidth: 0 }}>
        <h1 style={{ fontSize: '1.35rem', marginTop: 0 }}>APC100 시리얼 테스트</h1>
        <p style={{ color: '#445', marginTop: '-0.5rem' }}>
          로컬 전용 개발 도구 — 다른 프로그램이 같은 COM을 쓰면 열 수 없습니다.
        </p>

        <section style={card}>
        <h2 style={{ fontSize: '1rem', marginTop: 0 }}>연결</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button type="button" style={btn} disabled={busy} onClick={() => void refreshPorts()}>
            포트 새로고침
          </button>
          <select
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            disabled={busy}
            style={{ minWidth: 220, padding: 8 }}
          >
            <option value="">— 포트 선택 —</option>
            {ports.map((p: PortRow) => (
              <option key={p.path} value={p.path}>
                {p.path}
                {p.friendlyName ? ` · ${p.friendlyName}` : ''}
              </option>
            ))}
          </select>
          <label>
            보드레이트{' '}
            <input
              value={baudRate}
              onChange={(e) => setBaudRate(e.target.value)}
              disabled={busy}
              style={{ width: 72, padding: 6 }}
            />
          </label>
          <label>
            타임아웃(ms){' '}
            <input
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(e.target.value)}
              disabled={busy}
              style={{ width: 72, padding: 6 }}
            />
          </label>
          <label>
            장비 ID (프리셋){' '}
            <input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              onBlur={() => setDeviceId((v) => normalizeDeviceId(v))}
              disabled={busy}
              maxLength={4}
              title="4자리 십진 ID, 비우면 0000"
              style={{ width: 52, padding: 6, fontFamily: 'monospace' }}
            />
          </label>
        </div>
        {portsError && <p style={{ color: '#a00' }}>{portsError}</p>}
        <div style={{ marginTop: 12 }}>
          <button type="button" style={btn} disabled={busy} onClick={() => void handleOpen()}>
            열기
          </button>
          <button type="button" style={btn} disabled={busy} onClick={() => void handleClose()}>
            닫기
          </button>
          <span style={{ marginLeft: 8, fontWeight: 600, color: serialOpen ? '#060' : '#666' }}>
            {serialOpen ? '열림' : '닫힘'}
          </span>
        </div>
        </section>

        <section style={card}>
        <h2 style={{ fontSize: '1rem', marginTop: 0 }}>프리셋</h2>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>
          송신: <code style={{ fontSize: 12 }}>[{'{장비ID}'}</code>
          +명령, 기본 ID <strong>0000</strong> — 위 «장비 ID» 입력 반영.
        </p>
        <div>
          {PRESETS.map((p: PresetCommand) => (
            <button
              key={p.label}
              type="button"
              style={btn}
              disabled={busy}
              onClick={() => void sendPayload(buildApcCommand(deviceId, p.cmd), p.wait)}
            >
              {p.label}
            </button>
          ))}
        </div>
        </section>

        <section style={cardLast}>
        <h2 style={{ fontSize: '1rem', marginTop: 0 }}>커스텀 송신</h2>
        <p style={{ margin: '0 0 6px', fontSize: 13, color: '#555' }}>
          문자열 그대로 전송. 필요 시 아래로 현재 장비 ID 기준 BTR을 채움.
        </p>
        <textarea
          value={customData}
          onChange={(e) => setCustomData(e.target.value)}
          disabled={busy}
          placeholder="예: [0000BTR] 또는 [0000BTW,...]"
          rows={3}
          style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', padding: 8 }}
        />
        <label style={{ display: 'block', marginTop: 8 }}>
          <input
            type="checkbox"
            checked={customWait}
            onChange={(e) => setCustomWait(e.target.checked)}
            disabled={busy}
          />{' '}
          {`응답 대기 (']' 수신까지)`}
        </label>
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            style={btn}
            disabled={busy}
            onClick={() => setCustomData(buildApcCommand(deviceId, 'BTR'))}
          >
            현재 ID로 BTR 채우기
          </button>
          <button
            type="button"
            style={btn}
            disabled={busy}
            onClick={() => void sendPayload(customData, customWait)}
          >
            송신
          </button>
        </div>
        </section>
      </div>

      <aside
        style={{
          flex: '1 1 320px',
          width: 380,
          maxWidth: '100%',
          position: 'sticky',
          top: 24,
          alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <section
          style={{
            ...card,
            marginBottom: 0,
            flex: 1,
            minHeight: 320,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <h2 style={{ fontSize: '1rem', margin: 0, flex: '1 1 auto' }}>로그</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={logFollowLatest}
                onChange={(e) => setLogFollowLatest(e.target.checked)}
              />
              최신 로그로 자동 스크롤
            </label>
            <button
              type="button"
              style={{ ...btn, marginRight: 0, marginBottom: 0 }}
              onClick={() => setLogs([])}
            >
              로그 지우기
            </button>
          </div>
          <div
            ref={logScrollRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: 13,
              background: '#fff',
              border: '1px solid #ccd',
              borderRadius: 6,
              padding: 8,
            }}
          >
            {logs.length === 0 && <span style={{ color: '#888' }}>기록 없음</span>}
            {logs.map((line: LogLine) => {
              const isSerial = line.sent !== undefined;
              if (isSerial) {
                const rx =
                  line.received === null
                    ? { label: '(응답 대기 없음)', dim: true }
                    : line.received === SERIAL_RX_PENDING
                      ? { label: '(응답 대기 중…)', dim: true }
                      : line.received === ''
                        ? { label: '(수신 없음)', dim: true }
                        : { label: line.received, dim: false };
                const btwRows =
                  !rx.dim && line.received !== null && line.received !== SERIAL_RX_PENDING
                    ? parseBtwStatusFields(line.received)
                    : null;
                return (
                  <div
                    key={line.id}
                    style={{
                      marginBottom: 12,
                      paddingBottom: 10,
                      borderBottom: '1px solid #e8e8e8',
                    }}
                  >
                    <div
                      style={{
                        color: '#666',
                        fontSize: 12,
                        marginBottom: 8,
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    >
                      <span style={{ color: '#888' }}>{line.at}</span>
                      {line.detail ? (
                        <span style={{ color: line.kind === 'err' ? '#a00' : '#555' }}>
                          {' '}
                          · {line.detail}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#1565c0',
                          marginBottom: 4,
                          fontFamily: 'system-ui, sans-serif',
                        }}
                      >
                        보낸 데이터
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: 8,
                          background: '#f0f7ff',
                          border: '1px solid #cfe3fc',
                          borderRadius: 4,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {line.sent}
                      </pre>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#2e7d32',
                          marginBottom: 4,
                          fontFamily: 'system-ui, sans-serif',
                        }}
                      >
                        받은 데이터
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: 8,
                          background: rx.dim ? '#f9f9f9' : '#f4fbf4',
                          border: `1px solid ${rx.dim ? '#e0e0e0' : '#c8e6c9'}`,
                          borderRadius: 4,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          color: rx.dim ? '#888' : '#1b5e20',
                        }}
                      >
                        {rx.label}
                      </pre>
                      {btwRows && btwRows.length > 0 ? (
                        <div style={{ marginTop: 8, fontFamily: 'system-ui, sans-serif', fontSize: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6, color: '#333' }}>
                            BTW 상태 필드
                          </div>
                          <table
                            style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              background: '#fafafa',
                              border: '1px solid #e0e0e0',
                              borderRadius: 4,
                              overflow: 'hidden',
                            }}
                          >
                            <thead>
                              <tr style={{ background: '#eee', textAlign: 'left' }}>
                                <th style={{ padding: 6, borderBottom: '1px solid #ddd' }}>필드</th>
                                <th style={{ padding: 6, borderBottom: '1px solid #ddd' }}>값</th>
                                <th style={{ padding: 6, borderBottom: '1px solid #ddd' }}>설명</th>
                              </tr>
                            </thead>
                            <tbody>
                              {btwRows.map((row) => (
                                <tr key={`${line.id}-${row.label}`}>
                                  <td style={{ padding: 6, borderTop: '1px solid #eee', verticalAlign: 'top' }}>
                                    {row.label}
                                  </td>
                                  <td
                                    style={{
                                      padding: 6,
                                      borderTop: '1px solid #eee',
                                      fontFamily: 'monospace',
                                      wordBreak: 'break-all',
                                    }}
                                  >
                                    {row.value}
                                  </td>
                                  <td
                                    style={{
                                      padding: 6,
                                      borderTop: '1px solid #eee',
                                      color: '#555',
                                      fontSize: 11,
                                    }}
                                  >
                                    {row.hint}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={line.id}
                  style={{
                    marginBottom: 4,
                    color: line.kind === 'err' ? '#a00' : line.kind === 'ok' ? '#060' : '#333',
                  }}
                >
                  <span style={{ color: '#888' }}>{line.at}</span> {line.text}
                </div>
              );
            })}
          </div>
        </section>
      </aside>
    </main>
  );
}
