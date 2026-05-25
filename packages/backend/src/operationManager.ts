import { getDeviceDefaultValues, getFallbackDeviceValues } from './data/clientDefaultDataMapping';
import { logDebug, logError } from './logger';
import { Data as DataSchema } from './models/schemas/DataSchema';
import { Device as DeviceSchema } from './models/schemas/DeviceSchema';
import { Status as StatusSchema } from './models/schemas/StatusSchema';
import { Unit as UnitSchema } from './models/schemas/UnitSchema';

// 🔧 Phase 3: 핵심 기능만 유지하는 간소화된 운용 데이터 관리자
export class BushubOperationManager {
  private static instance: BushubOperationManager;
  private currentClientId: string | null = null;

  private constructor() {
    logDebug('🔧 BushubOperationManager 초기화 시작...');
    logDebug('🔧 BushubOperationManager 초기화 완료');
  }

  public static getInstance(): BushubOperationManager {
    if (!BushubOperationManager.instance) {
      BushubOperationManager.instance = new BushubOperationManager();
    }
    return BushubOperationManager.instance;
  }

  public setCurrentClientId(clientId: string): void {
    this.currentClientId = clientId;
    logDebug(`현재 클라이언트 ID 설정: ${clientId}`);
  }

  public getCurrentClientId(): string | null {
    return this.currentClientId;
  }

  // 클라이언트별 실제 운용데이터 생성 및 저장
  public async generateAndSaveClientData(clientInfo: any): Promise<void> {
    logDebug('🔍 클라이언트별 실제 운용데이터 생성 시작...');
    logDebug(`📋 클라이언트 정보: ${JSON.stringify(clientInfo)}`);

    // 현재 클라이언트 ID 설정
    this.setCurrentClientId(clientInfo.id);

    // 기존 데이터 삭제
    await StatusSchema.deleteMany({});
    await DataSchema.deleteMany({});

    // 데이터베이스에서 클라이언트의 장비와 유닛 정보를 직접 조회
    const devices = await DeviceSchema.find({ clientId: clientInfo.id }).lean();

    for (const device of devices) {
      const units = await UnitSchema.find({ deviceId: device.deviceId, clientId: clientInfo.id }).lean();
      logDebug(`📱 디바이스 ${device.deviceId} (${device.type}) 데이터 생성 중... - ${units.length}개 유닛`);

      // 상태 데이터 저장
      await StatusSchema.create({
        deviceId: device.deviceId,
        status: 0, // 정상
        units: units.map((unit: any) => ({
          unitId: unit.unitId,
          status: 0, // 정상
        })),
        updatedAt: new Date(),
      });

      // 디바이스 데이터 저장
      await DataSchema.create({
        clientId: clientInfo.id,
        deviceId: device.deviceId,
        type: device.type,
        units: units.map((unit: any) => ({
          unitId: unit.unitId,
          data: this.generateRealOperationData(device.type, unit.unitId),
        })),
        updatedAt: new Date(),
      });
    }

    logDebug('✅ 클라이언트별 실제 운용데이터가 데이터베이스에 저장되었습니다.');
    logDebug(`📊 생성된 데이터 요약: ${devices.length}개 디바이스`);
    logDebug('🔄 프론트엔드에서 데이터를 새로고침할 수 있습니다.');
  }

  // 디바이스 타입별 실제 운용 데이터 생성
  private generateRealOperationData(deviceType: string, unitId: string): any {
    try {
      // 현재 클라이언트 ID 가져오기
      const clientId = this.currentClientId;

      if (!clientId) {
        logError('❌ 클라이언트 ID가 설정되지 않았습니다. fallback 값 사용');
        return getFallbackDeviceValues(deviceType as any);
      }

      // 클라이언트별 유닛 기본값 조회
      const unitDefaults = getDeviceDefaultValues(clientId, deviceType as any, unitId);

      if (unitDefaults) {
        logDebug(`✅ ${clientId}의 ${deviceType} 유닛 ${unitId} 기본값 사용:`, unitDefaults);
        return unitDefaults;
      }

      // 유닛별 기본값이 없는 경우 fallback 값 사용
      logDebug(`⚠️ ${clientId}의 ${deviceType} 유닛 ${unitId} 기본값이 없습니다. fallback 값 사용`);
      return getFallbackDeviceValues(deviceType as any);
    } catch (error) {
      logError(`❌ ${deviceType} 유닛 ${unitId} 기본값 조회 실패:`, error);
      return getFallbackDeviceValues(deviceType as any);
    }
  }

  // 🔧 Phase 3: 정리 메서드 (핵심 기능만 정리)
  public async cleanup(): Promise<void> {
    try {
      logDebug('🧹 BushubOperationManager 정리 시작...');
      this.currentClientId = null;
      logDebug('✅ BushubOperationManager 정리 완료');
    } catch (error) {
      logError('❌ BushubOperationManager 정리 실패:', error);
    }
  }
}
