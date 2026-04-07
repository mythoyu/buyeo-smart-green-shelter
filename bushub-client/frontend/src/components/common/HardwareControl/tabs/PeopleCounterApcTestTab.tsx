/**
 * 피플카운터 APC100 시리얼 수동 테스트 (PEOPLE_COUNTER_PORT 전용, 백엔드 큐 직렬화)
 * @see people-counter-tester
 */
import { AlertCircle } from 'lucide-react';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { usePeopleCounterApcTest } from '../../../../api/queries/people-counter';
import { Alert, AlertDescription } from '../../../ui/alert';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Checkbox } from '../../../ui/checkbox';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';

import type { HardwareControlError } from '../../../../types/hardware';

type LogLine =
  | { id: string; at: string; kind: 'info' | 'ok' | 'err'; text: string }
  | {
      id: string;
      at: string;
      kind: 'info' | 'ok' | 'err';
      sent: string;
      received: string | null;
      detail?: string;
    };

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

const SERIAL_RX_PENDING = '__serial_rx_pending__';

function newLogId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizeDeviceId(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.padStart(4, '0');
}

function buildApcCommand(deviceId: string, commandSuffix: string): string {
  return `[${normalizeDeviceId(deviceId)}${commandSuffix}]`;
}

type BtwFieldRow = { label: string; value: string; hint: string };

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

interface PeopleCounterApcTestTabProps {
  disabled?: boolean;
  onError?: (error: HardwareControlError) => void;
  pollingStatus?: { pollingEnabled: boolean };
}

const PeopleCounterApcTestTab: React.FC<PeopleCounterApcTestTabProps> = ({
  disabled = false,
  onError,
  pollingStatus,
}) => {
  const apcTest = usePeopleCounterApcTest();
  const busy = apcTest.isPending;
  const [deviceId, setDeviceId] = useState('0000');
  const [timeoutMs, setTimeoutMs] = useState('1000');
  const [customData, setCustomData] = useState('');
  const [customWait, setCustomWait] = useState(true);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [logFollowLatest, setLogFollowLatest] = useState(true);
  const logScrollRef = useRef<HTMLDivElement>(null);

  const pushLog = useCallback((kind: LogLine['kind'], text: string) => {
    const at = new Date().toLocaleTimeString('ko-KR');
    setLogs(prev => [...prev, { id: newLogId(), at, kind, text }].slice(-200));
  }, []);

  const parseTimeout = () => {
    const n = parseInt(timeoutMs, 10);
    return Number.isFinite(n) && n > 0 ? Math.min(30000, Math.max(100, n)) : 1000;
  };

  useLayoutEffect(() => {
    if (!logFollowLatest || !logScrollRef.current) return;
    const el = logScrollRef.current;
    el.scrollTop = el.scrollHeight;
  }, [logs, logFollowLatest]);

  const sendPayload = async (data: string, waitForClosingBracket: boolean) => {
    if (disabled || pollingStatus?.pollingEnabled) {
      toast.error('DDC 폴링이 켜져 있으면 사용할 수 없습니다. 폴링을 중지한 뒤 다시 시도하세요.');
      return;
    }

    const exchangeId = newLogId();
    const at = new Date().toLocaleTimeString('ko-KR');
    setLogs(prev =>
      [
        ...prev,
        {
          id: exchangeId,
          at,
          kind: 'info',
          sent: data,
          received: waitForClosingBracket ? SERIAL_RX_PENDING : null,
          detail: waitForClosingBracket ? '응답 대기 중' : '전송 중',
        },
      ].slice(-200),
    );

    try {
      const result = await apcTest.mutateAsync({
        data,
        timeoutMs: parseTimeout(),
        waitForClosingBracket,
      });

      setLogs(prev =>
        prev.map(line => {
          if (line.id !== exchangeId || !('sent' in line)) return line;
          if (result.writeOnly) {
            return {
              ...line,
              kind: 'ok' as const,
              received: null,
              detail: '응답 대기 없음',
            };
          }
          if (result.timedOut) {
            return {
              ...line,
              kind: 'err' as const,
              received: result.received ?? '',
              detail: '타임아웃',
            };
          }
          return {
            ...line,
            kind: 'ok' as const,
            received: result.received ?? '',
            detail: undefined,
          };
        }),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLogs(prev =>
        prev.map(line =>
          line.id !== exchangeId || !('sent' in line)
            ? line
            : {
                ...line,
                kind: 'err' as const,
                received: line.received === SERIAL_RX_PENDING ? null : line.received,
                detail: msg,
              },
        ),
      );
      onError?.({ message: 'APC 테스트 실패', details: msg, type: 'hardware_error' });
      toast.error(msg, { id: 'apc-test-error' });
    }
  };

  const pollingBlocks = !!pollingStatus?.pollingEnabled || disabled;

  return (
    <div className='space-y-4'>
      <Alert>
        <AlertCircle className='h-4 w-4' />
        <AlertDescription className='space-y-2 text-sm leading-relaxed'>
          <p>
            이 탭의 통신은 <strong className='font-mono text-xs'>PEOPLE_COUNTER_PORT</strong> 전용입니다.
          </p>
          <p>
            DDC·Modbus 경로(<code className='rounded bg-muted px-1 py-0.5 font-mono text-[11px]'>MODBUS_PORT</code>)와는
            분리되어 있으며, 같은 장비 포트로 가는 폴링·테스트 요청은 서버 큐에서 순차 처리됩니다.
          </p>
          <p>
            <code className='rounded bg-muted px-1 py-0.5 font-mono text-[11px]'>PEOPLE_COUNTER_MOCK_ENABLED=true</code>
            인 환경에서는 APC 테스트가 비활성화됩니다.
          </p>
        </AlertDescription>
      </Alert>

      {pollingBlocks && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            DDC 폴링이 켜져 있으면 이 기능을 사용할 수 없습니다. 시스템 설정에서 폴링을 먼저 중지하세요.
          </AlertDescription>
        </Alert>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>프리셋</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex flex-wrap items-end gap-2'>
              <div className='space-y-1'>
                <Label htmlFor='pc-apc-device-id'>장비 ID (4자리)</Label>
                <Input
                  id='pc-apc-device-id'
                  value={deviceId}
                  onChange={e => setDeviceId(e.target.value)}
                  onBlur={() => setDeviceId(v => normalizeDeviceId(v))}
                  disabled={busy || pollingBlocks}
                  maxLength={4}
                  className='w-24 font-mono'
                />
              </div>
              <div className='space-y-1'>
                <Label htmlFor='pc-apc-timeout'>타임아웃(ms)</Label>
                <Input
                  id='pc-apc-timeout'
                  value={timeoutMs}
                  onChange={e => setTimeoutMs(e.target.value)}
                  disabled={busy || pollingBlocks}
                  className='w-28'
                />
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              {PRESETS.map(p => (
                <Button
                  key={p.label}
                  type='button'
                  size='sm'
                  variant='secondary'
                  disabled={busy || pollingBlocks}
                  onClick={() => void sendPayload(buildApcCommand(deviceId, p.cmd), p.wait)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>커스텀 송신</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <Textarea
              value={customData}
              onChange={e => setCustomData(e.target.value)}
              disabled={busy || pollingBlocks}
              placeholder='예: [0000BTR]'
              rows={3}
              className='font-mono text-sm'
            />
            <div className='flex items-center gap-2'>
              <Checkbox
                id='pc-apc-wait'
                checked={customWait}
                onCheckedChange={v => setCustomWait(v === true)}
                disabled={busy || pollingBlocks}
              />
              <Label htmlFor='pc-apc-wait' className='text-sm font-normal cursor-pointer'>
                응답 대기 (&apos;]&apos; 수신까지)
              </Label>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={busy || pollingBlocks}
                onClick={() => setCustomData(buildApcCommand(deviceId, 'BTR'))}
              >
                현재 ID로 BTR 채우기
              </Button>
              <Button
                type='button'
                size='sm'
                disabled={busy || pollingBlocks}
                onClick={() => void sendPayload(customData.trim(), customWait)}
              >
                송신
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-2'>
          <CardTitle className='text-base'>로그</CardTitle>
          <div className='flex items-center gap-3 text-sm'>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='checkbox'
                checked={logFollowLatest}
                onChange={e => setLogFollowLatest(e.target.checked)}
              />
              최신으로 스크롤
            </label>
            <Button type='button' size='sm' variant='ghost' onClick={() => setLogs([])}>
              지우기
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={logScrollRef}
            className='max-h-[420px] overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs'
          >
            {logs.length === 0 && <span className='text-muted-foreground'>기록 없음</span>}
            {logs.map(line => {
              if ('text' in line && !('sent' in line)) {
                return (
                  <div
                    key={line.id}
                    className={`mb-2 ${line.kind === 'err' ? 'text-destructive' : line.kind === 'ok' ? 'text-green-700 dark:text-green-400' : ''}`}
                  >
                    <span className='text-muted-foreground'>{line.at}</span> {line.text}
                  </div>
                );
              }
              if (!('sent' in line)) return null;
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
                <div key={line.id} className='mb-4 border-b border-border pb-3 last:border-0'>
                  <div className='text-muted-foreground mb-1 text-[11px]'>
                    {line.at}
                    {line.detail ? (
                      <span className={line.kind === 'err' ? 'text-destructive' : ''}> · {line.detail}</span>
                    ) : null}
                  </div>
                  <div className='text-[11px] font-semibold text-blue-700 dark:text-blue-300 mb-1'>보낸 데이터</div>
                  <pre className='mb-2 whitespace-pre-wrap break-all rounded bg-blue-500/10 p-2 text-[11px]'>{line.sent}</pre>
                  <div className='text-[11px] font-semibold text-green-700 dark:text-green-300 mb-1'>받은 데이터</div>
                  <pre
                    className={`whitespace-pre-wrap break-all rounded p-2 text-[11px] ${rx.dim ? 'bg-muted text-muted-foreground' : 'bg-green-500/10'}`}
                  >
                    {rx.label}
                  </pre>
                  {btwRows && btwRows.length > 0 ? (
                    <div className='mt-2 overflow-x-auto rounded border text-[11px]'>
                      <table className='w-full'>
                        <thead>
                          <tr className='bg-muted/80 text-left'>
                            <th className='p-1.5'>필드</th>
                            <th className='p-1.5'>값</th>
                            <th className='p-1.5'>설명</th>
                          </tr>
                        </thead>
                        <tbody>
                          {btwRows.map(row => (
                            <tr key={`${line.id}-${row.label}`} className='border-t'>
                              <td className='p-1.5 align-top'>{row.label}</td>
                              <td className='p-1.5 font-mono break-all'>{row.value}</td>
                              <td className='p-1.5 text-muted-foreground'>{row.hint}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PeopleCounterApcTestTab;
