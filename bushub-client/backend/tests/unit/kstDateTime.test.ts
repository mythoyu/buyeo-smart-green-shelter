import {
  exclusiveEndOfKstDayFromYmd,
  formatKstLocal,
  parseApiDateTimeToUtc,
  startOfKstDayFromYmd,
} from '../../src/shared/utils/kstDateTime';

describe('kstDateTime', () => {
  it('무오프셋 문자열은 KST 벽시계로 파싱한다', () => {
    const d = parseApiDateTimeToUtc('2024-06-15T15:30:00');
    expect(d.toISOString()).toBe('2024-06-15T06:30:00.000Z');
  });

  it('Z 접미 ISO는 instant로 파싱한다', () => {
    const d = parseApiDateTimeToUtc('2024-06-15T06:30:00.000Z');
    expect(d.toISOString()).toBe('2024-06-15T06:30:00.000Z');
  });

  it('KST 달력일 자정 범위', () => {
    const start = startOfKstDayFromYmd('2024-01-02');
    const end = exclusiveEndOfKstDayFromYmd('2024-01-02');
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(formatKstLocal(start)).toMatch(/^2024-01-02T00:00:00$/);
  });
});
