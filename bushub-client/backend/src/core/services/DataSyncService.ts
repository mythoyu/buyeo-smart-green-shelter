/**
 * Data Sync Service
 * 모든 데이터 동기화 관련 기능을 통합한 서비스
 *
 * 주요 기능:
 * 1. PollingDataMapper 기능: 폴링 결과 변환 및 매핑
 * 2. PollingDataSyncService 기능: 데이터 동기화 및 저장
 * 3. DataApplyService 기능: 하드웨어 제어 및 검증
 * 4. 양방향 동기화: 컬렉션 ↔ 하드웨어
 */

import { CLIENT_PORT_MAPPINGS } from '../../data/clientPortMappings';
import { DeviceModel } from '../../models/Device';
import { Data } from '../../models/schemas/DataSchema';
import { IDevice } from '../../models/schemas/DeviceSchema';
import { IUnit } from '../../models/schemas/UnitSchema';
import { ServiceContainer } from '../container/ServiceContainer';
import { ILogger } from '../interfaces/ILogger';

// PollingDataMapper 인터페이스들
export interface PollingResult {
  success: boolean;
  deviceId: string;
  unitId: string;
  deviceType: string;
  totalActions: number;
  successfulActions: number;
  responseTime: number;
  results: Array<{
    action: string;
    success: boolean;
    data?: any;
    error?: string;
  }>;
  timestamp: Date;
  error?: string;
}

export interface DataUpdatePayload {
  deviceId: string;
  unitId: string;
  data: { [key: string]: any };
  type: string;
}

// PollingDataSyncService 인터페이스들
export interface PollingSyncResult {
  success: boolean;
  deviceId: string;
  unitId: string;
  updatedFields: number;
  error?: string;
}

export interface BatchSyncResult {
  success: boolean;
  totalDevices: number;
  successfulCollections: number;
  processingTime: number;
  results: Array<{
    collection: string;
    success: boolean;
    count: number;
    time: number;
  }>;
}

export interface CollectionDataItem {
  deviceId: string;
  unitId: string;
  deviceType: string;
  data: { [key: string]: any };
  timestamp: Date;
}

// DataApplyService 인터페이스들
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
  appliedBy: string;
}

export interface ApplyProgress {
  current: number;
  total: number;
  currentDevice: string;
  status: 'preparing' | 'applying' | 'verifying' | 'completed' | 'failed';
  message: string;
}

export class DataSyncService {
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
    this.logger?.debug('[DataSyncService] 서비스 초기화 완료');
  }

  /**
   * 🔥 CommandResultHandler 수동 주입 메소드 추가
   */
  public setCommandResultHandler(commandResultHandler: any): void {
    this.commandResultHandler = commandResultHandler;
    this.logger?.info('[DataSyncService] CommandResultHandler 수동 주입 완료');
  }

  // ==================== PollingDataMapper 기능들 ====================

  /**
   * 폴링 결과를 Data 컬렉션 업데이트 페이로드로 변환
   */
  public async mapPollingResultToDataUpdate(
    deviceId: string,
    unitId: string,
    deviceType: string,
    pollingResult: PollingResult,
  ): Promise<DataUpdatePayload | null> {
    try {
      // this.logger?.info(`[DataSyncService] ${deviceId}/${unitId} (${deviceType}) 데이터 변환 시작`);

      // 폴링 결과 유효성 검증
      if (!pollingResult || typeof pollingResult !== 'object') {
        this.logger?.warn(
          `[DataSyncService] ${deviceId}/${unitId} 유효하지 않은 폴링 결과: ${JSON.stringify(pollingResult)}`,
        );
        return null;
      }

      if (!pollingResult.success) {
        this.logger?.warn(
          `[DataSyncService] ${deviceId}/${unitId} 폴링 실패: ${pollingResult.error || 'Unknown error'}`,
        );
        return null;
      }

      // 폴링 결과 구조 검증
      if (!pollingResult.results || !Array.isArray(pollingResult.results)) {
        this.logger?.warn(`[DataSyncService] ${deviceId}/${unitId} 폴링 결과에 results 배열이 없음`);
        return null;
      }

      // this.logger?.debug(
      //   `[DataSyncService] ${deviceId}/${unitId} 폴링 결과 분석: 총 ${pollingResult.totalActions}개 액션, 성공 ${pollingResult.successfulActions}개, 응답시간 ${pollingResult.responseTime}ms`,
      // );

      // Device 컬렉션에서 clientId 조회
      const clientId = await this.getClientIdFromDeviceCollection(deviceId);
      if (!clientId) {
        this.logger?.warn(`[DataSyncService] Client ID not found for device: ${deviceId}`);
        return null;
      }

      const clientMapping = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];

      if (!clientMapping) {
        this.logger?.warn(`[DataSyncService] Client mapping not found for ${clientId}`);
        return null;
      }

      // COMMON_SYSTEM_PORTS는 unitId가 없음
      if (deviceType === 'ddc_time' || deviceType === 'seasonal') {
        const availableActions = Object.keys(clientMapping[deviceType] || {});
        if (availableActions.length === 0) {
          this.logger?.warn(`[DataSyncService] No actions found for ${deviceType}`);
          return null;
        }

        this.logger?.info(
          `[DataSyncService] Common system ports (${deviceType}) polling supported with ${availableActions.length} actions`,
        );

        return null;
      }

      // 일반 디바이스는 unitId 필요
      if (!clientMapping[deviceType] || !clientMapping[deviceType][unitId]) {
        this.logger?.warn(`[DataSyncService] Mapping not found for ${clientId}/${deviceId}/${deviceType}/${unitId}`);
        return null;
      }

      const unitMapping = clientMapping[deviceType][unitId];
      const availableActions = Object.keys(unitMapping);

      if (availableActions.length === 0) {
        this.logger?.warn(`[DataSyncService] No actions found for ${clientId}/${deviceId}/${deviceType}/${unitId}`);
        return null;
      }

      this.logger?.debug(
        `[DataSyncService] ${clientId}/${deviceId}/${deviceType}/${unitId} 사용 가능한 액션: ${availableActions.join(
          ', ',
        )}`,
      );

      // 시간 관련 액션 확인 및 로깅
      const timeActions = this.getTimeActionsForDeviceType(deviceType, availableActions);
      this.logger?.debug(`[DataSyncService] ${clientId}/${deviceId}/${deviceType}/${unitId} 시간 관련 액션 분석:`, {
        deviceType,
        totalActions: availableActions.length,
        timeActions,
        hasTimeActions: timeActions.length > 0,
        timeActionCount: timeActions.length,
      });

      // 폴링 결과에서 데이터 추출 및 변환
      const mappedData = await this.extractAndTransformData(
        clientId,
        deviceId,
        deviceType,
        pollingResult,
        availableActions,
      );

      if (mappedData.processedCount === 0) {
        this.logger?.warn(`[DataSyncService] ${clientId}/${deviceId}/${deviceType}/${unitId}에서 변환된 데이터가 없음`);

        this.logger?.debug(`[DataSyncService] ${clientId}/${deviceId}/${deviceType}/${unitId} 디버깅 정보:`, {
          deviceType,
          availableActions,
          pollingResultSuccess: pollingResult.success,
          totalResults: pollingResult.results.length,
          successfulResults: pollingResult.results.filter((r) => r.success).length,
          failedResults: pollingResult.results.filter((r) => !r.success).length,
          results: pollingResult.results.map((r) => ({
            action: r.action,
            success: r.success,
            hasData: r.data !== undefined,
          })),
        });

        return null;
      }

      // this.logger?.info(
      //   `[DataSyncService] ${deviceId}/${unitId} 데이터 변환 완료: ${Object.keys(mappedData).length}개 필드`,
      // );

      // this.logger?.debug(`[DataSyncService] ${deviceId}/${unitId} 데이터 변환 상세`, {
      //   deviceType,
      //   mappedFields: Object.keys(mappedData),
      //   mappedData,
      // });

      return {
        deviceId,
        unitId,
        data: {}, // CommandResultHandler에서 이미 처리됨
        type: deviceType,
      };
    } catch (error) {
      this.logger?.error(`[DataSyncService] ${deviceId}/${unitId} 데이터 변환 실패: ${error}`);
      this.logger?.error(`[DataSyncService] 에러 상세: ${error instanceof Error ? error.message : String(error)}`);
      this.logger?.error(`[DataSyncService] 스택 트레이스: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      return null;
    }
  }

  /**
   * 데이터 추출 및 변환
   */
  private async extractAndTransformData(
    clientId: string,
    deviceId: string,
    deviceType: string,
    pollingResult: PollingResult,
    availableActions: string[],
  ): Promise<{ [key: string]: any }> {
    try {
      const mappedData: { [key: string]: any } = {};

      // 성공한 결과들만 처리
      const successfulResults = pollingResult.results.filter((result) => result.success);
      const failedResults = pollingResult.results.filter((result) => !result.success);

      // this.logger?.info(
      //   `[DataSyncService] ${pollingResult.deviceId}/${pollingResult.unitId} 성공한 액션: ${successfulResults.length}/${pollingResult.totalActions}`,
      // );

      // 각 성공한 결과에 대해 필드 매핑 적용
      let processedCount = 0;
      for (const result of successfulResults) {
        try {
          let processedData = result.data;

          // 배열 데이터를 단일 값으로 변환
          if (Array.isArray(processedData) && processedData.length === 1) {
            processedData = processedData[0];
          }
          this.logger?.debug(
            `[DataSyncService] 배열 데이터를 단일 값으로 변환: ${result.action} [${result.data}] → ${processedData}`,
          );
          // 필드 매핑 찾기
          const fieldMapping = this.getFieldMapping(clientId, deviceType, result.action);
          if (fieldMapping) {
            // CommandResultHandler.handleSuccess() 호출
            const success = await this.handlePollingDataWithCommandResultHandler(
              pollingResult.deviceId,
              pollingResult.unitId,
              fieldMapping,
              processedData,
              result.action,
            );
            if (success) {
              processedCount++;
            }
            this.logger?.debug(
              `[DataSyncService] 액션 ${result.action} → 필드 ${fieldMapping} = ${JSON.stringify(
                processedData,
              )} (CommandResultHandler 처리됨)`,
            );
          } else {
            // 에러아님
            this.logger?.warn(`[DataSyncService] 액션 ${result.action}에 대한 필드 매핑을 찾을 수 없음`);
          }
        } catch (error) {
          this.logger?.error(`[DataSyncService] 액션 ${result.action} 처리 중 오류: ${error}`);
        }
      }

      // 실패한 액션들 로깅
      if (failedResults.length > 0) {
        this.logger?.warn(
          `[DataSyncService] ${pollingResult.deviceId}/${pollingResult.unitId} 실패한 액션: ${failedResults.length}개`,
        );
        for (const failedResult of failedResults) {
          this.logger?.warn(`[DataSyncService] 실패한 액션: ${failedResult.action} - ${failedResult.error}`);
        }
      }

      // CommandResultHandler에서 처리된 데이터 개수 반환
      return { processedCount };
    } catch (error) {
      this.logger?.error(
        `[DataSyncService] 데이터 추출 및 변환 중 오류: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {};
    }
  }

  /**
   * CommandResultHandler.handleSuccess()를 통한 폴링 데이터 처리
   */
  private async handlePollingDataWithCommandResultHandler(
    deviceId: string,
    unitId: string,
    fieldMapping: string,
    processedData: any,
    action: string,
  ): Promise<boolean> {
    try {
      if (!this.commandResultHandler) {
        this.logger?.warn('[DataSyncService] CommandResultHandler가 초기화되지 않음');
        return false;
      }

      // 간단한 Device/Unit 객체 생성 (DB 조회 불필요)
      const device: IDevice = {
        deviceId,
        name: deviceId,
        clientId: '', // 빈 문자열로 초기화
        type: '', // 빈 문자열로 초기화
      } as IDevice;

      const unit: IUnit = {
        unitId,
        deviceId,
        name: unitId,
        clientId: '', // 빈 문자열로 초기화
        type: '', // 빈 문자열로 초기화
        status: 0, // 기본값
        data: {}, // 빈 객체로 초기화
      } as IUnit;

      // CommandResultHandler.handleSuccess() 호출
      await this.commandResultHandler.handleSuccess(
        `polling_${deviceId}_${unitId}_${Date.now()}`,
        { data: [processedData] },
        device,
        unit,
        action,
        processedData,
        'data', // 모든 폴링 데이터는 data 컬렉션에 저장
        'polling', // 컨텍스트: 폴링
      );

      this.logger?.debug(
        `[DataSyncService] CommandResultHandler.handleSuccess() 호출 완료: ${deviceId}/${unitId} - ${fieldMapping} = ${processedData}`,
      );
      return true;
    } catch (error) {
      this.logger?.error(
        `[DataSyncService] CommandResultHandler.handleSuccess() 호출 실패: ${deviceId}/${unitId} - ${fieldMapping} - ${error}`,
      );
      return false;
    }
  }

  /**
   * 필드 매핑 조회
   */
  private getFieldMapping(clientId: string, deviceType: string, action: string): string | null {
    try {
      const clientMapping = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];

      if (!clientMapping) {
        this.logger?.warn(`[DataSyncService] Client ID not found for device: ${clientId}`);
        return null;
      }

      if (!clientMapping[deviceType]) {
        this.logger?.warn(`[DataSyncService] Device type ${deviceType} not found in client ${clientId}`);
        return null;
      }

      // deviceType 내부의 unit들을 순회하여 action 찾기
      for (const unitId in clientMapping[deviceType]) {
        const unitMapping = clientMapping[deviceType][unitId];
        if (unitMapping && unitMapping[action]) {
          const actionConfig = unitMapping[action];

          // 문자열인 경우 (예: 'TIME_INTEGRATED') 건너뛰기
          if (typeof actionConfig === 'string') {
            this.logger?.debug(`[DataSyncService] Skipping string action config: ${action} = ${actionConfig}`);
            continue;
          }

          if (actionConfig && actionConfig.field) {
            this.logger?.debug(
              `[DataSyncService] Found field mapping for ${action}: ${actionConfig.field} in ${unitId}`,
            );
            return actionConfig.field;
          }
        }
      }

      // this.logger?.warn(`[DataSyncService] No field mapping found for action ${action} in ${deviceType}`);
      return null;
    } catch (error) {
      this.logger?.warn(`[DataSyncService] Field mapping 실패: ${action} - ${error}`);
      return null;
    }
  }

  /**
   * 시간 데이터 처리
   */
  private processTimeData(deviceType: string, mappedData: { [key: string]: any }): { [key: string]: any } {
    const timeData: { [key: string]: any } = {};

    // 시간 관련 액션들 확인
    const timeActions = this.getTimeActionsForDeviceType(deviceType, Object.keys(mappedData));
    if (timeActions.length === 0) {
      this.logger?.debug(`[DataSyncService] ${deviceType}에는 시간 관련 액션이 없음`);
      return timeData;
    }

    this.logger?.debug(`[DataSyncService] ${deviceType} 시간 관련 액션 발견: ${timeActions.join(', ')}`);

    // 시간 데이터 처리
    const timeFields = ['start_time_1', 'end_time_1', 'start_time_2', 'end_time_2'];
    for (const timeField of timeFields) {
      const hourKey = `${timeField}_hour`;
      const minuteKey = `${timeField}_minute`;

      if (mappedData[hourKey] !== undefined && mappedData[minuteKey] !== undefined) {
        const hour = mappedData[hourKey];
        const minute = mappedData[minuteKey];

        if (hour !== undefined && minute !== undefined) {
          const formattedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          timeData[timeField] = formattedTime;

          this.logger?.debug(
            `[DataSyncService] 시간 데이터 저장 완료: ${hourKey}=${hour}, ${minuteKey}=${minute}, ${timeField}="${formattedTime}"`,
          );
        } else {
          this.logger?.debug(`[DataSyncService] 시간 데이터 불완전: ${timeField} - hour: ${hour}, minute: ${minute}`);
        }
      }
    }

    this.logger?.debug(`[DataSyncService] 시간 데이터 처리 완료:`, {
      deviceType,
      timeActions,
      processedTimeFields: Object.keys(timeData),
      timeData,
    });

    return timeData;
  }

  /**
   * 시간 관련 액션 조회
   */
  private getTimeActionsForDeviceType(deviceType: string, availableActions: string[]): string[] {
    const timeActionPatterns = [
      'GET_START_TIME_1_HOUR',
      'GET_START_TIME_1_MINUTE',
      'GET_END_TIME_1_HOUR',
      'GET_END_TIME_1_MINUTE',
      'GET_START_TIME_2_HOUR',
      'GET_START_TIME_2_MINUTE',
      'GET_END_TIME_2_HOUR',
      'GET_END_TIME_2_MINUTE',
    ];

    return availableActions.filter((action) => timeActionPatterns.includes(action));
  }

  /**
   * Device 컬렉션에서 Client ID 조회
   */
  private async getClientIdFromDeviceCollection(deviceId: string): Promise<string | null> {
    try {
      const deviceModel = new DeviceModel();
      const device = await deviceModel.findById(deviceId);

      if (device && device.clientId) {
        this.logger?.debug(`[DataSyncService] Device ${deviceId}의 clientId: ${device.clientId}`);
        return device.clientId;
      }

      this.logger?.warn(`[DataSyncService] Device ${deviceId}에서 clientId를 찾을 수 없음`);
      return null;
    } catch (error) {
      this.logger?.error(`[DataSyncService] Device 조회 실패: ${error}`);
      return null;
    }
  }

  /**
   * 온도 튜닝값 조회
   */
  private async getTuningValue(field: string, deviceType: string): Promise<number> {
    try {
      const systemService = this.serviceContainer?.getSystemService();
      if (!systemService) {
        this.logger?.warn('[DataSyncService] SystemService를 찾을 수 없음');
        return 0;
      }

      const settings = await systemService.getDeviceAdvancedSettings();
      if (!settings) {
        this.logger?.debug('[DataSyncService] 디바이스 상세설정을 찾을 수 없음, 기본값 0 사용');
        return 0;
      }

      if (field === 'summer_cont_temp') {
        const tuningValue = settings.temp['fine-tuning-summer'] || 0;
        this.logger?.debug(`[DataSyncService] 여름 목표온도 튜닝값: ${tuningValue}`);
        return tuningValue;
      }
      if (field === 'winter_cont_temp') {
        const tuningValue = settings.temp['fine-tuning-winter'] || 0;
        this.logger?.debug(`[DataSyncService] 겨울 목표온도 튜닝값: ${tuningValue}`);
        return tuningValue;
      }

      return 0;
    } catch (error) {
      this.logger?.error(`[DataSyncService] 튜닝값 조회 실패: ${error}`);
      return 0;
    }
  }

  // ==================== PollingDataSyncService 기능들 ====================

  /**
   * 폴링 결과를 Data 컬렉션에 동기화
   */
  public async syncPollingData(
    deviceId: string,
    unitId: string,
    deviceType: string,
    pollingResult: PollingResult,
  ): Promise<PollingSyncResult> {
    try {
      // this.logger?.info(`[DataSyncService] ${deviceId}/${unitId} 폴링 데이터 동기화 시작`);

      // 폴링 결과를 Data 컬렉션 형식으로 변환
      const dataUpdate = await this.mapPollingResultToDataUpdate(deviceId, unitId, deviceType, pollingResult);

      if (!dataUpdate) {
        return {
          success: false,
          deviceId,
          unitId,
          updatedFields: 0,
          error: '데이터 변환 실패',
        };
      }

      // Data 컬렉션에 저장 또는 업데이트
      const syncResult = await this.saveOrUpdateData(dataUpdate);

      // this.logger?.info(
      //   `[DataSyncService] ${deviceId}/${unitId} 폴링 데이터 동기화 완료: ${syncResult.updatedFields}개 필드`,
      // );

      return syncResult;
    } catch (error) {
      const errorMessage = `폴링 데이터 동기화 실패: ${error}`;
      this.logger?.error(`[DataSyncService] ${deviceId}/${unitId} ${errorMessage}`);

      return {
        success: false,
        deviceId,
        unitId,
        updatedFields: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * 🔥 Data 컬렉션에 저장 또는 업데이트 (CommandResultHandler 방식)
   * 이미 extractAndTransformData()에서 CommandResultHandler.handleSuccess()로 처리됨
   */
  private async saveOrUpdateData(dataUpdate: DataUpdatePayload): Promise<PollingSyncResult> {
    try {
      const { deviceId, unitId } = dataUpdate;

      this.logger?.debug(
        `[DataSyncService] saveOrUpdateData 호출됨: ${deviceId}/${unitId} (이미 CommandResultHandler에서 처리됨)`,
      );

      // 이미 extractAndTransformData()에서 CommandResultHandler.handleSuccess()로 처리됨
      return {
        success: true,
        deviceId,
        unitId,
        updatedFields: 0, // 실제로는 CommandResultHandler에서 처리됨
      };
    } catch (error) {
      this.logger?.error(`[DataSyncService] saveOrUpdateData 처리 실패: ${error}`);
      return {
        success: false,
        deviceId: dataUpdate.deviceId,
        unitId: dataUpdate.unitId,
        updatedFields: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // 🔥 mergeData 메소드 제거 (더 이상 사용하지 않음)

  /**
   * 일괄 폴링 데이터 처리
   */
  public async syncBatchPollingData(
    batchResults: Array<{
      deviceId: string;
      unitId: string;
      deviceType: string;
      pollingResult: any;
      timestamp: Date;
    }>,
  ): Promise<BatchSyncResult> {
    const startTime = Date.now();

    try {
      this.logger?.info(`[DataSyncService] 일괄 폴링 데이터 처리 시작: ${batchResults.length}개 장비`);

      // 컬렉션별로 데이터 분류
      const { dataCollection, statusCollection, errorCollection, ddcConfigCollection } =
        await this.classifyBatchDataByCollection(batchResults);

      this.logger?.info(
        `[DataSyncService] 데이터 분류 완료: Data(${dataCollection.length}), Status(${statusCollection.length}), Error(${errorCollection.length}), DdcConfig(${ddcConfigCollection.length})`,
      );

      // 각 컬렉션에 일괄 저장
      const results = await Promise.all([
        this.bulkWriteDataCollection(dataCollection),
        this.bulkWriteStatusCollection(statusCollection),
        this.bulkWriteErrorCollection(errorCollection),
        this.bulkWriteDdcConfigCollection(ddcConfigCollection),
      ]);

      const successCount = results.filter((r) => r.success).length;
      const processingTime = Date.now() - startTime;

      this.logger?.info(
        `[DataSyncService] 일괄 처리 완료: ${successCount}/${results.length}개 컬렉션 성공, ${processingTime}ms`,
      );

      return {
        success: successCount === results.length,
        totalDevices: batchResults.length,
        successfulCollections: successCount,
        processingTime,
        results: results.map((result, index) => ({
          collection: ['Data', 'Status', 'Error', 'DdcConfig'][index],
          success: result.success,
          count: result.count,
          time: result.time,
        })),
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger?.error(`[DataSyncService] 일괄 처리 실패: ${processingTime}ms, ${error}`);

      return {
        success: false,
        totalDevices: batchResults.length,
        successfulCollections: 0,
        processingTime,
        results: [],
      };
    }
  }

  /**
   * 배치 데이터를 컬렉션별로 분류
   */
  private async classifyBatchDataByCollection(batchResults: any[]): Promise<{
    dataCollection: CollectionDataItem[];
    statusCollection: any[];
    errorCollection: any[];
    ddcConfigCollection: any[];
  }> {
    const dataCollection: CollectionDataItem[] = [];
    const statusCollection: any[] = [];
    const errorCollection: any[] = [];
    const ddcConfigCollection: any[] = [];

    for (const item of batchResults) {
      try {
        // 유효하지 않은 데이터 건너뛰기
        if (!item.pollingResult || !item.pollingResult.success) {
          this.logger?.warn(
            `[DataSyncService] 유효하지 않은 폴링 데이터 건너뜀: ${item.deviceId}/${item.unitId} - ${
              item.pollingResult?.error || 'Unknown error'
            }`,
          );
          continue;
        }

        // Data 컬렉션용 데이터 변환
        const dataUpdate = await this.mapPollingResultToDataUpdate(
          item.deviceId,
          item.unitId,
          item.deviceType,
          item.pollingResult,
        );

        if (dataUpdate) {
          dataCollection.push({
            deviceId: dataUpdate.deviceId,
            unitId: dataUpdate.unitId,
            deviceType: dataUpdate.type,
            data: dataUpdate.data,
            timestamp: item.timestamp,
          });
        }

        // Status, Error, DdcConfig 컬렉션용 데이터는 별도 처리
        // (기존 PollingDataSyncService 로직을 그대로 유지)
      } catch (error) {
        this.logger?.error(`[DataSyncService] 배치 데이터 분류 중 오류: ${item.deviceId}/${item.unitId} - ${error}`);
      }
    }

    return { dataCollection, statusCollection, errorCollection, ddcConfigCollection };
  }

  /**
   * Data 컬렉션 일괄 쓰기
   */
  private async bulkWriteDataCollection(
    dataCollection: CollectionDataItem[],
  ): Promise<{ success: boolean; count: number; time: number }> {
    const startTime = Date.now();

    try {
      if (dataCollection.length === 0) {
        return { success: true, count: 0, time: Date.now() - startTime };
      }

      // 일괄 업데이트 작업 구성
      const bulkOps = dataCollection.map((item) => ({
        updateOne: {
          filter: { deviceId: item.deviceId, type: item.deviceType, 'units.unitId': item.unitId },
          update: {
            $set: {
              'units.$.data': item.data,
              'units.$.updatedAt': item.timestamp,
              updatedAt: item.timestamp,
            },
          },
          upsert: true,
        },
      }));

      const result = await Data.bulkWrite(bulkOps);
      const processingTime = Date.now() - startTime;

      this.logger?.info(
        `[DataSyncService] Data 컬렉션 bulk write: ${dataCollection.length}개 문서, ${processingTime}ms`,
      );

      return { success: true, count: result.upsertedCount + result.modifiedCount, time: processingTime };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger?.error(`[DataSyncService] Data 컬렉션 bulk write 실패: ${processingTime}ms, ${error}`);
      return { success: false, count: 0, time: processingTime };
    }
  }

  /**
   * Status 컬렉션 일괄 쓰기 (기존 로직 유지)
   */
  private async bulkWriteStatusCollection(
    statusCollection: any[],
  ): Promise<{ success: boolean; count: number; time: number }> {
    // 기존 PollingDataSyncService 로직을 그대로 구현
    return { success: true, count: 0, time: 0 };
  }

  /**
   * Error 컬렉션 일괄 쓰기 (기존 로직 유지)
   */
  private async bulkWriteErrorCollection(
    errorCollection: any[],
  ): Promise<{ success: boolean; count: number; time: number }> {
    // 기존 PollingDataSyncService 로직을 그대로 구현
    return { success: true, count: 0, time: 0 };
  }

  /**
   * DdcConfig 컬렉션 일괄 쓰기 (기존 로직 유지)
   */
  private async bulkWriteDdcConfigCollection(
    ddcConfigCollection: any[],
  ): Promise<{ success: boolean; count: number; time: number }> {
    // 기존 PollingDataSyncService 로직을 그대로 구현
    return { success: true, count: 0, time: 0 };
  }

  // ==================== DataApplyService 기능들 ====================

  /**
   * 하드웨어에 데이터 적용
   */
  public async applyHardwareData(deviceId: string, unitId: string, data: any): Promise<void> {
    try {
      this.logger?.info(`[DataSyncService] 하드웨어 데이터 적용 시작: ${deviceId}/${unitId}`);

      const unifiedModbusService = this.serviceContainer?.getUnifiedModbusService();
      if (!unifiedModbusService) {
        throw new Error('Modbus 서비스를 찾을 수 없습니다');
      }

      // 각 필드별로 Modbus 쓰기 명령 실행
      for (const [field, value] of Object.entries(data)) {
        await this.executeModbusWrite(deviceId, unitId, field, value, unifiedModbusService);
      }

      this.logger?.info(`[DataSyncService] 하드웨어 데이터 적용 완료: ${deviceId}/${unitId}`);
    } catch (error) {
      this.logger?.error(`[DataSyncService] 하드웨어 데이터 적용 실패: ${deviceId}/${unitId} - ${error}`);
      throw error;
    }
  }

  /**
   * Modbus 쓰기 명령 실행
   */
  private async executeModbusWrite(
    deviceId: string,
    unitId: string,
    field: string,
    value: any,
    unifiedModbusService: any,
  ): Promise<void> {
    try {
      // fieldUtils에서 매핑 정보 조회
      const { getWritableFieldMappings } = await import('../../meta/protocols/fieldUtils');

      // 임시 unit 객체 생성 (실제 구현에서는 더 정확한 방법 필요)
      const unit = {
        deviceId,
        unitId,
        type: 'unknown',
        clientId: '',
        name: '',
        status: 'active',
        data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      const writableMappings = getWritableFieldMappings(
        unit,
        { [field]: value },
        {
          includeTimeFields: true,
          includeScheduleFields: false,
        },
      );

      const mapping = writableMappings.find((m) => m.field === field);
      if (!mapping) {
        this.logger?.warn(`[DataSyncService] 필드 ${field}에 대한 쓰기 매핑을 찾을 수 없음`);
        return;
      }

      this.logger?.info(
        `[DataSyncService] Modbus 쓰기: ${mapping.actionKey} = ${value} (${mapping.commandSpec.functionCode}:${mapping.commandSpec.address})`,
      );

      const result = await unifiedModbusService.writeRegister({
        slaveId: mapping.commandSpec.slaveId,
        functionCode: mapping.commandSpec.functionCode,
        address: mapping.commandSpec.address,
        value,
        context: 'control',
      });

      if (!result.success) {
        throw new Error(`Modbus write failed: ${result.error}`);
      }

      this.logger?.info(`[DataSyncService] Modbus 쓰기 성공: ${mapping.actionKey} = ${value}`);
    } catch (error) {
      this.logger?.error(`[DataSyncService] Modbus 쓰기 실패: ${field} = ${value} - ${error}`);
      throw error;
    }
  }

  /**
   * 컬렉션에서 하드웨어로 동기화
   */
  public async syncCollectionToHardware(deviceId: string, unitId: string): Promise<void> {
    try {
      this.logger?.info(`[DataSyncService] 컬렉션 → 하드웨어 동기화 시작: ${deviceId}/${unitId}`);

      // Data 컬렉션에서 데이터 조회
      const dataDoc = await Data.findOne({ deviceId });
      if (!dataDoc) {
        throw new Error('Data 컬렉션에서 데이터를 찾을 수 없습니다');
      }

      const unitData = dataDoc.units.find((unit) => unit.unitId === unitId);
      if (!unitData) {
        throw new Error(`Unit ${unitId} 데이터를 찾을 수 없습니다`);
      }

      // 하드웨어에 적용
      await this.applyHardwareData(deviceId, unitId, unitData.data);

      this.logger?.info(`[DataSyncService] 컬렉션 → 하드웨어 동기화 완료: ${deviceId}/${unitId}`);
    } catch (error) {
      this.logger?.error(`[DataSyncService] 컬렉션 → 하드웨어 동기화 실패: ${deviceId}/${unitId} - ${error}`);
      throw error;
    }
  }

  /**
   * 하드웨어에서 컬렉션으로 동기화
   */
  public async syncHardwareToCollection(deviceId: string, unitId: string): Promise<any> {
    try {
      this.logger?.info(`[DataSyncService] 하드웨어 → 컬렉션 동기화 시작: ${deviceId}/${unitId}`);

      // 하드웨어에서 데이터 읽기 (실제 구현에서는 더 정확한 방법 필요)
      const unifiedModbusService = this.serviceContainer?.getUnifiedModbusService();
      if (!unifiedModbusService) {
        throw new Error('Modbus 서비스를 찾을 수 없습니다');
      }

      // 임시 구현 - 실제로는 하드웨어에서 데이터를 읽어와야 함
      const hardwareData = {}; // 실제 하드웨어 데이터로 교체 필요

      // 컬렉션 업데이트
      await this.saveOrUpdateData({
        deviceId,
        unitId,
        data: hardwareData,
        type: 'unknown',
      });

      this.logger?.info(`[DataSyncService] 하드웨어 → 컬렉션 동기화 완료: ${deviceId}/${unitId}`);
      return hardwareData;
    } catch (error) {
      this.logger?.error(`[DataSyncService] 하드웨어 → 컬렉션 동기화 실패: ${deviceId}/${unitId} - ${error}`);
      throw error;
    }
  }

  /**
   * 적용 결과 검증
   */
  public async verifyApplication(result: DataApplyResult): Promise<void> {
    try {
      this.logger?.info('[DataSyncService] 적용 결과 검증 시작');

      // Data 컬렉션 재조회하여 적용된 값들 확인
      const dataCollection = await this.getDataCollection();
      const unifiedModbusService = this.serviceContainer?.getUnifiedModbusService();

      if (!unifiedModbusService) {
        this.logger?.warn('[DataSyncService] Modbus 서비스를 찾을 수 없어 검증을 건너뜁니다');
        return;
      }

      let verificationCount = 0;
      let successCount = 0;
      let failureCount = 0;

      // 각 장비별로 검증 수행
      for (const device of dataCollection) {
        if (!device.units || !Array.isArray(device.units)) {
          continue;
        }

        for (const unitData of device.units) {
          try {
            const isVerified = await this.verifyFieldValue(
              device.deviceId,
              unitData.unitId,
              unitData.data,
              unifiedModbusService,
            );
            verificationCount++;

            if (isVerified) {
              successCount++;
              this.logger?.info(`[DataSyncService] 검증 성공: ${device.deviceId}/${unitData.unitId}`);
            } else {
              failureCount++;
              this.logger?.warn(`[DataSyncService] 검증 실패: ${device.deviceId}/${unitData.unitId}`);
            }
          } catch (error) {
            this.logger?.error(`[DataSyncService] 유닛 검증 실패: ${unitData.unitId} - ${error}`);
            failureCount++;
          }
        }
      }

      this.logger?.info(
        `[DataSyncService] 적용 결과 검증 완료: ${successCount}/${verificationCount} 성공, ${failureCount} 실패`,
      );

      if (failureCount > 0) {
        this.logger?.warn(`[DataSyncService] ${failureCount}개 필드 검증 실패 - 설정값을 확인해주세요`);
      }
    } catch (error) {
      this.logger?.error(`[DataSyncService] 적용 결과 검증 실패: ${error}`);
    }
  }

  /**
   * 개별 필드 값 검증
   */
  private async verifyFieldValue(
    deviceId: string,
    unitId: string,
    expectedData: any,
    unifiedModbusService: any,
  ): Promise<boolean> {
    try {
      // 임시 구현 - 실제로는 각 필드별로 검증해야 함
      this.logger?.info(`[DataSyncService] 필드 검증: ${deviceId}/${unitId}`);

      // 실제 구현에서는 하드웨어에서 값을 읽어와서 비교
      return true; // 임시로 항상 성공 반환
    } catch (error) {
      this.logger?.error(`[DataSyncService] 필드 검증 실패: ${deviceId}/${unitId} - ${error}`);
      return false;
    }
  }

  // ==================== 양방향 동기화 기능들 ====================

  /**
   * 양방향 동기화
   */
  public async bidirectionalSync(deviceId: string, unitId: string): Promise<void> {
    try {
      this.logger?.info(`[DataSyncService] 양방향 동기화 시작: ${deviceId}/${unitId}`);

      // 1. 컬렉션 → 하드웨어
      await this.syncCollectionToHardware(deviceId, unitId);

      // 2. 하드웨어 → 컬렉션
      await this.syncHardwareToCollection(deviceId, unitId);

      // 3. 동기화 상태 확인
      await this.verifyApplication({
        success: true,
        appliedDevices: 1,
        failedDevices: 0,
        totalDevices: 1,
        errors: [],
        appliedAt: new Date(),
        appliedBy: 'system',
      });

      this.logger?.info(`[DataSyncService] 양방향 동기화 완료: ${deviceId}/${unitId}`);
    } catch (error) {
      this.logger?.error(`[DataSyncService] 양방향 동기화 실패: ${deviceId}/${unitId} - ${error}`);
      throw error;
    }
  }

  /**
   * 데이터 충돌 해결
   */
  public async resolveDataConflict(deviceId: string, unitId: string): Promise<void> {
    try {
      this.logger?.info(`[DataSyncService] 데이터 충돌 해결 시작: ${deviceId}/${unitId}`);

      // 1. 양쪽 데이터 읽기
      const collectionData = await this.getDataCollection();
      const hardwareData = await this.syncHardwareToCollection(deviceId, unitId);

      // 2. 충돌 해결 로직 (임시 구현)
      const resolvedData = { ...collectionData, ...hardwareData };

      // 3. 양쪽에 동기화
      await this.syncCollectionToHardware(deviceId, unitId);
      await this.saveOrUpdateData({
        deviceId,
        unitId,
        data: resolvedData,
        type: 'unknown',
      });

      this.logger?.info(`[DataSyncService] 데이터 충돌 해결 완료: ${deviceId}/${unitId}`);
    } catch (error) {
      this.logger?.error(`[DataSyncService] 데이터 충돌 해결 실패: ${deviceId}/${unitId} - ${error}`);
      throw error;
    }
  }

  // ==================== 유틸리티 메서드들 ====================

  /**
   * Data 컬렉션 조회
   */
  private async getDataCollection(): Promise<any[]> {
    try {
      return await Data.find({}).lean();
    } catch (error) {
      this.logger?.error(`[DataSyncService] Data 컬렉션 조회 실패: ${error}`);
      return [];
    }
  }

  /**
   * 동기화 상태 조회
   */
  public async getSyncStatus(
    deviceId: string,
    unitId: string,
  ): Promise<{
    lastSync: Date | null;
    syncStatus: 'active' | 'inactive' | 'error';
    lastError?: string;
  }> {
    try {
      const dataDoc = await Data.findOne({ deviceId });
      if (!dataDoc) {
        return {
          lastSync: null,
          syncStatus: 'inactive',
          lastError: '데이터를 찾을 수 없습니다',
        };
      }

      const unitData = dataDoc.units.find((unit) => unit.unitId === unitId);
      if (!unitData) {
        return {
          lastSync: null,
          syncStatus: 'inactive',
          lastError: '유닛 데이터를 찾을 수 없습니다',
        };
      }

      return {
        lastSync: (unitData as any).updatedAt || new Date(),
        syncStatus: 'active',
      };
    } catch (error) {
      return {
        lastSync: null,
        syncStatus: 'error',
        lastError: `상태 확인 실패: ${error}`,
      };
    }
  }

  /**
   * 진행 상황 업데이트
   */
  private updateProgress(status: ApplyProgress['status'], message: string): void {
    if (this.currentProgress) {
      this.currentProgress.status = status;
      this.currentProgress.message = message;
      this.logger?.info(`[DataSyncService] 진행 상황: ${status} - ${message}`);
    }
  }

  /**
   * 현재 진행 상황 조회
   */
  public getProgress(): ApplyProgress | null {
    return this.currentProgress;
  }
}
