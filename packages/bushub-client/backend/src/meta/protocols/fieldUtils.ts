/**
 * Field 기반 역탐색 유틸 함수들
 *
 * 주요 기능:
 * 1. Field 이름으로 액션 키를 역탐색
 * 2. Device 객체의 변경 가능한 필드들에 대한 SET 액션 조회
 * 3. 검증을 위한 GET 액션 조회
 */

import { CLIENT_PORT_MAPPINGS } from '../../data/clientPortMappings';
import { IUnit } from '../../models/schemas/UnitSchema';

export interface FieldActionMapping {
  field: string;
  actionKey: string;
  kind: 'set' | 'get' | 'both';
  commandSpec: {
    functionCode: number;
    address: number;
    slaveId: number;
    length?: number;
  };
}

export interface FieldSearchOptions {
  kind?: 'set' | 'get' | 'both';
  includeTimeFields?: boolean;
  includeScheduleFields?: boolean;
}

/**
 * Field 기반으로 액션 키를 찾는 유틸
 */
export const getActionKeysByField = (
  unit: IUnit,
  field: string,
  options: FieldSearchOptions = {},
): FieldActionMapping[] => {
  const { kind = 'both', includeTimeFields = false, includeScheduleFields = false } = options;

  try {
    const { clientId } = unit;
    const deviceType = unit.type;
    const { unitId } = unit;

    // 클라이언트 매핑 존재 여부 확인
    if (!(CLIENT_PORT_MAPPINGS as any)[clientId]) {
      console.warn(`[FieldUtils] Client '${clientId}' not found in port mappings`);
      return [];
    }

    // 장비 타입 매핑 존재 여부 확인
    if (!(CLIENT_PORT_MAPPINGS as any)[clientId][deviceType]) {
      console.warn(`[FieldUtils] Device type '${deviceType}' not found for client '${clientId}'`);
      return [];
    }

    // 유닛 매핑 존재 여부 확인
    if (!(CLIENT_PORT_MAPPINGS as any)[clientId][deviceType][unitId]) {
      console.warn(`[FieldUtils] Unit '${unitId}' not found for device type '${deviceType}' in client '${clientId}'`);
      return [];
    }

    const unitMapping = (CLIENT_PORT_MAPPINGS as any)[clientId][deviceType][unitId];
    const results: FieldActionMapping[] = [];

    // 유닛 매핑의 모든 액션을 순회하며 field로 필터링
    for (const [actionKey, actionSpec] of Object.entries(unitMapping)) {
      const spec = actionSpec as any;

      // field 메타데이터 확인
      if (spec.field === field) {
        // 시간 필드 필터링
        if (!includeTimeFields && (field.includes('hour') || field.includes('minute'))) {
          continue;
        }

        // 스케줄 필드 필터링
        if (!includeScheduleFields && (field.includes('schedule') || field.includes('time'))) {
          continue;
        }

        // 액션 종류 필터링
        const actionKind = actionKey.startsWith('SET_') ? 'set' : actionKey.startsWith('GET_') ? 'get' : 'both';

        if (kind === 'both' || actionKind === kind || actionKind === 'both') {
          results.push({
            field,
            actionKey,
            kind: actionKind,
            commandSpec: {
              functionCode: spec.port.functionCode,
              address: spec.port.address,
              slaveId: spec.port.slaveId || 1,
              length: spec.port.length,
            },
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error(`[FieldUtils] Error finding action keys for field '${field}':`, error);
    return [];
  }
};

/**
 * Device 객체의 변경 가능한 필드들에 대한 SET 액션 조회
 */
export const getWritableFieldMappings = (
  unit: IUnit,
  deviceData: Record<string, any>,
  options: FieldSearchOptions = {},
): FieldActionMapping[] => {
  const { includeTimeFields = false, includeScheduleFields = false } = options;
  const results: FieldActionMapping[] = [];

  try {
    // deviceData의 모든 필드를 순회
    for (const [field, value] of Object.entries(deviceData)) {
      // 값이 존재하고 변경 가능한 필드인지 확인
      if (value !== undefined && value !== null) {
        // 시간 필드 필터링
        if (!includeTimeFields && (field.includes('hour') || field.includes('minute'))) {
          continue;
        }

        // 스케줄 필드 필터링
        if (!includeScheduleFields && (field.includes('schedule') || field.includes('time'))) {
          continue;
        }

        // SET 액션 찾기
        const setActions = getActionKeysByField(unit, field, {
          kind: 'set',
          includeTimeFields,
          includeScheduleFields,
        });

        results.push(...setActions);
      }
    }

    return results;
  } catch (error) {
    console.error(`[FieldUtils] Error getting writable field mappings:`, error);
    return [];
  }
};

/**
 * 검증을 위한 GET 액션 조회
 */
export const getVerificationFieldMappings = (
  unit: IUnit,
  deviceData: Record<string, any>,
  options: FieldSearchOptions = {},
): FieldActionMapping[] => {
  const { includeTimeFields = false, includeScheduleFields = false } = options;
  const results: FieldActionMapping[] = [];

  try {
    // deviceData의 모든 필드를 순회
    for (const [field, expectedValue] of Object.entries(deviceData)) {
      // 값이 존재하는 필드인지 확인
      if (expectedValue !== undefined && expectedValue !== null) {
        // 시간 필드 필터링
        if (!includeTimeFields && (field.includes('hour') || field.includes('minute'))) {
          continue;
        }

        // 스케줄 필드 필터링
        if (!includeScheduleFields && (field.includes('schedule') || field.includes('time'))) {
          continue;
        }

        // GET 액션 찾기
        const getActions = getActionKeysByField(unit, field, {
          kind: 'get',
          includeTimeFields,
          includeScheduleFields,
        });

        results.push(...getActions);
      }
    }

    return results;
  } catch (error) {
    console.error(`[FieldUtils] Error getting verification field mappings:`, error);
    return [];
  }
};

/**
 * Unit 객체 생성 헬퍼 (DataApplyService에서 사용)
 */
export const createUnitFromDevice = (device: any, unitData: any): Partial<IUnit> => {
  return {
    clientId: device.clientId || 'c0101', // 기본값
    deviceId: device.deviceId,
    unitId: unitData.unitId,
    type: device.type,
    name: `${device.type}_${unitData.unitId}`,
    // 기타 필수 필드들
    status: 0, // 0: normal
    data: unitData.data || {},
    updatedAt: new Date(),
  };
};
