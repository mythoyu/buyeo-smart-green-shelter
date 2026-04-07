import { IDevice } from '../../models/schemas/DeviceSchema';
import { IUnit } from '../../models/schemas/UnitSchema';

import { CommandPayload, CommandResult } from './interfaces/IControlService';
import { IControlService } from './interfaces/IControlService';

export interface CommandExecutionStrategy {
  execute(
    unit: IUnit,
    device: IDevice,
    commands: CommandPayload[],
    controlService: IControlService,
    request?: any,
  ): Promise<CommandResult[]>;
}

/**
 * 순차 실행 전략 (기본값)
 */
export class SequentialExecutionStrategy implements CommandExecutionStrategy {
  async execute(
    unit: IUnit,
    device: IDevice,
    commands: CommandPayload[],
    controlService: IControlService,
    request?: any,
  ): Promise<CommandResult[]> {
    const results: CommandResult[] = [];

    for (const cmd of commands) {
      const result = await controlService.executeUnitCommand(unit, device, cmd.action, cmd.value, request);
      results.push(result);
    }

    return results;
  }
}

/**
 * 병렬 실행 전략 (제한된 동시성)
 */
export class ParallelExecutionStrategy implements CommandExecutionStrategy {
  constructor(private maxConcurrency: number = 3) {}

  async execute(
    unit: IUnit,
    device: IDevice,
    commands: CommandPayload[],
    controlService: IControlService,
    request?: any,
  ): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    const chunks = this.chunkArray(commands, this.maxConcurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map((cmd) =>
        controlService.executeUnitCommand(unit, device, cmd.action, cmd.value, request),
      );

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * 전략 팩토리
 */
export class CommandExecutionStrategyFactory {
  static createStrategy(type: 'sequential' | 'parallel', maxConcurrency?: number): CommandExecutionStrategy {
    switch (type) {
      case 'parallel':
        return new ParallelExecutionStrategy(maxConcurrency);
      case 'sequential':
      default:
        return new SequentialExecutionStrategy();
    }
  }
}
