import { DeviceModel } from '../../models/Device';
import { IDevice } from '../../models/schemas/DeviceSchema';
import { IUnit } from '../../models/schemas/UnitSchema';
import { ILogger } from '../../shared/interfaces/ILogger';
import { Logger } from '../../shared/services/Logger';
import { IControlRepository } from '../repositories/interfaces/IControlRepository';

import { IWebSocketService } from './interfaces/IWebSocketService';
import { IErrorService } from './interfaces/IErrorService';

export class CommandResultHandler {
  private logger: ILogger = new Logger();
  private dataModel: any = null;

  constructor(
    private controlRepository: IControlRepository,
    private webSocketService?: IWebSocketService,
    private errorService?: IErrorService,
  ) {
    this.initializeDataModel();
  }

  /**
   * Data 모델 초기화 (지연 로딩)
   */
  private async initializeDataModel(): Promise<void> {
    try {
      // Data 모델을 동적으로 가져오기
      const { Data } = await import('../../models/schemas/DataSchema');
      this.dataModel = Data;
    } catch (error) {
      this.logger.error(`[CommandResultHandler] Data 모델 초기화 실패: ${error}`);
    }
  }

  /**
   * 명령 실행 성공 처리
   */
  async handleSuccess(
    requestId: string,
    result: any,
    device: IDevice,
    unit: IUnit,
    commandKey: string,
    value?: any,
    collection?: string,
    context?: 'polling' | 'control',
  ): Promise<void> {
    try {
      // 폴링 데이터의 경우 CommandLog 업데이트 건너뛰기
      if (!requestId.startsWith('polling_')) {
        // 성공 시 로그 업데이트
        await this.controlRepository.updateCommandLog(requestId, {
          status: 'success',
          finishedAt: new Date(),
          result,
        });
      }

      // 모든 명령을 Data 컬렉션에 저장 (통신 에러는 폴링 시스템에서 처리)

      // ✅ Data 컬렉션 업데이트 추가 (value 우선, 없으면 result에서 추출)
      let dataValue = value !== undefined ? value : this.extractValueFromResult(result, commandKey);

      // 온도 필드 처리 시 Modbus 값을 실제 온도로 변환
      if (commandKey === 'GET_SUMMER_CONT_TEMP' || commandKey === 'GET_WINTER_CONT_TEMP' || commandKey === 'GET_HUM') {
        dataValue = dataValue / 10;
        this.logger.info(`[CommandResultHandler] 계절 타겟 온도 변환: ${commandKey} ${value} → ${dataValue}°C`);
      } else if (commandKey === 'GET_CUR_TEMP' || commandKey === 'GET_TEMP') {
        // Modbus 읽기 시: Modbus 값을 실제 온도로 변환 (튜닝값은 적용하지 않음)
        dataValue = (dataValue - 2000) / 10;
        this.logger.info(`[CommandResultHandler] 온도 변환: ${commandKey} ${value} → ${dataValue}°C`);
      }
      // power, auto 필드는 boolean으로 변환 (alarm은 number로 유지)
      else if (commandKey === 'GET_POWER' || commandKey === 'GET_AUTO') {
        dataValue = dataValue === 1 ? true : false;
      }
      // 🆕 Alarm 필드 처리 제거 (StatusService에서 처리)
      // else if (commandKey === 'GET_ALARM') {
      //   await this.processAlarmField(device, unit, dataValue);
      // }

      this.logger.debug(
        `[CommandResultHandler] handleSuccess에서 updateDeviceData 호출: ${device.deviceId}/${unit.unitId} - ${commandKey} = ${dataValue} (원본: ${result})`,
      );
      await this.updateDeviceDataLegacy(device.deviceId, unit.unitId, commandKey, dataValue);

      // WebSocket으로 명령 상태 브로드캐스트 (폴링 컨텍스트는 제외)
      if (context !== 'polling') {
        this.webSocketService?.broadcastCommandStatus(
          device.name || unit.deviceId,
          unit.name || unit.unitId,
          commandKey,
          'success',
          dataValue, // 성공 시 value 전달
        );
      }

      this.logger.debug(
        `[CommandResultHandler] 명령 성공 처리 완료: ${device.deviceId}/${unit.unitId} - ${commandKey}`,
      );
    } catch (error) {
      this.logger.error(`[CommandResultHandler] 명령 성공 처리 실패: ${error}`);
    }
  }

  /**
   * result에서 실제 값을 추출
   */
  private extractValueFromResult(result: any, commandKey: string): any {
    try {
      let value: any;

      // result가 객체인 경우 value 필드 확인
      if (result && typeof result === 'object') {
        if (result.value !== undefined) {
          value = result.value;
        } else if (result.data !== undefined) {
          value = result.data;
        } else if (result.success !== undefined) {
          value = result.success;
        } else {
          value = result;
        }
      } else {
        value = result;
      }

      return value;
    } catch (error) {
      this.logger.warn(`[CommandResultHandler] result에서 값 추출 실패: ${error}`);
      return result;
    }
  }

  /**
   * 🔥 새로운 공통 메소드: 여러 필드 업데이트 지원
   */
  async updateDeviceData(
    deviceId: string,
    unitId: string,
    data: { [key: string]: any },
    options?: { source: 'user' | 'polling' | 'system' },
  ): Promise<void> {
    try {
      this.logger.info(
        `[CommandResultHandler] updateDeviceData 시작: ${deviceId}/${unitId} - ${Object.keys(data).length}개 필드`,
      );

      if (!this.dataModel) {
        this.logger.warn('[CommandResultHandler] Data 모델이 초기화되지 않음');
        return;
      }

      // 각 필드별로 개별 업데이트 (일관성 보장)
      for (const [field, value] of Object.entries(data)) {
        await this.updateSingleField(deviceId, unitId, field, value);
      }

      this.logger.debug(`[CommandResultHandler] updateDeviceData 완료: ${deviceId}/${unitId}`);
    } catch (error) {
      this.logger.error(`[CommandResultHandler] updateDeviceData 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 🔥 공통 로직: 단일 필드 업데이트 (시간 필드 연동 처리 포함)
   */
  private async updateSingleField(deviceId: string, unitId: string, field: string, value: any): Promise<void> {
    if (!this.dataModel) {
      this.logger.warn('[CommandResultHandler] Data 모델이 초기화되지 않음');
      return;
    }

    const queryCondition = { deviceId, 'units.unitId': unitId };
    const updateContent: any = {
      [`units.$.data.${field}`]: value,
      updatedAt: new Date(),
    };

    // 🎯 시간 필드 연동 처리
    await this.handleTimeFieldSync(deviceId, unitId, field, value, updateContent);

    await this.dataModel.findOneAndUpdate(queryCondition, { $set: updateContent }, { new: true });
  }

  /**
   * 🎯 시간 필드 연동 처리: hour/minute 필드와 통합 시간 필드 동기화
   */
  private async handleTimeFieldSync(
    deviceId: string,
    unitId: string,
    field: string,
    value: any,
    updateContent: any,
  ): Promise<void> {
    try {
      // 🎯 시간 필드 매핑 정의
      const timeFieldMappings: Record<string, { hourField: string; minuteField: string; integratedField: string }> = {
        start_time_1_hour: {
          hourField: 'start_time_1_hour',
          minuteField: 'start_time_1_minute',
          integratedField: 'start_time_1',
        },
        start_time_1_minute: {
          hourField: 'start_time_1_hour',
          minuteField: 'start_time_1_minute',
          integratedField: 'start_time_1',
        },
        end_time_1_hour: {
          hourField: 'end_time_1_hour',
          minuteField: 'end_time_1_minute',
          integratedField: 'end_time_1',
        },
        end_time_1_minute: {
          hourField: 'end_time_1_hour',
          minuteField: 'end_time_1_minute',
          integratedField: 'end_time_1',
        },
        start_time_2_hour: {
          hourField: 'start_time_2_hour',
          minuteField: 'start_time_2_minute',
          integratedField: 'start_time_2',
        },
        start_time_2_minute: {
          hourField: 'start_time_2_hour',
          minuteField: 'start_time_2_minute',
          integratedField: 'start_time_2',
        },
        end_time_2_hour: {
          hourField: 'end_time_2_hour',
          minuteField: 'end_time_2_minute',
          integratedField: 'end_time_2',
        },
        end_time_2_minute: {
          hourField: 'end_time_2_hour',
          minuteField: 'end_time_2_minute',
          integratedField: 'end_time_2',
        },
      };

      const mapping = timeFieldMappings[field];
      if (!mapping) {
        return; // 시간 필드가 아닌 경우 처리하지 않음
      }

      // 🎯 현재 데이터에서 hour와 minute 값 가져오기
      const queryCondition = { deviceId, 'units.unitId': unitId };
      const currentData = await this.dataModel.findOne(queryCondition);
      if (!currentData) {
        this.logger.warn(`[CommandResultHandler] 현재 데이터를 찾을 수 없음: ${deviceId}/${unitId}`);
        return;
      }

      const unit = currentData.units.find((u: any) => u.unitId === unitId);
      if (!unit || !unit.data) {
        this.logger.warn(`[CommandResultHandler] 유닛 데이터를 찾을 수 없음: ${deviceId}/${unitId}`);
        return;
      }

      // 🎯 현재 hour와 minute 값 추출
      let currentHour = unit.data[mapping.hourField] || 0;
      let currentMinute = unit.data[mapping.minuteField] || 0;

      // 🎯 업데이트할 필드에 따라 값 설정
      if (field === mapping.hourField) {
        currentHour = value;
      } else if (field === mapping.minuteField) {
        currentMinute = value;
      }

      // 🎯 통합 시간 필드 생성 (HH:mm 형식)
      const integratedTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      updateContent[`units.$.data.${mapping.integratedField}`] = integratedTime;

      this.logger.debug(
        `[CommandResultHandler] 시간 필드 연동: ${field} = ${value} → ${mapping.integratedField} = ${integratedTime}`,
      );
    } catch (error) {
      this.logger.error(`[CommandResultHandler] 시간 필드 연동 처리 실패: ${error}`);
    }
  }

  /**
   * 🔥 기존 메소드: 단일 필드 업데이트 (하위 호환성)
   */
  private async updateDeviceDataLegacy(
    deviceId: string,
    unitId: string,
    commandKey: string,
    value: any,
  ): Promise<void> {
    try {
      this.logger.debug(
        `[CommandResultHandler] updateDeviceDataLegacy 시작: ${deviceId}/${unitId} - ${commandKey} = ${value}`,
      );

      if (!this.dataModel) {
        this.logger.warn('[CommandResultHandler] Data 모델이 초기화되지 않음');
        return;
      }

      this.logger.debug(`[CommandResultHandler] Data 모델 확인됨: ${typeof this.dataModel}`);

      // 명령 키를 데이터 필드로 매핑
      const dataField = await this.mapCommandToDataField(commandKey, deviceId, unitId);
      this.logger.debug(`[CommandResultHandler] 매핑 결과: ${commandKey} → ${dataField}`);

      if (!dataField) {
        this.logger.warn(`[CommandResultHandler] 매핑되지 않은 명령: ${commandKey}`);
        return;
      }

      // 🔥 공통 메소드 사용
      await this.updateSingleField(deviceId, unitId, dataField, value);

      this.logger.debug(
        `[CommandResultHandler] updateDeviceDataLegacy 완료: ${deviceId}/${unitId} - ${dataField} = ${value}`,
      );
    } catch (error) {
      this.logger.error(
        `[CommandResultHandler] Data 컬렉션 업데이트 실패: ${deviceId}/${unitId} - ${commandKey}: ${error}`,
      );
    }
  }

  /**
   * 🎯 Phase 3: CLIENT_PORT_MAPPINGS 기반 동적 데이터 필드 매핑
   * 기존 하드코딩된 매핑을 제거하고 CLIENT_PORT_MAPPINGS에서 동적으로 추출
   */
  private async mapCommandToDataField(commandKey: string, deviceId?: string, unitId?: string): Promise<string | null> {
    try {
      // 🎯 CLIENT_PORT_MAPPINGS에서 명령어 정보 동적 추출
      const { CLIENT_PORT_MAPPINGS } = await import('../../data/clientPortMappings');

      // 🎯 deviceId에서 clientId 추출 (기본값: c0101)
      const clientId = await this.extractClientIdFromDeviceId(deviceId || 'd001');

      // 🎯 CLIENT_PORT_MAPPINGS에서 해당 clientId의 매핑 찾기
      const clientMapping = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];
      if (!clientMapping) {
        this.logger.warn(`[CommandResultHandler] Client mapping not found for ${clientId}`);
        return this.getFallbackDataField(commandKey);
      }

      // 🎯 COMMON_SYSTEM_PORTS에서 먼저 검색
      if (clientMapping.ddc_time && clientMapping.ddc_time[commandKey]) {
        return this.determineDataFieldFromCommand(commandKey, clientMapping.ddc_time[commandKey]);
      }
      if (clientMapping.seasonal && clientMapping.seasonal[commandKey]) {
        return this.determineDataFieldFromCommand(commandKey, clientMapping.seasonal[commandKey]);
      }

      // 🎯 일반 디바이스에서 검색
      for (const deviceType in clientMapping) {
        // ddc_time, seasonal은 제외
        if (deviceType === 'ddc_time' || deviceType === 'seasonal') continue;

        if (clientMapping[deviceType]) {
          for (const unit in clientMapping[deviceType]) {
            const unitMapping = clientMapping[deviceType][unit];
            if (unitMapping[commandKey]) {
              // 🎯 명령어 타입에 따른 데이터 필드 결정
              return this.determineDataFieldFromCommand(commandKey, unitMapping[commandKey]);
            }
          }
        }
      }

      // 🎯 매핑을 찾지 못한 경우 fallback 사용
      this.logger.warn(`[CommandResultHandler] Command mapping not found for ${commandKey} in ${clientId}`);
      return this.getFallbackDataField(commandKey);
    } catch (error) {
      this.logger.error(`[CommandResultHandler] 동적 매핑 실패: ${error}`);
      return this.getFallbackDataField(commandKey);
    }
  }

  /**
   * 🎯 deviceId에서 clientId 추출 (device 컬렉션 조회)
   */
  private async extractClientIdFromDeviceId(deviceId: string): Promise<string> {
    try {
      const deviceModel = new DeviceModel();
      const device = await deviceModel.findById(deviceId);

      if (device && device.clientId) {
        this.logger.debug(`[CommandResultHandler] Device ${deviceId}의 정확한 clientId: ${device.clientId}`);
        return device.clientId;
      }

      // 🎯 device를 찾지 못한 경우 fallback 패턴 사용
      this.logger.warn(`[CommandResultHandler] Device ${deviceId}를 찾을 수 없어 fallback 패턴 사용`);
      if (deviceId.startsWith('d')) {
        const deviceNumber = deviceId.substring(1);
        const paddedNumber = deviceNumber.padStart(3, '0');
        return `c0${paddedNumber}`;
      }
      return 'c0101'; // 기본값
    } catch (error) {
      this.logger.error(`[CommandResultHandler] Device 조회 실패, fallback 패턴 사용: ${error}`);
      // 🎯 에러 발생 시 fallback 패턴 사용
      if (deviceId.startsWith('d')) {
        const deviceNumber = deviceId.substring(1);
        const paddedNumber = deviceNumber.padStart(3, '0');
        return `c0${paddedNumber}`;
      }
      return 'c0101'; // 기본값
    }
  }

  /**
   * 🎯 명령어와 설정값에 따른 데이터 필드 결정
   */
  private determineDataFieldFromCommand(commandKey: string, commandConfig: any): string | null {
    // 🎯 통합된 시간 명령어 처리
    if (commandConfig === 'TIME_INTEGRATED') {
      return this.getTimeDataField(commandKey);
    }

    // 🎯 HW_PORTS 기반 명령어 처리
    if (commandConfig && typeof commandConfig === 'object') {
      return this.getHardwarePortDataField(commandKey, commandConfig);
    }

    // 🎯 기타 명령어 처리
    return this.getGenericDataField(commandKey);
  }

  /**
   * 🎯 통합된 시간 명령어에 대한 데이터 필드 결정
   */
  private getTimeDataField(commandKey: string): string | null {
    const timeFieldMapping: Record<string, string> = {
      GET_START_TIME_1: 'start_time_1',
      SET_START_TIME_1: 'start_time_1',
      GET_END_TIME_1: 'end_time_1',
      SET_END_TIME_1: 'end_time_1',
      GET_START_TIME_2: 'start_time_2',
      SET_START_TIME_2: 'start_time_2',
      GET_END_TIME_2: 'end_time_2',
      SET_END_TIME_2: 'end_time_2',
    };

    return timeFieldMapping[commandKey] || null;
  }

  /**
   * 🎯 HW_PORTS 기반 명령어에 대한 데이터 필드 결정
   */
  private getHardwarePortDataField(commandKey: string, commandConfig: any): string | null {
    // 🎯 commandConfig에 field가 명시되어 있으면 우선 사용
    if (commandConfig.field) {
      return commandConfig.field;
    }

    // 🎯 명령어 패턴에 따른 데이터 필드 결정
    if (commandKey.includes('AUTO')) {
      return 'auto';
    }
    if (commandKey.includes('MODE')) {
      return 'mode';
    }
    if (commandKey.includes('POWER')) {
      return 'power';
    }
    if (commandKey.includes('SPEED')) {
      return 'speed';
    }
    // 🌡️ 온도 관련 명령어 명확하게 구분
    if (commandKey === 'GET_CUR_TEMP') {
      return 'cur_temp'; // 🎯 현재 온도 (cooler용)
    }
    if (commandKey === 'GET_TEMP') {
      return 'temp'; // 🎯 기본 온도 (sensor용)
    }
    if (commandKey.includes('SUMMER_CONT_TEMP')) return 'summer_cont_temp';
    if (commandKey.includes('WINTER_CONT_TEMP')) return 'winter_cont_temp';
    if (commandKey.includes('TEMP')) {
      return 'temp'; // 🎯 기타 온도 관련 명령어는 'temp'로 매핑
    }
    if (commandKey.includes('PM')) {
      return commandKey.toLowerCase().replace('get_', '');
    }
    if (commandKey.includes('CO2')) {
      return 'co2';
    }
    if (commandKey.includes('VOC')) {
      return 'voc';
    }
    if (commandKey.includes('HUM')) {
      return 'hum';
    }

    return null;
  }

  /**
   * 🎯 일반적인 명령어에 대한 데이터 필드 결정
   */
  private getGenericDataField(commandKey: string): string | null {
    const genericFieldMapping: Record<string, string> = {
      GET_CONNECTION: 'connection',
      GET_CONNECTION_STATUS: 'connection_status',
      GET_CUR_TEMP: 'cur_temp',
    };

    return genericFieldMapping[commandKey] || null;
  }

  /**
   * 🎯 Fallback 데이터 필드 (기존 하드코딩된 매핑)
   */
  private getFallbackDataField(commandKey: string): string | null {
    // 🎯 기존 하드코딩된 매핑을 fallback으로 사용
    const fallbackMapping: Record<string, string> = {
      // 🤖 자동 모드 관련
      SET_AUTO: 'auto',
      GET_AUTO: 'auto',

      // 🔌 전원 관련
      SET_POWER: 'power',
      GET_POWER: 'power',

      // ⏰ 시간 관련 (1차)
      SET_START_TIME_1: 'start_time_1',
      GET_START_TIME_1: 'start_time_1',
      SET_END_TIME_1: 'end_time_1',
      GET_END_TIME_1: 'end_time_1',

      // ⏰ 시간 관련 (2차) - 조명만
      SET_START_TIME_2: 'start_time_2',
      GET_START_TIME_2: 'start_time_2',
      SET_END_TIME_2: 'end_time_2',
      GET_END_TIME_2: 'end_time_2',

      // 🔄 모드 관련
      SET_MODE: 'mode',
      GET_MODE: 'mode',

      // 🌡️ 온도 관련
      SET_SUMMER_CONT_TEMP: 'summer_cont_temp',
      GET_SUMMER_CONT_TEMP: 'summer_cont_temp',
      SET_WINTER_CONT_TEMP: 'winter_cont_temp',
      GET_WINTER_CONT_TEMP: 'winter_cont_temp',
      GET_CUR_TEMP: 'cur_temp',

      // 💨 속도 관련
      SET_SPEED: 'speed',
      GET_SPEED: 'speed',

      // 📡 센서 관련 (통합센서)
      GET_PM100: 'pm100',
      GET_PM25: 'pm25',
      GET_PM10: 'pm10',
      GET_CO2: 'co2',
      GET_VOC: 'voc',
      GET_HUM: 'hum',
      GET_TEMP: 'temp',
    };

    return fallbackMapping[commandKey] || null;
  }

  /**
   * 명령 실행 실패 처리
   */
  async handleFailure(
    requestId: string,
    error: Error | string,
    device: IDevice,
    unit: IUnit,
    commandKey: string,
    value?: any, // value 파라미터 추가
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;

    // 실패 시 로그 업데이트
    await this.controlRepository.updateCommandLog(requestId, {
      status: 'fail',
      finishedAt: new Date(),
      error: errorMessage,
      value, // value도 로그에 저장
    });

    // WebSocket으로 명령 상태 브로드캐스트 (value와 error 포함)
    this.webSocketService?.broadcastCommandStatus(
      device.name || unit.deviceId,
      unit.name || unit.unitId,
      commandKey,
      'fail',
      value, // value 전달
      errorMessage, // 에러 메시지도 전달
    );
  }

  // 🆕 Alarm 필드 처리 메서드 제거 (StatusService로 이동)
  // private async processAlarmField(device: IDevice, unit: IUnit, alarmValue: number): Promise<void> {
  //   // 이 로직은 StatusService.processAlarmFields()로 이동됨
  // }

  // 🆕 디바이스 타입 추출 메서드 제거 (StatusService로 이동)
  // private getDeviceTypeFromDeviceId(deviceId: string): string | null {
  //   // 이 로직은 StatusService.processAlarmFields()로 이동됨
  // }
}
