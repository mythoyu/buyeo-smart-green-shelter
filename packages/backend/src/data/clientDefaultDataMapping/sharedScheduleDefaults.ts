/**
 * 현장 공통 초기 스케줄·모드 (현장등록 initialize 시 data 컬렉션 시드)
 * - 2구간(조명): 06:30–08:00, 18:00–22:30
 * - 1구간: 06:30–22:30
 * - 자동문: 00:00–00:00, 수동(auto false), power true
 */
/** 2구간 — 조명(lighting) */
export const LIGHTING_TWO_ZONE_UNIT = {
  start_time_1: '06:30',
  start_time_1_hour: 6,
  start_time_1_minute: 30,
  end_time_1: '08:00',
  end_time_1_hour: 8,
  end_time_1_minute: 0,
  start_time_2: '18:00',
  start_time_2_hour: 18,
  start_time_2_minute: 0,
  end_time_2: '22:30',
  end_time_2_hour: 22,
  end_time_2_minute: 30,
  power: false,
  auto: true,
} as const;

/** 1구간 — 스케줄 시·분만 (power/auto는 장비별로 추가) */
export const SCHEDULE_ONE_ZONE = {
  start_time_1: '06:30',
  start_time_1_hour: 6,
  start_time_1_minute: 30,
  end_time_1: '22:30',
  end_time_1_hour: 22,
  end_time_1_minute: 30,
} as const;

export const COOLER_U001 = {
  ...SCHEDULE_ONE_ZONE,
  power: false,
  auto: true,
  mode: 3,
  speed: 4,
  summer_cont_temp: 22,
  winter_cont_temp: 24,
  cur_temp: 22,
  alarm: 0,
};

export const BENCH_U001 = {
  ...SCHEDULE_ONE_ZONE,
  power: false,
  auto: true,
  cur_temp: 24.0,
  cont_temp: 32.0,
  temp_offset: 5.0,
  temp_check_interval: 10.0,
};

export const DOOR_U001 = {
  start_time_1: '00:00',
  start_time_1_hour: 0,
  start_time_1_minute: 0,
  end_time_1: '00:00',
  end_time_1_hour: 0,
  end_time_1_minute: 0,
  power: true,
  auto: false,
};

export const PEOPLE_COUNTER_UNIT = {
  todayKey: '1970-01-01',
  todayInCount: 0,
  timestamp: '1970-01-01T00:00:00',
};

/** c0102~c0111 등 조명 u001 단일 구성 현장 */
export const standardShelterDefaults = {
  lighting: {
    u001: { ...LIGHTING_TWO_ZONE_UNIT },
  },
  cooler: {
    u001: { ...COOLER_U001 },
  },
  bench: {
    u001: { ...BENCH_U001 },
  },
  door: {
    u001: { ...DOOR_U001 },
  },
  people_counter: {
    u001: { ...PEOPLE_COUNTER_UNIT },
  },
};

/** getFallbackDeviceValues용 — 장비 타입별 단일 유닛 기본 */
export const FALLBACK_BY_DEVICE_TYPE = {
  lighting: { ...LIGHTING_TWO_ZONE_UNIT },
  cooler: { ...COOLER_U001 },
  exchanger: {
    ...SCHEDULE_ONE_ZONE,
    power: false,
    auto: true,
    mode: 0,
    speed: 1,
    alarm: 0,
  },
  aircurtain: {
    ...SCHEDULE_ONE_ZONE,
    power: false,
    auto: true,
  },
  bench: { ...BENCH_U001 },
  door: { ...DOOR_U001 },
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
    ...SCHEDULE_ONE_ZONE,
    auto: true,
  },
  people_counter: { ...PEOPLE_COUNTER_UNIT },
} as const;
