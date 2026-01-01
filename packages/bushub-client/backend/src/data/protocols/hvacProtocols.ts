/**
 * 냉난방기 프로토콜 매핑 유틸리티
 * 제조사별 프로토콜 매핑 함수
 */

import { IUnit } from '../../models/schemas/UnitSchema';
import { HttpValidationError } from '../../shared/utils/responseHelper';
import { lgHvacProtocol, LG_SUPPORTED_COMMANDS } from './lg-hvac';
import { samsungHvacProtocol, SAMSUNG_SUPPORTED_COMMANDS } from './samsung-hvac';

/**
 * 프로토콜별 명령 매핑 가져오기
 * @param manufacturer 제조사 ('samsung' | 'lg')
 * @param unitId 유닛 ID (기본값: 'u001')
 * @returns 명령 매핑 객체
 */
export function getHvacProtocolMapping(
  manufacturer: 'samsung' | 'lg',
  unitId: string = 'u001',
): Record<string, any> {
  if (manufacturer === 'samsung') {
    return samsungHvacProtocol[unitId as keyof typeof samsungHvacProtocol] || samsungHvacProtocol.u001;
  } else if (manufacturer === 'lg') {
    return lgHvacProtocol[unitId as keyof typeof lgHvacProtocol] || lgHvacProtocol.u001;
  }

  throw new HttpValidationError(`지원하지 않는 제조사입니다: ${manufacturer}`);
}

/**
 * 삼성 프로토콜 명령 가져오기
 * @param commandKey 명령 키 (예: 'SET_POWER')
 * @param unitId 유닛 ID
 * @returns 명령 매핑 또는 'NOT_SUPPORTED'
 */
export function getSamsungHvacCommand(commandKey: string, unitId: string = 'u001'): any {
  const protocolMapping = getHvacProtocolMapping('samsung', unitId);
  return protocolMapping[commandKey];
}

/**
 * LG 프로토콜 명령 가져오기
 * @param commandKey 명령 키 (예: 'SET_POWER')
 * @param unitId 유닛 ID
 * @returns 명령 매핑 또는 'NOT_SUPPORTED'
 */
export function getLgHvacCommand(commandKey: string, unitId: string = 'u001'): any {
  const protocolMapping = getHvacProtocolMapping('lg', unitId);
  return protocolMapping[commandKey];
}

/**
 * 제조사별 명령 지원 여부 확인
 * @param manufacturer 제조사
 * @param commandKey 명령 키
 * @returns 지원 여부
 */
export function isHvacCommandSupported(manufacturer: 'samsung' | 'lg', commandKey: string): boolean {
  if (manufacturer === 'samsung') {
    return SAMSUNG_SUPPORTED_COMMANDS.includes(commandKey as any);
  } else if (manufacturer === 'lg') {
    return LG_SUPPORTED_COMMANDS.includes(commandKey as any);
  }
  return false;
}

/**
 * 외부제어 프로토콜 명령 가져오기 (제조사 자동 감지) - 동기 버전
 * Unit.data만 확인 (동기 함수에서 사용)
 * @param unit 냉난방기 유닛
 * @param commandKey 명령 키
 * @returns 명령 매핑
 * @throws HttpValidationError 명령이 지원되지 않는 경우
 */
export function getExternalControlHvacCommandSync(unit: IUnit, commandKey: string): any {
  // Unit.data에서 manufacturer 확인
  let manufacturer: 'samsung' | 'lg' | undefined;
  if (unit.data && typeof unit.data === 'object' && unit.data.hvac) {
    const hvacData = unit.data.hvac as any;
    manufacturer = hvacData.manufacturer;
  }

  // 환경변수에서 manufacturer 확인 (fallback)
  if (!manufacturer) {
    const envManufacturer = process.env.HVAC_MANUFACTURER;
    if (envManufacturer === 'samsung' || envManufacturer === 'lg') {
      manufacturer = envManufacturer;
    }
  }

  if (!manufacturer) {
    throw new HttpValidationError(
      `냉난방기 제조사가 설정되지 않았습니다. Unit.data.hvac.manufacturer 또는 환경변수 HVAC_MANUFACTURER를 설정해주세요.`,
    );
  }

  // 제조사별 명령 가져오기
  const command =
    manufacturer === 'samsung'
      ? getSamsungHvacCommand(commandKey, unit.unitId)
      : getLgHvacCommand(commandKey, unit.unitId);

  if (!command) {
    throw new HttpValidationError(
      `명령 '${commandKey}'가 ${manufacturer} 프로토콜에서 지원되지 않습니다.`,
    );
  }

  if (command === 'NOT_SUPPORTED') {
    throw new HttpValidationError(
      `명령 '${commandKey}'는 ${manufacturer} 냉난방기에서 지원되지 않습니다. 이 명령은 DDC 제어 냉난방기에서만 사용 가능합니다.`,
    );
  }

  // SOFTWARE_VIRTUAL 명령 처리: DB에만 저장하고 Modbus 명령은 보내지 않음
  if (command === 'SOFTWARE_VIRTUAL') {
    // 명령 키에 따라 field와 type 결정
    let field: string;
    let type: 'boolean' | 'string';

    if (commandKey === 'SET_AUTO' || commandKey === 'GET_AUTO') {
      field = 'auto';
      type = 'boolean';
    } else if (commandKey === 'SET_START_TIME_1' || commandKey === 'GET_START_TIME_1') {
      field = 'start_time_1';
      type = 'string';
    } else if (commandKey === 'SET_END_TIME_1' || commandKey === 'GET_END_TIME_1') {
      field = 'end_time_1';
      type = 'string';
    } else {
      throw new HttpValidationError(`SOFTWARE_VIRTUAL 명령 '${commandKey}'의 field를 결정할 수 없습니다.`);
    }

    return {
      type: 'SOFTWARE_VIRTUAL',
      collection: 'data',
      field,
      type,
    };
  }

  return command;
}

/**
 * 외부제어 프로토콜 명령 가져오기 (제조사 자동 감지) - 비동기 버전
 * Unit.data > System.hvac > 환경변수 순으로 확인
 * @param unit 냉난방기 유닛
 * @param commandKey 명령 키
 * @returns 명령 매핑
 * @throws HttpValidationError 명령이 지원되지 않는 경우
 */
export async function getExternalControlHvacCommand(unit: IUnit, commandKey: string): Promise<any> {
  // Unit.data에서 manufacturer 확인 (우선순위 1)
  let manufacturer: 'samsung' | 'lg' | undefined;
  if (unit.data && typeof unit.data === 'object' && unit.data.hvac) {
    const hvacData = unit.data.hvac as any;
    manufacturer = hvacData.manufacturer;
  }

  // System 설정에서 manufacturer 확인 (우선순위 2)
  if (!manufacturer) {
    try {
      const { getHvacConfigForUnit } = await import('../../config/hvac.config');
      const hvacConfig = await getHvacConfigForUnit(unit);
      // 대문자 -> 소문자 변환
      if (hvacConfig.manufacturer === 'SAMSUNG') {
        manufacturer = 'samsung';
      } else if (hvacConfig.manufacturer === 'LG') {
        manufacturer = 'lg';
      }
    } catch (error) {
      // 에러 발생 시 계속 진행
    }
  }

  // 환경변수에서 manufacturer 확인 (우선순위 3)
  if (!manufacturer) {
    const envManufacturer = process.env.HVAC_MANUFACTURER;
    if (envManufacturer === 'SAMSUNG' || envManufacturer === 'samsung') {
      manufacturer = 'samsung';
    } else if (envManufacturer === 'LG' || envManufacturer === 'lg') {
      manufacturer = 'lg';
    }
  }

  if (!manufacturer) {
    throw new HttpValidationError(
      `냉난방기 제조사가 설정되지 않았습니다. Unit.data.hvac.manufacturer 또는 System.hvac.manufacturer 또는 환경변수 HVAC_MANUFACTURER를 설정해주세요.`,
    );
  }

  // 제조사별 명령 가져오기
  const command =
    manufacturer === 'samsung'
      ? getSamsungHvacCommand(commandKey, unit.unitId)
      : getLgHvacCommand(commandKey, unit.unitId);

  if (!command) {
    throw new HttpValidationError(
      `명령 '${commandKey}'가 ${manufacturer} 프로토콜에서 지원되지 않습니다.`,
    );
  }

  if (command === 'NOT_SUPPORTED') {
    throw new HttpValidationError(
      `명령 '${commandKey}'는 ${manufacturer} 냉난방기에서 지원되지 않습니다. 이 명령은 DDC 제어 냉난방기에서만 사용 가능합니다.`,
    );
  }

  // SOFTWARE_VIRTUAL 명령 처리: DB에만 저장하고 Modbus 명령은 보내지 않음
  if (command === 'SOFTWARE_VIRTUAL') {
    // 명령 키에 따라 field와 type 결정
    let field: string;
    let type: 'boolean' | 'string';

    if (commandKey === 'SET_AUTO' || commandKey === 'GET_AUTO') {
      field = 'auto';
      type = 'boolean';
    } else if (commandKey === 'SET_START_TIME_1' || commandKey === 'GET_START_TIME_1') {
      field = 'start_time_1';
      type = 'string';
    } else if (commandKey === 'SET_END_TIME_1' || commandKey === 'GET_END_TIME_1') {
      field = 'end_time_1';
      type = 'string';
    } else {
      throw new HttpValidationError(`SOFTWARE_VIRTUAL 명령 '${commandKey}'의 field를 결정할 수 없습니다.`);
    }

    return {
      type: 'SOFTWARE_VIRTUAL',
      collection: 'data',
      field,
      type,
    };
  }

  return command;
}

