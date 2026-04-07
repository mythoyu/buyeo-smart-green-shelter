import { HttpValidationError, HttpModbusError } from '../../shared/utils/responseHelper';

export class ModbusErrorFactory {
  /**
   * 지원하지 않는 function code 에러
   */
  static createUnsupportedFunctionCode(functionCode: number): HttpValidationError {
    return new HttpValidationError(`지원하지 않는 Modbus function code: ${functionCode}`);
  }

  /**
   * Modbus 연결 없음 에러
   */
  static createNoConnectionError(unitId: string): HttpModbusError {
    return new HttpModbusError(`Unit ${unitId}에 대한 Modbus 연결이 없습니다.`);
  }

  /**
   * Modbus 통신 실패 에러
   */
  static createCommunicationError(unitId: string, operation: string, details?: string): HttpModbusError {
    const message = `Unit ${unitId}의 ${operation} 실패${details ? `: ${details}` : ''}`;
    return new HttpModbusError(message);
  }

  /**
   * 명령 실행 실패 에러
   */
  static createCommandExecutionError(commandKey: string, reason: string): HttpValidationError {
    return new HttpValidationError(`명령 '${commandKey}' 실행 실패: ${reason}`);
  }

  /**
   * 시간 명령 값 파싱 실패 에러
   */
  static createTimeValueParseError(value: any): HttpValidationError {
    return new HttpValidationError(`잘못된 시간 값: ${value}. 예상 형식: "HH:MM" 또는 HHMM`);
  }
}
