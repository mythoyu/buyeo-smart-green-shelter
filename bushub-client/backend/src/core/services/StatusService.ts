import { IStatus, IUnitStatus } from '../../models/schemas/StatusSchema';
import { ILogger } from '../../shared/interfaces/ILogger';
import { IStatusRepository } from '../repositories/interfaces/IStatusRepository';
import { ServiceContainer } from '../container/ServiceContainer';

import { IStatusService } from './interfaces/IStatusService';

export class StatusService implements IStatusService {
  constructor(private statusRepository: IStatusRepository, private logger?: ILogger) {}

  async upsertStatus(deviceId: string, status: number, units: IUnitStatus[]): Promise<IStatus> {
    console.log(`[StatusService] upsertStatus 호출: ${deviceId}, status: ${status}`);
    console.log(`[StatusService] units:`, units.map((u) => `${u.unitId}:${u.status}`).join(', '));
    console.log(`[StatusService] statusRepository 호출 시작`);
    const result = await this.statusRepository.upsertStatus(deviceId, status, units);
    console.log(`[StatusService] statusRepository 호출 완료`);

    // 🆕 Alarm 필드 처리
    await this.processAlarmFields(deviceId, units);

    return result;
  }

  // 🆕 Alarm 필드 처리 (Data 컬렉션 기반)
  private async processAlarmFields(deviceId: string, units: IUnitStatus[]): Promise<void> {
    try {
      const serviceContainer = ServiceContainer.getInstance();
      const errorService = serviceContainer.getErrorService();

      // Data 컬렉션에서 실제 폴링 데이터 조회
      const { Data } = await import('../../models/schemas/DataSchema');
      const dataDoc = await Data.findOne({ deviceId });

      if (!dataDoc) {
        this.logger?.debug(`[StatusService] Data 컬렉션에서 ${deviceId} 데이터를 찾을 수 없음`);
        return;
      }

      for (const unit of units) {
        const unitsDoc = dataDoc.units as any;
        const unitData =
          Array.isArray(unitsDoc)
            ? unitsDoc.find((u: any) => u.unitId === unit.unitId)
            : unitsDoc?.[unit.unitId];
        if (!unitData || !unitData.data) {
          continue;
        }

        // cooler alarm 처리
        if (unitData.data.cooler?.alarm !== undefined) {
          if (unitData.data.cooler.alarm === 0) {
            await errorService.clearAlarmErrors(deviceId, unit.unitId, 'cooler');
          } else {
            await errorService.createAlarmError(deviceId, unit.unitId, 'cooler', unitData.data.cooler.alarm);
          }
        }

        // exchanger alarm 처리
        if (unitData.data.exchanger?.alarm !== undefined) {
          if (unitData.data.exchanger.alarm === 0) {
            await errorService.clearAlarmErrors(deviceId, unit.unitId, 'exchanger');
          } else {
            await errorService.createAlarmError(deviceId, unit.unitId, 'exchanger', unitData.data.exchanger.alarm);
          }
        }

        // integrated_sensor alarm 로직 제거됨
      }
    } catch (error) {
      this.logger?.error(`[StatusService] Alarm 필드 처리 실패: ${error}`);
    }
  }

  async findStatusByDevice(deviceId: string): Promise<IStatus | null> {
    return await this.statusRepository.findStatusByDevice(deviceId);
  }

  async findAllStatuses(): Promise<IStatus[]> {
    return await this.statusRepository.findAllStatuses();
  }

  async deleteStatus(deviceId: string): Promise<boolean> {
    this.logger?.info(`[StatusService] 상태 삭제: ${deviceId}`);
    return await this.statusRepository.deleteStatus(deviceId);
  }

  async setCommunicationError(): Promise<void> {
    this.logger?.warn(`[StatusService] 통신 에러 설정 - 전체 시스템`);

    const allStatuses = await this.findAllStatuses();
    for (const status of allStatuses) {
      // 모든 유닛에 통신 에러 상태 설정 (순수 객체로 변환)
      const updatedUnits = status.units.map((unit) => ({
        unitId: unit.unitId,
        status: 2, // 통신 에러 시 항상 2
      }));

      await this.upsertStatus(status.deviceId, 2, updatedUnits); // 장비 상태도 항상 2
    }
  }

  async clearCommunicationError(): Promise<void> {
    this.logger?.info(`[StatusService] 통신 에러 해제 - 전체 시스템`);

    const allStatuses = await this.findAllStatuses();
    for (const status of allStatuses) {
      // 모든 유닛에 정상 상태 설정 (순수 객체로 변환)
      const updatedUnits = status.units.map((unit) => ({
        unitId: unit.unitId,
        status: 0, // 통신 에러 해제 시 정상 상태
      }));

      await this.upsertStatus(status.deviceId, 0, updatedUnits); // 장비 상태도 정상 상태
    }
  }

  // 🆕 개별 장비 통신 에러 설정
  async setCommunicationErrorForDevice(deviceId: string, unitId: string): Promise<void> {
    const existingStatus = await this.findStatusByDevice(deviceId);

    if (existingStatus) {
      // 해당 유닛만 통신 에러 상태로 설정
      let found = false;
      const updatedUnits = existingStatus.units.map((unit) => {
        if (unit.unitId === unitId) {
          found = true;
          return {
            unitId: unit.unitId,
            status: 2, // 통신 에러 상태
          };
        }
        return {
          unitId: unit.unitId,
          status: unit.status,
        };
      });

      // 🆕 대상 유닛이 존재하지 않으면 새로 추가
      if (!found) {
        updatedUnits.push({ unitId, status: 2 });
      }

      // 장비 상태 계산 (모든 유닛이 정상이면 0, 아니면 1 또는 2)
      const deviceStatus = this.calculateDeviceStatus(updatedUnits);

      await this.upsertStatus(deviceId, deviceStatus, updatedUnits);
    } else {
      // 새로운 상태 문서 생성
      const newUnits = [
        {
          unitId,
          status: 2, // 통신 에러 상태
        },
      ];
      await this.upsertStatus(deviceId, 2, newUnits);
    }
  }

  // 🆕 개별 장비 통신 에러 해제
  async clearCommunicationErrorForDevice(deviceId: string, unitId: string): Promise<void> {
    const existingStatus = await this.findStatusByDevice(deviceId);

    if (existingStatus) {
      // 해당 유닛만 정상 상태로 설정
      let found = false;
      const updatedUnits = existingStatus.units.map((unit) => {
        if (unit.unitId === unitId) {
          found = true;
          return {
            unitId: unit.unitId,
            status: 0, // 통신 에러 해제 시 정상 상태
          };
        }
        return {
          unitId: unit.unitId,
          status: unit.status,
        };
      });

      // 🆕 대상 유닛이 없으면 정상 상태 유닛으로 추가
      if (!found) {
        updatedUnits.push({ unitId, status: 0 });
      }

      // 장비 상태 계산 (모든 유닛이 정상이면 0, 아니면 1 또는 2)
      const deviceStatus = this.calculateDeviceStatus(updatedUnits);

      await this.upsertStatus(deviceId, deviceStatus, updatedUnits);
    } else {
      console.log(`[StatusService] 기존 상태가 없어서 업데이트를 건너뜀`);
    }
  }

  // 🆕 장비 상태 계산 헬퍼
  private calculateDeviceStatus(units: IUnitStatus[]): number {
    const errorCount = units.filter((unit) => unit.status === 2).length;
    const warningCount = units.filter((unit) => unit.status === 1).length;

    if (errorCount > 0) return 2; // 전체 이상
    if (warningCount > 0) return 1; // 일부 이상
    return 0; // 정상
  }
}
