import { getEffectiveClientMapping } from '../../core/services/PortMappingService';

import {
  executeBulkRegisterReads,
  groupRegisterRefsForBulkRead,
  ModbusBulkReadExecutor,
  ModbusRegisterReadRef,
} from './modbusBulkRead';

export interface RegisteredDeviceRef {
  deviceId: string;
  unitId: string;
  deviceType: string;
}

export interface GlobalBulkPollingActionResult {
  action: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface GlobalBulkUnitPollingResult {
  success: boolean;
  /** 글로벌 벌크 그룹 read 실패로 포함된 멤버가 있으면 true (통신 판정 강제 error) */
  bulkGroupFailed?: boolean;
  deviceId: string;
  unitId: string;
  deviceType: string;
  totalActions: number;
  successfulActions: number;
  responseTime: number;
  modbusTransactionCount: number;
  globalBulk: boolean;
  globalBulkGroups: number;
  results: GlobalBulkPollingActionResult[];
}

export function unitResultKey(deviceId: string, unitId: string): string {
  return `${deviceId}/${unitId}`;
}

function refStorageKey(deviceId: string, unitId: string, actionName: string): string {
  return `${deviceId}|${unitId}|${actionName}`;
}

/** TIME_INTEGRATED(API용) 제외, port 있는 GET_* 만 폴링 */
export function isPollableGetAction(action: string, actionConfig: unknown): boolean {
  if (!action.startsWith('GET_')) {
    return false;
  }
  if (actionConfig === 'TIME_INTEGRATED' || typeof actionConfig === 'string') {
    return false;
  }

  const cfg = actionConfig as { port?: { functionCode?: number; address?: number } };
  return cfg.port?.functionCode !== undefined && cfg.port.address !== undefined;
}

export function getPollableGetActionNames(unitMapping: Record<string, unknown>): string[] {
  return Object.keys(unitMapping).filter((action) => isPollableGetAction(action, unitMapping[action]));
}

export function collectPollingRegisterRefs(
  device: RegisteredDeviceRef,
  clientId: string,
): { refs: ModbusRegisterReadRef[]; actionNames: string[] } {
  const clientMapping = getEffectiveClientMapping(clientId) as Record<string, Record<string, Record<string, unknown>>> | undefined;
  if (!clientMapping?.[device.deviceType]) {
    return { refs: [], actionNames: [] };
  }

  const unitMapping = clientMapping[device.deviceType][device.unitId] as Record<string, unknown> | undefined;
  if (!unitMapping) {
    return { refs: [], actionNames: [] };
  }

  const actionNames = getPollableGetActionNames(unitMapping);
  const refs: ModbusRegisterReadRef[] = [];

  for (const actionName of actionNames) {
    const actionConfig = unitMapping[actionName] as {
      port: { functionCode: number; address: number };
      length?: number;
    };

    refs.push({
      key: refStorageKey(device.deviceId, device.unitId, actionName),
      port: actionName,
      command: actionName,
      functionCode: actionConfig.port.functionCode,
      address: actionConfig.port.address,
      length: actionConfig.length ?? 1,
    });
  }

  return { refs, actionNames };
}

function normalizeBulkValue(data: number[] | undefined): unknown {
  if (!data || data.length === 0) {
    return undefined;
  }
  if (data.length === 1) {
    return data[0];
  }
  return data;
}

/**
 * clientId(slave) 단위로 전 유닛 레지스터를 모아 인접 bulk read 후 유닛별 결과 분배
 */
export async function executeGlobalBulkPollingForClient(
  clientId: string,
  devices: RegisteredDeviceRef[],
  executeRead: ModbusBulkReadExecutor,
): Promise<{
  unitResults: Map<string, GlobalBulkUnitPollingResult>;
  transactionCount: number;
  groupCount: number;
}> {
  const cycleStart = Date.now();
  const unitResults = new Map<string, GlobalBulkUnitPollingResult>();
  const expectedByUnit = new Map<string, string[]>();

  for (const device of devices) {
    unitResults.set(unitResultKey(device.deviceId, device.unitId), {
      success: false,
      deviceId: device.deviceId,
      unitId: device.unitId,
      deviceType: device.deviceType,
      totalActions: 0,
      successfulActions: 0,
      responseTime: 0,
      modbusTransactionCount: 0,
      globalBulk: true,
      globalBulkGroups: 0,
      results: [],
    });
    expectedByUnit.set(unitResultKey(device.deviceId, device.unitId), []);
  }

  const allRefs: ModbusRegisterReadRef[] = [];

  for (const device of devices) {
    const { refs, actionNames } = collectPollingRegisterRefs(device, clientId);
    const key = unitResultKey(device.deviceId, device.unitId);
    expectedByUnit.set(key, actionNames);
    const entry = unitResults.get(key);
    if (entry) {
      entry.totalActions = actionNames.length;
    }
    allRefs.push(...refs);
  }

  if (allRefs.length === 0) {
    return { unitResults, transactionCount: 0, groupCount: 0 };
  }

  const bulkGroups = groupRegisterRefsForBulkRead(allRefs);
  const { results: bulkMap, transactionCount, failedMemberKeys } = await executeBulkRegisterReads(
    allRefs,
    executeRead,
  );
  const groupCount = bulkGroups.length;
  const failedMemberKeySet = new Set(failedMemberKeys);

  for (const device of devices) {
    const key = unitResultKey(device.deviceId, device.unitId);
    const actionNames = expectedByUnit.get(key) ?? [];
    const results: GlobalBulkPollingActionResult[] = [];
    const bulkGroupFailed = actionNames.some((actionName) =>
      failedMemberKeySet.has(refStorageKey(device.deviceId, device.unitId, actionName)),
    );

    for (const actionName of actionNames) {
      const storageKey = refStorageKey(device.deviceId, device.unitId, actionName);
      const values = bulkMap.get(storageKey);
      if (values && values.length > 0) {
        results.push({
          action: actionName,
          success: true,
          data: normalizeBulkValue(values),
        });
      } else {
        results.push({
          action: actionName,
          success: false,
          error: bulkGroupFailed
            ? 'global bulk group read failed'
            : 'global bulk read returned no data',
        });
      }
    }

    const successfulActions = results.filter((r) => r.success).length;
    const responseTime = Date.now() - cycleStart;

    unitResults.set(key, {
      success: !bulkGroupFailed && successfulActions > 0,
      bulkGroupFailed,
      deviceId: device.deviceId,
      unitId: device.unitId,
      deviceType: device.deviceType,
      totalActions: actionNames.length,
      successfulActions,
      responseTime,
      modbusTransactionCount: transactionCount,
      globalBulk: true,
      globalBulkGroups: groupCount,
      results,
    });
  }

  return { unitResults, transactionCount, groupCount };
}
