import { HW_PORTS } from '../../meta/hardware/ports';
import { ILogger } from '../../shared/interfaces/ILogger';

import { ModbusCommand } from './ModbusCommandQueue';
import { UnifiedModbusService } from './UnifiedModbusService';

/**
 * 하드웨어 제어 서비스
 * HARDWARE_PORTS를 활용하여 승일 DDC 하드웨어를 제어
 */
export class HardwareControlService {
  constructor(private unifiedModbusService: UnifiedModbusService, private logger?: ILogger) {
    this.logger?.debug('[HardwareControlService] 하드웨어 제어 서비스 초기화 완료');
  }

  /**
   * HARDWARE_PORTS를 활용한 하드웨어 제어
   */
  async executeAction(
    port: string,
    action: string,
    operation: 'set' | 'get',
    value?: any,
    clientId?: string,
  ): Promise<any> {
    try {
      this.logger?.info(
        `[HardwareControlService] 하드웨어 제어 실행: ${port}.${action}.${operation}${
          value !== undefined ? ` = ${value}` : ''
        }`,
      );

      // HARDWARE_PORTS에서 포트 정보 조회
      const portConfig = HW_PORTS[port as keyof typeof HW_PORTS];
      if (!portConfig) {
        throw new Error(`포트 ${port}를 찾을 수 없습니다.`);
      }

      // 액션 정보 조회
      const actionConfig = portConfig[action as keyof typeof portConfig];
      if (!actionConfig) {
        throw new Error(`포트 ${port}의 액션 ${action}을 찾을 수 없습니다.`);
      }

      // 작업 타입에 따른 설정 조회
      const operationConfig = actionConfig[operation as keyof typeof actionConfig];
      if (!operationConfig) {
        throw new Error(`포트 ${port}.${action}의 ${operation} 작업을 찾을 수 없습니다.`);
      }

      // 🆕 타입 가드를 사용하여 HardwarePortCommand인지 확인
      if (
        !operationConfig ||
        typeof operationConfig !== 'object' ||
        !('functionCode' in operationConfig) ||
        !('address' in operationConfig)
      ) {
        throw new Error(`포트 ${port}.${action}.${operation}의 설정이 올바르지 않습니다.`);
      }

      // 🆕 타입 단언을 사용하여 TypeScript 타입 에러 해결
      const safeOperationConfig = operationConfig as { functionCode: number; address: number; description: string };

      // ModbusCommand 생성
      const command: ModbusCommand = {
        id: `hw_${port}_${action}_${operation}_${Date.now()}`,
        type: operation === 'set' ? 'write' : 'read',
        unitId: 'default',
        functionCode: safeOperationConfig.functionCode,
        address: safeOperationConfig.address,
        lengthOrValue: operation === 'set' ? value || 0 : 1, // 읽기는 길이 1, 쓰기는 값
        priority: operation === 'set' ? 'high' : 'normal', // 제어는 높은 우선순위, 읽기는 일반 우선순위
        timestamp: new Date(),
        resolve: () => {
          // Placeholder for queue resolution
        },
        reject: () => {
          // Placeholder for queue resolution
        },
        ...(clientId !== undefined ? { clientId } : {}),
      };

      this.logger?.info(
        `[HardwareControlService] Modbus 명령 생성: ${command.type} ${command.functionCode} ${command.address}`,
      );

      // 중앙 Queue를 통해 명령 실행
      const result = await this.unifiedModbusService.executeCommand(command);

      this.logger?.info(`[HardwareControlService] 하드웨어 제어 성공: ${port}.${action}.${operation}`);
      return result;
    } catch (error) {
      this.logger?.error(
        `[HardwareControlService] 하드웨어 제어 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * 배치 읽기 기능
   */
  async batchRead(ports: string[]): Promise<Record<string, any>> {
    try {
      this.logger?.info(`[HardwareControlService] 배치 읽기 시작: ${ports.length}개 포트`);

      const results: Record<string, any> = {};

      for (const port of ports) {
        try {
          // 🆕 포트 설정 조회
          const portConfig = HW_PORTS[port as keyof typeof HW_PORTS];
          if (!portConfig) {
            results[port] = { error: `포트 ${port}를 찾을 수 없습니다.` };
            this.logger?.warn(`[HardwareControlService] 포트 ${port}를 찾을 수 없습니다.`);
            continue;
          }

          // 🆕 사용 가능한 액션 찾기 (STATUS 또는 MODE)
          let actionToUse = 'MODE'; // 기본값
          if ('STATUS' in portConfig && portConfig.STATUS) {
            actionToUse = 'STATUS';
          } else if ('MODE' in portConfig && portConfig.MODE) {
            actionToUse = 'MODE';
          } else {
            // 사용 가능한 첫 번째 액션 사용
            const availableActions = Object.keys(portConfig);
            if (availableActions.length > 0) {
              actionToUse = availableActions[0];
            } else {
              results[port] = { error: `포트 ${port}에 사용 가능한 액션이 없습니다.` };
              continue;
            }
          }

          const result = await this.executeAction(port, actionToUse, 'get');
          results[port] = result;
        } catch (error) {
          results[port] = { error: error instanceof Error ? error.message : String(error) };
          this.logger?.warn(
            `[HardwareControlService] 포트 ${port} 읽기 실패: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      this.logger?.info(`[HardwareControlService] 배치 읽기 완료: ${Object.keys(results).length}개 포트`);
      return results;
    } catch (error) {
      this.logger?.error(
        `[HardwareControlService] 배치 읽기 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * 특정 포트의 모든 액션 정보 조회
   */
  getPortInfo(port: string): any {
    try {
      const portConfig = HW_PORTS[port as keyof typeof HW_PORTS];
      if (!portConfig) {
        throw new Error(`포트 ${port}를 찾을 수 없습니다.`);
      }

      return {
        port,
        actions: Object.keys(portConfig),
        config: portConfig,
      };
    } catch (error) {
      this.logger?.error(
        `[HardwareControlService] 포트 정보 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * 사용 가능한 모든 포트 목록 조회
   */
  getAvailablePorts(): string[] {
    return Object.keys(HW_PORTS);
  }

  /**
   * 특정 포트의 특정 액션 정보 조회
   */
  getActionInfo(port: string, action: string): any {
    try {
      const portConfig = HW_PORTS[port as keyof typeof HW_PORTS];
      if (!portConfig) {
        throw new Error(`포트 ${port}를 찾을 수 없습니다.`);
      }

      const actionConfig = portConfig[action as keyof typeof portConfig];
      if (!actionConfig) {
        throw new Error(`포트 ${port}의 ${action} 액션을 찾을 수 없습니다.`);
      }

      return {
        port,
        action,
        config: actionConfig,
      };
    } catch (error) {
      this.logger?.error(
        `[HardwareControlService] 액션 정보 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
