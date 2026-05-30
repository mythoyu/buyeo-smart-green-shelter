/**
 * 폴링 결과 기반 Modbus "통신(링크)" 정상 여부 — action 일부 실패(GET_AUTO 등)와 분리
 */

export type UnitCommunicationEvaluation = 'ok' | 'error';

/** UnifiedModbusPoller 폴링·링크 감시 대상 (APC 시리얼 people_counter는 PeopleCounterPoller 전용) */
export function isModbusPolledDeviceType(deviceType: string): boolean {
  return deviceType !== 'people_counter';
}

/** 장비 타입별 통신 probe 성공으로 인정하는 핵심 GET action */
export const COMMUNICATION_CORE_ACTIONS: Record<string, readonly string[]> = {
  lighting: ['GET_POWER'],
  door: ['GET_POWER'],
  cooler: ['GET_POWER', 'GET_CUR_TEMP'],
  bench: ['GET_POWER', 'GET_TEMP'],
  exchanger: ['GET_POWER'],
  integrated_sensor: ['GET_HUM', 'GET_TEMP'],
  external_switch: ['GET_POWER'],
  sensor: ['GET_HUM', 'GET_TEMP'],
};

export interface PollingActionOutcome {
  action: string;
  success: boolean;
}

export interface PollingOutcomeForCommunication {
  success?: boolean;
  results?: PollingActionOutcome[];
}

function hasCoreProbeSuccess(deviceType: string, results: PollingActionOutcome[]): boolean {
  const core = COMMUNICATION_CORE_ACTIONS[deviceType];
  if (!core?.length) {
    return results.some((r) => r.success);
  }
  return core.some((action) => results.find((r) => r.action === action)?.success === true);
}

/**
 * 유닛 통신 상태(0/2) 갱신용 — 핵심 probe 성공 시 ok, 그 외 실패·무응답은 error
 */
export function evaluateUnitCommunicationFromPolling(
  deviceType: string,
  pollingResult: PollingOutcomeForCommunication | undefined,
): UnitCommunicationEvaluation {
  const results = pollingResult?.results ?? [];

  if (results.length === 0) {
    return pollingResult?.success === true ? 'ok' : 'error';
  }

  return hasCoreProbeSuccess(deviceType, results) ? 'ok' : 'error';
}
