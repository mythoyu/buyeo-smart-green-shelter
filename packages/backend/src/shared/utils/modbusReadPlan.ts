import { ModbusBulkReadExecutor, ModbusRegisterReadRef } from './modbusBulkRead';
import { ModbusCycleProfileCache } from './modbusCycleProfileCache';
import {
  enrichPollingRefsWithHwPort,
  executePollingBulkReadsWithFunctionalGrouping,
} from './modbusFunctionalBulk';

export interface PollingActionResult {
  action: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface UnitMappingActionSpec {
  port?: { functionCode: number; address: number };
  functionCode?: number;
  address?: number;
  length?: number;
}

export type ModbusReadCommandExecutor = (request: {
  functionCode: number;
  address: number;
  length: number;
  commandId: string;
}) => Promise<{ success: boolean; data?: number[]; error?: string }>;

/** clientPortMappings 액션 설정 → Modbus read 스펙 */
export function resolveActionModbusSpec(actionConfig: unknown): {
  functionCode: number;
  address: number;
  length: number;
} | null {
  if (!actionConfig || actionConfig === 'TIME_INTEGRATED') {
    return null;
  }

  const cfg = actionConfig as UnitMappingActionSpec;

  if (cfg.port) {
    return {
      functionCode: cfg.port.functionCode,
      address: cfg.port.address,
      length: cfg.length ?? 1,
    };
  }

  if (cfg.functionCode != null && cfg.address != null) {
    return {
      functionCode: cfg.functionCode,
      address: cfg.address,
      length: cfg.length ?? 1,
    };
  }

  return null;
}

/** GET_* 액션 목록 → bulk read용 ref (TIME_INTEGRATED·스펙 없음 제외) */
export function collectPollingRefsFromMapping(
  mapping: Record<string, unknown>,
  pollingActions: string[],
): ModbusRegisterReadRef[] {
  const refs: ModbusRegisterReadRef[] = [];

  for (const action of pollingActions) {
    const spec = resolveActionModbusSpec(mapping[action]);
    if (!spec) {
      continue;
    }

    refs.push({
      key: action,
      port: action,
      command: action,
      functionCode: spec.functionCode,
      address: spec.address,
      length: spec.length,
    });
  }

  return enrichPollingRefsWithHwPort(refs);
}

export function isTimeIntegratedAction(mapping: Record<string, unknown>, action: string): boolean {
  return mapping[action] === 'TIME_INTEGRATED';
}

export function createModbusBulkReadExecutor(executeRead: ModbusReadCommandExecutor): ModbusBulkReadExecutor {
  return async (functionCode, startAddress, length) => {
    const commandId = `bulk_fc${functionCode}_addr${startAddress}_len${length}_${Date.now()}`;
    return executeRead({
      functionCode,
      address: startAddress,
      length,
      commandId,
    });
  };
}

export function bulkMapToPollingResults(
  bulkResults: Map<string, number[]>,
  bulkActions: string[],
): PollingActionResult[] {
  return bulkActions.map((action) => {
    const values = bulkResults.get(action);
    if (!values || values.length === 0) {
      return {
        action,
        success: false,
        error: 'bulk read returned no data',
      };
    }

    return {
      action,
      success: true,
      data: values,
    };
  });
}

/** bulk read 실행 후 PollingResult.results 항목 생성 */
export async function executePollingBulkReads(
  mapping: Record<string, unknown>,
  pollingActions: string[],
  executeRead: ModbusReadCommandExecutor,
  options?: {
    onGroupFailure?: (groupKey: string, error: string) => void;
    cycleProfileCache?: ModbusCycleProfileCache;
  },
): Promise<{ results: PollingActionResult[]; transactionCount: number }> {
  const bulkActions = pollingActions.filter((action) => !isTimeIntegratedAction(mapping, action));
  const refs = collectPollingRefsFromMapping(mapping, bulkActions);

  if (refs.length === 0) {
    return { results: [], transactionCount: 0 };
  }

  const executor = createModbusBulkReadExecutor(executeRead);
  const groupingOpts: {
    onProfileFailure: (profileId: string, error: string) => void;
    onAdjacentGroupFailure: (groupKey: string, error: string) => void;
    cycleProfileCache?: ModbusCycleProfileCache;
  } = {
    onProfileFailure: (profileId, error) => {
      options?.onGroupFailure?.(profileId, error);
    },
    onAdjacentGroupFailure: (groupKey, error) => {
      options?.onGroupFailure?.(groupKey, error);
    },
  };

  if (options?.cycleProfileCache) {
    groupingOpts.cycleProfileCache = options.cycleProfileCache;
  }

  const { results: bulkMap, transactionCount } = await executePollingBulkReadsWithFunctionalGrouping(
    refs,
    executor,
    groupingOpts,
  );

  return {
    results: bulkMapToPollingResults(bulkMap, bulkActions),
    transactionCount,
  };
}
