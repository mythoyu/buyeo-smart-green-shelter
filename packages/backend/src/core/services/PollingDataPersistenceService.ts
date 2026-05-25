import { ILogger } from '../../shared/interfaces/ILogger';

import { IPollingDataPersistenceService } from './interfaces/IPollingDataPersistenceService';

export class PollingDataPersistenceService implements IPollingDataPersistenceService {
  private logger: ILogger | undefined;

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  // TODO: 폴링 데이터를 data 컬렉션에 저장 (구조만 준비)
  async savePollingData(slaveId: number, _data: any): Promise<void> {
    this.logger?.debug(`[PollingDataPersistenceService] 폴링 데이터 저장 예정: Slave ${slaveId}`);
  }

  // TODO: Modbus 읽기 결과를 data 컬렉션에 저장 (구조만 준비)
  async saveModbusReadResult(deviceId: string, unitId: string, _command: any, _result: any): Promise<void> {
    this.logger?.debug(`[PollingDataPersistenceService] Modbus 읽기 결과 저장 예정: ${deviceId}/${unitId}`);
  }

  // TODO: 저장된 폴링 데이터 조회 (구조만 준비)
  async getPollingData(slaveId: number, _limit = 100): Promise<any[]> {
    this.logger?.debug(`[PollingDataPersistenceService] 폴링 데이터 조회 예정: Slave ${slaveId}`);
    return [];
  }
}
