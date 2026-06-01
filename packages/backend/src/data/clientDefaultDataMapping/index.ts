// 클라이언트별 기본값 import
import { c0101Defaults } from './c0101';
import { c0102Defaults } from './c0102';
import { c0103Defaults } from './c0103';
import { FALLBACK_BY_DEVICE_TYPE } from './sharedScheduleDefaults';

// 디바이스별 기본 초기값 인터페이스
export interface DeviceDefaultValues {
  lighting?: {
    [unitId: string]: {
      start_time_1: string;
      start_time_1_hour: number;
      start_time_1_minute: number;
      end_time_1: string;
      end_time_1_hour: number;
      end_time_1_minute: number;
      start_time_2: string;
      start_time_2_hour: number;
      start_time_2_minute: number;
      end_time_2: string;
      end_time_2_hour: number;
      end_time_2_minute: number;
      power: boolean;
      auto: boolean;
    };
  };
  cooler?: {
    [unitId: string]: {
      start_time_1: string;
      start_time_1_hour: number;
      start_time_1_minute: number;
      end_time_1: string;
      end_time_1_hour: number;
      end_time_1_minute: number;
      power: boolean;
      auto: boolean;
      mode: number;
      speed: number;
      summer_cont_temp: number;
      winter_cont_temp: number;
      cur_temp: number;
      alarm: number;
    };
  };
  exchanger?: {
    [unitId: string]: {
      start_time_1: string;
      start_time_1_hour: number;
      start_time_1_minute: number;
      end_time_1: string;
      end_time_1_hour: number;
      end_time_1_minute: number;
      power: boolean;
      auto: boolean;
      mode: number;
      speed: number;
      alarm: number;
    };
  };
  aircurtain?: {
    [unitId: string]: {
      start_time_1: string;
      start_time_1_hour: number;
      start_time_1_minute: number;
      end_time_1: string;
      end_time_1_hour: number;
      end_time_1_minute: number;
      power: boolean;
      auto: boolean;
    };
  };
  bench?: {
    [unitId: string]: {
      start_time_1: string;
      start_time_1_hour: number;
      start_time_1_minute: number;
      end_time_1: string;
      end_time_1_hour: number;
      end_time_1_minute: number;
      power: boolean;
      auto: boolean;
      cur_temp: number;
      cont_temp: number;
      temp_offset: number;
      temp_check_interval: number;
    };
  };
  door?: {
    [unitId: string]: {
      start_time_1: string;
      start_time_1_hour: number;
      start_time_1_minute: number;
      end_time_1: string;
      end_time_1_hour: number;
      end_time_1_minute: number;
      power: boolean;
      auto: boolean;
    };
  };
  integrated_sensor?: {
    [unitId: string]: {
      pm100: number;
      pm25: number;
      pm10: number;
      co2: number;
      voc: number;
      hum: number;
      temp: number;
      alarm: number;
    };
  };
  externalsw?: {
    [unitId: string]: {
      start_time_1: string;
      start_time_1_hour: number;
      start_time_1_minute: number;
      end_time_1: string;
      end_time_1_hour: number;
      end_time_1_minute: number;
      auto: boolean;
    };
  };
  people_counter?: {
    [unitId: string]: {
      todayKey: string;
      todayInCount: number;
      timestamp: string;
    };
  };
}

// 클라이언트별 기본값 매핑
export interface ClientDefaultMapping {
  [clientId: string]: DeviceDefaultValues;
}

// 전체 클라이언트 기본값 매핑
// c0101만 조명 3유닛·피플카운터 2대, c0102~c0111은 standardShelterDefaults(조명 u001)
export const CLIENT_DEFAULT_MAPPING: ClientDefaultMapping = {
  c0101: c0101Defaults,
  c0102: c0102Defaults,
  c0103: c0103Defaults,
  c0104: c0103Defaults,
  c0105: c0103Defaults,
  c0106: c0103Defaults,
  c0107: c0103Defaults,
  c0108: c0103Defaults,
  c0109: c0103Defaults,
  c0110: c0103Defaults,
  c0111: c0103Defaults,
};

// 기본값 조회 함수
export function getClientDefaultValues(clientId: string): DeviceDefaultValues | undefined {
  return CLIENT_DEFAULT_MAPPING[clientId];
}

// 특정 디바이스의 유닛별 기본값 조회 함수
export function getDeviceDefaultValues(clientId: string, deviceType: keyof DeviceDefaultValues, unitId: string): any {
  const clientDefaults = getClientDefaultValues(clientId);
  const deviceDefaults = clientDefaults?.[deviceType];

  if (!deviceDefaults) {
    return undefined;
  }

  // 유닛별 설정 반환
  return deviceDefaults[unitId] || undefined;
}

// 기본값이 없는 경우 fallback 값 반환 (sharedScheduleDefaults 와 동일 규칙)
export function getFallbackDeviceValues(deviceType: keyof DeviceDefaultValues): any {
  return FALLBACK_BY_DEVICE_TYPE[deviceType];
}
