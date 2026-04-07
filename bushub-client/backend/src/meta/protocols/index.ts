import { CLIENT_PORT_MAPPINGS } from '../../data/clientPortMappings/index';
import { IUnit } from '../../models/schemas/UnitSchema';
import { HttpValidationError } from '../../shared/utils/responseHelper';

import { DOOR_COMMAND_MAP } from './doorSpec';
import { EXCHANGER_COMMAND_MAP } from './exchangerSpec';
import { EXTERNAL_SWITCH_COMMAND_MAP } from './externalSwitchSpec';
import { ModbusCommand, INTEGRATED_SENSOR_COMMAND_MAP } from './integratedSensorSpec';
import { LIGHTING_COMMAND_MAP } from './lightingSpec';

// 새로운 하드웨어 매핑 시스템 import

// 성능 최적화를 위한 캐싱 시스템
class MappingCache {
  private static instance: MappingCache;
  private commandCache = new Map<string, ModbusCommand>();
  private clientCache = new Map<string, boolean>();
  private deviceCache = new Map<string, boolean>();
  private unitCache = new Map<string, boolean>();
  private lastCacheCleanup = Date.now();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): MappingCache {
    if (!MappingCache.instance) {
      MappingCache.instance = new MappingCache();
    }
    return MappingCache.instance;
  }

  private getCacheKey(unit: IUnit, commandKey: string): string {
    return `${unit.clientId}:${unit.type}:${unit.unitId}:${commandKey}`;
  }

  get(unit: IUnit, commandKey: string): ModbusCommand | null {
    const key = this.getCacheKey(unit, commandKey);
    return this.commandCache.get(key) || null;
  }

  set(unit: IUnit, commandKey: string, command: ModbusCommand): void {
    const key = this.getCacheKey(unit, commandKey);
    this.commandCache.set(key, command);
  }

  hasClient(clientId: string): boolean {
    if (this.clientCache.has(clientId)) {
      return this.clientCache.get(clientId)!;
    }
    const exists = CLIENT_PORT_MAPPINGS.hasOwnProperty(clientId);
    this.clientCache.set(clientId, exists);
    return exists;
  }

  hasDevice(clientId: string, deviceType: string): boolean {
    const key = `${clientId}:${deviceType}`;
    if (this.deviceCache.has(key)) {
      return this.deviceCache.get(key)!;
    }
    const client = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];
    const exists = client ? Object.prototype.hasOwnProperty.call(client, deviceType) : false;
    this.deviceCache.set(key, exists);
    return exists;
  }

  hasUnit(clientId: string, deviceType: string, unitId: string): boolean {
    const key = `${clientId}:${deviceType}:${unitId}`;
    if (this.unitCache.has(key)) {
      return this.unitCache.get(key)!;
    }
    const client = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];
    const device = client ? (client as Record<string, any>)[deviceType] : undefined;
    const exists = device ? Object.prototype.hasOwnProperty.call(device, unitId) : false;
    this.unitCache.set(key, exists);
    return exists;
  }

  clear(): void {
    this.commandCache.clear();
    this.clientCache.clear();
    this.deviceCache.clear();
    this.unitCache.clear();
    this.lastCacheCleanup = Date.now();
  }

  cleanup(): void {
    const now = Date.now();
    if (now - this.lastCacheCleanup > this.CACHE_TTL) {
      this.clear();
    }
  }

  getStats(): { commandCacheSize: number; clientCacheSize: number; deviceCacheSize: number; unitCacheSize: number } {
    return {
      commandCacheSize: this.commandCache.size,
      clientCacheSize: this.clientCache.size,
      deviceCacheSize: this.deviceCache.size,
      unitCacheSize: this.unitCache.size,
    };
  }
}

// 전역 캐시 인스턴스
const mappingCache = MappingCache.getInstance();

export type CommandMap = { [key: string]: ModbusCommand };

// Maps unit types to their corresponding Modbus command map.
const protocolMap: { [key: string]: CommandMap } = {
  integrated_sensor: INTEGRATED_SENSOR_COMMAND_MAP,
  exchanger: EXCHANGER_COMMAND_MAP,
  lighting: LIGHTING_COMMAND_MAP,
  door: DOOR_COMMAND_MAP,
  externalsw: EXTERNAL_SWITCH_COMMAND_MAP,
  // Add other device types here as their specs are defined.
};

/**
 * Retrieves the appropriate Modbus command map for a given unit.
 * @param unit The unit for which to find the command map.
 * @returns The corresponding command map.
 * @throws An error if the unit type is unknown or has no associated protocol.
 */
export const getCommandMapForUnit = (unit: IUnit): CommandMap => {
  const commandMap = protocolMap[unit.type];
  if (!commandMap) {
    throw new HttpValidationError(`No protocol specification found for unit type: '${unit.type}'`);
  }
  return commandMap;
};

/**
 * Retrieves a specific Modbus command specification for a given unit and command key.
 * @param unit The unit to command.
 * @param commandKey The string key for the command (e.g., 'read-temperature').
 * @returns The ModbusCommand specification.
 * @throws An error if the command key is not found in the unit's protocol map.
 */
export const getModbusCommand = (unit: IUnit, commandKey: string): ModbusCommand => {
  const commandMap = getCommandMapForUnit(unit);
  const commandSpec = commandMap[commandKey];
  if (!commandSpec) {
    throw new HttpValidationError(`Command '${commandKey}' not found for unit type '${unit.type}'`);
  }
  return commandSpec;
};

/**
 * Retrieves a specific Modbus command specification with hardware port mapping for a given unit and command key.
 * This function uses the new hardware mapping system to provide unit-specific port assignments.
 * @param unit The unit to command.
 * @param commandKey The string key for the command (e.g., 'SET_POWER').
 * @returns The ModbusCommand specification with actual hardware port information.
 * @throws An error if the command key is not found or not supported for the unit.
 */
export const getModbusCommandWithPortMapping = (unit: IUnit, commandKey: string): ModbusCommand => {
  // 캐시 정리 (TTL 기반)
  mappingCache.cleanup();

  // 1. 캐시에서 명령어 조회 시도
  const cachedCommand = mappingCache.get(unit, commandKey);
  if (cachedCommand) {
    return cachedCommand;
  }

  const { clientId } = unit;
  const deviceType = unit.type;
  const { unitId } = unit;

  // 2. 캐시된 클라이언트 존재 여부 확인
  if (!mappingCache.hasClient(clientId)) {
    throw new HttpValidationError(`Client '${clientId}' not found in port mappings`);
  }

  // 3. 캐시된 장비 타입 존재 여부 확인
  if (!mappingCache.hasDevice(clientId, deviceType)) {
    throw new HttpValidationError(`Device type '${deviceType}' not found for client '${clientId}'`);
  }

  // 4. 캐시된 유닛 존재 여부 확인
  if (!mappingCache.hasUnit(clientId, deviceType, unitId)) {
    throw new HttpValidationError(`Unit '${unitId}' not found for device type '${deviceType}' in client '${clientId}'`);
  }

  // 5. 실제 매핑에서 명령어 조회
  const clientMapping = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];
  const deviceMapping = clientMapping[deviceType] as Record<string, any>;
  const unitMapping = deviceMapping[unitId] as Record<string, any>;
  const hardwarePort = unitMapping[commandKey] as any;

  if (!hardwarePort) {
    throw new HttpValidationError(
      `Command '${commandKey}' not supported for unit '${unitId}' of device type '${deviceType}' in client '${clientId}'. ` +
        `Available commands: ${Object.keys(unitMapping).join(', ')}`,
    );
  }

  // 🎯 TIME_INTEGRATED 명령어 처리
  if (hardwarePort === 'TIME_INTEGRATED') {
    throw new HttpValidationError(
      `Command '${commandKey}' is a TIME_INTEGRATED command that requires special handling. ` +
        `Use the individual HOUR/MINUTE commands instead.`,
    );
  }

  // 6. 결과 생성 및 캐싱
  let result: any;

  if (hardwarePort && hardwarePort.port) {
    // 새로운 구조: { port: { functionCode, address, description } }
    result = {
      name: hardwarePort.port.description || hardwarePort.description,
      description: hardwarePort.port.description || hardwarePort.description,
      functionCode: hardwarePort.port.functionCode,
      address: hardwarePort.port.address,
      length: hardwarePort.port.length || hardwarePort.length || 1,
    };
  } else if (hardwarePort && hardwarePort.functionCode && hardwarePort.address) {
    // 하위 호환성: { functionCode, address, description }
    result = {
      name: hardwarePort.description,
      description: hardwarePort.description,
      functionCode: hardwarePort.functionCode,
      address: hardwarePort.address,
      length: hardwarePort.length || 1,
    };
  } else {
    throw new HttpValidationError(
      `Invalid hardware port configuration for command '${commandKey}': missing functionCode or address`,
    );
  }

  // 캐시에 저장
  mappingCache.set(unit, commandKey, result);

  return result;
};

// 캐시 관리 함수들
export const getMappingCacheStats = () => mappingCache.getStats();
export const clearMappingCache = () => mappingCache.clear();
