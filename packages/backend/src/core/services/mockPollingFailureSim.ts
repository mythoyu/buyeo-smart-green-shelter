/**
 * Mock 폴링 통신 실패 시뮬 — 정상 폴링과 동일하게 results[]·probe 평가 경로만 사용
 * (MockModbusService read/write 일괄 실패는 사용하지 않음)
 */

import { isModbusMockEnabled } from '../../config/mock.config';
import {
  COMMUNICATION_CORE_ACTIONS,
  type PollingOutcomeForCommunication,
} from '../../shared/utils/pollingCommunicationStatus';

export type MockSimulateMode = 'unit_comm' | 'link_down' | 'bulk_fail';

export function isMockPollingFailureSimEnabled(): boolean {
  return isModbusMockEnabled() && process.env.MODBUS_MOCK_SIMULATE_FAILURE === 'true';
}

export function getMockSimulateMode(): MockSimulateMode {
  const raw = (process.env.MODBUS_MOCK_SIMULATE_MODE || 'unit_comm').trim().toLowerCase();
  if (raw === 'link_down' || raw === 'bulk_fail') return raw;
  return 'unit_comm';
}

export function getMockModbusDelayMs(): number {
  const n = Number(process.env.MODBUS_MOCK_DELAY_MS ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** 핵심 probe action만 실패 처리 — evaluateUnitCommunicationFromPolling 과 동일 관측면 */
export function applyMockUnitCommProbeFailure(
  deviceType: string,
  pollingResult: PollingOutcomeForCommunication,
): void {
  const core = COMMUNICATION_CORE_ACTIONS[deviceType] ?? [];
  if (!pollingResult.results) {
    pollingResult.results = [];
  }

  for (const action of core) {
    const existing = pollingResult.results.find((r) => r.action === action);
    if (existing) {
      existing.success = false;
    } else {
      pollingResult.results.push({ action, success: false });
    }
  }

  pollingResult.success = false;
}

export function clonePollingOutcome(
  pollingResult?: PollingOutcomeForCommunication,
): PollingOutcomeForCommunication {
  if (!pollingResult) {
    return { success: false, results: [] };
  }
  return {
    success: pollingResult.success ?? false,
    results: pollingResult.results?.map((r) => ({ ...r })) ?? [],
  };
}
