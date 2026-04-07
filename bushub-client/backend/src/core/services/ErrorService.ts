import { IError, IUnitError } from '../../models/schemas/ErrorSchema';
import { ILogger } from '../../shared/interfaces/ILogger';
import { IErrorRepository } from '../repositories/interfaces/IErrorRepository';

import { IErrorService } from './interfaces/IErrorService';

export class ErrorService implements IErrorService {
  constructor(private errorRepository: IErrorRepository, private logger?: ILogger) {}

  async createError(deviceId: string, units: IUnitError[]): Promise<IError> {
    this.logger?.info(`[ErrorService] 에러 생성: ${deviceId} - ${units.length}개 유닛`);
    return await this.errorRepository.createError(deviceId, units);
  }

  async findErrorByDevice(deviceId: string): Promise<IError | null> {
    return await this.errorRepository.findErrorByDevice(deviceId);
  }

  async findAllErrors(): Promise<IError[]> {
    return await this.errorRepository.findAllErrors();
  }

  async deleteAllErrorsByDevice(deviceId: string): Promise<boolean> {
    this.logger?.info(`[ErrorService] 장비 에러 삭제: ${deviceId}`);
    return await this.errorRepository.deleteAllErrorsByDevice(deviceId);
  }

  async createCommunicationError(): Promise<void> {
    this.logger?.warn(`[ErrorService] 통신 에러 생성 - 전체 시스템`);

    const allErrors = await this.findAllErrors();
    for (const error of allErrors) {
      // 통신 에러가 이미 있는지 확인
      const hasCommunicationError = error.units.some((unit) => unit.errorId === 'e001');
      if (!hasCommunicationError) {
        const communicationError: IUnitError = {
          unitId: 'system',
          errorId: 'e001', // 고정된 통신 에러 ID
          errorDesc: 'Modbus 통신 실패',
          errorAt: new Date(),
        };
        error.units.push(communicationError);
        await error.save();
      }
    }
  }

  // 🆕 개별 장비 통신 에러 생성
  async createCommunicationErrorForDevice(deviceId: string, unitId: string): Promise<void> {
    this.logger?.warn(`[ErrorService] 통신 에러 생성 - ${deviceId}/${unitId}`);

    // 기존 에러 확인
    let existingError = await this.findErrorByDevice(deviceId);

    if (existingError) {
      // 중복 통신 에러 확인
      const hasExistingCommunicationError = existingError.units.some(
        (unit) => unit.unitId === unitId && unit.errorId === 'e001',
      );

      if (!hasExistingCommunicationError) {
        const communicationError: IUnitError = {
          unitId,
          errorId: 'e001',
          errorDesc: 'Modbus 통신 실패',
          errorAt: new Date(),
        };
        existingError.units.push(communicationError);
        await existingError.save();
        this.logger?.info(`[ErrorService] 통신 에러 추가: ${deviceId}/${unitId}`);
      } else {
        this.logger?.info(`[ErrorService] 중복 통신 에러 방지: ${deviceId}/${unitId}`);
      }
    } else {
      // 새로운 에러 문서 생성
      const communicationError: IUnitError = {
        unitId,
        errorId: 'e001',
        errorDesc: 'Modbus 통신 실패',
        errorAt: new Date(),
      };
      await this.createError(deviceId, [communicationError]);
      this.logger?.info(`[ErrorService] 새로운 통신 에러 생성: ${deviceId}/${unitId}`);
    }
  }

  async clearCommunicationError(): Promise<void> {
    this.logger?.info(`[ErrorService] 통신 에러 해제 - 전체 시스템`);

    const allErrors = await this.findAllErrors();
    for (const error of allErrors) {
      // 통신 에러만 제거
      const updatedUnits = error.units.filter((unit) => unit.errorId !== 'e001');
      if (updatedUnits.length === 0) {
        await this.deleteAllErrorsByDevice(error.deviceId);
      } else {
        error.units = updatedUnits;
        await error.save();
      }
    }
  }

  // 🆕 개별 장비 통신 에러 해제
  async clearCommunicationErrorForDevice(deviceId: string, unitId: string): Promise<void> {
    this.logger?.info(`[ErrorService] 통신 에러 해제 - ${deviceId}/${unitId}`);

    const existingError = await this.findErrorByDevice(deviceId);
    if (existingError) {
      // 해당 장비의 통신 에러만 제거
      const updatedUnits = existingError.units.filter((unit) => !(unit.unitId === unitId && unit.errorId === 'e001'));

      if (updatedUnits.length === 0) {
        await this.deleteAllErrorsByDevice(deviceId);
      } else {
        existingError.units = updatedUnits;
        await existingError.save();
      }
    }
  }

  // 🆕 Alarm 에러 생성
  async createAlarmError(deviceId: string, unitId: string, deviceType: string, alarmValue: number): Promise<void> {
    const errorId = this.generateAlarmErrorCode(deviceType, alarmValue);
    const errorDesc = this.generateAlarmErrorDescription(deviceType, alarmValue);

    this.logger?.warn(`[ErrorService] Alarm 에러 생성: ${deviceId}/${unitId} - ${errorId}: ${errorDesc}`);

    // 기존 에러 확인
    let existingError = await this.findErrorByDevice(deviceId);

    if (existingError) {
      // 중복 에러 확인
      const hasExistingAlarmError = existingError.units.some(
        (unit) => unit.unitId === unitId && unit.errorId === errorId,
      );

      if (!hasExistingAlarmError) {
        const alarmError: IUnitError = {
          unitId,
          errorId,
          errorDesc,
          errorAt: new Date(), // UTC+0 시간
        };
        existingError.units.push(alarmError);
        await existingError.save();
        this.logger?.info(`[ErrorService] Alarm 에러 추가: ${errorId}`);
      } else {
        this.logger?.info(`[ErrorService] 중복 Alarm 에러 방지: ${errorId}`);
      }
    } else {
      // 새로운 에러 문서 생성
      const alarmError: IUnitError = {
        unitId,
        errorId,
        errorDesc,
        errorAt: new Date(), // UTC+0 시간
      };
      await this.createError(deviceId, [alarmError]);
      this.logger?.info(`[ErrorService] 새로운 Alarm 에러 생성: ${errorId}`);
    }
  }

  // 🆕 Alarm 에러 해제
  async clearAlarmErrors(deviceId: string, unitId: string, deviceType?: string): Promise<void> {
    this.logger?.info(`[ErrorService] Alarm 에러 해제: ${deviceId}/${unitId}${deviceType ? ` (${deviceType})` : ''}`);

    const existingError = await this.findErrorByDevice(deviceId);
    if (existingError) {
      // Alarm 에러만 제거 (e1xx, e4xx, e5xx)
      const updatedUnits = existingError.units.filter((unit) => {
        if (unit.unitId !== unitId) return true;

        // deviceType이 지정되면 해당 타입만 해제
        if (deviceType) {
          const errorCodePattern = this.getErrorCodePattern(deviceType);
          const regex = new RegExp(errorCodePattern);
          return !regex.test(unit.errorId);
        }

        // deviceType이 지정되지 않으면 모든 alarm 에러 해제
        return !this.isAlarmError(unit.errorId);
      });

      if (updatedUnits.length === 0) {
        await this.deleteAllErrorsByDevice(deviceId);
      } else {
        existingError.units = updatedUnits;
        await existingError.save();
      }
    }
  }

  // 🆕 디바이스 타입별 에러 코드 패턴 반환
  private getErrorCodePattern(deviceType: string): string {
    switch (deviceType) {
      case 'cooler':
        return '^e1';
      case 'exchanger':
        return '^e4';
      default:
        return '^e[1-5]';
    }
  }

  // 🆕 Alarm 에러 코드 생성
  generateAlarmErrorCode(deviceType: string, alarmValue: number): string {
    switch (deviceType) {
      case 'cooler':
        // CH01 → alarm=1 → e101, CH02 → alarm=2 → e102
        return `e1${alarmValue.toString().padStart(2, '0')}`;
      case 'exchanger':
        // 전열교환기는 기존 방식 유지 (e400~e499)
        return `e${400 + alarmValue}`;
      default:
        throw new Error(`지원하지 않는 디바이스 타입: ${deviceType}`);
    }
  }

  // 🆕 Alarm 에러 설명 생성
  generateAlarmErrorDescription(deviceType: string, alarmValue: number): string {
    if (deviceType === 'cooler') {
      // CHxx 에러 코드 매핑
      const chErrorMap: Record<number, string> = {
        1: '실내 온도센서 Open/Short',
        2: '실내 입구 배관센서 Open/Short',
        3: '리모컨 통신 불량',
        4: '드레인 펌프 불량',
        5: '통신 불량 (실내기 ↔ 실외기)',
        6: '실내 출구 배관센서 Open/Short',
        9: '옵션 PCB 에러',
        10: '실내팬 구속(동작 불량)',
        21: '인버터 압축기 IPM Fault',
        22: 'CT 2 (Max CT/입력 과전류)',
        23: 'DC Link 저전압 에러',
        24: '고압/저압/방열판 SW',
        25: '저전압/과전압',
        26: 'DC Comp 위치감지 에러',
        27: 'PFC Fault',
        28: 'DC Link 고전압 에러',
        29: 'Comp 상 과전류 에러',
        32: '토출 배관 과열 에러',
        35: '압축기 입구 압력 과다 하락',
        38: '냉매 누설 감지',
        40: 'CT 센서 에러 (Open / Short)',
        41: 'Comp 토출 온도 센서 에러',
        43: '압력센서 개방/단락',
        44: '실외 흡입 온도 센서 에러',
        45: '실외 중간 배관 온도 센서 에러',
        46: 'Comp 흡입 온도 센서 에러',
        47: '인젝션 출구 온도 센서 에러',
        48: '실외 출구 배관 센서 에러',
        51: '과접속대수(용량)',
        52: 'Inv ↔ Main PCB통신에러',
        53: '통신 에러 (실외기 ↔ 실내기)',
        54: '역/결상 감지 에러',
        60: 'EEPROM Check Sum 에러',
        61: '응축기 과열 에러',
        62: '방열판 과열 에러',
        65: '방열판 센서 에러 (Open / Short)',
        67: '실외기 팬 구속 에러',
        92: '시운전 미실시 에러',
        93: '시운전 시 SVC Valve 막힘',
        94: '시운전 시 냉매 없음 감지',
      };

      return chErrorMap[alarmValue] || `냉난방기 알 수 없는 오류 (${alarmValue})`;
    }

    // 다른 디바이스 타입은 기존 방식 유지
    const descriptions = {
      exchanger: '전열교환기 오류',
    };

    const baseDescription = descriptions[deviceType as keyof typeof descriptions];
    if (!baseDescription) {
      throw new Error(`지원하지 않는 디바이스 타입: ${deviceType}`);
    }

    return `${baseDescription} ${alarmValue}`;
  }

  // 🆕 Alarm 에러인지 확인
  isAlarmError(errorId: string): boolean {
    // e101~e199 (cooler), e400~e499 (exchanger), e500~e599 (integrated_sensor)
    return /^e(1[0-9][0-9]|[4-5][0-9][0-9])$/.test(errorId);
  }
}
