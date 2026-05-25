/**
 * 피플카운터(d082) — 표시 필드는 client GET /data 폴링으로 채움.
 * 리셋은 POST /devices/.../commands [{ action: 'SET_RESET', value }] 경로(ControlService).
 */
import type { CommandData } from '../types';

export const peopleCounterCommands: CommandData[] = [
  {
    key: 'todayInCount',
    label: '오늘 입실',
    type: 'int',
    get: true,
    set: false,
    // todayInCount는 APC 장비 응답이 아니라 서버가 "오늘(00:00~현재, KST)"로 집계하여 data 컬렉션에 반영한다.
    // action.get은 타입 요구사항 충족 및 UI 메타데이터용이다. 하드웨어 폴링 액션으로 사용하지 않는다.
    action: { get: 'GET_TODAY_IN_COUNT' },
    min: 0,
    max: 9999999,
    unit: '명',
    defaultValue: 0,
  },
];
