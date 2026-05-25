import { getInitialFormValues, filterCommands } from '../DeviceListShowDetail/utils';
import { Command, Device, DeviceSpec } from '../DeviceListShowDetail/types';

import {
  CommonScheduleState,
  DEFAULT_LIGHTING_SCHEDULE,
  DEFAULT_OTHER_SCHEDULE,
  LightingScheduleState,
  OtherScheduleState,
  QuickSettingsFormState,
  QuickSettingsTargetUnit,
} from './types';
import { getQuickSettingsUnitKey } from './types';

export const LIGHTING_DEVICE_TYPE = 'lighting';

export const QUICK_SETTINGS_EXCLUDED_KEYS = new Set(['power', 'auto']);
export const COMMON_SCHEDULE_KEYS = ['start_time_1', 'end_time_1', 'start_time_2', 'end_time_2'] as const;
export const TIME_FORMAT_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
export const APPLY_CONCURRENCY = 10;

/** smartcityDeviceSpecs 정의 순서 (통합센서 제외) */
export const QUICK_SETTINGS_DEVICE_TYPE_ORDER = [
  'lighting',
  'cooler',
  'exchanger',
  'aircurtain',
  'bench',
  'door',
  'externalsw',
] as const;

export function sortQuickSettingsDeviceTypes(types: string[]): string[] {
  const orderIndex = new Map(QUICK_SETTINGS_DEVICE_TYPE_ORDER.map((type, index) => [type, index]));
  return [...types].sort((a, b) => {
    const aIndex = orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

export function hasQuickSettingsCommands(deviceSpec: DeviceSpec | undefined): boolean {
  return deviceSpec?.commands?.some((cmd) => cmd.set === true && !QUICK_SETTINGS_EXCLUDED_KEYS.has(cmd.key)) ?? false;
}

export function getQuickSettingsDeviceTypes(devices: Device[], deviceSpecs: Record<string, DeviceSpec>): string[] {
  const clientTypes = new Set(devices.filter((device) => device.units && device.units.length > 0).map((device) => device.type));
  const types = [...clientTypes].filter((type) => hasQuickSettingsCommands(deviceSpecs[type]));
  return sortQuickSettingsDeviceTypes(types);
}

export function getTargetUnits(devices: Device[], deviceSpecs: Record<string, DeviceSpec>): QuickSettingsTargetUnit[] {
  const types = getQuickSettingsDeviceTypes(devices, deviceSpecs);
  const typeOrder = new Map(types.map((type, index) => [type, index]));
  const result: QuickSettingsTargetUnit[] = [];

  devices.forEach((device) => {
    if (!typeOrder.has(device.type) || !device.units?.length) {
      return;
    }

    device.units.forEach((unit) => {
      result.push({ device, unit, deviceType: device.type });
    });
  });

  return result.sort((a, b) => {
    const typeDiff = (typeOrder.get(a.deviceType) ?? 0) - (typeOrder.get(b.deviceType) ?? 0);
    if (typeDiff !== 0) {
      return typeDiff;
    }
    const deviceDiff = a.device.id.localeCompare(b.device.id);
    if (deviceDiff !== 0) {
      return deviceDiff;
    }
    return a.unit.id.localeCompare(b.unit.id);
  });
}

export function getUnitsByDeviceType(devices: Device[], deviceSpecs: Record<string, DeviceSpec>): Record<string, QuickSettingsTargetUnit[]> {
  const grouped: Record<string, QuickSettingsTargetUnit[]> = {};
  getTargetUnits(devices, deviceSpecs).forEach((entry) => {
    if (!grouped[entry.deviceType]) {
      grouped[entry.deviceType] = [];
    }
    grouped[entry.deviceType].push(entry);
  });
  return grouped;
}

export function getUnitCountByType(devices: Device[], deviceType: string): number {
  return devices
    .filter((device) => device.type === deviceType)
    .reduce((sum, device) => sum + (device.units?.length ?? 0), 0);
}

export function isLightingDeviceType(deviceType: string): boolean {
  return deviceType === LIGHTING_DEVICE_TYPE;
}

export function filterTargetUnits(
  units: QuickSettingsTargetUnit[],
  predicate: (unit: QuickSettingsTargetUnit) => boolean,
): QuickSettingsTargetUnit[] {
  return units.filter(predicate);
}

export function hasNonTimeQuickSettingsFields(deviceSpec: DeviceSpec | undefined): boolean {
  if (!deviceSpec) {
    return false;
  }
  const editable = getEditableCommands(deviceSpec.commands ?? []);
  return filterCommands(editable, 'other').length > 0;
}

/** 유닛별(시간 외) 설정이 있는 유형만 아코디언에 표시 */
export function getAccordionDeviceTypes(devices: Device[], deviceSpecs: Record<string, DeviceSpec>): string[] {
  return getQuickSettingsDeviceTypes(devices, deviceSpecs).filter((type) => hasNonTimeQuickSettingsFields(deviceSpecs[type]));
}

export function hasLightingScheduleTargets(units: QuickSettingsTargetUnit[], deviceSpecs: Record<string, DeviceSpec>): boolean {
  return units.some(({ deviceType }) => isLightingDeviceType(deviceType) && unitSpecHasScheduleFields(deviceSpecs[deviceType]));
}

export function hasOtherScheduleTargets(units: QuickSettingsTargetUnit[], deviceSpecs: Record<string, DeviceSpec>): boolean {
  return units.some(({ deviceType }) => !isLightingDeviceType(deviceType) && unitSpecHasScheduleFields(deviceSpecs[deviceType]));
}

function unitSpecHasScheduleFields(deviceSpec: DeviceSpec | undefined): boolean {
  if (!deviceSpec) {
    return false;
  }
  return deviceSpec.commands.some(
    (cmd) => cmd.key === 'start_time_1' || cmd.key === 'end_time_1' || cmd.key === 'start_time_2' || cmd.key === 'end_time_2',
  );
}

export function buildInitialForms(targetUnits: QuickSettingsTargetUnit[], deviceSpecs: Record<string, DeviceSpec>): QuickSettingsFormState {
  const forms: QuickSettingsFormState = {};

  targetUnits.forEach(({ device, unit, deviceType }) => {
    const deviceSpec = deviceSpecs[deviceType];
    if (!deviceSpec) {
      return;
    }

    forms[getQuickSettingsUnitKey(device.id, unit.id)] = getInitialFormValues(unit, deviceSpec);
  });

  return forms;
}

export function buildCommandsFromForm(form: Record<string, unknown>, deviceSpec: DeviceSpec): Array<{ action: string; value: unknown }> {
  return deviceSpec.commands
    .filter((cmd) => cmd.set && cmd.action?.set && form[cmd.key] !== undefined)
    .filter((cmd) => !QUICK_SETTINGS_EXCLUDED_KEYS.has(cmd.key))
    .map((cmd) => ({
      action: cmd.action!.set!,
      value: form[cmd.key],
    }))
    .filter((cmd) => typeof cmd.action === 'string');
}

export function countCommandsForApply(
  formsByUnit: QuickSettingsFormState,
  targetUnits: QuickSettingsTargetUnit[],
  deviceSpecs: Record<string, DeviceSpec>,
): number {
  return targetUnits.reduce((count, { device, unit, deviceType }) => {
    const spec = deviceSpecs[deviceType];
    const form = formsByUnit[getQuickSettingsUnitKey(device.id, unit.id)];
    if (!spec || !form) {
      return count;
    }
    return count + buildCommandsFromForm(form, spec).length;
  }, 0);
}

export function applyCommonScheduleToForms(
  forms: QuickSettingsFormState,
  schedule: CommonScheduleState,
  targetUnits: QuickSettingsTargetUnit[],
  deviceSpecs: Record<string, DeviceSpec>,
  options?: { applySlot2?: boolean },
): QuickSettingsFormState {
  const applySlot2 = options?.applySlot2 ?? true;
  const next: QuickSettingsFormState = { ...forms };

  targetUnits.forEach(({ device, unit, deviceType }) => {
    const spec = deviceSpecs[deviceType];
    if (!spec) {
      return;
    }

    const hasStart1 = spec.commands.some((cmd) => cmd.key === 'start_time_1');
    const hasEnd1 = spec.commands.some((cmd) => cmd.key === 'end_time_1');
    const hasStart2 = spec.commands.some((cmd) => cmd.key === 'start_time_2');
    const hasEnd2 = spec.commands.some((cmd) => cmd.key === 'end_time_2');
    if (!hasStart1 && !hasEnd1 && !hasStart2 && !hasEnd2) {
      return;
    }

    const unitKey = getQuickSettingsUnitKey(device.id, unit.id);
    next[unitKey] = { ...(next[unitKey] ?? {}) };
    if (hasStart1) {
      next[unitKey].start_time_1 = schedule.start1;
    }
    if (hasEnd1) {
      next[unitKey].end_time_1 = schedule.end1;
    }
    if (applySlot2) {
      if (hasStart2) {
        next[unitKey].start_time_2 = schedule.start2;
      }
      if (hasEnd2) {
        next[unitKey].end_time_2 = schedule.end2;
      }
    }
  });

  return next;
}

export function inferLightingSchedule(forms: QuickSettingsFormState, units: QuickSettingsTargetUnit[]): LightingScheduleState {
  const schedule = { ...DEFAULT_LIGHTING_SCHEDULE };
  const lightingUnits = filterTargetUnits(units, (u) => isLightingDeviceType(u.deviceType));

  for (const { device, unit } of lightingUnits) {
    const form = forms[getQuickSettingsUnitKey(device.id, unit.id)];
    if (typeof form?.start_time_1 === 'string' && typeof form.end_time_1 === 'string') {
      schedule.start1 = form.start_time_1;
      schedule.end1 = form.end_time_1;
      break;
    }
  }

  for (const { device, unit } of lightingUnits) {
    const form = forms[getQuickSettingsUnitKey(device.id, unit.id)];
    if (typeof form?.start_time_2 === 'string' && typeof form.end_time_2 === 'string') {
      schedule.start2 = form.start_time_2;
      schedule.end2 = form.end_time_2;
      break;
    }
  }

  return schedule;
}

export function inferOtherSchedule(forms: QuickSettingsFormState, units: QuickSettingsTargetUnit[]): OtherScheduleState {
  const schedule = { ...DEFAULT_OTHER_SCHEDULE };

  for (const { device, unit, deviceType } of units) {
    if (isLightingDeviceType(deviceType)) {
      continue;
    }
    const form = forms[getQuickSettingsUnitKey(device.id, unit.id)];
    if (!form) {
      continue;
    }
    if (typeof form.start_time_1 === 'string' && typeof form.end_time_1 === 'string') {
      schedule.start1 = form.start_time_1;
      schedule.end1 = form.end_time_1;
      break;
    }
  }

  return schedule;
}

export function getEditableCommands(commands: Command[]): Command[] {
  return commands.filter((cmd) => cmd.set === true && !QUICK_SETTINGS_EXCLUDED_KEYS.has(cmd.key));
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) {
    return [];
  }

  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) {
        break;
      }

      try {
        const value = await fn(items[currentIndex], currentIndex);
        results[currentIndex] = { status: 'fulfilled', value };
      } catch (reason) {
        results[currentIndex] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

