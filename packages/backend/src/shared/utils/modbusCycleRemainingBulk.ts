import { executeBulkRegisterReads, ModbusBulkReadExecutor, ModbusRegisterReadRef } from './modbusBulkRead';
import { ModbusCycleProfileCache, tryResolveRefFromCycleCache } from './modbusCycleProfileCache';
import { enrichPollingRefsWithHwPort, planFunctionalBulkReads } from './modbusFunctionalBulk';

/** Modbus 레지스터 단위 캐시 키 (유닛·액션 무관) */
export function registerCacheKey(functionCode: number, address: number): string {
  return `${functionCode}:${address}`;
}

/** 사이클 단위 인접 bulk read 결과 (fc+address) */
export class ModbusCycleRegisterCache {
  private readonly registerData = new Map<string, number[]>();

  get size(): number {
    return this.registerData.size;
  }

  has(functionCode: number, address: number): boolean {
    return this.registerData.has(registerCacheKey(functionCode, address));
  }

  get(ref: Pick<ModbusRegisterReadRef, 'functionCode' | 'address'>): number[] | undefined {
    return this.registerData.get(registerCacheKey(ref.functionCode, ref.address));
  }

  setRegister(functionCode: number, address: number, data: number[]): void {
    this.registerData.set(registerCacheKey(functionCode, address), data);
  }
}

/** 동일 레지스터 중복 ref 제거 (사이클 bulk 1회 read) */
export function dedupeRefsByRegister(refs: ModbusRegisterReadRef[]): ModbusRegisterReadRef[] {
  const byRegister = new Map<string, ModbusRegisterReadRef>();

  for (const ref of refs) {
    const rk = registerCacheKey(ref.functionCode, ref.address);
    if (!byRegister.has(rk)) {
      byRegister.set(rk, ref);
    }
  }

  return [...byRegister.values()];
}

/**
 * 프로필 캐시에 없는 ref만 수집 (프로필 미매칭 + 프로필 miss/실패)
 */
export function collectRemainingRefsForCycleBulk(
  allRefs: ModbusRegisterReadRef[],
  profileCache: ModbusCycleProfileCache,
): ModbusRegisterReadRef[] {
  const enriched = enrichPollingRefsWithHwPort(allRefs);
  const { plans, remaining } = planFunctionalBulkReads(enriched);
  const needRead: ModbusRegisterReadRef[] = [...remaining];

  for (const { members } of plans) {
    for (const member of members) {
      const cached = tryResolveRefFromCycleCache(member, profileCache);
      if (!cached || cached.length === 0) {
        needRead.push(member);
      }
    }
  }

  return dedupeRefsByRegister(needRead);
}

export function tryResolveRefFromCycleRegisterCache(
  ref: ModbusRegisterReadRef,
  cache: ModbusCycleRegisterCache,
): number[] | null {
  const values = cache.get(ref);
  return values && values.length > 0 ? values : null;
}

/**
 * 사이클 시작 시 remaining ref를 전 유닛 합쳐 인접 bulk read (유닛별 fallback 대체)
 */
export async function warmCycleRemainingRegisterCache(
  allRefs: ModbusRegisterReadRef[],
  profileCache: ModbusCycleProfileCache,
  executeRead: ModbusBulkReadExecutor,
  options?: {
    onGroupFailure?: (groupKey: string, error: string) => void;
  },
): Promise<{ cache: ModbusCycleRegisterCache; transactionCount: number; registerCount: number }> {
  const refsToRead = collectRemainingRefsForCycleBulk(allRefs, profileCache);
  const cache = new ModbusCycleRegisterCache();

  if (refsToRead.length === 0) {
    return { cache, transactionCount: 0, registerCount: 0 };
  }

  const { results, transactionCount } = await executeBulkRegisterReads(refsToRead, executeRead, {
    onGroupFailure: (group, error) => {
      const groupKey = `fc${group.functionCode}@${group.startAddress}+${group.length}`;
      options?.onGroupFailure?.(groupKey, error);
    },
  });

  for (const ref of refsToRead) {
    const values = results.get(ref.key);
    if (values && values.length > 0) {
      cache.setRegister(ref.functionCode, ref.address, values);
    }
  }

  return { cache, transactionCount, registerCount: refsToRead.length };
}
