import { buildReverseIndex, generateBySpec, initializeMockGenerator } from '../../meta/protocols/mockValueGenerator';
import { ILogger } from '../../shared/interfaces/ILogger';
import { nowKstFormatted } from '../../shared/utils/kstDateTime';
import { ServiceContainer } from '../container/ServiceContainer';
import {
  ModbusReadRequest,
  ModbusWriteRequest,
  ModbusResponse,
  IModbusCommunication,
  QueueStatus,
  UnitQueueStatus,
} from '../interfaces/IModbusCommunication';

/**
 * Mock Modbus 서비스
 * 실제 하드웨어 없이 Modbus 통신을 시뮬레이션
 */
export class MockModbusService implements IModbusCommunication {
  private logger: ILogger | undefined;
  // 🆕 내부 큐 제거
  // private commandQueue: any[] = [];
  private _isConnected = true;
  private _initialized = false;
  private _reverseIndex: Map<string, any> | undefined;
  private serviceContainer: ServiceContainer | null = null;

  // 🆕 통신 실패 시뮬레이션 플래그
  private communicationFailureEnabled = true;

  // 🆕 Alarm 에러 테스트 플래그들
  private alarmErrorTestEnabled = true;
  private alarmErrorDeviceType: 'cooler' | 'exchanger' | 'integrated_sensor' | 'all' = 'all';
  private alarmErrorValue = 1; // 테스트할 alarm 값

  constructor(logger?: ILogger) {
    this.logger = logger;
    this._initialized = true;
    this.logger?.debug('[MockModbusService] Mock Modbus 서비스 초기화 완료');
    // 🎮 테스트용 통신 실패 모드 제어 코드 (주석 해제하여 사용)
    // 통신 실패 모드 활성화
    // this.setCommunicationFailure(true);

    // 통신 실패 모드 비활성화
    // this.setCommunicationFailure(false);

    // 🆕 초기화 상태 로깅
    this.logger?.debug(
      `[MockModbusService] 초기화 상태: initialized=${this._initialized}, connected=${this._isConnected}, mode=mock`,
    );
  }

  /**
   * 초기화 상태 확인
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * ServiceContainer 초기화
   */
  initialize(serviceContainer: ServiceContainer): void {
    this.serviceContainer = serviceContainer;
    initializeMockGenerator(serviceContainer);
    this.logger?.debug('[MockModbusService] ServiceContainer 초기화 완료');
  }

  /**
   * 연결 상태 확인 (Mock은 항상 연결된 것으로 간주)
   */
  isConnected(): boolean {
    return this._isConnected && this._initialized;
  }

  /**
   * 🆕 Mock 연결 (항상 성공)
   */
  async connect(): Promise<boolean> {
    this._isConnected = true;
    this.logger?.info('[MockModbusService] Mock 연결 성공');
    return true;
  }

  /**
   * 🆕 Mock 연결 해제
   */
  async disconnect(): Promise<void> {
    this._isConnected = false;
    this.logger?.info('[MockModbusService] Mock 연결 해제');
  }

  /**
   * 🆕 중앙큐를 통한 명령 실행 - MockModbusService에서는 Mock 응답 생성
   */
  async executeCommand(command: any): Promise<any> {
    try {
      if (command.type === 'read') {
        return await this.readRegisters({
          slaveId: parseInt(command.unitId),
          functionCode: command.functionCode,
          address: command.address,
          length: command.lengthOrValue,
        });
      } else if (command.type === 'write') {
        return await this.writeRegister({
          slaveId: parseInt(command.unitId),
          functionCode: command.functionCode,
          address: command.address,
          value: command.lengthOrValue,
        });
      }
      throw new Error(`지원하지 않는 명령 타입: ${command.type}`);
    } catch (error) {
      this.logger?.error(`[MockModbusService] executeCommand 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 🆕 Mock 큐 상태 반환
   */
  getQueueStatus(): QueueStatus {
    return {
      totalCommands: 0,
      highPriority: 0,
      normalPriority: 0,
      lowPriority: 0,
      isProcessing: false,
    };
  }

  /**
   * 🆕 Mock 유닛 큐 상태 반환
   */
  getUnitQueueStatus(unitId: string): UnitQueueStatus {
    return {
      totalCommands: 0,
      highPriority: 0,
      normalPriority: 0,
      lowPriority: 0,
    };
  }

  /**
   * 🆕 Mock 큐 정리
   */
  clearQueue(): void {
    // Mock에서는 아무것도 하지 않음
    this.logger?.debug('[MockModbusService] Mock 큐 정리 (아무것도 하지 않음)');
  }

  /**
   * 🆕 Mock 모드 확인
   */
  isMockMode(): boolean {
    return true;
  }

  /**
   * 🆕 통신 실패 시뮬레이션 모드 설정
   */
  setCommunicationFailure(enabled: boolean): void {
    this.communicationFailureEnabled = enabled;
    this.logger?.info(`[MockModbusService] 통신 실패 모드: ${enabled ? '활성화' : '비활성화'}`);
  }

  /**
   * 🆕 통신 실패 모드 확인
   */
  private isCommunicationFailureMode(): boolean {
    return this.communicationFailureEnabled;
  }

  // 🆕 큐 관련 메소드들 제거
  // addCommand, getQueueStatus, getUnitQueueStatus, clearQueue 메소드 제거

  /**
   * 서비스 정리
   */
  destroy(): void {
    // 🆕 큐 초기화 제거
    // this.clearQueue();
    this._isConnected = false;
    this.logger?.info('[MockModbusService] Mock Modbus 서비스 정리 완료');
  }

  /**
   * 레지스터 읽기 (Mock 구현)
   */
  async readRegisters(request: ModbusReadRequest): Promise<ModbusResponse> {
    // 🆕 통신 실패 모드 체크
    if (this.communicationFailureEnabled) {
      this.logger?.warn(`[MockModbusService] 통신 실패 시뮬레이션: ${request.slaveId}/${request.address}`);

      // 70ms 딜레이 후 실패 응답
      await new Promise((resolve) => setTimeout(resolve, 70));

      return {
        success: false,
        error: 'Modbus 통신 실패 (Mock 시뮬레이션)',
      };
    }

    this.logger?.debug(
      `[MockModbusService] Mock 레지스터 읽기: Slave ${request.slaveId}, Address ${request.address}, Length ${request.length}`,
    );

    // 🆕 실제 하드웨어 응답 시간 시뮬레이션 (70ms 딜레이)
    await new Promise((resolve) => setTimeout(resolve, 70));

    if (!this._reverseIndex) {
      this._reverseIndex = buildReverseIndex();
      this.logger?.debug(`[MockModbusService] Reverse index built: size=${this._reverseIndex.size}`);
    }

    const key = `${request.functionCode}:${request.address}`;
    const spec = this._reverseIndex.get(key);
    let rawData = await generateBySpec(spec, request.length);

    // 🆕 Alarm 에러 테스트 적용
    if (spec && this.shouldGenerateAlarmError(spec.deviceId || '', spec.commandKey || '')) {
      const alarmErrorValue = this.generateAlarmErrorValue();
      rawData = [alarmErrorValue]; // Alarm 에러 값으로 덮어쓰기
      this.logger?.warn(
        `[MockModbusService] Alarm 에러 테스트 적용: ${spec.deviceId}/${spec.unitId} - ${spec.commandKey} = ${alarmErrorValue}`,
      );
    }

    // ✅ RealModbusService와 완전히 동일한 데이터 형식으로 변환
    // const data = rawData.map((value) => {
    //   // boolean → number 변환 (RealModbusService와 동일)
    //   if (typeof value === 'boolean') {
    //     return value ? 1 : 0;
    //   }

    //   // ✅ 변환 제외 조건들
    //   if (typeof value === 'number') {
    //     // 0/1 값 (power, auto 필드)
    //     if (value === 0 || value === 1) {
    //       return value;
    //     }

    //     // 모드/속도 필드 (0~4 범위)
    //     if (value >= 0 && value <= 4) {
    //       return value;
    //     }

    //     // 시간 필드 (0~59 범위)
    //     if (value >= 0 && value <= 59) {
    //       return value;
    //     }

    //     // ✅ 온도 값만 Modbus 형식으로 변환 (실제 온도 → Modbus 값)
    //     if (value > 59 && value < 100) {
    //       return Math.round(value * 10 + 2000); // 실제 온도 → Modbus 값 (온도 * 10 + 2000)
    //     }
    //   }

    //   // 기타 값은 그대로 반환
    //   return value;
    // });

    // this.logger?.info(
    //   `[MockModbusService] 데이터 변환: 원본=${JSON.stringify(rawData)} → Modbus형식=${JSON.stringify(rawData)}`,
    // );

    return {
      success: true,
      data: rawData as number[],
    };
  }

  /**
   * 레지스터 쓰기 (Mock 구현)
   */
  async writeRegister(request: ModbusWriteRequest): Promise<ModbusResponse> {
    // 🆕 통신 실패 모드 체크
    if (this.communicationFailureEnabled) {
      this.logger?.warn(`[MockModbusService] 통신 실패 시뮬레이션: ${request.slaveId}/${request.address}`);

      await new Promise((resolve) => setTimeout(resolve, 70));

      return {
        success: false,
        error: 'Modbus 통신 실패 (Mock 시뮬레이션)',
      };
    }

    this.logger?.debug(
      `[MockModbusService] Mock 레지스터 쓰기: Slave ${request.slaveId}, Address ${request.address}, Value ${request.value}`,
    );

    // 🆕 실제 하드웨어 응답 시간 시뮬레이션 (70ms 딜레이)
    await new Promise((resolve) => setTimeout(resolve, 70));

    return {
      success: true,
      data: [request.value || 0],
    };
  }

  /**
   * 연결 상태 정보 반환
   */
  getConnectionStatus(): { isConnected: boolean; mode: string; timestamp: string } {
    return {
      isConnected: this._isConnected,
      mode: 'mock',
      timestamp: nowKstFormatted(),
    };
  }

  /**
   * 🆕 Alarm 에러 테스트 설정
   */
  setAlarmErrorTest(
    enabled: boolean,
    deviceType: 'cooler' | 'exchanger' | 'integrated_sensor' | 'all' = 'all',
    value: number = 1,
  ): void {
    this.alarmErrorTestEnabled = enabled;
    this.alarmErrorDeviceType = deviceType;
    this.alarmErrorValue = value;

    this.logger?.info(
      `[MockModbusService] Alarm 에러 테스트 설정: enabled=${enabled}, deviceType=${deviceType}, value=${value}`,
    );
  }

  /**
   * 🆕 Alarm 에러 테스트 상태 확인
   */
  getAlarmErrorTestStatus(): { enabled: boolean; deviceType: string; value: number } {
    return {
      enabled: this.alarmErrorTestEnabled,
      deviceType: this.alarmErrorDeviceType,
      value: this.alarmErrorValue,
    };
  }

  /**
   * 🆕 디바이스 ID에서 디바이스 타입 추출
   */
  private getDeviceTypeFromDeviceId(deviceId: string): string | null {
    const deviceTypeMap: { [key: string]: string } = {
      d021: 'cooler', // 냉난방기
      d022: 'exchanger', // 전열교환기
      d061: 'integrated_sensor', // 통합센서
    };

    return deviceTypeMap[deviceId] || null;
  }

  /**
   * 🆕 Alarm 에러 테스트 여부 확인
   */
  private shouldGenerateAlarmError(deviceId: string, commandKey: string): boolean {
    if (!this.alarmErrorTestEnabled || commandKey !== 'GET_ALARM') {
      return false;
    }

    const deviceType = this.getDeviceTypeFromDeviceId(deviceId);
    if (!deviceType) {
      return false;
    }

    // deviceType이 'all'이거나 해당 디바이스 타입과 일치하는 경우
    return this.alarmErrorDeviceType === 'all' || this.alarmErrorDeviceType === deviceType;
  }

  /**
   * 🆕 Alarm 에러 값 생성
   */
  private generateAlarmErrorValue(): number {
    return this.alarmErrorValue;
  }
}
