/**
 * 치명/운영 알림용 WebSocket 로그 (상태 전이·1회 알림으로 스팸 방지)
 * 포맷: broadcastLog와 동일 — TopLogPanel은 message 한 줄 표시
 */

import { UnitValue } from '../../types';
import { ServiceContainer } from '../container/ServiceContainer';

import { IWebSocketService } from './interfaces/IWebSocketService';

type WsLevel = 'info' | 'warn' | 'error' | 'debug';

export interface CriticalWsPayload {
  level: WsLevel;
  service: string;
  message: string;
  data?: Record<string, UnitValue>;
}

const transitionState = new Map<string, boolean>();
const onceFired = new Set<string>();

function getWebSocketService(): IWebSocketService | null {
  try {
    const container = ServiceContainer.getInstance();
    if (!container?.isInitialized?.()) {
      return null;
    }
    return container.getWebSocketService();
  } catch {
    return null;
  }
}

export function broadcastCritical(payload: CriticalWsPayload): void {
  const ws = getWebSocketService();
  if (!ws) return;
  ws.broadcastLog(payload.level, payload.service, payload.message, payload.data);
}

/** active=true/false 전이 시에만 WS 전송 */
export function broadcastCriticalOnTransition(
  key: string,
  active: boolean,
  whenActive: CriticalWsPayload,
  whenInactive?: CriticalWsPayload,
): void {
  const prev = transitionState.get(key) ?? false;
  if (active === prev) return;
  transitionState.set(key, active);
  const payload = active ? whenActive : whenInactive;
  if (payload) {
    broadcastCritical(payload);
  }
}

/** 동일 key는 프로세스 생애 동안 1회만 */
export function broadcastCriticalOnce(key: string, payload: CriticalWsPayload): void {
  if (onceFired.has(key)) return;
  onceFired.add(key);
  broadcastCritical(payload);
}

export function clearCriticalOnce(key: string): void {
  onceFired.delete(key);
}

export function notifyModbusLink(activeDown: boolean): void {
  broadcastCriticalOnTransition(
    'modbus_link',
    activeDown,
    {
      level: 'error',
      service: 'system',
      message: 'DDC 통신 링크 단절 — 전체 장비 통신 이상으로 표시',
      data: { code: 'LINK_DOWN' },
    },
    {
      level: 'info',
      service: 'system',
      message: 'DDC 통신 링크 복구 — 장비 통신 정상으로 복귀',
      data: { code: 'LINK_UP' },
    },
  );
}

export function notifyUnitDdcCommunication(deviceId: string, unitId: string, inError: boolean): void {
  const key = `ddc_comm:${deviceId}/${unitId}`;
  broadcastCriticalOnTransition(
    key,
    inError,
    {
      level: 'error',
      service: 'system',
      message: `[${deviceId}/${unitId}] DDC 통신 실패 (e001)`,
      data: { deviceId, unitId, code: 'COMM_ERROR' },
    },
    {
      level: 'info',
      service: 'system',
      message: `[${deviceId}/${unitId}] DDC 통신 복구`,
      data: { deviceId, unitId, code: 'COMM_OK' },
    },
  );
}

export function notifyPeopleCounterCommunication(unitId: string, inError: boolean): void {
  const deviceId = 'd082';
  const key = `pc_comm:${unitId}`;
  broadcastCriticalOnTransition(
    key,
    inError,
    {
      level: 'error',
      service: 'PeopleCounterPoller',
      message: `[${deviceId}/${unitId}] 피플카운터 응답 없음`,
      data: { deviceId, unitId, code: 'PC_COMM_ERROR' },
    },
    {
      level: 'info',
      service: 'PeopleCounterPoller',
      message: `[${deviceId}/${unitId}] 피플카운터 통신 복구`,
      data: { deviceId, unitId, code: 'PC_COMM_OK' },
    },
  );
}

export function notifyPollingSkippedNoClientId(deviceId: string): void {
  broadcastCriticalOnce(`poll_skip_no_client:${deviceId}`, {
    level: 'warn',
    service: 'system',
    message: `폴링 제외: ${deviceId} — clientId 없음 (현장 Client 미등록?)`,
    data: { deviceId, code: 'POLL_SKIP_NO_CLIENT' },
  });
}

export function clearPollingSkippedNoClientId(deviceId: string): void {
  clearCriticalOnce(`poll_skip_no_client:${deviceId}`);
}

export function notifyBulkPollingFailed(clientId: string, detail?: string): void {
  const msg = detail
    ? `DDC 폴링 실패 (${clientId}): ${detail}`
    : `DDC 폴링 실패 (${clientId}): Modbus bulk read 오류`;
  broadcastCriticalOnTransition(`bulk_fail:${clientId}`, true, {
    level: 'error',
    service: 'system',
    message: msg,
    data: { clientId, code: 'BULK_POLL_FAIL' },
  });
}

export function clearBulkPollingFailed(clientId: string): void {
  const key = `bulk_fail:${clientId}`;
  if (!(transitionState.get(key) ?? false)) return;
  transitionState.set(key, false);
  broadcastCritical({
    level: 'info',
    service: 'system',
    message: `DDC 폴링 복구 (${clientId})`,
    data: { clientId, code: 'BULK_POLL_OK' },
  });
}

export function notifyNoActiveClient(context: string): void {
  broadcastCriticalOnce(`no_active_client:${context}`, {
    level: 'error',
    service: 'system',
    message: '활성 현장 Client 없음 — DDC/데이터 반영 중단',
    data: { code: 'NO_ACTIVE_CLIENT', context },
  });
}

export function clearNoActiveClient(context: string): void {
  clearCriticalOnce(`no_active_client:${context}`);
}

export function notifyDeviceMissingClientId(deviceId: string): void {
  broadcastCriticalOnce(`device_no_client:${deviceId}`, {
    level: 'error',
    service: 'system',
    message: `명령/Data 적용 실패: ${deviceId}에 clientId 없음`,
    data: { deviceId, code: 'DEVICE_NO_CLIENT' },
  });
}

export function notifyPeopleCounterUnitsNotConfigured(): void {
  broadcastCriticalOnce('pc_no_units', {
    level: 'warn',
    service: 'PeopleCounterPoller',
    message: '피플카운터 유닛 미설정 (PEOPLE_COUNTER_PORTS)',
    data: { code: 'PC_NO_PORTS' },
  });
}

/** 폴링 사이클 실패 (기존 메시지 보강) */
export function notifyPollingCycleFailed(cycleDurationMs: number, detail?: string): void {
  const suffix = detail ? `: ${detail}` : '';
  broadcastCritical({
    level: 'error',
    service: 'system',
    message: `폴링 사이클 실패 (${cycleDurationMs}ms)${suffix}`,
    data: { code: 'POLL_CYCLE_FAIL', cycleDurationMs },
  });
}
