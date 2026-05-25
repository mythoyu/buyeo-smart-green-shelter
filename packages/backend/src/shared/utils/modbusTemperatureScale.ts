/**
 * Modbus (raw - 2000) / 10 스케일 — 장비 공통
 * - 냉난방기: GET_CUR_TEMP → field `cur_temp`
 * - 온열벤치: GET_CUR_TEMP → field `cur_temp`
 * - 통합센서: GET_TEMP → field `temp`
 */
export function decodeCoolerBenchIntegratedSensorTemp(raw: number): number {
  return (raw - 2000) / 10;
}

export function encodeCoolerBenchIntegratedSensorTemp(celsius: number): number {
  return Math.round(Number(celsius) * 10 + 2000);
}
