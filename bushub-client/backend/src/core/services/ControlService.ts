import { getModbusCommandWithPortMapping } from '../../meta/protocols';
import { IDevice } from '../../models/schemas/DeviceSchema';
import { IUnit } from '../../models/schemas/UnitSchema';
import { ILogger } from '../../shared/interfaces/ILogger';
import { HttpValidationError } from '../../shared/utils/responseHelper';
import { IUnifiedModbusCommunication } from '../interfaces/IModbusCommunication';
import { IControlRepository } from '../repositories/interfaces/IControlRepository';

import { CommandExecutionStrategyFactory, CommandExecutionStrategy } from './CommandExecutionStrategy';
import { CommandResultHandler } from './CommandResultHandler';
import { IControlService, CommandPayload, CommandResult } from './interfaces/IControlService';
import { IErrorService } from './interfaces/IErrorService';
import { IWebSocketService } from './interfaces/IWebSocketService';
import { ModbusErrorFactory } from './ModbusErrorFactory';

interface TimeCommand {
  hourCommand: string;
  minuteCommand: string;
  value: string;
}

export class ControlService implements IControlService {
  private commandResultHandler: CommandResultHandler;
  private executionStrategy: CommandExecutionStrategy;

  constructor(
    private controlRepository: IControlRepository,
    private webSocketService?: IWebSocketService,
    private unifiedModbusService?: IUnifiedModbusCommunication,
    private logger?: ILogger,
    private errorService?: IErrorService, // 🆕 ErrorService 주입
  ) {
    this.commandResultHandler = new CommandResultHandler(controlRepository, webSocketService, errorService);
    this.executionStrategy = CommandExecutionStrategyFactory.createStrategy('sequential');
  }

  /**
   * 실행 전략 설정
   */
  setExecutionStrategy(strategy: 'sequential' | 'parallel', maxConcurrency?: number): void {
    this.executionStrategy = CommandExecutionStrategyFactory.createStrategy(strategy, maxConcurrency);
  }

  /**
   * Modbus 통신 서비스 선택
   */
  private getModbusService(): IUnifiedModbusCommunication | undefined {
    return this.unifiedModbusService;
  }

  /**
   * Modbus 쓰기 명령 실행 (UnifiedModbusService만 사용)
   */
  private async executeModbusWrite(unit: IUnit, functionCode: number, address: number, value: number): Promise<any> {
    const modbusService = this.getModbusService();

    if (!modbusService) {
      throw new Error('Modbus 서비스가 초기화되지 않았습니다.');
    }

    // 🆕 새로운 중앙 큐 시스템 사용
    const modbusCommand = {
      id: `control_write_${unit.deviceId}_${unit.unitId}_${functionCode}_${address}_${Date.now()}`,
      type: 'write' as const,
      unitId: '1', // 기본값 사용 (unit.slaveId가 없음)
      functionCode,
      address,
      lengthOrValue: value,
      priority: 'high' as const, // 사용자 제어는 높은 우선순위
      timestamp: new Date(),
      resolve: () => {},
      reject: () => {},
    };

    // IUnifiedModbusCommunication 인터페이스 사용
    return await modbusService.executeCommand(modbusCommand);
  }

  /**
   * Modbus 읽기 명령 실행 (UnifiedModbusService만 사용)
   */
  private async executeModbusRead(unit: IUnit, functionCode: number, address: number, length: number): Promise<any> {
    const modbusService = this.getModbusService();

    if (!modbusService) {
      throw new Error('Modbus 서비스가 초기화되지 않았습니다.');
    }

    // 🆕 새로운 중앙 큐 시스템 사용
    const modbusCommand = {
      id: `control_read_${unit.deviceId}_${unit.unitId}_${functionCode}_${address}_${Date.now()}`,
      type: 'read' as const,
      unitId: '1', // 기본값 사용 (unit.slaveId가 없음)
      functionCode,
      address,
      lengthOrValue: length,
      priority: 'normal' as const,
      timestamp: new Date(),
      resolve: () => {},
      reject: () => {},
    };

    // IUnifiedModbusCommunication 인터페이스 사용
    return await modbusService.executeCommand(modbusCommand);
  }

  private isTimeCommand(commandKey: string): boolean {
    // 🎯 Phase 4: 강제 디버깅 로그 추가
    const result = commandKey.includes('START_TIME') || commandKey.includes('END_TIME');
    this.logger?.info(`[ControlService] isTimeCommand(${commandKey}) = ${result}`);
    return result;
  }

  private getTimeCommands(commandKey: string): { hourCommand: string; minuteCommand: string } | null {
    if (commandKey.includes('START_TIME_1')) {
      if (commandKey.startsWith('GET_')) {
        return { hourCommand: 'GET_START_TIME_1_HOUR', minuteCommand: 'GET_START_TIME_1_MINUTE' };
      }
      return { hourCommand: 'SET_START_TIME_1_HOUR', minuteCommand: 'SET_START_TIME_1_MINUTE' };
    } else if (commandKey.includes('END_TIME_1')) {
      if (commandKey.startsWith('GET_')) {
        return { hourCommand: 'GET_END_TIME_1_HOUR', minuteCommand: 'GET_END_TIME_1_MINUTE' };
      }
      return { hourCommand: 'SET_END_TIME_1_HOUR', minuteCommand: 'SET_END_TIME_1_MINUTE' };
    } else if (commandKey.includes('START_TIME_2')) {
      if (commandKey.startsWith('GET_')) {
        return { hourCommand: 'GET_START_TIME_2_HOUR', minuteCommand: 'GET_START_TIME_2_MINUTE' };
      }
      return { hourCommand: 'SET_START_TIME_2_HOUR', minuteCommand: 'SET_START_TIME_2_MINUTE' };
    } else if (commandKey.includes('END_TIME_2')) {
      if (commandKey.startsWith('GET_')) {
        return { hourCommand: 'GET_END_TIME_2_HOUR', minuteCommand: 'GET_END_TIME_2_MINUTE' };
      }
      return { hourCommand: 'SET_END_TIME_2_HOUR', minuteCommand: 'SET_END_TIME_2_MINUTE' };
    }
    return null;
  }

  private parseTimeValue(value: any): { hour: number; minute: number } | null {
    if (typeof value === 'string') {
      if (value.includes(':')) {
        const [hourStr, minuteStr] = value.split(':');
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        if (!isNaN(hour) && !isNaN(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          return { hour, minute };
        }
      } else {
        const timeValue = parseInt(value, 10);
        if (!isNaN(timeValue) && timeValue >= 0 && timeValue <= 2359) {
          const hour = Math.floor(timeValue / 100);
          const minute = timeValue % 100;
          if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            return { hour, minute };
          }
        }
      }
    } else if (typeof value === 'number') {
      // 숫자 타입 직접 처리
      if (value >= 0 && value <= 2359) {
        const hour = Math.floor(value / 100);
        const minute = value % 100;
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          return { hour, minute };
        }
      }
    }
    return null;
  }

  async executeUnitCommand(
    unit: IUnit,
    device: IDevice,
    commandKey: string,
    value?: any,
    _request?: any,
  ): Promise<CommandResult> {
    this.logger?.info(`🔍 executeUnitCommand 시작: ${unit.deviceId}/${unit.unitId} - ${commandKey} = ${value}`);

    // 🆕 시간 명령어를 일반 Modbus 경로로 처리
    if (this.isTimeCommand(commandKey)) {
      this.logger?.info(`[ControlService] 시간 명령어 감지: ${commandKey} - 일반 Modbus 경로로 처리`);

      // GET 명령어인지 SET 명령어인지 구분
      if (commandKey.startsWith('GET_')) {
        this.logger?.info(`[ControlService] 시간 GET 명령어 감지: ${commandKey} - executeTimeGetCommand 호출`);
        return this.executeTimeGetCommand(unit, device, commandKey, _request);
      }
      this.logger?.info(`[ControlService] 시간 SET 명령어 감지: ${commandKey} - executeTimeCommandAsModbus 호출`);
      return this.executeTimeCommandAsModbus(unit, device, commandKey, value, _request);
    }

    // 🆕 일반 명령어는 executeGeneralModbusCommand로 처리
    this.logger?.info(`[ControlService] 일반 Modbus 명령어 처리: ${commandKey}`);
    return this.executeGeneralModbusCommand(unit, device, commandKey, value, _request);
  }

  /**
   * 일반 Modbus 명령어 처리 (읽기/쓰기)
   */
  private async executeGeneralModbusCommand(
    unit: IUnit,
    device: IDevice,
    commandKey: string,
    value?: any,
    _request?: any,
  ): Promise<CommandResult> {
    this.logger?.info(`[ControlService] 일반 Modbus 명령어 처리: ${commandKey}`);

    const commandSpec = getModbusCommandWithPortMapping(unit, commandKey);

    if (!commandSpec) {
      const errorMsg = `Invalid command key: ${commandKey}`;
      this.logger?.error(`Control error: ${errorMsg}`);
      throw ModbusErrorFactory.createCommandExecutionError(commandKey, errorMsg);
    }

    // 유닛 타입으로 Modbus 지원 여부 확인
    const supportedTypes = [
      'integrated_sensor',
      'cooler',
      'exchanger',
      'lighting',
      'aircurtain',
      'bench',
      'door',
      'externalsw',
    ];
    if (!supportedTypes.includes(unit.type)) {
      const errorMsg = `Unit ${unit.name} (${unit.type}) does not support Modbus commands.`;
      this.logger?.error(`Control error: ${errorMsg}`);
      throw ModbusErrorFactory.createCommandExecutionError(commandKey, errorMsg);
    }

    // 명령 로그 생성 (waiting 상태)
    this.logger?.info(`🔍 CommandLog 생성 시작: ${unit.deviceId}/${unit.unitId} - ${commandKey} = ${value}`);

    const commandLog = await this.controlRepository.createCommandLog({
      deviceId: unit.deviceId,
      unitId: unit.unitId,
      action: commandKey,
      value,
      status: 'waiting',
    });

    const requestId = (commandLog._id as any).toString();
    this.logger?.info(`🔍 CommandLog 생성 완료: requestId = ${requestId}, status = ${commandLog.status}`);

    try {
      let result;
      // Differentiate between read and write commands
      if (commandSpec.functionCode === 3 || commandSpec.functionCode === 4) {
        // RD_HLD_REG, RD_INPUT_REG
        const readLength = commandSpec.length || 1; // Use specified length, default to 1
        try {
          const modbusResult = await this.unifiedModbusService?.readRegisters({
            slaveId: 1, // 기본값 사용 (unit.slaveId가 없음)
            functionCode: commandSpec.functionCode,
            address: commandSpec.address,
            length: readLength,
            context: 'polling', // 읽기는 낮은 우선순위
          });

          result = modbusResult;
          await this.commandResultHandler.handleSuccess(
            requestId,
            result,
            device,
            unit,
            commandKey,
            value,
            'data', // 모든 명령은 data 컬렉션에 저장
            'polling', // 컨텍스트: 읽기 경로는 폴링 컨텍스트로 처리
          );
        } catch (error) {
          await this.commandResultHandler.handleFailure(requestId, error as Error, device, unit, commandKey);
          throw error;
        }
      } else if (
        commandSpec.functionCode === 5 || // WR_SNGL_COIL
        commandSpec.functionCode === 6 || // WR_SNGL_REG
        commandSpec.functionCode === 15 || // WR_MULTI_COILS
        commandSpec.functionCode === 16 // WR_MULTI_REG
      ) {
        const writeValue = value !== undefined ? value : commandSpec.value;
        if (writeValue === undefined) {
          const errorMsg = `Write command '${commandKey}' requires a value.`;
          await this.commandResultHandler.handleFailure(requestId, errorMsg, device, unit, commandKey);
          throw ModbusErrorFactory.createCommandExecutionError(commandKey, errorMsg);
        }

        try {
          const modbusResult = await this.unifiedModbusService?.writeRegister({
            slaveId: 1, // 기본값 사용 (unit.slaveId가 없음)
            functionCode: commandSpec.functionCode,
            address: commandSpec.address,
            value: writeValue,
            context: 'control', // 사용자 제어는 높은 우선순위
          });

          result = modbusResult;
          await this.commandResultHandler.handleSuccess(
            requestId,
            result,
            device,
            unit,

            commandKey,
            value,
            'data', // 모든 명령은 data 컬렉션에 저장
            'control', // 컨텍스트: 쓰기 경로는 제어 컨텍스트
          );
        } catch (error) {
          await this.commandResultHandler.handleFailure(requestId, error as Error, device, unit, commandKey);
          throw error;
        }
      } else {
        const errorMsg = `Unsupported function code: ${commandSpec.functionCode}`;
        await this.commandResultHandler.handleFailure(requestId, errorMsg, device, unit, commandKey);
        throw ModbusErrorFactory.createUnsupportedFunctionCode(commandSpec.functionCode);
      }

      return { _id: requestId, action: commandKey, result };
    } catch (error) {
      // 에러는 이미 handleFailure에서 처리되었으므로 그대로 throw
      throw error;
    }
  }

  /**
   * 시간 명령어를 Modbus 명령어로 변환하여 처리
   */
  private async executeTimeCommandAsModbus(
    unit: IUnit,
    device: IDevice,
    commandKey: string,
    value?: any,
    _request?: any,
    existingRequestId?: string,
  ): Promise<CommandResult> {
    this.logger?.info(`[ControlService] 시간 명령어를 Modbus 명령어로 처리: ${commandKey}, value: ${value}`);

    // 🆕 시간 명령어를 HOUR/MINUTE로 분해
    const timeCommands = this.getTimeCommands(commandKey);
    if (!timeCommands) {
      throw new HttpValidationError(`Invalid time command: ${commandKey}`);
    }

    this.logger?.info(`[ControlService] getTimeCommands 결과: ${JSON.stringify(timeCommands)}`);

    // 🆕 시간 값 파싱
    const parsedTime = this.parseTimeValue(value);
    if (!parsedTime) {
      throw new HttpValidationError(`Invalid time value: ${value}. Expected format: "HH:MM" or HHMM`);
    }

    this.logger?.info(`[ControlService] 파싱된 시간: hour=${parsedTime.hour}, minute=${parsedTime.minute}`);

    try {
      // 🆕 기존 requestId가 있으면 사용, 없으면 새로 생성
      let requestId: string;
      if (existingRequestId) {
        requestId = existingRequestId;
        this.logger?.info(`[ControlService] 기존 requestId 사용: ${requestId}`);
      } else {
        // 🆕 새로운 CommandLog 생성
        const commandLog = await this.controlRepository.createCommandLog({
          deviceId: unit.deviceId,
          unitId: unit.unitId,
          action: commandKey,
          value,
          status: 'waiting',
        });
        requestId = (commandLog._id as any).toString();
        this.logger?.info(`[ControlService] 새로운 CommandLog 생성: requestId = ${requestId}`);
      }

      // 🆕 HOUR 명령어를 일반 Modbus 명령어로 처리
      this.logger?.info(`[ControlService] HOUR 명령어 처리 시작: ${timeCommands.hourCommand}`);
      const hourResult = await this.executeGeneralModbusCommand(
        unit,
        device,
        timeCommands.hourCommand,
        parsedTime.hour,
        _request,
      );

      // 🆕 MINUTE 명령어를 일반 Modbus 명령어로 처리
      this.logger?.info(`[ControlService] MINUTE 명령어 처리 시작: ${timeCommands.minuteCommand}`);
      const minuteResult = await this.executeGeneralModbusCommand(
        unit,
        device,
        timeCommands.minuteCommand,
        parsedTime.minute,
        _request,
      );

      // 🆕 결과 통합
      const timeString = `${parsedTime.hour.toString().padStart(2, '0')}:${parsedTime.minute
        .toString()
        .padStart(2, '0')}`;
      this.logger?.info(`[ControlService] 시간 명령어 처리 완료: ${commandKey} = ${timeString}`);

      // 🆕 CommandResultHandler를 통한 통합 처리 (Data 컬렉션 업데이트 포함)
      await this.commandResultHandler.handleSuccess(requestId, timeString, device, unit, commandKey, timeString);

      return { _id: requestId, action: commandKey, result: timeString };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger?.error(`[ControlService] executeTimeCommandAsModbus 에러: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * 기존 CommandLog ID를 사용하여 명령 실행 (중복 생성 방지)
   */
  async executeUnitCommandWithExistingLog(
    unit: IUnit,
    device: IDevice,
    commandKey: string,
    existingRequestId: string,
    value?: number,
    request?: any,
  ): Promise<CommandResult> {
    this.logger?.info(
      `�� 기존 CommandLog로 명령 실행: ${unit.deviceId}/${unit.unitId} - ${commandKey} = ${value}, requestId: ${existingRequestId}`,
    );

    // 🆕 시간 명령어를 일반 Modbus 경로로 처리
    if (this.isTimeCommand(commandKey)) {
      this.logger?.info(`[ControlService] 시간 명령어 감지: ${commandKey} - 일반 Modbus 경로로 처리 (existing)`);

      // GET 명령어인지 SET 명령어인지 구분
      if (commandKey.startsWith('GET_')) {
        this.logger?.info(
          `[ControlService] 시간 GET 명령어 감지: ${commandKey} - executeTimeGetCommand 호출 (existing)`,
        );
        return this.executeTimeGetCommand(unit, device, commandKey, request, existingRequestId);
      }
      this.logger?.info(
        `[ControlService] 시간 SET 명령어 감지: ${commandKey} - executeTimeCommandAsModbus 호출 (existing)`,
      );
      return this.executeTimeCommandAsModbus(unit, device, commandKey, value, request, existingRequestId);
    }

    // 기존 CommandLog 상태를 'processing'으로 업데이트
    await this.controlRepository.updateCommandLog(existingRequestId, {
      status: 'waiting', // processing 대신 waiting 유지
    });

    const commandSpec = getModbusCommandWithPortMapping(unit, commandKey);

    if (!commandSpec) {
      const errorMsg = `Invalid command key: ${commandKey}`;
      this.logger?.error(`Control error: ${errorMsg}`);
      await this.commandResultHandler.handleFailure(existingRequestId, errorMsg, device, unit, commandKey);
      throw ModbusErrorFactory.createCommandExecutionError(commandKey, errorMsg);
    }

    // 유닛 타입으로 Modbus 지원 여부 확인
    const supportedTypes = [
      'integrated_sensor',
      'cooler',
      'exchanger',
      'lighting',
      'aircurtain',
      'bench',
      'door',
      'externalsw',
    ];
    if (!supportedTypes.includes(unit.type)) {
      const errorMsg = `Unit ${unit.name} (${unit.type}) does not support Modbus commands.`;
      this.logger?.error(`Control error: ${errorMsg}`);
      await this.commandResultHandler.handleFailure(existingRequestId, errorMsg, device, unit, commandKey);
      throw ModbusErrorFactory.createCommandExecutionError(commandKey, errorMsg);
    }

    try {
      let result;
      // Differentiate between read and write commands
      if (commandSpec.functionCode === 3 || commandSpec.functionCode === 4) {
        // RD_HLD_REG, RD_INPUT_REG
        const readLength = commandSpec.length || 1;
        try {
          const modbusResult = await this.unifiedModbusService?.readRegisters({
            slaveId: 1,
            functionCode: commandSpec.functionCode,
            address: commandSpec.address,
            length: readLength,
            context: 'polling',
          });

          result = modbusResult;
          // 결과 성공 여부 확인 후 처리
          if (!result || (result as any).success !== true) {
            const errorMsg = (result as any)?.error ?? 'Modbus read failed';
            await this.commandResultHandler.handleFailure(existingRequestId, errorMsg, device, unit, commandKey, value);
            throw ModbusErrorFactory.createCommandExecutionError(commandKey, errorMsg);
          }

          await this.commandResultHandler.handleSuccess(
            existingRequestId,
            result,
            device,
            unit,
            commandKey,
            value,
            'data', // 모든 명령은 data 컬렉션에 저장
          );
        } catch (error) {
          await this.commandResultHandler.handleFailure(existingRequestId, error as Error, device, unit, commandKey);
          throw error;
        }
      } else if (
        commandSpec.functionCode === 5 || // WR_SNGL_COIL
        commandSpec.functionCode === 6 || // WR_SNGL_REG
        commandSpec.functionCode === 15 || // WR_MULTI_COILS
        commandSpec.functionCode === 16 // WR_MULTI_REG
      ) {
        const writeValue = value !== undefined ? value : commandSpec.value;
        if (writeValue === undefined) {
          const errorMsg = `Write command '${commandKey}' requires a value.`;
          await this.commandResultHandler.handleFailure(existingRequestId, errorMsg, device, unit, commandKey);
          throw ModbusErrorFactory.createCommandExecutionError(commandKey, errorMsg);
        }

        try {
          const modbusResult = await this.unifiedModbusService?.writeRegister({
            slaveId: 1,
            functionCode: commandSpec.functionCode,
            address: commandSpec.address,
            value: writeValue,
            context: 'control',
          });

          result = modbusResult;
          // 결과 성공 여부 확인 후 처리
          if (!result || (result as any).success !== true) {
            const errorMsg = (result as any)?.error ?? 'Modbus write failed';
            await this.commandResultHandler.handleFailure(existingRequestId, errorMsg, device, unit, commandKey, value);
            throw ModbusErrorFactory.createCommandExecutionError(commandKey, errorMsg);
          }

          await this.commandResultHandler.handleSuccess(
            existingRequestId,
            result,
            device,
            unit,
            commandKey,
            value,
            'data', // 모든 명령은 data 컬렉션에 저장
          );
        } catch (error) {
          await this.commandResultHandler.handleFailure(existingRequestId, error as Error, device, unit, commandKey);
          throw error;
        }
      } else {
        const errorMsg = `Unsupported function code: ${commandSpec.functionCode}`;
        await this.commandResultHandler.handleFailure(existingRequestId, errorMsg, device, unit, commandKey);
        throw ModbusErrorFactory.createUnsupportedFunctionCode(commandSpec.functionCode);
      }

      return { _id: existingRequestId, action: commandKey, result };
    } catch (error) {
      // 에러는 이미 handleFailure에서 처리되었으므로 그대로 throw
      throw error;
    }
  }

  // 시간 명령어 분리 처리 메서드
  private async executeTimeCommand(
    unit: IUnit,
    device: IDevice,
    commandKey: string,
    value?: any,
    _request?: any,
    existingRequestId?: string,
  ): Promise<CommandResult> {
    // 🎯 Phase 4: executeTimeCommand 디버깅 로그 추가
    this.logger?.info(`[ControlService] executeTimeCommand 시작: ${commandKey}, value: ${value}`);

    const timeCommands = this.getTimeCommands(commandKey);
    this.logger?.info(`[ControlService] getTimeCommands 결과: ${JSON.stringify(timeCommands)}`);

    if (!timeCommands) {
      throw new HttpValidationError(`Invalid time command: ${commandKey}`);
    }

    // GET 명령어인지 SET 명령어인지 확인
    const isGetCommand = commandKey.startsWith('GET_');

    if (isGetCommand) {
      return this.executeTimeGetCommand(unit, device, commandKey, _request);
    }

    // SET 명령어 처리
    const parsedTime = this.parseTimeValue(value);
    if (!parsedTime) {
      throw new HttpValidationError(`Invalid time value: ${value}. Expected format: "HH:MM" or HHMM`);
    }

    // 기존 요청이 있으면 재사용, 없으면 생성
    let requestId: string;
    if (!existingRequestId) {
      const commandLog = await this.controlRepository.createCommandLog({
        deviceId: unit.deviceId,
        unitId: unit.unitId,
        action: commandKey,
        value,
        status: 'waiting',
      });
      requestId = (commandLog._id as any).toString();
      this.logger?.info(`[ControlService] 명령 로그 생성 완료: requestId=${requestId}`);
    } else {
      requestId = existingRequestId;
      this.logger?.info(`[ControlService] 기존 요청 ID 재사용: requestId=${requestId}`);
    }

    try {
      // 🎯 Phase 4: HOUR/MINUTE 명령어 사양 조회 디버깅
      this.logger?.info(`[ControlService] HOUR 명령어 조회: ${timeCommands.hourCommand}`);
      const hourCommandSpec = getModbusCommandWithPortMapping(unit, timeCommands.hourCommand);
      this.logger?.info(`[ControlService] HOUR 명령어 사양: ${JSON.stringify(hourCommandSpec)}`);

      this.logger?.info(`[ControlService] MINUTE 명령어 조회: ${timeCommands.minuteCommand}`);
      const minuteCommandSpec = getModbusCommandWithPortMapping(unit, timeCommands.minuteCommand);
      this.logger?.info(`[ControlService] MINUTE 명령어 사양: ${JSON.stringify(minuteCommandSpec)}`);

      if (!hourCommandSpec || !minuteCommandSpec) {
        // 🎯 Phase 4: 에러 처리 강화 - 명령 상태를 fail로 업데이트
        const errorMsg = `Time command specifications not found for ${commandKey}`;
        this.logger?.error(`[ControlService] ${errorMsg}`);

        // 명령 상태를 fail로 업데이트
        await this.controlRepository.updateCommandLog(requestId, {
          status: 'fail',
          finishedAt: new Date(),
          error: errorMsg,
        });

        // 스케줄2 지원 여부 확인하여 더 명확한 오류 메시지 제공
        if (commandKey.includes('START_TIME_2') || commandKey.includes('END_TIME_2')) {
          if (unit.type !== 'lighting') {
            const scheduleErrorMsg =
              `Command '${commandKey}' not supported for ${unit.type} device type. ` +
              `Only lighting device supports schedule2 (START_TIME_2, END_TIME_2). ` +
              `Use schedule1 (START_TIME_1, END_TIME_1) instead.`;

            await this.controlRepository.updateCommandLog(requestId, {
              status: 'fail',
              finishedAt: new Date(),
              error: scheduleErrorMsg,
            });

            throw new HttpValidationError(scheduleErrorMsg);
          }
        }

        throw new HttpValidationError(errorMsg);
      }

      // 🎯 Phase 4: Mock 환경 감지 및 로깅
      const isMockMode = process.env.MODBUS_MOCK_ENABLED === 'true';
      this.logger?.info(`[ControlService] Mock 모드 감지: ${isMockMode}`);

      // 시 설정 실행 로그
      this.logger?.info(
        `[TimeCommand] ${commandKey} - _HOUR 명령어 실행: ${timeCommands.hourCommand} (functionCode: ${hourCommandSpec.functionCode}, address: ${hourCommandSpec.address}, value: ${parsedTime.hour})`,
      );

      // 🎯 Phase 4: 시 설정 - 상세 디버깅 로그 추가
      this.logger?.info(`[ControlService] executeModbusWrite 호출 전: ${timeCommands.hourCommand}`);
      try {
        await this.executeModbusWrite(unit, hourCommandSpec.functionCode, hourCommandSpec.address, parsedTime.hour);
        this.logger?.info(`[ControlService] executeModbusWrite 성공: ${timeCommands.hourCommand}`);
      } catch (error) {
        this.logger?.error(`[ControlService] executeModbusWrite 실패: ${timeCommands.hourCommand} - ${error}`);
        throw error;
      }

      // 분 설정 실행 로그
      this.logger?.info(
        `[TimeCommand] ${commandKey} - _MINUTE 명령어 실행: ${timeCommands.minuteCommand} (functionCode: ${minuteCommandSpec.functionCode}, address: ${minuteCommandSpec.address}, value: ${parsedTime.minute})`,
      );

      // 🎯 Phase 4: 분 설정 - 상세 디버깅 로그 추가
      this.logger?.info(`[ControlService] executeModbusWrite 호출 전: ${timeCommands.minuteCommand}`);
      try {
        await this.executeModbusWrite(
          unit,
          minuteCommandSpec.functionCode,
          minuteCommandSpec.address,
          parsedTime.minute,
        );
        this.logger?.info(`[ControlService] executeModbusWrite 성공: ${timeCommands.minuteCommand}`);
      } catch (error) {
        this.logger?.error(`[ControlService] executeModbusWrite 실패: ${timeCommands.minuteCommand} - ${error}`);
        throw error;
      }

      // 🎯 Phase 4: 성공 시 명령 상태 업데이트 및 CommandResultHandler 호출
      const timeString = `${parsedTime.hour.toString().padStart(2, '0')}:${parsedTime.minute
        .toString()
        .padStart(2, '0')}`;

      this.logger?.info(`[ControlService] 통합 시간 문자열 생성: ${timeString}`);

      // ✅ CommandResultHandler를 통한 통합 처리 (Data 컬렉션 업데이트 포함)
      this.logger?.info(`[ControlService] handleSuccess 호출 전`);
      try {
        await this.commandResultHandler.handleSuccess(requestId, timeString, device, unit, commandKey, timeString);
        this.logger?.info(`[ControlService] handleSuccess 성공`);
      } catch (error) {
        this.logger?.error(`[ControlService] handleSuccess 실패: ${error}`);
        throw error;
      }

      this.logger?.info(`[ControlService] executeTimeCommand 완료: ${commandKey} = ${timeString}`);

      return { _id: requestId, action: commandKey, result: timeString };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger?.error(`[ControlService] executeTimeCommand 에러: ${errorMsg}`);

      // 실패 시 로그 업데이트
      await this.controlRepository.updateCommandLog(requestId, {
        status: 'fail',
        finishedAt: new Date(),
        error: errorMsg,
      });

      throw error;
    }
  }

  // 시간 명령어 GET 처리 메서드
  private async executeTimeGetCommand(
    unit: IUnit,
    device: IDevice,
    commandKey: string,
    _request?: any,
    existingRequestId?: string,
  ): Promise<CommandResult> {
    const timeCommands = this.getTimeCommands(commandKey);
    if (!timeCommands) {
      throw new HttpValidationError(`Invalid time command: ${commandKey}`);
    }

    // 기존 요청이 있으면 재사용, 없으면 생성
    let requestId: string;
    if (!existingRequestId) {
      const commandLog = await this.controlRepository.createCommandLog({
        deviceId: unit.deviceId,
        unitId: unit.unitId,
        action: commandKey,
        value: undefined, // GET 명령어는 value가 없음
        status: 'waiting',
      });
      requestId = (commandLog._id as any).toString();
    } else {
      requestId = existingRequestId;
      this.logger?.info(`[ControlService] 기존 요청 ID 재사용(GET): requestId=${requestId}`);
    }

    try {
      // 시와 분을 각각 읽기
      const hourCommandSpec = getModbusCommandWithPortMapping(unit, timeCommands.hourCommand);
      const minuteCommandSpec = getModbusCommandWithPortMapping(unit, timeCommands.minuteCommand);

      if (!hourCommandSpec || !minuteCommandSpec) {
        // 스케줄2 지원 여부 확인하여 더 명확한 오류 메시지 제공
        if (commandKey.includes('START_TIME_2') || commandKey.includes('END_TIME_2')) {
          if (unit.type !== 'lighting') {
            throw new HttpValidationError(
              `Command '${commandKey}' not supported for ${unit.type} device type. ` +
                `Only lighting device supports schedule2 (START_TIME_2, END_TIME_2). ` +
                `Use schedule1 (START_TIME_1, END_TIME_1) instead.`,
            );
          }
        }
        throw new HttpValidationError(`Time command specifications not found for ${commandKey}`);
      }

      // 시 읽기 실행 로그
      this.logger?.info(
        `[TimeCommand] ${commandKey} - _HOUR 명령어 실행: ${timeCommands.hourCommand} (functionCode: ${hourCommandSpec.functionCode}, address: ${hourCommandSpec.address})`,
      );

      // 시 읽기
      const hourResult = await this.executeModbusRead(
        unit,
        hourCommandSpec.functionCode,
        hourCommandSpec.address,
        hourCommandSpec.length || 1,
      );

      // 분 읽기 실행 로그
      this.logger?.info(
        `[TimeCommand] ${commandKey} - _MINUTE 명령어 실행: ${timeCommands.minuteCommand} (functionCode: ${minuteCommandSpec.functionCode}, address: ${minuteCommandSpec.address})`,
      );

      // 분 읽기
      const minuteResult = await this.executeModbusRead(
        unit,
        minuteCommandSpec.functionCode,
        minuteCommandSpec.address,
        minuteCommandSpec.length || 1,
      );

      if (hourResult === undefined || minuteResult === undefined) {
        throw new Error('Failed to read time values from device');
      }

      // 통합된 시간 형식으로 변환 (HH:MM)
      const hour = Array.isArray(hourResult) ? hourResult[0] : hourResult;
      const minute = Array.isArray(minuteResult) ? minuteResult[0] : minuteResult;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      // ✅ CommandResultHandler를 통한 통합 처리 (Data 컬렉션 업데이트 포함)
      await this.commandResultHandler.handleSuccess(requestId, timeString, device, unit, commandKey, timeString);

      return { _id: requestId, action: commandKey, result: timeString };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';

      // ✅ CommandResultHandler를 통한 통합 처리 (Data 컬렉션 업데이트 포함)
      await this.commandResultHandler.handleFailure(requestId, errorMsg, device, unit, commandKey);

      throw error;
    }
  }

  async executeUnitCommands(
    unit: IUnit,
    device: IDevice,
    commands: CommandPayload[],
    request?: any,
  ): Promise<
    Array<{
      action: string;
      requestId: string;
      deviceName?: string;
      unitName?: string;
    }>
  > {
    // 빈 배열이면 빈 배열 반환
    if (!commands || commands.length === 0) {
      return [];
    }

    // 실행 전략을 사용하여 명령 실행
    const results = await this.executionStrategy.execute(unit, device, commands, this, request);

    // 결과를 응답 형식으로 변환
    return results.map((result) => ({
      action: result.action || '',
      requestId: result._id || '',
      deviceName: device.name || unit.deviceId,
      unitName: unit.name || unit.unitId,
    }));
  }

  /**
   * 모든 DO를 schedule 모드로 변경
   */
  async setAllDOToScheduleMode(): Promise<{ successCount: number; failureCount: number; totalCount: number }> {
    try {
      this.logger?.info('[ControlService] 모든 DO를 schedule 모드로 변경 시작');

      const DO_NUMBERS = Array.from({ length: 16 }, (_, i) => i + 1); // DO1 ~ DO16
      const DO_MODE_ADDRESSES = [352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 385, 386, 367];

      let successCount = 0;
      let failureCount = 0;
      const results: Array<{ doNumber: number; success: boolean; error?: string }> = [];

      // WebSocket을 통해 시작 알림 전송
      this.webSocketService?.broadcastLog('info', 'system', '자동모드 활성화: 모든 DO 모드를 schedule로 변경 중...');

      // DO 모드를 순차적으로 변경 (Modbus 통신은 병렬 처리 불가)
      for (let i = 0; i < DO_NUMBERS.length; i++) {
        const doNumber = DO_NUMBERS[i];
        const address = DO_MODE_ADDRESSES[i];
        const progress = Math.round(((i + 1) / DO_NUMBERS.length) * 100);

        try {
          // DO 모드를 schedule 모드(1)로 변경
          await this.executeModbusWrite(
            { deviceId: 'sngil-ddc', unitId: 'unit-001' } as IUnit, // 기본값 사용
            5, // Write Single Coil
            address,
            1, // schedule 모드
          );

          successCount++;
          results.push({ doNumber, success: true });

          this.logger?.info(`[ControlService] DO${doNumber} 모드 변경 완료: schedule (주소: ${address})`);

          // WebSocket을 통해 진행 상황 전달
          this.webSocketService?.broadcastLog('info', 'system', `DO${doNumber} 모드 변경 완료 (${progress}%)`);

          // Modbus 통신 간격 추가 (안정성을 위해 100ms 대기)
          // await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          failureCount++;
          const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
          results.push({ doNumber, success: false, error: errorMsg });

          this.logger?.error(`[ControlService] DO${doNumber} 모드 변경 실패: ${errorMsg}`);

          // WebSocket을 통해 실패 상황 전달
          this.webSocketService?.broadcastLog('error', 'system', `DO${doNumber} 모드 변경 실패: ${errorMsg}`);

          // 실패해도 계속 진행 (전체 프로세스 중단 방지)
        }
      }

      const totalCount = DO_NUMBERS.length;

      // 최종 결과 로깅
      this.logger?.info(
        `[ControlService] 모든 DO 모드 변경 완료: 성공 ${successCount}개, 실패 ${failureCount}개, 총 ${totalCount}개`,
      );

      // WebSocket을 통해 최종 결과 전달
      if (failureCount === 0) {
        this.webSocketService?.broadcastLog(
          'info',
          'system',
          `자동모드 활성화 완료: 모든 DO 모드가 schedule로 변경되었습니다.`,
        );
      } else {
        this.webSocketService?.broadcastLog(
          'warn',
          'system',
          `자동모드 활성화 완료: ${successCount}개 성공, ${failureCount}개 실패`,
        );
      }

      return { successCount, failureCount, totalCount };
    } catch (error) {
      this.logger?.error(`[ControlService] 모든 DO 모드 변경 중 오류 발생: ${error}`);

      // WebSocket을 통해 에러 알림 전송
      this.webSocketService?.broadcastLog(
        'error',
        'system',
        `자동모드 활성화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      );

      throw error;
    }
  }

  /**
   * 모든 DO를 manual 모드로 변경
   */
  async setAllDOToManualMode(): Promise<{ successCount: number; failureCount: number; totalCount: number }> {
    try {
      this.logger?.info('[ControlService] 모든 DO를 manual 모드로 변경 시작');

      const DO_NUMBERS = Array.from({ length: 16 }, (_, i) => i + 1); // DO1 ~ DO16
      const DO_MODE_ADDRESSES = [352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 385, 386, 367];

      let successCount = 0;
      let failureCount = 0;
      const results: Array<{ doNumber: number; success: boolean; error?: string }> = [];

      // WebSocket을 통해 시작 알림 전송
      this.webSocketService?.broadcastLog('info', 'system', '수동모드 활성화: 모든 DO 모드를 manual로 변경 중...');

      // DO 모드를 순차적으로 변경 (Modbus 통신은 병렬 처리 불가)
      for (let i = 0; i < DO_NUMBERS.length; i++) {
        const doNumber = DO_NUMBERS[i];
        const address = DO_MODE_ADDRESSES[i];
        const progress = Math.round(((i + 1) / DO_NUMBERS.length) * 100);

        try {
          // DO 모드를 manual 모드(0)로 변경
          await this.executeModbusWrite(
            { deviceId: 'sngul-ddc', unitId: 'unit-001' } as IUnit, // 기본값 사용
            5, // Write Single Coil
            address,
            0, // manual 모드
          );

          successCount++;
          results.push({ doNumber, success: true });

          this.logger?.info(`[ControlService] DO${doNumber} 모드 변경 완료: manual (주소: ${address})`);

          // WebSocket을 통해 진행 상황 전달
          this.webSocketService?.broadcastLog('info', 'system', `DO${doNumber} 모드 변경 완료 (${progress}%)`);

          // Modbus 통신 간격 추가 (안정성을 위해 100ms 대기)
          // await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          failureCount++;
          const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
          results.push({ doNumber, success: false, error: errorMsg });

          this.logger?.error(`[ControlService] DO${doNumber} 모드 변경 실패: ${errorMsg}`);

          // WebSocket을 통해 실패 상황 전달
          this.webSocketService?.broadcastLog('error', 'system', `DO${doNumber} 모드 변경 실패: ${errorMsg}`);

          // 실패해도 계속 진행 (전체 프로세스 중단 방지)
        }
      }

      const totalCount = DO_NUMBERS.length;

      // 최종 결과 로깅
      this.logger?.info(
        `[ControlService] 모든 DO 모드 변경 완료: 성공 ${successCount}개, 실패 ${failureCount}개, 총 ${totalCount}개`,
      );

      // WebSocket을 통해 최종 결과 전달
      if (failureCount === 0) {
        this.webSocketService?.broadcastLog(
          'info',
          'system',
          `수동모드 활성화 완료: 모든 DO 모드가 manual로 변경되었습니다.`,
        );
      } else {
        this.webSocketService?.broadcastLog(
          'warn',
          'system',
          `수동모드 활성화 완료: ${successCount}개 성공, ${failureCount}개 실패`,
        );
      }

      return { successCount, failureCount, totalCount };
    } catch (error) {
      this.logger?.error(`[ControlService] 모든 DO 모드 변경 중 오류 발생: ${error}`);

      // WebSocket을 통해 에러 알림 전송
      this.webSocketService?.broadcastLog(
        'error',
        'system',
        `수동모드 활성화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      );

      throw error;
    }
  }
}
