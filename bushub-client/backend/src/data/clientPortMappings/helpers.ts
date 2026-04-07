import { ModbusInfo } from './types';

/**
 * CLIENT_PORT_MAPPINGS 구조 변경에 따른 헬퍼 함수들
 *
 * 모든 서비스에서 공통으로 사용할 수 있는 표준화된 접근 방법 제공
 */
export class MappingHelper {
  /**
   * 명령어의 functionCode와 address 추출
   */
  static extractModbusInfo(commandConfig: any): ModbusInfo | null {
    if (commandConfig === 'TIME_INTEGRATED') {
      return null; // 특수 케이스
    }

    if (commandConfig && commandConfig.port) {
      return {
        functionCode: commandConfig.port.functionCode,
        address: commandConfig.port.address,
        description: commandConfig.port.description,
      };
    }

    // 하위 호환성을 위한 fallback (기존 구조)
    if (commandConfig && commandConfig.functionCode && commandConfig.address) {
      return {
        functionCode: commandConfig.functionCode,
        address: commandConfig.address,
        description: commandConfig.description,
      };
    }

    return null;
  }

  /**
   * COMMON_SYSTEM_PORTS와 일반 디바이스 구분
   */
  static isCommonSystemPort(deviceType: string): boolean {
    return deviceType === 'ddc_time' || deviceType === 'seasonal';
  }

  /**
   * 클라이언트 매핑에서 특정 명령어 검색
   */
  static findCommandInMapping(clientMapping: any, commandKey: string): any {
    // COMMON_SYSTEM_PORTS에서 검색
    if (clientMapping.ddc_time && clientMapping.ddc_time[commandKey]) {
      return clientMapping.ddc_time[commandKey];
    }
    if (clientMapping.seasonal && clientMapping.seasonal[commandKey]) {
      return clientMapping.seasonal[commandKey];
    }

    // 일반 디바이스에서 검색
    for (const deviceType in clientMapping) {
      if (this.isCommonSystemPort(deviceType)) continue;

      if (clientMapping[deviceType]) {
        for (const unit in clientMapping[deviceType]) {
          const unitMapping = clientMapping[deviceType][unit];
          if (unitMapping[commandKey]) {
            return unitMapping[commandKey];
          }
        }
      }
    }

    return null;
  }

  /**
   * 클라이언트 매핑에서 사용 가능한 디바이스 타입 목록 반환
   */
  static getDeviceTypes(clientMapping: any): string[] {
    if (!clientMapping) return [];

    return Object.keys(clientMapping).filter((deviceType) => !this.isCommonSystemPort(deviceType));
  }

  /**
   * 특정 디바이스 타입의 유닛 목록 반환
   */
  static getUnitsForDevice(clientMapping: any, deviceType: string): string[] {
    if (!clientMapping || !clientMapping[deviceType]) return [];

    return Object.keys(clientMapping[deviceType]);
  }

  /**
   * 특정 디바이스 타입의 모든 명령어 목록 반환
   */
  static getCommandsForDevice(clientMapping: any, deviceType: string): string[] {
    if (!clientMapping || !clientMapping[deviceType]) return [];

    const allCommands = new Set<string>();

    for (const unit in clientMapping[deviceType]) {
      const unitMapping = clientMapping[deviceType][unit];
      if (unitMapping) {
        Object.keys(unitMapping).forEach((command) => allCommands.add(command));
      }
    }

    return Array.from(allCommands);
  }

  /**
   * 특정 유닛의 모든 명령어 목록 반환
   */
  static getCommandsForUnit(clientMapping: any, deviceType: string, unitId: string): string[] {
    if (!clientMapping || !clientMapping[deviceType] || !clientMapping[deviceType][unitId]) {
      return [];
    }

    return Object.keys(clientMapping[deviceType][unitId]);
  }

  /**
   * 특정 명령어가 지원되는지 확인
   */
  static isCommandSupported(clientMapping: any, commandKey: string): boolean {
    return this.findCommandInMapping(clientMapping, commandKey) !== null;
  }

  /**
   * 특정 명령어가 TIME_INTEGRATED인지 확인
   */
  static isTimeIntegratedCommand(commandConfig: any): boolean {
    return commandConfig === 'TIME_INTEGRATED';
  }

  /**
   * 특정 명령어가 유효한 CommandConfig인지 확인
   */
  static isValidCommandConfig(commandConfig: any): boolean {
    return (
      commandConfig &&
      typeof commandConfig === 'object' &&
      commandConfig.port &&
      typeof commandConfig.port.functionCode === 'number' &&
      typeof commandConfig.port.address === 'number'
    );
  }

  /**
   * 클라이언트 매핑 유효성 검사
   */
  static validateClientMapping(clientMapping: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!clientMapping) {
      errors.push('Client mapping is null or undefined');
      return { isValid: false, errors };
    }

    // COMMON_SYSTEM_PORTS 검사
    if (clientMapping.ddc_time) {
      for (const [key, config] of Object.entries(clientMapping.ddc_time)) {
        if (!this.isValidCommandConfig(config)) {
          errors.push(`Invalid ddc_time config for ${key}`);
        }
      }
    }

    if (clientMapping.seasonal) {
      for (const [key, config] of Object.entries(clientMapping.seasonal)) {
        if (!this.isValidCommandConfig(config)) {
          errors.push(`Invalid seasonal config for ${key}`);
        }
      }
    }

    // 일반 디바이스 검사
    for (const deviceType in clientMapping) {
      if (this.isCommonSystemPort(deviceType)) continue;

      if (clientMapping[deviceType]) {
        for (const unitId in clientMapping[deviceType]) {
          const unitMapping = clientMapping[deviceType][unitId];
          if (unitMapping) {
            for (const [commandKey, commandConfig] of Object.entries(unitMapping)) {
              if (commandConfig !== 'TIME_INTEGRATED' && !this.isValidCommandConfig(commandConfig)) {
                errors.push(`Invalid command config for ${deviceType}/${unitId}/${commandKey}`);
              }
            }
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // ==================== COMMON_SYSTEM_PORTS 폴링 지원 ====================

  /**
   * COMMON_SYSTEM_PORTS에서 사용 가능한 액션 목록 반환
   */
  static getCommonSystemPortActions(clientMapping: any, deviceType: string): string[] {
    if (!clientMapping || !clientMapping[deviceType]) return [];

    return Object.keys(clientMapping[deviceType]);
  }

  /**
   * COMMON_SYSTEM_PORTS에서 특정 액션이 지원되는지 확인
   */
  static isCommonSystemPortActionSupported(clientMapping: any, deviceType: string, action: string): boolean {
    if (!clientMapping || !clientMapping[deviceType]) return false;

    return clientMapping[deviceType][action] !== undefined;
  }

  /**
   * COMMON_SYSTEM_PORTS에서 GET_로 시작하는 폴링 액션 목록 반환
   */
  static getCommonSystemPortPollingActions(clientMapping: any, deviceType: string): string[] {
    if (!clientMapping || !clientMapping[deviceType]) return [];

    return Object.keys(clientMapping[deviceType]).filter((action) => action.startsWith('GET_'));
  }

  /**
   * COMMON_SYSTEM_PORTS 액션 설정 검증
   */
  static validateCommonSystemPortAction(
    clientMapping: any,
    deviceType: string,
    action: string,
  ): { isValid: boolean; config: any; error?: string } {
    if (!clientMapping || !clientMapping[deviceType]) {
      return { isValid: false, config: null, error: `Device type '${deviceType}' not found` };
    }

    if (!clientMapping[deviceType][action]) {
      return { isValid: false, config: null, error: `Action '${action}' not found in ${deviceType}` };
    }

    const config = clientMapping[deviceType][action];

    if (config === 'TIME_INTEGRATED') {
      return { isValid: false, config: null, error: `TIME_INTEGRATED actions are not supported for polling` };
    }

    if (!this.isValidCommandConfig(config)) {
      return { isValid: false, config: null, error: `Invalid command config for ${deviceType}/${action}` };
    }

    return { isValid: true, config };
  }

  /**
   * COMMON_SYSTEM_PORTS 폴링 실행을 위한 기본 정보 추출
   */
  static extractCommonSystemPortPollingInfo(
    clientMapping: any,
    deviceType: string,
    action: string,
  ): {
    success: boolean;
    functionCode?: number;
    address?: number;
    collection?: string;
    field?: string;
    type?: string;
    error?: string | undefined;
  } {
    const validation = this.validateCommonSystemPortAction(clientMapping, deviceType, action);

    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const { config } = validation;

    if (config.port) {
      return {
        success: true,
        functionCode: config.port.functionCode,
        address: config.port.address,
        collection: config.collection,
        field: config.field,
        type: config.type,
      };
    }

    return { success: false, error: 'Invalid port configuration' };
  }

  /**
   * COMMON_SYSTEM_PORTS와 일반 디바이스 구분하여 폴링 지원 여부 확인
   */
  static supportsPolling(clientMapping: any, deviceType: string, action?: string): boolean {
    if (this.isCommonSystemPort(deviceType)) {
      if (!action) return true; // deviceType만으로는 판단 불가
      return this.isCommonSystemPortActionSupported(clientMapping, deviceType, action);
    }

    // 일반 디바이스는 항상 폴링 지원 (unitId 체크는 별도)
    return true;
  }
}
