import { IDevice } from '../../../models/schemas/DeviceSchema';
import { IUnit } from '../../../models/schemas/UnitSchema';

export interface CommandPayload {
  action: string;
  value?: number;
}

export interface CommandResult {
  _id: string;
  action: string;
  result: any;
}

export interface IControlService {
  executeUnitCommand(
    unit: IUnit,
    device: IDevice,
    commandKey: string,
    value?: number,
    request?: any,
  ): Promise<CommandResult>;

  /**
   * 기존 CommandLog ID를 사용하여 명령 실행 (중복 생성 방지)
   */
  executeUnitCommandWithExistingLog(
    unit: IUnit,
    device: IDevice,
    commandKey: string,
    existingRequestId: string,
    value?: number,
    request?: any,
  ): Promise<CommandResult>;

  executeUnitCommands(
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
  >;

  /**
   * 모든 DO를 schedule 모드로 변경
   */
  setAllDOToScheduleMode(): Promise<{ successCount: number; failureCount: number; totalCount: number }>;

  /**
   * 모든 DO를 manual 모드로 변경
   */
  setAllDOToManualMode(): Promise<{ successCount: number; failureCount: number; totalCount: number }>;
}
