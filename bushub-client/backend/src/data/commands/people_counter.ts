/**
 * 피플카운터(d082) — 표시 필드는 client GET /data 폴링으로 채움.
 * 리셋은 POST /devices/.../commands [{ action: 'SET_RESET', value }] 경로(ControlService).
 */
import type { CommandData } from '../types';

export const peopleCounterCommands: CommandData[] = [
  {
    key: 'currentCount',
    label: '현재 인원',
    type: 'int',
    get: true,
    set: false,
    action: { get: 'GET_CURRENT_COUNT' },
    min: 0,
    max: 999999,
    unit: '명',
    defaultValue: 0,
  },
  {
    key: 'inCumulative',
    label: '입실 누적',
    type: 'int',
    get: true,
    set: false,
    action: { get: 'GET_IN_CUMULATIVE' },
    min: 0,
    max: 9999999,
    unit: '명',
    defaultValue: 0,
  },
  {
    key: 'outCumulative',
    label: '퇴실 누적',
    type: 'int',
    get: true,
    set: false,
    action: { get: 'GET_OUT_CUMULATIVE' },
    min: 0,
    max: 9999999,
    unit: '명',
    defaultValue: 0,
  },
];
