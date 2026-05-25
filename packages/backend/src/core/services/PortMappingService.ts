import { CLIENT_PORT_MAPPINGS } from '../../data/clientPortMappings';
import {
  buildDiUnitMapping,
  buildDoUnitMapping,
  DI_ASSIGNABLE_DEVICE_TYPES,
  DO_ASSIGNABLE_DEVICE_TYPES,
  inferDefaultDiPort,
  isDiAssignableDeviceType,
  isDiPortKey,
  isDoAssignableDeviceType,
  isDoPortKey,
  resolveDoPortFromUnitMapping,
  type DiPortKey,
  type DoPortKey,
} from '../../data/portMapping';
import { UnitDiAssignment } from '../../models/schemas/UnitDiAssignmentSchema';
import { UnitDoAssignment } from '../../models/schemas/UnitDoAssignmentSchema';
import { Logger } from '../../shared/services/Logger';

function clearProtocolMappingCache(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { clearMappingCache } = require('../../meta/protocols') as { clearMappingCache: () => void };
  clearMappingCache();
}

type ClientMappingRecord = Record<string, Record<string, Record<string, unknown>>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClientMappingRoot = Record<string, any>;

function assignmentKey(deviceType: string, unitId: string): string {
  return `${deviceType}:${unitId}`;
}

export class PortMappingService {
  private static instance: PortMappingService;
  private readonly log = new Logger();

  /** clientId → (deviceType:unitId → doPort) */
  private readonly dbDoAssignments = new Map<string, Map<string, DoPortKey>>();

  /** clientId → (deviceType:unitId → diPort) */
  private readonly dbDiAssignments = new Map<string, Map<string, DiPortKey>>();

  /** 병합된 CLIENT_PORT_MAPPINGS[clientId] */
  private readonly effectiveByClient = new Map<string, ClientMappingRoot>();

  private constructor() {}

  static getInstance(): PortMappingService {
    if (!PortMappingService.instance) {
      PortMappingService.instance = new PortMappingService();
    }
    return PortMappingService.instance;
  }

  /**
   * DB 할당 전체를 메모리에 반영 후 effective 캐시 재구성
   */
  async refreshFromDatabase(clientId?: string): Promise<void> {
    const filter = clientId ? { clientId } : {};
    const [doRows, diRows] = await Promise.all([
      UnitDoAssignment.find(filter).lean(),
      UnitDiAssignment.find(filter).lean(),
    ]);

    if (clientId) {
      this.dbDoAssignments.delete(clientId);
      this.dbDiAssignments.delete(clientId);
    } else {
      this.dbDoAssignments.clear();
      this.dbDiAssignments.clear();
    }

    for (const row of doRows) {
      if (!isDoPortKey(row.doPort) || !isDoAssignableDeviceType(row.deviceType)) {
        continue;
      }
      let clientMap = this.dbDoAssignments.get(row.clientId);
      if (!clientMap) {
        clientMap = new Map();
        this.dbDoAssignments.set(row.clientId, clientMap);
      }
      clientMap.set(assignmentKey(row.deviceType, row.unitId), row.doPort);
    }

    for (const row of diRows) {
      if (!isDiPortKey(row.diPort) || !isDiAssignableDeviceType(row.deviceType)) {
        continue;
      }
      let clientMap = this.dbDiAssignments.get(row.clientId);
      if (!clientMap) {
        clientMap = new Map();
        this.dbDiAssignments.set(row.clientId, clientMap);
      }
      clientMap.set(assignmentKey(row.deviceType, row.unitId), row.diPort);
    }

    const clientIds = clientId ? [clientId] : Object.keys(CLIENT_PORT_MAPPINGS);
    for (const id of clientIds) {
      this.rebuildEffectiveForClient(id);
    }

    clearProtocolMappingCache();
  }

  invalidate(clientId?: string): void {
    if (clientId) {
      this.effectiveByClient.delete(clientId);
    } else {
      this.effectiveByClient.clear();
    }
    clearProtocolMappingCache();
  }

  getDbDoPort(clientId: string, deviceType: string, unitId: string): DoPortKey | undefined {
    return this.dbDoAssignments.get(clientId)?.get(assignmentKey(deviceType, unitId));
  }

  getDbDiPort(clientId: string, deviceType: string, unitId: string): DiPortKey | undefined {
    return this.dbDiAssignments.get(clientId)?.get(assignmentKey(deviceType, unitId));
  }

  /**
   * TS 기본값 + DB doPort 병합 결과 (동기)
   */
  getEffectiveClientMapping(clientId: string): ClientMappingRoot | undefined {
    if (!this.effectiveByClient.has(clientId)) {
      this.rebuildEffectiveForClient(clientId);
    }
    return this.effectiveByClient.get(clientId);
  }

  getEffectiveClientMappings(): Record<string, ClientMappingRoot> {
    for (const clientId of Object.keys(CLIENT_PORT_MAPPINGS)) {
      if (!this.effectiveByClient.has(clientId)) {
        this.rebuildEffectiveForClient(clientId);
      }
    }
    const out: Record<string, ClientMappingRoot> = {};
    for (const [clientId, mapping] of this.effectiveByClient) {
      out[clientId] = mapping;
    }
    return out;
  }

  getUnitMapping(
    clientId: string,
    deviceType: string,
    unitId: string,
  ): Record<string, unknown> | undefined {
    const client = this.getEffectiveClientMapping(clientId);
    if (!client) {
      return undefined;
    }
    const device = client[deviceType] as Record<string, Record<string, unknown>> | undefined;
    return device?.[unitId];
  }

  private rebuildEffectiveForClient(clientId: string): void {
    const base = (CLIENT_PORT_MAPPINGS as Record<string, ClientMappingRoot>)[clientId];
    if (!base) {
      return;
    }

    const merged = structuredClone(base) as Record<string, unknown>;
    const doOverrides = this.dbDoAssignments.get(clientId);

    if (doOverrides) {
      for (const [key, doPort] of doOverrides) {
        const [deviceType, unitId] = key.split(':');
        if (!deviceType || !unitId || !isDoAssignableDeviceType(deviceType)) {
          continue;
        }
        const device = merged[deviceType] as Record<string, Record<string, unknown>> | undefined;
        if (!device?.[unitId]) {
          continue;
        }
        device[unitId] = buildDoUnitMapping(deviceType, doPort);
      }
    }

    for (const deviceType of DI_ASSIGNABLE_DEVICE_TYPES) {
      const device = merged[deviceType] as Record<string, Record<string, unknown>> | undefined;
      if (!device) {
        continue;
      }
      const diOverrides = this.dbDiAssignments.get(clientId);
      for (const unitId of Object.keys(device)) {
        const diPort =
          diOverrides?.get(assignmentKey(deviceType, unitId)) ??
          inferDefaultDiPort(clientId, deviceType, unitId);
        if (!diPort) {
          continue;
        }
        Object.assign(device[unitId] as Record<string, unknown>, buildDiUnitMapping(diPort));
      }
    }

    this.effectiveByClient.set(clientId, merged);
  }

  /**
   * TS CLIENT_PORT_MAPPINGS에서 DO 번호 추출
   */
  inferDoPortFromTs(clientId: string, deviceType: string, unitId: string): DoPortKey | null {
    const base = (CLIENT_PORT_MAPPINGS as Record<string, ClientMappingRecord>)[clientId];
    const unitMapping = base?.[deviceType]?.[unitId] as Record<string, unknown> | undefined;
    if (!unitMapping) {
      return null;
    }
    return resolveDoPortFromUnitMapping(
      unitMapping as Record<string, import('../../data/clientPortMappings/types').CommandConfig | 'TIME_INTEGRATED'>,
    );
  }

  /**
   * 현장 1대 배포: 활성 clientId 외 unitDo/DiAssignments 문서 삭제 및 캐시 정리
   */
  async purgePortAssignmentsExcept(clientId: string): Promise<{ doRemoved: number; diRemoved: number }> {
    const [doResult, diResult] = await Promise.all([
      UnitDoAssignment.deleteMany({ clientId: { $ne: clientId } }),
      UnitDiAssignment.deleteMany({ clientId: { $ne: clientId } }),
    ]);

    for (const id of [...this.dbDoAssignments.keys()]) {
      if (id !== clientId) {
        this.dbDoAssignments.delete(id);
      }
    }
    for (const id of [...this.dbDiAssignments.keys()]) {
      if (id !== clientId) {
        this.dbDiAssignments.delete(id);
      }
    }
    for (const id of [...this.effectiveByClient.keys()]) {
      if (id !== clientId) {
        this.effectiveByClient.delete(id);
      }
    }

    await this.refreshFromDatabase(clientId);

    const doRemoved = doResult.deletedCount ?? 0;
    const diRemoved = diResult.deletedCount ?? 0;
    this.log.info(`접점 포트 정리: 활성 현장=${clientId}, 다른 현장 DO ${doRemoved}건·DI ${diRemoved}건 삭제`);
    return { doRemoved, diRemoved };
  }

  /**
   * 기동 시·수동: DB에 없는 유닛만 TS 기준 insert
   */
  async seedMissingFromTs(clientId?: string): Promise<{ inserted: number; skipped: number }> {
    const clientIds = clientId ? [clientId] : Object.keys(CLIENT_PORT_MAPPINGS);
    let inserted = 0;
    let skipped = 0;

    for (const cid of clientIds) {
      const base = (CLIENT_PORT_MAPPINGS as Record<string, ClientMappingRecord>)[cid];
      if (!base) {
        continue;
      }

      for (const deviceType of DO_ASSIGNABLE_DEVICE_TYPES) {
        const device = base[deviceType];
        if (!device) {
          continue;
        }

        for (const unitId of Object.keys(device)) {
          const doPort = this.inferDoPortFromTs(cid, deviceType, unitId);
          if (!doPort) {
            skipped += 1;
            continue;
          }

          const exists = await UnitDoAssignment.findOne({
            clientId: cid,
            deviceType,
            unitId,
          });

          if (exists) {
            skipped += 1;
            continue;
          }

          await UnitDoAssignment.create({
            clientId: cid,
            deviceType,
            unitId,
            doPort,
          });
          inserted += 1;
        }
      }
    }

    let diInserted = 0;
    let diSkipped = 0;

    for (const cid of clientIds) {
      const base = (CLIENT_PORT_MAPPINGS as Record<string, ClientMappingRecord>)[cid];
      if (!base) {
        continue;
      }

      for (const deviceType of DI_ASSIGNABLE_DEVICE_TYPES) {
        const device = base[deviceType];
        if (!device) {
          continue;
        }

        for (const unitId of Object.keys(device)) {
          const diPort = inferDefaultDiPort(cid, deviceType, unitId);
          if (!diPort) {
            diSkipped += 1;
            continue;
          }

          const exists = await UnitDiAssignment.findOne({
            clientId: cid,
            deviceType,
            unitId,
          });

          if (exists) {
            diSkipped += 1;
            continue;
          }

          await UnitDiAssignment.create({
            clientId: cid,
            deviceType,
            unitId,
            diPort,
          });
          diInserted += 1;
        }
      }
    }

    await this.refreshFromDatabase(clientId);
    this.log.info(
      `접점 포트 시드: DO inserted=${inserted} skipped=${skipped}, DI inserted=${diInserted} skipped=${diSkipped}${clientId ? ` client=${clientId}` : ''}`,
    );
    return { inserted, skipped };
  }

  /**
   * 현장 전체 삭제 후 TS/기본값 기준 재삽입
   */
  async resetClientFromTs(clientId: string): Promise<{ doInserted: number; diInserted: number }> {
    await UnitDoAssignment.deleteMany({ clientId });
    await UnitDiAssignment.deleteMany({ clientId });

    const base = (CLIENT_PORT_MAPPINGS as Record<string, ClientMappingRecord>)[clientId];
    if (!base) {
      await this.refreshFromDatabase(clientId);
      return { doInserted: 0, diInserted: 0 };
    }

    const doDocs: Array<{ clientId: string; deviceType: string; unitId: string; doPort: DoPortKey }> = [];
    const diDocs: Array<{ clientId: string; deviceType: string; unitId: string; diPort: DiPortKey }> = [];

    for (const deviceType of DO_ASSIGNABLE_DEVICE_TYPES) {
      const device = base[deviceType];
      if (!device) {
        continue;
      }
      for (const unitId of Object.keys(device)) {
        const doPort = this.inferDoPortFromTs(clientId, deviceType, unitId);
        if (doPort) {
          doDocs.push({ clientId, deviceType, unitId, doPort });
        }
      }
    }

    for (const deviceType of DI_ASSIGNABLE_DEVICE_TYPES) {
      const device = base[deviceType];
      if (!device) {
        continue;
      }
      for (const unitId of Object.keys(device)) {
        const diPort = inferDefaultDiPort(clientId, deviceType, unitId);
        if (diPort) {
          diDocs.push({ clientId, deviceType, unitId, diPort });
        }
      }
    }

    if (doDocs.length > 0) {
      await UnitDoAssignment.insertMany(doDocs, { ordered: false });
    }
    if (diDocs.length > 0) {
      await UnitDiAssignment.insertMany(diDocs, { ordered: false });
    }

    await this.refreshFromDatabase(clientId);
    this.log.info(`접점 포트 초기화: client=${clientId} DO=${doDocs.length} DI=${diDocs.length}`);
    return { doInserted: doDocs.length, diInserted: diDocs.length };
  }

  validateDoAssignmentBatchDuplicates(
    assignments: Array<{ deviceType: string; unitId: string; doPort: DoPortKey }>,
  ): string[] {
    const used = new Map<string, string>();
    const conflicts: string[] = [];

    for (const { deviceType, unitId, doPort } of assignments) {
      const prev = used.get(doPort);
      if (prev) {
        conflicts.push(`DO ${doPort}가 ${prev}와 ${deviceType}/${unitId}에 중복 할당되었습니다.`);
      } else {
        used.set(doPort, `${deviceType}/${unitId}`);
      }
    }

    return conflicts;
  }

  validateDiAssignmentBatchDuplicates(
    assignments: Array<{ deviceType: string; unitId: string; diPort: DiPortKey }>,
  ): string[] {
    const used = new Map<string, string>();
    const conflicts: string[] = [];

    for (const { deviceType, unitId, diPort } of assignments) {
      const prev = used.get(diPort);
      if (prev) {
        conflicts.push(`DI ${diPort}가 ${prev}와 ${deviceType}/${unitId}에 중복 할당되었습니다.`);
      } else {
        used.set(diPort, `${deviceType}/${unitId}`);
      }
    }

    return conflicts;
  }

  async saveClientPortAssignments(
    clientId: string,
    payload: {
      doAssignments?: Array<{ deviceType: string; unitId: string; doPort: DoPortKey }>;
      diAssignments?: Array<{ deviceType: string; unitId: string; diPort: DiPortKey }>;
    },
    updatedBy?: string,
  ): Promise<void> {
    const doAssignments = payload.doAssignments ?? [];
    const diAssignments = payload.diAssignments ?? [];

    const doConflicts = this.validateDoAssignmentBatchDuplicates(doAssignments);
    const diConflicts = this.validateDiAssignmentBatchDuplicates(diAssignments);
    const conflicts = [...doConflicts, ...diConflicts];
    if (conflicts.length > 0) {
      throw new Error(conflicts.join(' '));
    }

    await UnitDoAssignment.deleteMany({ clientId });
    await UnitDiAssignment.deleteMany({ clientId });

    if (doAssignments.length > 0) {
      await UnitDoAssignment.insertMany(
        doAssignments.map((a) => ({
          clientId,
          deviceType: a.deviceType,
          unitId: a.unitId,
          doPort: a.doPort,
          updatedBy,
        })),
      );
    }

    if (diAssignments.length > 0) {
      await UnitDiAssignment.insertMany(
        diAssignments.map((a) => ({
          clientId,
          deviceType: a.deviceType,
          unitId: a.unitId,
          diPort: a.diPort,
          updatedBy,
        })),
      );
    }

    await this.refreshFromDatabase(clientId);
  }

  /** @deprecated saveClientPortAssignments 사용 */
  async saveClientAssignments(
    clientId: string,
    assignments: Array<{ deviceType: string; unitId: string; doPort: DoPortKey }>,
    updatedBy?: string,
  ): Promise<void> {
    return this.saveClientPortAssignments(clientId, { doAssignments: assignments }, updatedBy);
  }

  async listDoAssignmentsForClient(
    clientId: string,
  ): Promise<
    Array<{
      deviceType: string;
      deviceId: string;
      deviceName: string;
      unitId: string;
      unitName: string;
      doPort: DoPortKey | null;
      source: 'db' | 'file';
    }>
  > {
    const { Device } = await import('../../models/schemas/DeviceSchema');
    const { Unit } = await import('../../models/schemas/UnitSchema');

    const devices = await Device.find({ clientId }).lean();
    const rows: Array<{
      deviceType: string;
      deviceId: string;
      deviceName: string;
      unitId: string;
      unitName: string;
      doPort: DoPortKey | null;
      source: 'db' | 'file';
    }> = [];

    for (const device of devices) {
      if (!isDoAssignableDeviceType(device.type)) {
        continue;
      }

      const units = await Unit.find({ clientId, deviceId: device.deviceId }).lean();
      for (const unit of units) {
        const dbPort = this.getDbDoPort(clientId, device.type, unit.unitId);
        const filePort = this.inferDoPortFromTs(clientId, device.type, unit.unitId);
        const doPort = dbPort ?? filePort;
        rows.push({
          deviceType: device.type,
          deviceId: device.deviceId,
          deviceName: device.name,
          unitId: unit.unitId,
          unitName: unit.name,
          doPort,
          source: dbPort ? 'db' : 'file',
        });
      }
    }

    return rows;
  }

  async listDiAssignmentsForClient(
    clientId: string,
  ): Promise<
    Array<{
      deviceType: string;
      deviceId: string;
      deviceName: string;
      unitId: string;
      unitName: string;
      diPort: DiPortKey | null;
      source: 'db' | 'file';
    }>
  > {
    const { Device } = await import('../../models/schemas/DeviceSchema');
    const { Unit } = await import('../../models/schemas/UnitSchema');

    const devices = await Device.find({ clientId }).lean();
    const rows: Array<{
      deviceType: string;
      deviceId: string;
      deviceName: string;
      unitId: string;
      unitName: string;
      diPort: DiPortKey | null;
      source: 'db' | 'file';
    }> = [];

    for (const device of devices) {
      if (!isDiAssignableDeviceType(device.type)) {
        continue;
      }

      const units = await Unit.find({ clientId, deviceId: device.deviceId }).lean();
      for (const unit of units) {
        const dbPort = this.getDbDiPort(clientId, device.type, unit.unitId);
        const filePort = inferDefaultDiPort(clientId, device.type, unit.unitId);
        const diPort = dbPort ?? filePort;
        rows.push({
          deviceType: device.type,
          deviceId: device.deviceId,
          deviceName: device.name,
          unitId: unit.unitId,
          unitName: unit.name,
          diPort,
          source: dbPort ? 'db' : 'file',
        });
      }
    }

    return rows;
  }

  /** @deprecated listDoAssignmentsForClient / listDiAssignmentsForClient 사용 */
  async listAssignmentsForClient(clientId: string) {
    return this.listDoAssignmentsForClient(clientId);
  }
}

/** 병합된 클라이언트 매핑 (폴링·fieldUtils 등에서 CLIENT_PORT_MAPPINGS 대체) */
export function getEffectiveClientMapping(clientId: string): Record<string, any> | undefined {
  return PortMappingService.getInstance().getEffectiveClientMapping(clientId);
}

export function getEffectiveClientMappings(): Record<string, Record<string, any>> {
  return PortMappingService.getInstance().getEffectiveClientMappings();
}

