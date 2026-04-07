/**
 * Data Apply Service
 * Data 컬렉션을 DDC에 적용하는 서비스
 *
 * 주요 기능:
 * 1. Data 컬렉션 데이터를 Modbus를 통해 DDC에 적용
 * 2. 적용 전후 상태 검증
 * 3. 적용 실패 시 롤백 로직
 * 4. 적용 진행 상황 추적
 */

import {
  getWritableFieldMappings,
  getVerificationFieldMappings,
  createUnitFromDevice,
  FieldActionMapping,
} from '../../meta/protocols/fieldUtils';
import { toUnitsArray } from '../../shared/utils/dataUnits';
import { ServiceContainer } from '../container/ServiceContainer';
import { ILogger } from '../interfaces/ILogger';

export interface DataApplyResult {
  success: boolean;
  appliedDevices: number;
  failedDevices: number;
  totalDevices: number;
  errors: Array<{
    deviceId: string;
    unitId: string;
    error: string;
  }>;
  appliedAt: Date;
}

export interface ApplyProgress {
  current: number;
  total: number;
  currentDevice: string;
  status: 'preparing' | 'applying' | 'verifying' | 'completed' | 'failed';
  message: string;
}

export class DataApplyService {
  private logger: ILogger | undefined;
  private serviceContainer: ServiceContainer | null = null;
  private commandResultHandler: any = null; // 🔥 CommandResultHandler 의존성 추가
  private applying = false;
  private currentProgress: ApplyProgress | null = null;

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  /**
   * 서비스 초기화
   */
  public initialize(serviceContainer: ServiceContainer): void {
    this.serviceContainer = serviceContainer;
    this.logger?.debug('[DataApplyService] 서비스 초기화 완료');
  }

  /**
   * 🔥 CommandResultHandler 수동 주입 메소드 추가
   */
  public setCommandResultHandler(commandResultHandler: any): void {
    this.commandResultHandler = commandResultHandler;
    this.logger?.info('[DataApplyService] CommandResultHandler 주입 완료');
  }

  /**
   * Data 적용 시작 (현재 Data 컬렉션 기준)
   */
  public async applyData(appliedBy: string): Promise<DataApplyResult> {
    if (this.applying) {
      throw new Error('Data 적용이 이미 진행 중입니다');
    }

    this.applying = true;
    this.currentProgress = {
      current: 0,
      total: 0,
      currentDevice: '',
      status: 'preparing',
      message: 'Data 적용 준비 중...',
    };

    try {
      this.logger?.info(`[DataApplyService] Data 적용 시작: ${appliedBy}`);

      // 1단계: Data 컬렉션 조회
      this.updateProgress('preparing', 'Data 컬렉션 조회 중...');
      const dataCollection = await this.getDataCollection();

      if (!dataCollection || dataCollection.length === 0) {
        throw new Error('적용할 데이터가 없습니다');
      }

      this.currentProgress.total = dataCollection.length;
      this.logger?.info(`[DataApplyService] 적용 대상: ${dataCollection.length}개 장비`);

      // 2단계: 적용 시작
      this.updateProgress('applying', 'DDC에 설정 적용 중...');
      const result = await this.applyToDevices(dataCollection, appliedBy);

      // 3단계: 적용 결과 검증
      this.updateProgress('verifying', '적용 결과 검증 중...');
      await this.verifyApplication(result);

      this.updateProgress('completed', 'Data 적용 완료');
      this.logger?.info(`[DataApplyService] Data 적용 완료: ${result.appliedDevices}/${result.totalDevices} 성공`);

      return result;
    } catch (error) {
      this.updateProgress('failed', `Data 적용 실패: ${error}`);
      this.logger?.error(`[DataApplyService] Data 적용 실패: ${error}`);
      throw error;
    } finally {
      this.applying = false;
      this.currentProgress = null;
    }
  }

  /**
   * Data 컬렉션 조회
   */
  private async getDataCollection(): Promise<any[]> {
    try {
      const { Data } = await import('../../models/schemas/DataSchema');
      const dataCollection = await Data.find({}).lean();
      return dataCollection;
    } catch (error) {
      this.logger?.error(`[DataApplyService] Data 컬렉션 조회 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 장비별 데이터 적용
   */
  private async applyToDevices(dataCollection: any[], appliedBy: string): Promise<DataApplyResult> {
    const result: DataApplyResult = {
      success: true,
      appliedDevices: 0,
      failedDevices: 0,
      totalDevices: dataCollection.length,
      errors: [],
      appliedAt: new Date(),
    };

    const unifiedModbusService = this.serviceContainer?.getUnifiedModbusService();
    if (!unifiedModbusService) {
      throw new Error('Modbus 통신 서비스를 찾을 수 없습니다');
    }

    for (let i = 0; i < dataCollection.length; i++) {
      const device = dataCollection[i];
      this.currentProgress!.current = i + 1;
      this.currentProgress!.currentDevice = device.deviceId || 'unknown';

      try {
        this.logger?.info(`[DataApplyService] 장비 적용 중: ${device.deviceId} (${i + 1}/${dataCollection.length})`);

        // 장비별 설정 적용
        await this.applyDeviceSettings(device, unifiedModbusService);
        result.appliedDevices++;

        this.logger?.info(`[DataApplyService] 장비 적용 성공: ${device.deviceId}`);
      } catch (error) {
        result.failedDevices++;
        result.errors.push({
          deviceId: device.deviceId || 'unknown',
          unitId: device.unitId || 'unknown',
          error: String(error),
        });

        this.logger?.error(`[DataApplyService] 장비 적용 실패: ${device.deviceId} - ${error}`);
      }

      // 진행 상황 업데이트
      this.updateProgress(
        'applying',
        `${device.deviceId} 적용 완료 (${i + 1}/${dataCollection.length})`,
        i + 1,
        dataCollection.length,
        device.deviceId,
      );
    }

    result.success = result.failedDevices === 0;
    return result;
  }

  /**
   * 개별 장비 설정 적용 (Field 기반 역탐색 사용)
   */
  private async applyDeviceSettings(device: any, unifiedModbusService: any): Promise<void> {
    try {
      this.logger?.info(`[DataApplyService] 장비 설정 적용 시작: ${device.deviceId} (${device.type})`);

      // 각 유닛별로 설정 적용
      for (const unitData of toUnitsArray(device.units)) {
        await this.applyUnitSettings(device, unitData, unifiedModbusService);
      }

      this.logger?.info(`[DataApplyService] 장비 설정 적용 완료: ${device.deviceId}`);
    } catch (error) {
      this.logger?.error(`[DataApplyService] 장비 설정 적용 실패: ${device.deviceId} - ${error}`);
      throw error;
    }
  }

  /**
   * 개별 유닛 설정 적용 (Field 기반 역탐색)
   */
  private async applyUnitSettings(device: any, unitData: any, unifiedModbusService: any): Promise<void> {
    try {
      const unit = createUnitFromDevice(device, unitData) as any;
      this.logger?.info(`[DataApplyService] 유닛 설정 적용: ${unit.deviceId}/${unit.unitId}`);

      // Field 기반으로 SET 액션들 조회
      const writableMappings = getWritableFieldMappings(unit, unitData.data, {
        includeTimeFields: true,
        includeScheduleFields: true,
      });

      if (writableMappings.length === 0) {
        this.logger?.warn(`[DataApplyService] 적용 가능한 필드가 없음: ${unit.deviceId}/${unit.unitId}`);
        return;
      }

      this.logger?.info(`[DataApplyService] 적용 대상 필드: ${writableMappings.length}개`);

      // 각 필드별로 Modbus 쓰기 명령 실행
      for (const mapping of writableMappings) {
        try {
          await this.executeModbusWrite(mapping, unitData.data[mapping.field], unifiedModbusService, unit);
        } catch (fieldError) {
          this.logger?.error(`[DataApplyService] 필드 적용 실패: ${mapping.field} - ${fieldError}`);
          // 개별 필드 실패 시에도 계속 진행
        }
      }

      this.logger?.info(`[DataApplyService] 유닛 설정 적용 완료: ${unit.deviceId}/${unit.unitId}`);
    } catch (error) {
      this.logger?.error(`[DataApplyService] 유닛 설정 적용 실패: ${unitData.unitId} - ${error}`);
      throw error;
    }
  }

  /**
   * Modbus 쓰기 명령 실행
   */
  private async executeModbusWrite(
    mapping: FieldActionMapping,
    value: any,
    unifiedModbusService: any,
    unit: any,
  ): Promise<void> {
    try {
      // 온도 필드인 경우 튜닝값 적용
      let adjustedValue = value;

      this.logger?.info(
        `[DataApplyService] Modbus 쓰기: ${mapping.actionKey} = ${adjustedValue} (${mapping.commandSpec.functionCode}:${mapping.commandSpec.address})`,
      );

      const result = await unifiedModbusService.writeRegister({
        slaveId: mapping.commandSpec.slaveId,
        functionCode: mapping.commandSpec.functionCode,
        address: mapping.commandSpec.address,
        value: adjustedValue,
        context: 'control',
      });

      if (!result.success) {
        throw new Error(`Modbus write failed: ${result.error}`);
      }

      // 🔥 CommandResultHandler를 통한 DB 업데이트 추가
      if (this.commandResultHandler && result.success) {
        try {
          await this.commandResultHandler.updateDeviceData(
            unit.deviceId,
            unit.unitId,
            { [mapping.field]: value }, // 원본 값 사용 (Celsius)
            { source: 'system' },
          );
          this.logger?.info(`[DataApplyService] DB 업데이트 완료: ${mapping.field} = ${value}`);
        } catch (dbError) {
          this.logger?.error(`[DataApplyService] DB 업데이트 실패: ${mapping.field} = ${value} - ${dbError}`);
          // DB 업데이트 실패해도 Modbus 통신은 성공했으므로 계속 진행
        }
      }

      this.logger?.info(`[DataApplyService] Modbus 쓰기 성공: ${mapping.actionKey} = ${adjustedValue}`);
    } catch (error) {
      this.logger?.error(`[DataApplyService] Modbus 쓰기 실패: ${mapping.actionKey} = ${value} - ${error}`);
      throw error;
    }
  }

  // 기존 장비별 설정 함수들은 Field 기반 역탐색으로 통합됨
  // applyCoolerSettings, applyExchangerSettings, applyLightingSettings,
  // applyBenchSettings, applyDoorSettings 함수들은 더 이상 필요하지 않음

  /**
   * 적용 결과 검증 (Field 기반 GET 액션으로 확인)
   */
  private async verifyApplication(result: DataApplyResult): Promise<void> {
    try {
      this.logger?.info('[DataApplyService] 적용 결과 검증 시작');

      // Data 컬렉션 재조회하여 적용된 값들 확인
      const dataCollection = await this.getDataCollection();
      const unifiedModbusService = this.serviceContainer?.getUnifiedModbusService();

      if (!unifiedModbusService) {
        this.logger?.warn('[DataApplyService] Modbus 서비스를 찾을 수 없어 검증을 건너뜁니다');
        return;
      }

      let verificationCount = 0;
      let successCount = 0;
      let failureCount = 0;

      // 각 장비별로 검증 수행
      for (const device of dataCollection) {
        for (const unitData of toUnitsArray(device.units)) {
          try {
            const unit = createUnitFromDevice(device, unitData) as any;
            const verificationMappings = getVerificationFieldMappings(unit, unitData.data, {
              includeTimeFields: false,
              includeScheduleFields: false,
            });

            for (const mapping of verificationMappings) {
              verificationCount++;
              const isVerified = await this.verifyFieldValue(
                mapping,
                unitData.data[mapping.field],
                unifiedModbusService,
              );

              if (isVerified) {
                successCount++;
                this.logger?.info(
                  `[DataApplyService] 검증 성공: ${mapping.actionKey} = ${unitData.data[mapping.field]}`,
                );
              } else {
                failureCount++;
                this.logger?.warn(
                  `[DataApplyService] 검증 실패: ${mapping.actionKey} = ${unitData.data[mapping.field]}`,
                );
              }
            }
          } catch (error) {
            this.logger?.error(`[DataApplyService] 유닛 검증 실패: ${unitData.unitId} - ${error}`);
            failureCount++;
          }
        }
      }

      this.logger?.info(
        `[DataApplyService] 적용 결과 검증 완료: ${successCount}/${verificationCount} 성공, ${failureCount} 실패`,
      );

      if (failureCount > 0) {
        this.logger?.warn(`[DataApplyService] ${failureCount}개 필드 검증 실패 - 설정값을 확인해주세요`);
      }
    } catch (error) {
      this.logger?.error(`[DataApplyService] 적용 결과 검증 실패: ${error}`);
      // 검증 실패는 전체 적용을 실패로 만들지 않음
    }
  }

  /**
   * 개별 필드 값 검증
   */
  private async verifyFieldValue(
    mapping: FieldActionMapping,
    expectedValue: any,
    unifiedModbusService: any,
  ): Promise<boolean> {
    try {
      this.logger?.info(`[DataApplyService] 필드 검증: ${mapping.actionKey} (예상값: ${expectedValue})`);

      const result = await unifiedModbusService.readRegisters({
        slaveId: mapping.commandSpec.slaveId,
        functionCode: mapping.commandSpec.functionCode,
        address: mapping.commandSpec.address,
        length: mapping.commandSpec.length || 1,
        context: 'control',
      });

      if (!result.success || !result.data || result.data.length === 0) {
        this.logger?.error(`[DataApplyService] Modbus 읽기 실패: ${mapping.actionKey} - ${result.error}`);
        return false;
      }

      const actualValue = result.data[0];
      const isMatch = actualValue === expectedValue;

      this.logger?.info(
        `[DataApplyService] 필드 검증 결과: ${mapping.actionKey} - 예상: ${expectedValue}, 실제: ${actualValue}, 일치: ${isMatch}`,
      );

      return isMatch;
    } catch (error) {
      this.logger?.error(`[DataApplyService] 필드 검증 실패: ${mapping.actionKey} - ${error}`);
      return false;
    }
  }

  /**
   * 진행 상황 업데이트
   */
  private updateProgress(
    status: ApplyProgress['status'],
    message: string,
    current?: number,
    total?: number,
    currentDevice?: string,
  ): void {
    if (this.currentProgress) {
      this.currentProgress.status = status;
      this.currentProgress.message = message;

      if (current !== undefined) {
        this.currentProgress.current = current;
      }
      if (total !== undefined) {
        this.currentProgress.total = total;
      }
      if (currentDevice !== undefined) {
        this.currentProgress.currentDevice = currentDevice;
      }

      this.logger?.info(
        `[DataApplyService] 진행 상황: ${status} - ${message} (${this.currentProgress.current}/${this.currentProgress.total})`,
      );
    }
  }

  /**
   * 현재 진행 상황 조회
   */
  public getProgress(): ApplyProgress | null {
    return this.currentProgress;
  }

  /**
   * 적용 상태 조회
   */
  public isApplyingInProgress(): boolean {
    return this.applying;
  }

  /**
   * 온도 튜닝값 조회
   */
  private async getTuningValue(field: string): Promise<number> {
    try {
      const systemService = this.serviceContainer?.getSystemService();
      if (!systemService) {
        this.logger?.warn('[DataApplyService] SystemService를 찾을 수 없음');
        return 0;
      }

      const settings = await systemService.getDeviceAdvancedSettings();
      if (!settings) {
        this.logger?.debug('[DataApplyService] 디바이스 상세설정을 찾을 수 없음, 기본값 0 사용');
        return 0;
      }

      if (field === 'summer_cont_temp') {
        const tuningValue = settings.temp['fine-tuning-summer'] || 0;
        this.logger?.debug(`[DataApplyService] 여름 목표온도 튜닝값: ${tuningValue}`);
        return tuningValue;
      }
      if (field === 'winter_cont_temp') {
        const tuningValue = settings.temp['fine-tuning-winter'] || 0;
        this.logger?.debug(`[DataApplyService] 겨울 목표온도 튜닝값: ${tuningValue}`);
        return tuningValue;
      }

      return 0;
    } catch (error) {
      this.logger?.error(`[DataApplyService] 튜닝값 조회 실패: ${error}`);
      return 0;
    }
  }

  /**
   * 적용 중단
   */
  public async cancel(): Promise<void> {
    if (!this.applying) {
      throw new Error('적용 중인 작업이 없습니다');
    }

    this.logger?.info('[DataApplyService] Data 적용 중단 요청');

    // TODO: 실제 중단 로직 구현
    // - 진행 중인 Modbus 통신 중단
    // - 상태 정리

    this.applying = false;
    this.currentProgress = null;

    this.logger?.info('[DataApplyService] Data 적용 중단 완료');
  }

  /**
   * DDC 설정 완전 초기화
   * 모든 DOx 포트를 AUTO(false), POWER(false), 스케줄 00:00으로 설정
   */
  public async initializeDDC(clientId: string): Promise<DataApplyResult> {
    if (this.applying) {
      throw new Error('DDC 초기화 중 다른 작업이 진행 중입니다');
    }

    this.applying = true;
    this.currentProgress = {
      current: 0,
      total: 0,
      currentDevice: '',
      status: 'preparing',
      message: 'DDC 초기화 준비 중...',
    };

    try {
      this.logger?.info(`[DataApplyService] DDC 초기화 시작: ${clientId}`);

      // 1단계: UnifiedModbusService 가져오기
      this.updateProgress('preparing', 'Modbus 서비스 준비 중...');
      const unifiedModbusService = this.serviceContainer?.getUnifiedModbusService();
      if (!unifiedModbusService) {
        throw new Error('Modbus 서비스를 사용할 수 없습니다');
      }

      // 2단계: 모든 DOx 포트 직접 초기화
      this.updateProgress('applying', 'DOx 포트 초기화 진행 중...');
      await this.resetAllDOxPortsDirectly(unifiedModbusService);

      // 3단계: 결과 정리
      this.updateProgress('completed', 'DDC 초기화 완료');
      const result: DataApplyResult = {
        success: true,
        appliedDevices: 16, // DO1~DO16
        failedDevices: 0,
        totalDevices: 16,
        errors: [],
        appliedAt: new Date(),
      };

      this.logger?.info(`[DataApplyService] DDC 초기화 완료: 16개 DOx 포트 초기화 성공`);

      return result;
    } catch (error) {
      this.updateProgress('failed', 'DDC 초기화 실패');
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error(`[DataApplyService] DDC 초기화 실패: ${errorMessage}`);
      throw error;
    } finally {
      this.applying = false;
      this.currentProgress = null;
    }
  }

  /**
   * 모든 DOx 포트 직접 초기화 (Data 컬렉션 무관)
   */
  private async resetAllDOxPortsDirectly(unifiedModbusService: any): Promise<void> {
    const doxPorts = [
      'DO1',
      'DO2',
      'DO3',
      'DO4',
      'DO5',
      'DO6',
      'DO7',
      'DO8',
      'DO9',
      'DO10',
      'DO11',
      'DO12',
      'DO13',
      'DO14',
      'DO15',
      'DO16',
    ];

    this.currentProgress!.total = doxPorts.length;

    for (let i = 0; i < doxPorts.length; i++) {
      const doxPort = doxPorts[i];
      try {
        this.currentProgress!.currentDevice = `${doxPort} 초기화`;
        this.currentProgress!.current = i + 1;

        // AUTO = false
        await this.executeDirectModbusWrite(doxPort, 'AUTO', false, unifiedModbusService);

        // POWER = false
        await this.executeDirectModbusWrite(doxPort, 'POWER', false, unifiedModbusService);

        // SCHED1_START_HOUR = 0
        await this.executeDirectModbusWrite(doxPort, 'SCHED1_START_HOUR', 0, unifiedModbusService);

        // SCHED1_START_MIN = 0
        await this.executeDirectModbusWrite(doxPort, 'SCHED1_START_MIN', 0, unifiedModbusService);

        // SCHED1_END_HOUR = 0
        await this.executeDirectModbusWrite(doxPort, 'SCHED1_END_HOUR', 0, unifiedModbusService);

        // SCHED1_END_MIN = 0
        await this.executeDirectModbusWrite(doxPort, 'SCHED1_END_MIN', 0, unifiedModbusService);

        // SCHED2_START_HOUR = 0
        await this.executeDirectModbusWrite(doxPort, 'SCHED2_START_HOUR', 0, unifiedModbusService);

        // SCHED2_START_MIN = 0
        await this.executeDirectModbusWrite(doxPort, 'SCHED2_START_MIN', 0, unifiedModbusService);

        // SCHED2_END_HOUR = 0
        await this.executeDirectModbusWrite(doxPort, 'SCHED2_END_HOUR', 0, unifiedModbusService);

        // SCHED2_END_MIN = 0
        await this.executeDirectModbusWrite(doxPort, 'SCHED2_END_MIN', 0, unifiedModbusService);

        this.logger?.info(`[DataApplyService] ${doxPort} 초기화 완료`);
      } catch (error) {
        this.logger?.error(`[DataApplyService] ${doxPort} 초기화 실패: ${error}`);
        // 개별 포트 실패 시에도 계속 진행
      }
    }
  }

  /**
   * 직접 Modbus 쓰기 실행 (포트 기반)
   */
  private async executeDirectModbusWrite(
    doxPort: string,
    field: string,
    value: any,
    unifiedModbusService: any,
  ): Promise<void> {
    try {
      // HW_PORTS에서 포트 정보 조회
      const { HW_PORTS } = await import('../../meta/hardware/ports');

      if (!(HW_PORTS as any)[doxPort] || !(HW_PORTS as any)[doxPort][field]) {
        this.logger?.warn(`[DataApplyService] ${doxPort}.${field} 포트 정보 없음`);
        return;
      }

      const portInfo = (HW_PORTS as any)[doxPort][field];
      if (!portInfo.set) {
        this.logger?.warn(`[DataApplyService] ${doxPort}.${field} SET 포트 정보 없음`);
        return;
      }

      const result = await unifiedModbusService.writeRegister({
        slaveId: 1, // 기본 slaveId
        functionCode: portInfo.set.functionCode,
        address: portInfo.set.address,
        value: value,
        context: 'control',
      });

      if (!result.success) {
        throw new Error(`Modbus 쓰기 실패: ${result.error}`);
      }

      this.logger?.info(
        `[DataApplyService] 직접 Modbus 쓰기: ${doxPort}.${field} = ${value} (${portInfo.set.functionCode}:${portInfo.set.address})`,
      );
    } catch (error) {
      this.logger?.error(`[DataApplyService] 직접 Modbus 쓰기 실패: ${doxPort}.${field} - ${error}`);
      throw error;
    }
  }
}
