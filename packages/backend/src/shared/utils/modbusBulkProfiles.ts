import { HW_PORTS, MODBUS_FC, PortCommand } from '../../meta/hardware/ports';

/** 기능·하드웨어 블록 단위 Modbus read 프로필 */
export interface ModbusBulkReadProfile {
  id: string;
  functionCode: number;
  startAddress: number;
  length: number;
  /** 매칭할 HW_PORTS 키 (정규식) */
  hwPortPattern: RegExp;
}

/** DO1~16 AUTO 코일 블록, COOLER/EXCHANGER AUTO 포함 */
export const PROFILE_DO_COIL_MODE: ModbusBulkReadProfile = {
  id: 'DO_COIL_MODE',
  functionCode: MODBUS_FC.RD_COILS,
  startAddress: 351,
  length: 16,
  hwPortPattern: /^(DO\d{1,2}|COOLER|EXCHANGER)$/,
};

/** DO1~16 POWER/STATUS 코일 블록 */
export const PROFILE_DO_COIL_STATUS: ModbusBulkReadProfile = {
  id: 'DO_COIL_STATUS',
  functionCode: MODBUS_FC.RD_COILS,
  startAddress: 820,
  length: 16,
  hwPortPattern: /^DO\d{1,2}$/,
};

/** 냉난방기 HR 주요 상태 블록 */
export const PROFILE_COOLER_HR: ModbusBulkReadProfile = {
  id: 'COOLER_HR',
  functionCode: MODBUS_FC.RD_HLD_REG,
  startAddress: 115,
  length: 12,
  hwPortPattern: /^COOLER$/,
};

/** 전열교환기 HR 주요 상태 블록 */
export const PROFILE_EXCHANGER_HR: ModbusBulkReadProfile = {
  id: 'EXCHANGER_HR',
  functionCode: MODBUS_FC.RD_HLD_REG,
  startAddress: 111,
  length: 4,
  hwPortPattern: /^EXCHANGER$/,
};

/** 통합센서 HR 블록 */
export const PROFILE_INTEGRATED_SENSOR_HR: ModbusBulkReadProfile = {
  id: 'INTEGRATED_SENSOR_HR',
  functionCode: MODBUS_FC.RD_HLD_REG,
  startAddress: 131,
  length: 10,
  hwPortPattern: /^INTEGRATED_SENSOR$/,
};

export const GLOBAL_MODBUS_BULK_PROFILES: ModbusBulkReadProfile[] = [
  PROFILE_DO_COIL_MODE,
  PROFILE_DO_COIL_STATUS,
  PROFILE_COOLER_HR,
  PROFILE_EXCHANGER_HR,
  PROFILE_INTEGRATED_SENSOR_HR,
];

const DO_PORT_KEYS = Array.from({ length: 16 }, (_, i) => `DO${i + 1}`);

let doSchedProfileCache: Map<string, ModbusBulkReadProfile> | null = null;

function isSchedCommand(command: string): boolean {
  return command.startsWith('SCHED');
}

/** DO별 스케줄 HR GET 주소 span → 한 번에 read */
export function buildDoSchedBulkProfiles(): Map<string, ModbusBulkReadProfile> {
  if (doSchedProfileCache) {
    return doSchedProfileCache;
  }

  const profiles = new Map<string, ModbusBulkReadProfile>();
  const hw = HW_PORTS as Record<string, Record<string, PortCommand>>;

  for (const portKey of DO_PORT_KEYS) {
    const block = hw[portKey];
    if (!block) {
      continue;
    }

    const schedAddresses: number[] = [];
    for (const [command, portCommand] of Object.entries(block)) {
      if (!isSchedCommand(command) || !portCommand?.get) {
        continue;
      }
      if (portCommand.get.functionCode === MODBUS_FC.RD_HLD_REG) {
        schedAddresses.push(portCommand.get.address);
      }
    }

    if (schedAddresses.length < 2) {
      continue;
    }

    const startAddress = Math.min(...schedAddresses);
    const endAddress = Math.max(...schedAddresses);
    profiles.set(portKey, {
      id: `${portKey}_SCHED_HR`,
      functionCode: MODBUS_FC.RD_HLD_REG,
      startAddress,
      length: endAddress - startAddress + 1,
      hwPortPattern: new RegExp(`^${portKey}$`),
    });
  }

  doSchedProfileCache = profiles;
  return profiles;
}

export function clearModbusBulkProfileCache(): void {
  doSchedProfileCache = null;
}

export function refMatchesProfile(
  ref: { functionCode: number; address: number; hwPort?: string },
  profile: ModbusBulkReadProfile,
): boolean {
  if (!ref.hwPort || !profile.hwPortPattern.test(ref.hwPort)) {
    return false;
  }
  if (ref.functionCode !== profile.functionCode) {
    return false;
  }
  return ref.address >= profile.startAddress && ref.address < profile.startAddress + profile.length;
}

export function resolveProfileForRef(ref: {
  functionCode: number;
  address: number;
  hwPort?: string;
  hwCommand?: string;
}): ModbusBulkReadProfile | null {
  if (!ref.hwPort) {
    return null;
  }

  for (const profile of GLOBAL_MODBUS_BULK_PROFILES) {
    if (refMatchesProfile(ref, profile)) {
      return profile;
    }
  }

  const schedProfiles = buildDoSchedBulkProfiles();
  const schedProfile = schedProfiles.get(ref.hwPort);
  if (schedProfile && refMatchesProfile(ref, schedProfile)) {
    if (ref.hwCommand && isSchedCommand(ref.hwCommand)) {
      return schedProfile;
    }
  }

  return null;
}
