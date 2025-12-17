// 클라이언트별 기본값 import
import { c0101Defaults } from './c0101';
import { c0102Defaults } from './c0102';

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
}

// 클라이언트별 기본값 매핑
export interface ClientDefaultMapping {
  [clientId: string]: DeviceDefaultValues;
}

// 전체 클라이언트 기본값 매핑
export const CLIENT_DEFAULT_MAPPING: ClientDefaultMapping = {
  c0101: c0101Defaults,
  c0102: c0102Defaults,
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

// 기본값이 없는 경우 fallback 값 반환
export function getFallbackDeviceValues(deviceType: keyof DeviceDefaultValues): any {
  const fallbackValues = {
    lighting: {
      start_time_1: '07:00',
      start_time_1_hour: 7,
      start_time_1_minute: 0,
      end_time_1: '09:00',
      end_time_1_hour: 9,
      end_time_1_minute: 0,
      start_time_2: '18:00',
      start_time_2_hour: 18,
      start_time_2_minute: 0,
      end_time_2: '22:00',
      end_time_2_hour: 22,
      end_time_2_minute: 0,
      power: false,
      auto: true,
    },
    cooler: {
      start_time_1: '07:00',
      start_time_1_hour: 7,
      start_time_1_minute: 0,
      end_time_1: '22:00',
      end_time_1_hour: 22,
      end_time_1_minute: 0,
      power: false,
      auto: true,
      mode: 0,
      speed: 1,
      summer_cont_temp: 25,
      winter_cont_temp: 25,
      cur_temp: 22,
      alarm: 0,
    },
    exchanger: {
      start_time_1: '07:00',
      start_time_1_hour: 7,
      start_time_1_minute: 0,
      end_time_1: '22:00',
      end_time_1_hour: 22,
      end_time_1_minute: 0,
      power: false,
      auto: true,
      mode: 0,
      speed: 1,
      alarm: 0,
    },
    aircurtain: {
      start_time_1: '07:00',
      start_time_1_hour: 7,
      start_time_1_minute: 0,
      end_time_1: '22:00',
      end_time_1_hour: 22,
      end_time_1_minute: 0,
      power: false,
      auto: true,
    },
    bench: {
      start_time_1: '07:00',
      start_time_1_hour: 7,
      start_time_1_minute: 0,
      end_time_1: '22:00',
      end_time_1_hour: 22,
      end_time_1_minute: 0,
      power: false,
      auto: true,
    },
    door: {
      start_time_1: '07:00',
      start_time_1_hour: 7,
      start_time_1_minute: 0,
      end_time_1: '22:00',
      end_time_1_hour: 22,
      end_time_1_minute: 0,
      power: false,
      auto: true,
    },
    integrated_sensor: {
      pm100: 25,
      pm25: 12,
      pm10: 35,
      co2: 450,
      voc: 50,
      hum: 60,
      temp: 22,
      alarm: 0,
    },
    externalsw: {
      start_time_1: '07:00',
      start_time_1_hour: 7,
      start_time_1_minute: 0,
      end_time_1: '22:00',
      end_time_1_hour: 22,
      end_time_1_minute: 0,
      auto: true,
    },
  };

  return fallbackValues[deviceType];
}
