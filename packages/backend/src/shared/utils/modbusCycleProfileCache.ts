import { getEffectiveClientMapping } from '../../core/services/PortMappingService';

import { ModbusBulkReadProfile, resolveProfileForRef } from './modbusBulkProfiles';
import { ModbusBulkReadExecutor, ModbusRegisterReadRef } from './modbusBulkRead';
import { enrichPollingRefsWithHwPort, planFunctionalBulkReads } from './modbusFunctionalBulk';
import { collectPollingRefsFromMapping, isTimeIntegratedAction } from './modbusReadPlan';

/** 폴링 사이클 동안 공유하는 기능 프로필 read 결과 */
export class ModbusCycleProfileCache {
  private readonly dataByProfileId = new Map<string, number[]>();

  private readonly failedProfileIds = new Set<string>();

  get size(): number {
    return this.dataByProfileId.size;
  }

  hasProfile(profileId: string): boolean {
    return this.dataByProfileId.has(profileId);
  }

  isFailed(profileId: string): boolean {
    return this.failedProfileIds.has(profileId);
  }

  getProfileData(profileId: string): number[] | undefined {
    return this.dataByProfileId.get(profileId);
  }

  setProfileData(profileId: string, data: number[]): void {
    this.dataByProfileId.set(profileId, data);
    this.failedProfileIds.delete(profileId);
  }

  markFailed(profileId: string): void {
    this.failedProfileIds.add(profileId);
    this.dataByProfileId.delete(profileId);
  }
}

export function sliceRefValueFromProfileData(
  ref: ModbusRegisterReadRef,
  profile: ModbusBulkReadProfile,
  profileData: number[],
): number[] {
  const offset = ref.address - profile.startAddress;
  const raw = profileData[offset];
  if (raw === undefined || raw === null) {
    return [];
  }
  return [Number(raw)];
}

/** 유닛 매핑에서 bulk 대상 GET ref 수집 (TIME_INTEGRATED 제외) */
export function collectPollingRefsForUnit(
  clientId: string,
  deviceType: string,
  unitId: string,
): ModbusRegisterReadRef[] | null {
  const clientMapping = getEffectiveClientMapping(clientId) as Record<string, Record<string, Record<string, unknown>>> | undefined;
  if (!clientMapping?.[deviceType]) {
    return null;
  }

  if (deviceType === 'ddc_time' || deviceType === 'seasonal') {
    return null;
  }

  const unitMapping = clientMapping[deviceType][unitId] as Record<string, unknown>;
  if (!unitMapping) {
    return null;
  }

  const pollingActions = Object.keys(unitMapping).filter(
    action => action.startsWith('GET_') && !isTimeIntegratedAction(unitMapping, action),
  );

  return collectPollingRefsFromMapping(unitMapping, pollingActions);
}

/** 사이클 시작 시 필요한 기능 프로필을 한 번씩만 Modbus read */
export async function warmCycleProfileCache(
  allRefs: ModbusRegisterReadRef[],
  executeRead: ModbusBulkReadExecutor,
  cache: ModbusCycleProfileCache,
  options?: {
    onProfileFailure?: (profileId: string, error: string) => void;
  },
): Promise<number> {
  const enriched = enrichPollingRefsWithHwPort(allRefs);
  const { plans } = planFunctionalBulkReads(enriched);

  let transactionCount = 0;

  for (const { profile } of plans) {
    if (cache.hasProfile(profile.id) || cache.isFailed(profile.id)) {
      continue;
    }

    const readResult = await executeRead(profile.functionCode, profile.startAddress, profile.length);
    transactionCount++;

    if (readResult.success && Array.isArray(readResult.data)) {
      cache.setProfileData(profile.id, readResult.data.map(v => Number(v)));
      continue;
    }

    const errMsg = readResult.error ?? 'cycle profile read failed';
    cache.markFailed(profile.id);
    options?.onProfileFailure?.(profile.id, errMsg);
  }

  return transactionCount;
}

export function tryResolveRefFromCycleCache(
  ref: ModbusRegisterReadRef,
  cache: ModbusCycleProfileCache,
): number[] | null {
  const profile = resolveProfileForRef(ref);
  if (!profile || !cache.hasProfile(profile.id) || cache.isFailed(profile.id)) {
    return null;
  }

  const profileData = cache.getProfileData(profile.id);
  if (!profileData) {
    return null;
  }

  const values = sliceRefValueFromProfileData(ref, profile, profileData);
  return values.length > 0 ? values : null;
}
