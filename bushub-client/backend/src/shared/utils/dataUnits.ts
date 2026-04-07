import type { IUnitData } from '../../models/schemas/DataSchema';

export type UnitsLike = IUnitData[] | Record<string, IUnitData> | undefined | null;

export function toUnitsArray(units: UnitsLike): IUnitData[] {
  if (!units) return [];
  if (Array.isArray(units)) return units;
  return Object.values(units);
}

export function getUnit(units: UnitsLike, unitId: string): IUnitData | undefined {
  if (!units) return undefined;
  if (Array.isArray(units)) return units.find((u) => u.unitId === unitId);
  return units[unitId];
}

