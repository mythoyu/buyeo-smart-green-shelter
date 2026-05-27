/** Modbus 인접 레지스터 bulk read 그룹핑 (폴링·하드웨어 공통) */
export const MODBUS_BULK_MAX_GAP = 10;
export const MODBUS_BULK_MAX_LENGTH = 125;

export interface ModbusRegisterReadRef {
  /** 결과 맵 키 (폴링: action 이름, 하드웨어: "DO1:POWER") */
  key: string;
  port: string;
  command: string;
  functionCode: number;
  address: number;
  length: number;
  /** HW_PORTS 키 (기능 bulk 그룹핑) */
  hwPort?: string;
  hwCommand?: string;
}

export interface ModbusBulkReadGroup {
  functionCode: number;
  startAddress: number;
  length: number;
  members: Array<{
    key: string;
    port: string;
    command: string;
    registerOffset: number;
  }>;
}

export type ModbusBulkReadExecutor = (
  functionCode: number,
  startAddress: number,
  length: number,
) => Promise<{ success: boolean; data?: number[]; error?: string }>;

export function groupRegisterRefsForBulkRead(refs: ModbusRegisterReadRef[]): ModbusBulkReadGroup[] {
  const fcActions = new Map<
    number,
    Array<{ key: string; port: string; command: string; address: number }>
  >();

  for (const ref of refs) {
    if (!fcActions.has(ref.functionCode)) {
      fcActions.set(ref.functionCode, []);
    }
    fcActions.get(ref.functionCode)!.push({
      key: ref.key,
      port: ref.port,
      command: ref.command,
      address: ref.address,
    });
  }

  const groups: ModbusBulkReadGroup[] = [];

  for (const [functionCode, actions] of fcActions.entries()) {
    actions.sort((a, b) => a.address - b.address);
    let currentGroup = [actions[0]];

    for (let i = 1; i < actions.length; i++) {
      const prev = currentGroup[currentGroup.length - 1];
      const curr = actions[i];
      const gap = curr.address - (prev.address + 1);

      if (gap <= MODBUS_BULK_MAX_GAP && curr.address - currentGroup[0].address + 1 <= MODBUS_BULK_MAX_LENGTH) {
        currentGroup.push(curr);
      } else {
        groups.push(createBulkGroup(functionCode, currentGroup));
        currentGroup = [curr];
      }
    }

    if (currentGroup.length > 0) {
      groups.push(createBulkGroup(functionCode, currentGroup));
    }
  }

  return groups;
}

function createBulkGroup(
  functionCode: number,
  actions: Array<{ key: string; port: string; command: string; address: number }>,
): ModbusBulkReadGroup {
  const startAddress = actions[0].address;
  const endAddress = actions[actions.length - 1].address;
  const length = endAddress - startAddress + 1;

  return {
    functionCode,
    startAddress,
    length,
    members: actions.map((a) => ({
      key: a.key,
      port: a.port,
      command: a.command,
      registerOffset: a.address - startAddress,
    })),
  };
}

/**
 * 레지스터 ref 목록을 bulk 그룹으로 읽고 key → number[] 결과 반환
 */
export async function executeBulkRegisterReads(
  refs: ModbusRegisterReadRef[],
  executeRead: ModbusBulkReadExecutor,
  options?: {
    onGroupFailure?: (group: ModbusBulkReadGroup, error: string) => void;
  },
): Promise<{ results: Map<string, number[]>; transactionCount: number; failedMemberKeys: string[] }> {
  const results = new Map<string, number[]>();
  const failedMemberKeys: string[] = [];
  const groups = groupRegisterRefsForBulkRead(refs);
  let transactionCount = 0;

  for (const group of groups) {
    const readResult = await executeRead(group.functionCode, group.startAddress, group.length);
    transactionCount++;

    if (readResult.success && Array.isArray(readResult.data)) {
      for (const member of group.members) {
        const raw = readResult.data[member.registerOffset];
        results.set(member.key, raw !== undefined && raw !== null ? [Number(raw)] : []);
      }
      continue;
    }

    const errMsg = readResult.error ?? 'bulk read failed';
    options?.onGroupFailure?.(group, errMsg);

    // 정책: 그룹 read 실패 시 단일 read 폴백을 수행하지 않음.
    for (const member of group.members) {
      failedMemberKeys.push(member.key);
      results.set(member.key, []);
    }
  }

  return { results, transactionCount, failedMemberKeys };
}

export function bulkResultsToPortCommandMap(
  bulkResults: Map<string, number[]>,
): Record<string, Record<string, number[]>> {
  const out: Record<string, Record<string, number[]>> = {};

  for (const [key, values] of bulkResults.entries()) {
    const sep = key.indexOf(':');
    if (sep < 0) {
      continue;
    }
    const port = key.slice(0, sep);
    const command = key.slice(sep + 1);
    if (!out[port]) {
      out[port] = {};
    }
    out[port][command] = values;
  }

  return out;
}
