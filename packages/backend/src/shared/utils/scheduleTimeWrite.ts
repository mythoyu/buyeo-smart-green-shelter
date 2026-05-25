import { executeHardwarePortWrite } from './hardwarePortWrite';

import type { IUnifiedModbusCommunication } from '../../core/interfaces/IModbusCommunication';

export const SCHEDULE_WRITE_GAP_MS = 150;

export type ScheduleTimeSlot = 'SCHED1_START' | 'SCHED1_END' | 'SCHED2_START' | 'SCHED2_END';

export const SCHEDULE_SLOT_COMMANDS: Record<ScheduleTimeSlot, { hour: string; minute: string }> = {
  SCHED1_START: { hour: 'SCHED1_START_HOUR', minute: 'SCHED1_START_MIN' },
  SCHED1_END: { hour: 'SCHED1_END_HOUR', minute: 'SCHED1_END_MIN' },
  SCHED2_START: { hour: 'SCHED2_START_HOUR', minute: 'SCHED2_START_MIN' },
  SCHED2_END: { hour: 'SCHED2_END_HOUR', minute: 'SCHED2_END_MIN' },
};

export function delayMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function writeScheduleTimePair(
  modbusService: IUnifiedModbusCommunication,
  port: string,
  slot: ScheduleTimeSlot,
  hour: number,
  minute: number,
  commandIdPrefix: string,
): Promise<{ success: true } | { success: false; error: string; failedCommand?: string }> {
  const { hour: hourCommand, minute: minuteCommand } = SCHEDULE_SLOT_COMMANDS[slot];

  const hourResult = await executeHardwarePortWrite(
    modbusService,
    port,
    hourCommand,
    hour,
    `${commandIdPrefix}_hour`,
  );
  if (!hourResult.success) {
    return { success: false, error: hourResult.error, failedCommand: hourCommand };
  }

  await delayMs(SCHEDULE_WRITE_GAP_MS);

  const minuteResult = await executeHardwarePortWrite(
    modbusService,
    port,
    minuteCommand,
    minute,
    `${commandIdPrefix}_min`,
  );
  if (!minuteResult.success) {
    return { success: false, error: minuteResult.error, failedCommand: minuteCommand };
  }

  return { success: true };
}
