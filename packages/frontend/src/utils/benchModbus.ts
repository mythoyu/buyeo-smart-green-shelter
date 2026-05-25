/** 하드웨어 온열벤치 탭 — Modbus 쓰기 레지스터 환산 (backend benchModbus.ts 와 동일) */

const REG_LIMITS = {
  contTemp: { regMin: 1800, regMax: 2800 },
  tempOffset: { regMin: 0, regMax: 200 },
  tempCheckInterval: { regMin: 0, regMax: 6000 },
} as const;

/** 설정온도: °C×10+2000 (80°C→2800, -20°C→1800) */
export function encodeBenchContTemp(celsius: number): number {
  const reg = Math.round(Number(celsius) * 10 + 2000);
  return Math.min(REG_LIMITS.contTemp.regMax, Math.max(REG_LIMITS.contTemp.regMin, reg));
}

export function encodeBenchTempOffset(value: number): number {
  const reg = Math.round(value * 10);
  return Math.min(REG_LIMITS.tempOffset.regMax, Math.max(REG_LIMITS.tempOffset.regMin, reg));
}

export function encodeBenchTempCheckInterval(seconds: number): number {
  const reg = Math.round(seconds * 10);
  return Math.min(REG_LIMITS.tempCheckInterval.regMax, Math.max(REG_LIMITS.tempCheckInterval.regMin, reg));
}
