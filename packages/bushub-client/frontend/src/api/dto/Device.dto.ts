import { UnitValue } from '../../types/database';

// 장비 제어 요청 DTO
export interface UnitCommandRequestDto {
  action: string;
  value?: UnitValue;
}

// 장비 제어 응답 DTO
export interface UnitCommandResponseDto {
  _id: string;
  result?: UnitValue;
}

// 대량제어 요청 DTO
export interface UnitBulkCommandRequestDto {
  action: string;
  value?: UnitValue;
}

// 대량제어 응답 DTO
export interface UnitBulkCommandResponseDto {
  action: string;
  requestId: string;
}

// 대량제어 상태조회 응답 DTO
export interface UnitBulkCommandStatusDto {
  requestId: string;
  action: string;
  status: 'waiting' | 'success' | 'fail';
  error?: string;
  finishedAt?: string;
  result?: UnitValue;
}
