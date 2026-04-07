import { IError, IUnitError } from '../../../models/schemas/ErrorSchema';

export interface IErrorService {
  createError(deviceId: string, units: IUnitError[]): Promise<IError>;
  findErrorByDevice(deviceId: string): Promise<IError | null>;
  findAllErrors(): Promise<IError[]>;
  deleteAllErrorsByDevice(deviceId: string): Promise<boolean>;
  createCommunicationError(): Promise<void>;
  createCommunicationErrorForDevice(deviceId: string, unitId: string): Promise<void>;
  clearCommunicationError(): Promise<void>;
  clearCommunicationErrorForDevice(deviceId: string, unitId: string): Promise<void>;

  // 🆕 Alarm 에러 관련 메서드
  createAlarmError(deviceId: string, unitId: string, deviceType: string, alarmValue: number): Promise<void>;
  clearAlarmErrors(deviceId: string, unitId: string, deviceType?: string): Promise<void>;
  generateAlarmErrorCode(deviceType: string, alarmValue: number): string;
  generateAlarmErrorDescription(deviceType: string, alarmValue: number): string;
  isAlarmError(errorId: string): boolean;
}
