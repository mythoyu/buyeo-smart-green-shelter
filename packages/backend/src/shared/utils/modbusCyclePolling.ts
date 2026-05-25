import { ModbusCycleProfileCache, tryResolveRefFromCycleCache } from './modbusCycleProfileCache';
import {
  ModbusCycleRegisterCache,
  tryResolveRefFromCycleRegisterCache,
} from './modbusCycleRemainingBulk';
import {
  collectPollingRefsFromMapping,
  executePollingBulkReads,
  isTimeIntegratedAction,
  ModbusReadCommandExecutor,
  PollingActionResult,
} from './modbusReadPlan';

/** 사이클 캐시에서 bulk GET 액션 결과 조립 (Modbus 호출 없음) */
export function buildBulkResultsFromCycleCache(
  mapping: Record<string, unknown>,
  bulkActions: string[],
  profileCache: ModbusCycleProfileCache,
  registerCache?: ModbusCycleRegisterCache,
): Map<string, PollingActionResult> {
  const refs = collectPollingRefsFromMapping(mapping, bulkActions);
  const resultByAction = new Map<string, PollingActionResult>();

  for (const ref of refs) {
    let values: number[] | null = tryResolveRefFromCycleCache(ref, profileCache);
    if ((!values || values.length === 0) && registerCache) {
      values = tryResolveRefFromCycleRegisterCache(ref, registerCache);
    }

    if (values && values.length > 0) {
      resultByAction.set(ref.key, { action: ref.key, success: true, data: values });
    } else {
      resultByAction.set(ref.key, {
        action: ref.key,
        success: false,
        error: registerCache ? 'cycle register cache miss' : 'cycle cache miss',
      });
    }
  }

  return resultByAction;
}

/**
 * 사이클 캐시 우선 → miss만 Modbus fallback, TIME_INTEGRATED는 유닛별 read
 */
export async function executeUnitPollingInCycle(
  mapping: Record<string, unknown>,
  pollingActions: string[],
  cache: ModbusCycleProfileCache,
  runTimeIntegratedAction: (action: string) => Promise<unknown>,
  executeRead: ModbusReadCommandExecutor,
  options?: {
    onGroupFailure?: (groupKey: string, error: string) => void;
    /** 사이클 전역 인접 bulk 캐시 (있으면 유닛별 Modbus fallback 생략) */
    cycleRegisterCache?: ModbusCycleRegisterCache;
  },
): Promise<{ results: PollingActionResult[]; transactionCount: number }> {
  const bulkActions = pollingActions.filter(action => !isTimeIntegratedAction(mapping, action));
  const bulkResultByAction = new Map<string, PollingActionResult>();
  let transactionCount = 0;
  const registerCache = options?.cycleRegisterCache;

  if (bulkActions.length > 0) {
    const fromCache = buildBulkResultsFromCycleCache(mapping, bulkActions, cache, registerCache);
    for (const [action, result] of fromCache) {
      bulkResultByAction.set(action, result);
    }

    const missedActions = bulkActions.filter(action => {
      const item = bulkResultByAction.get(action);
      return !item?.success;
    });

    // 사이클 register 캐시가 없을 때만 유닛 단위 bulk fallback
    if (missedActions.length > 0 && !registerCache) {
      const fallbackOpts: {
        onGroupFailure?: (groupKey: string, error: string) => void;
        cycleProfileCache: ModbusCycleProfileCache;
      } = { cycleProfileCache: cache };
      if (options?.onGroupFailure) {
        fallbackOpts.onGroupFailure = options.onGroupFailure;
      }
      const fallback = await executePollingBulkReads(mapping, missedActions, executeRead, fallbackOpts);
      transactionCount += fallback.transactionCount;
      for (const item of fallback.results) {
        bulkResultByAction.set(item.action, item);
      }
    }
  }

  const ordered: PollingActionResult[] = [];

  for (const action of pollingActions) {
    if (isTimeIntegratedAction(mapping, action)) {
      try {
        const data = await runTimeIntegratedAction(action);
        ordered.push({ action, success: true, data });
        transactionCount += 2;
      } catch (error) {
        ordered.push({
          action,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      continue;
    }

    const bulkItem = bulkResultByAction.get(action);
    if (bulkItem) {
      ordered.push(bulkItem);
      continue;
    }

    ordered.push({
      action,
      success: false,
      error: 'no modbus spec for bulk read',
    });
  }

  return { results: ordered, transactionCount };
}
