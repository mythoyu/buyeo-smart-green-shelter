/**
 * 냉난방기 Modbus alarm 값 ↔ 설명 (ErrorService.generateAlarmErrorDescription 과 동기)
 * CH01 → alarm=1 → e101
 */
export const COOLER_ALARM_CODE_MAP: Record<number, string> = {
  1: '실내 온도센서 Open/Short',
  2: '실내 입구 배관센서 Open/Short',
  3: '리모컨 통신 불량',
  4: '드레인 펌프 불량',
  5: '통신 불량 (실내기 ↔ 실외기)',
  6: '실내 출구 배관센서 Open/Short',
  9: '옵션 PCB 에러',
  10: '실내팬 구속(동작 불량)',
  21: '인버터 압축기 IPM Fault',
  22: 'CT 2 (Max CT/입력 과전류)',
  23: 'DC Link 저전압 에러',
  24: '고압/저압/방열판 SW',
  25: '저전압/과전압',
  26: 'DC Comp 위치감지 에러',
  27: 'PFC Fault',
  28: 'DC Link 고전압 에러',
  29: 'Comp 상 과전류 에러',
  32: '토출 배관 과열 에러',
  35: '압축기 입구 압력 과다 하락',
  38: '냉매 누설 감지',
  40: 'CT 센서 에러 (Open / Short)',
  41: 'Comp 토출 온도 센서 에러',
  43: '압력센서 개방/단락',
  44: '실외 흡입 온도 센서 에러',
  45: '실외 중간 배관 온도 센서 에러',
  46: 'Comp 흡입 온도 센서 에러',
  47: '인젝션 출구 온도 센서 에러',
  48: '실외 출구 배관 센서 에러',
  51: '과접속대수(용량)',
  52: 'Inv ↔ Main PCB통신에러',
  53: '통신 에러 (실외기 ↔ 실내기)',
  54: '역/결상 감지 에러',
  60: 'EEPROM Check Sum 에러',
  61: '응축기 과열 에러',
  62: '방열판 과열 에러',
  65: '방열판 센서 에러 (Open / Short)',
  67: '실외기 팬 구속 에러',
  92: '시운전 미실시 에러',
  93: '시운전 시 SVC Valve 막힘',
  94: '시운전 시 냉매 없음 감지',
};

export const COOLER_ALARM_CODE_ROWS = Object.entries(COOLER_ALARM_CODE_MAP)
  .map(([code, description]) => ({ code: Number(code), description }))
  .sort((a, b) => a.code - b.code);

export function formatCoolerAlarmDashboardValue(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) {
    return '정상';
  }
  return String(Math.round(n));
}

export function getCoolerAlarmDescription(code: number): string {
  return COOLER_ALARM_CODE_MAP[code] ?? `알 수 없는 오류 (${code})`;
}
