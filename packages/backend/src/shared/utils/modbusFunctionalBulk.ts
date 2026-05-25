import {
  ModbusBulkReadProfile,
  resolveProfileForRef,
} from './modbusBulkProfiles';
import {
  ModbusCycleProfileCache,
  sliceRefValueFromProfileData,
  tryResolveRefFromCycleCache,
} from './modbusCycleProfileCache';
import { lookupHwPortGet } from './modbusHwPortIndex';
import {
  executeBulkRegisterReads,
  ModbusBulkReadExecutor,
  ModbusRegisterReadRef,
} from './modbusBulkRead';

export interface FunctionalBulkPlan {
  profile: ModbusBulkReadProfile;
  members: ModbusRegisterReadRef[];
}

/** ref에 HW 포트 메타데이터 부여 */
export function enrichPollingRefsWithHwPort(refs: ModbusRegisterReadRef[]): ModbusRegisterReadRef[] {
  return refs.map(ref => {
    const lookup = lookupHwPortGet(ref.functionCode, ref.address);
    if (!lookup) {
      return ref;
    }

    return {
      ...ref,
      hwPort: lookup.hwPort,
      hwCommand: lookup.hwCommand,
      port: lookup.hwPort,
      command: lookup.hwCommand,
    };
  });
}

/** 기능 프로필별로 ref 그룹핑 */
export function planFunctionalBulkReads(refs: ModbusRegisterReadRef[]): {
  plans: FunctionalBulkPlan[];
  remaining: ModbusRegisterReadRef[];
} {
  const planById = new Map<string, FunctionalBulkPlan>();
  const remaining: ModbusRegisterReadRef[] = [];

  for (const ref of refs) {
    const profile = resolveProfileForRef(ref);
    if (!profile) {
      remaining.push(ref);
      continue;
    }

    const existing = planById.get(profile.id);
    if (existing) {
      existing.members.push(ref);
    } else {
      planById.set(profile.id, { profile, members: [ref] });
    }
  }

  return { plans: Array.from(planById.values()), remaining };
}

/**
 * 기능 프로필 bulk read 실행 후 결과 맵 반환.
 * 실패한 프로필 멤버는 remaining으로 넘겨 인접 bulk fallback.
 */
export async function executeFunctionalBulkReads(
  refs: ModbusRegisterReadRef[],
  executeRead: ModbusBulkReadExecutor,
  options?: {
    onProfileFailure?: (profileId: string, error: string) => void;
    cycleProfileCache?: ModbusCycleProfileCache;
  },
): Promise<{
  results: Map<string, number[]>;
  remainingRefs: ModbusRegisterReadRef[];
  transactionCount: number;
}> {
  const enriched = enrichPollingRefsWithHwPort(refs);
  const { plans, remaining: unassigned } = planFunctionalBulkReads(enriched);

  const results = new Map<string, number[]>();
  const failedMembers: ModbusRegisterReadRef[] = [...unassigned];
  let transactionCount = 0;
  const cache = options?.cycleProfileCache;

  for (const { profile, members } of plans) {
    if (cache?.hasProfile(profile.id) && !cache.isFailed(profile.id)) {
      const profileData = cache.getProfileData(profile.id);
      if (profileData) {
        for (const member of members) {
          results.set(member.key, sliceRefValueFromProfileData(member, profile, profileData));
        }
        continue;
      }
    }

    const readResult = await executeRead(profile.functionCode, profile.startAddress, profile.length);
    transactionCount++;

    if (readResult.success && Array.isArray(readResult.data)) {
      const profileData = readResult.data.map(v => Number(v));
      cache?.setProfileData(profile.id, profileData);

      for (const member of members) {
        results.set(member.key, sliceRefValueFromProfileData(member, profile, profileData));
      }
      continue;
    }

    const errMsg = readResult.error ?? 'functional profile read failed';
    cache?.markFailed(profile.id);
    options?.onProfileFailure?.(profile.id, errMsg);
    failedMembers.push(...members);
  }

  if (cache) {
    for (const ref of enriched) {
      if (results.has(ref.key)) {
        continue;
      }
      const cached = tryResolveRefFromCycleCache(ref, cache);
      if (cached) {
        results.set(ref.key, cached);
      }
    }
  }

  return {
    results,
    remainingRefs: failedMembers.filter(ref => !results.has(ref.key)),
    transactionCount,
  };
}

/**
 * 기능 bulk → 남은 ref 인접 bulk (폴링 공통 파이프라인)
 */
export async function executePollingBulkReadsWithFunctionalGrouping(
  refs: ModbusRegisterReadRef[],
  executeRead: ModbusBulkReadExecutor,
  options?: {
    onProfileFailure?: (profileId: string, error: string) => void;
    onAdjacentGroupFailure?: (groupKey: string, error: string) => void;
    cycleProfileCache?: ModbusCycleProfileCache;
  },
): Promise<{ results: Map<string, number[]>; transactionCount: number }> {
  if (refs.length === 0) {
    return { results: new Map(), transactionCount: 0 };
  }

  const functionalOpts: {
    onProfileFailure?: (profileId: string, error: string) => void;
    cycleProfileCache?: ModbusCycleProfileCache;
  } = {};

  if (options?.onProfileFailure) {
    functionalOpts.onProfileFailure = options.onProfileFailure;
  }
  if (options?.cycleProfileCache) {
    functionalOpts.cycleProfileCache = options.cycleProfileCache;
  }

  const functional = await executeFunctionalBulkReads(
    refs,
    executeRead,
    Object.keys(functionalOpts).length > 0 ? functionalOpts : undefined,
  );

  let transactionCount = functional.transactionCount;
  const merged = new Map(functional.results);

  if (functional.remainingRefs.length > 0) {
    const adjacent = await executeBulkRegisterReads(functional.remainingRefs, executeRead, {
      onGroupFailure: (group, error) => {
        const groupKey = `fc${group.functionCode}@${group.startAddress}+${group.length}`;
        options?.onAdjacentGroupFailure?.(groupKey, error);
      },
    });
    transactionCount += adjacent.transactionCount;
    for (const [key, values] of adjacent.results) {
      merged.set(key, values);
    }
  }

  return { results: merged, transactionCount };
}
