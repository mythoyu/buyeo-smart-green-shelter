import { getModbusConfig } from '../../config/modbus.config';
import { ILogger } from '../../shared/interfaces/ILogger';

import { IUnifiedModbusCommunicationService } from './interfaces/IUnifiedModbusCommunicationService';

// Modbus 명령 타입
export interface ModbusCommand {
  id: string;
  type: 'read' | 'write';
  unitId: string;
  functionCode: number;
  address: number;
  lengthOrValue: number;
  /** 스마트시티 클라이언트 ID (역색인·삼성 cooler 변환). UnifiedModbusCommunicationService → Real/Mock 전달. */
  clientId?: string;
  priority: 'high' | 'normal' | 'low';
  timestamp: Date;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

// 큐 처리 결과
export interface QueueProcessResult {
  success: boolean;
  commandId: string;
  result?: any;
  error?: string;
  processingTime: number;
}

// 큐 상태
export interface QueueStatus {
  highPriority: number;
  normalPriority: number;
  lowPriority: number;
  isProcessing: boolean;
  totalCommands: number;
}

// 유닛별 큐 상태
export interface UnitQueueStatus {
  highPriority: number;
  normalPriority: number;
  lowPriority: number;
  totalCommands: number;
}

export class ModbusCommandQueue {
  private highPriorityQueue: ModbusCommand[] = [];
  private normalPriorityQueue: ModbusCommand[] = [];
  private lowPriorityQueue: ModbusCommand[] = [];
  private isProcessing = false;
  // ✅ setInterval 제거, setImmediate 기반으로 변경
  private commandCounter = 0;
  private logger: ILogger | undefined;
  private config = getModbusConfig();

  // 🆕 실제 Modbus 통신 서비스 주입
  private modbusCommunicationService?: IUnifiedModbusCommunicationService;

  constructor(logger?: ILogger) {
    this.logger = logger;
    this.logger?.debug(`[ModbusQueue] 큐 서비스 초기화 완료`);
    // ✅ startProcessing() 제거 - setImmediate 기반으로 변경
  }

  // 🆕 Modbus 통신 서비스 설정 메서드
  setModbusCommunicationService(service: IUnifiedModbusCommunicationService): void {
    this.modbusCommunicationService = service;
    this.logger?.info(`[ModbusQueue] Modbus 통신 서비스 설정 완료`);
  }

  /**
   * 명령을 큐에 추가
   */
  async addCommand(
    type: 'read' | 'write',
    unitId: string,
    functionCode: number,
    address: number,
    lengthOrValue: number,
    priority: 'high' | 'normal' | 'low' = 'normal',
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const command: ModbusCommand = {
        id: `cmd_${++this.commandCounter}_${Date.now()}`,
        type,
        unitId,
        functionCode,
        address,
        lengthOrValue,
        priority,
        timestamp: new Date(),
        resolve,
        reject,
      };

      // 우선순위에 따라 적절한 큐에 추가
      switch (priority) {
        case 'high':
          this.highPriorityQueue.push(command);
          break;
        case 'normal':
          this.normalPriorityQueue.push(command);
          break;
        case 'low':
          this.lowPriorityQueue.push(command);
          break;
      }

      this.logger?.debug(`[ModbusQueue] 명령 추가: ${command.id} (${type}, ${priority}, Unit: ${unitId})`);
      this.logger?.debug(
        `[ModbusQueue] 큐 상태 - High: ${this.highPriorityQueue.length}, Normal: ${this.normalPriorityQueue.length}, Low: ${this.lowPriorityQueue.length}`,
      );

      // ✅ 명령 추가 후 즉시 처리 시작
      this.startProcessingIfNeeded();
    });
  }

  /**
   * ModbusCommand 객체를 직접 받아서 큐에 추가
   */
  async addCommandObject(command: ModbusCommand): Promise<any> {
    return new Promise((resolve, reject) => {
      // 명령 ID가 없으면 자동 생성
      if (!command.id) {
        command.id = `cmd_${++this.commandCounter}_${Date.now()}`;
      }

      // resolve, reject 함수 설정
      command.resolve = resolve;
      command.reject = reject;
      command.timestamp = new Date();

      // 우선순위에 따라 적절한 큐에 추가
      switch (command.priority) {
        case 'high':
          this.highPriorityQueue.push(command);
          break;
        case 'normal':
          this.normalPriorityQueue.push(command);
          break;
        case 'low':
          this.lowPriorityQueue.push(command);
          break;
      }

      const addTime = Date.now();
      this.logger?.debug(
        `[ModbusQueue] 명령 객체 추가: ${command.id} (${command.type}, ${command.priority}, Unit: ${command.unitId}) - 시간: ${addTime}`,
      );
      this.logger?.debug(
        `[ModbusQueue] 큐 상태 - High: ${this.highPriorityQueue.length}, Normal: ${this.normalPriorityQueue.length}, Low: ${this.lowPriorityQueue.length}`,
      );

      // 큐 크기 경고
      const totalCommands =
        this.highPriorityQueue.length + this.normalPriorityQueue.length + this.lowPriorityQueue.length;
      if (totalCommands > 100) {
        this.logger?.warn(`[ModbusQueue] 큐 크기 증가: ${totalCommands}개 명령 대기 중`);
      }

      // ✅ 명령 추가 후 즉시 처리 시작
      this.logger?.debug(`[ModbusQueue] startProcessingIfNeeded() 호출 시작`);
      this.startProcessingIfNeeded();
      this.logger?.debug(`[ModbusQueue] startProcessingIfNeeded() 호출 완료`);
    });
  }

  /**
   * ✅ 큐 처리 시작 (setImmediate 기반)
   */
  private startProcessingIfNeeded(): void {
    if (!this.isProcessing) {
      this.logger?.debug(`[ModbusQueue] setImmediate으로 큐 처리 시작 예약`);
      const startTime = Date.now();
      setImmediate(() => {
        const delay = Date.now() - startTime;
        this.logger?.debug(`[ModbusQueue] setImmediate 실행됨 (지연: ${delay}ms)`);
        this.processQueue();
      });
    } else {
      this.logger?.debug(`[ModbusQueue] 이미 처리 중이므로 큐 처리 시작 생략`);
    }
  }

  /**
   * ✅ 큐에 명령이 있는지 확인하는 헬퍼 메서드
   */
  private hasCommands(): boolean {
    return this.highPriorityQueue.length > 0 || this.normalPriorityQueue.length > 0 || this.lowPriorityQueue.length > 0;
  }

  /**
   * ✅ 큐 처리 로직 (연속 처리 최적화)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      this.logger?.debug(`[ModbusQueue] 이미 처리 중이므로 큐 처리 생략`);
      return;
    }

    // 처리할 명령이 있는지 확인
    const hasCommands =
      this.highPriorityQueue.length > 0 || this.normalPriorityQueue.length > 0 || this.lowPriorityQueue.length > 0;

    if (!hasCommands) {
      this.logger?.debug(`[ModbusQueue] 처리할 명령이 없음`);
      return;
    }

    this.isProcessing = true;
    const processStartTime = Date.now();
    const totalCommands =
      this.highPriorityQueue.length + this.normalPriorityQueue.length + this.lowPriorityQueue.length;
    // this.logger?.info(`[ModbusQueue] 큐 처리 시작 - 총 ${totalCommands}개 명령 (시작 시간: ${processStartTime})`);

    try {
      // ✅ 큐가 비워질 때까지 연속 처리
      while (this.hasCommands()) {
        // 1. 고우선순위 명령 처리
        await this.processPriorityQueue(this.highPriorityQueue, 'high');

        // 2. 일반 우선순위 명령 처리
        await this.processPriorityQueue(this.normalPriorityQueue, 'normal');

        // 3. 낮은 우선순위 명령 처리
        await this.processPriorityQueue(this.lowPriorityQueue, 'low');
      }
    } catch (error) {
      this.logger?.error(`[ModbusQueue] 큐 처리 중 오류: ${error}`);
    } finally {
      const processEndTime = Date.now();
      const totalProcessTime = processEndTime - processStartTime;
      // this.logger?.info(`[ModbusQueue] 큐 처리 완료 - 총 처리 시간: ${totalProcessTime}ms`);

      // 처리 시간 경고
      if (totalProcessTime > 5000) {
        this.logger?.warn(`[ModbusQueue] 큐 처리 시간 지연: ${totalProcessTime}ms`);
      }

      this.isProcessing = false;

      // ✅ 처리 완료 후 큐에 남은 명령이 있으면 다시 시작
      // if (this.hasCommands()) {
      //   this.logger?.debug(`[ModbusQueue] 큐에 남은 명령이 있어 재시작`);
      //   this.startProcessingIfNeeded();
      // }
    }
  }

  /**
   * 특정 우선순위 큐 처리
   */
  private async processPriorityQueue(queue: ModbusCommand[], priority: string): Promise<void> {
    // this.logger?.debug(`[ModbusQueue] ${priority} 우선순위 큐 처리 시작 (${queue.length}개 명령)`);
    const queueStartTime = Date.now();

    while (queue.length > 0) {
      const command = queue.shift();
      if (command) {
        try {
          const commandStartTime = Date.now();
          this.logger?.debug(`[ModbusQueue] ${priority} 명령 실행 시작: ${command.id}`);

          // 명령 실행 (실제 Modbus 통신은 외부에서 처리)
          const result = await this.executeCommand(command);

          // 성공 시 resolve 호출
          command.resolve(result);

          const commandEndTime = Date.now();
          const commandProcessTime = commandEndTime - commandStartTime;
          this.logger?.debug(`[ModbusQueue] ${priority} 명령 완료: ${command.id} (처리 시간: ${commandProcessTime}ms)`);

          // 명령 간 딜레이 (Modbus 응답 대기)
          const delayStartTime = Date.now();
          // await this.delay(1);
          const actualDelay = Date.now() - delayStartTime;
          this.logger?.debug(`[ModbusQueue] ${priority} 명령 간 딜레이: ${actualDelay}ms (설정값: 1ms)`);
        } catch (error) {
          this.logger?.error(`[ModbusQueue] ${priority} 명령 실패: ${command.id} - ${error}`);

          // 실패 시 reject 호출
          command.reject(error);
        }
      }
    }

    const queueEndTime = Date.now();
    const queueProcessTime = queueEndTime - queueStartTime;
    this.logger?.debug(`[ModbusQueue] ${priority} 우선순위 큐 처리 완료 (총 처리 시간: ${queueProcessTime}ms)`);
  }

  /**
   * 명령 실행 (실제 Modbus 통신 처리)
   */
  private async executeCommand(command: ModbusCommand): Promise<any> {
    const startTime = Date.now();

    try {
      // 🆕 실제 Modbus 통신 서비스가 설정되어 있으면 사용
      if (this.modbusCommunicationService) {
        this.logger?.debug(`[ModbusQueue] 실제 Modbus 통신 수행: ${command.id}`);

        // executeDirect 메서드를 사용하여 실제 Modbus 통신 수행
        const result = await this.modbusCommunicationService.executeDirect(command);

        const processingTime = Date.now() - startTime;
        this.logger?.debug(`[ModbusQueue] 명령 실행 완료: ${command.id} (${processingTime}ms)`);

        return {
          success: result.success,
          commandId: command.id,
          type: command.type,
          unitId: command.unitId,
          functionCode: command.functionCode,
          address: command.address,
          data: result.data,
          error: result.error,
          timestamp: result.timestamp || new Date(),
        };
      }

      // 🆕 Modbus 통신 서비스가 없으면 Mock 응답 (기존 동작 유지)
      this.logger?.warn(`[ModbusQueue] Modbus 통신 서비스가 설정되지 않음 - Mock 응답 반환: ${command.id}`);

      const result = {
        success: true,
        commandId: command.id,
        type: command.type,
        unitId: command.unitId,
        functionCode: command.functionCode,
        address: command.address,
        timestamp: new Date(),
      };

      const processingTime = Date.now() - startTime;
      this.logger?.debug(`[ModbusQueue] Mock 명령 실행 완료: ${command.id} (${processingTime}ms)`);

      return result;
    } catch (error) {
      this.logger?.error(`[ModbusQueue] 명령 실행 실패: ${command.id} - ${error}`);
      throw error;
    }
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 큐 상태 조회
   */
  getQueueStatus(): {
    highPriority: number;
    normalPriority: number;
    lowPriority: number;
    isProcessing: boolean;
    totalCommands: number;
  } {
    return {
      highPriority: this.highPriorityQueue.length,
      normalPriority: this.normalPriorityQueue.length,
      lowPriority: this.lowPriorityQueue.length,
      isProcessing: this.isProcessing,
      totalCommands: this.highPriorityQueue.length + this.normalPriorityQueue.length + this.lowPriorityQueue.length,
    };
  }

  /**
   * 특정 유닛의 큐 상태 조회
   */
  getUnitQueueStatus(unitId: string): {
    highPriority: number;
    normalPriority: number;
    lowPriority: number;
    totalCommands: number;
  } {
    const filterByUnit = (queue: ModbusCommand[]) => queue.filter((cmd) => cmd.unitId === unitId).length;

    return {
      highPriority: filterByUnit(this.highPriorityQueue),
      normalPriority: filterByUnit(this.normalPriorityQueue),
      lowPriority: filterByUnit(this.lowPriorityQueue),
      totalCommands:
        filterByUnit(this.highPriorityQueue) +
        filterByUnit(this.normalPriorityQueue) +
        filterByUnit(this.lowPriorityQueue),
    };
  }

  /**
   * 큐 정리 (테스트용)
   */
  clearQueue(): void {
    this.highPriorityQueue = [];
    this.normalPriorityQueue = [];
    this.lowPriorityQueue = [];
    this.logger?.info(`[ModbusQueue] 모든 큐가 정리되었습니다.`);
  }

  /**
   * 서비스 정리
   */
  destroy(): void {
    // ✅ setInterval 관련 코드 제거
    this.clearQueue();
    this.logger?.info(`[ModbusQueue] 서비스가 정리되었습니다.`);
  }
}
