/**
 * SNGIL DDC 레지스터 주소 상수 정의
 * Function Code별로 그룹화하여 관리
 */

// Function Code 1 (Read Coils) - DO 상태 및 제어
export const SNGIL_DO_REGISTERS = {
  // DO 상태 레지스터 (821-836)
  STATUS: {
    DO1: 821,
    DO2: 822,
    DO3: 823,
    DO4: 824,
    DO5: 825,
    DO6: 826,
    DO7: 827,
    DO8: 828,
    DO9: 829,
    DO10: 830,
    DO11: 831,
    DO12: 832,
    DO13: 833,
    DO14: 834,
    DO15: 835,
    DO16: 836,
    // 범위로도 사용 가능
    START: 821,
    END: 836,
    LENGTH: 16,
  },

  // DO 모드 레지스터 (352-367, 385-386)
  MODE: {
    DO1: 352,
    DO2: 353,
    DO3: 354,
    DO4: 355,
    DO5: 356,
    DO6: 357,
    DO7: 358,
    DO8: 359,
    DO9: 360,
    DO10: 361,
    DO11: 362,
    DO12: 363,
    DO13: 364,
    DO14: 365,
    DO15: 366,
    DO16: 367,
    DO14_EXTRA: 385,
    DO15_EXTRA: 386,
    // 범위로도 사용 가능
    START: 352,
    END: 367,
    EXTRA_START: 385,
    EXTRA_END: 386,
  },

  // DO 수동 제어 레지스터 (368-383)
  MANUAL: {
    DO1: 368,
    DO2: 369,
    DO3: 370,
    DO4: 371,
    DO5: 372,
    DO6: 373,
    DO7: 374,
    DO8: 375,
    DO9: 376,
    DO10: 377,
    DO11: 378,
    DO12: 379,
    DO13: 383, // 380-382는 건너뜀
    // 범위로도 사용 가능
    START: 368,
    END: 383,
  },

  // 스케줄 상태 레지스터 (470-490)
  SCHEDULE_STATUS: {
    START: 470,
    END: 490,
    LENGTH: 21,
  },

  // DI 기능 활성화 레지스터 (404-419)
  DI_FUNCTION: {
    START: 404,
    END: 419,
    LENGTH: 16,
  },
};

// Function Code 2 (Read Discrete Inputs) - DI 접점 상태
export const SNGIL_DI_REGISTERS = {
  // DI 접점 상태 레지스터 (449-451)
  CONTACT_STATUS: {
    DI1: 449,
    DI2: 450,
    DI3: 451,
    // 범위로도 사용 가능
    START: 449,
    END: 451,
    LENGTH: 3,
  },
};

// Function Code 3 (Read Holding Registers) - 설정값 및 데이터
export const SNGIL_HOLDING_REGISTERS = {
  // HVAC 관련 레지스터 (116-130)
  HVAC: {
    START: 116,
    END: 130,
    // 개별 주소 (122, 125는 건너뜀)
    ADDRESSES: [116, 117, 118, 119, 120, 122, 123, 124, 126, 127, 128, 129, 130],
  },

  // 전열교환기 관련 레지스터 (107-113)
  HEAT_EXCHANGER: {
    START: 107,
    END: 113,
    LENGTH: 7,
  },

  // 통합 센서 관련 레지스터 (134-141)
  INTEGRATED_SENSOR: {
    START: 134,
    END: 141,
    LENGTH: 8,
  },

  // 스케줄 설정 레지스터
  SCHEDULE: {
    // 스케줄 1-1 (DO1-DO13)
    SCHED1_1: {
      START_TIME_HOUR: {
        START: 42,
        END: 54,
        LENGTH: 13,
      },
      START_TIME_MINUTE: {
        START: 58,
        END: 70,
        LENGTH: 13,
      },
      END_TIME_HOUR: {
        START: 74,
        END: 86,
        LENGTH: 13,
      },
      END_TIME_MINUTE: {
        START: 90,
        END: 102,
        LENGTH: 13,
      },
    },

    // 스케줄 1-2 (DO1-DO4, DO14-DO15)
    SCHED1_2: {
      START_TIME_HOUR: {
        DO1: 146,
        DO2: 147,
        DO3: 148,
        DO4: 149,
        DO14: 150,
      },
      START_TIME_MINUTE: {
        DO1: 151,
        DO2: 152,
        DO3: 153,
        DO4: 154,
        DO14: 155,
      },
      END_TIME_HOUR: {
        DO1: 156,
        DO2: 157,
        DO3: 158,
        DO4: 159,
        DO14: 160,
      },
      END_TIME_MINUTE: {
        DO1: 161,
        DO2: 162,
        DO3: 163,
        DO4: 164,
        DO14: 165,
      },
      DO15: {
        START_TIME_HOUR: 167,
        START_TIME_MINUTE: 168,
        END_TIME_HOUR: 169,
        END_TIME_MINUTE: 170,
      },
    },
  },

  // 절기 설정 레지스터 (327-351)
  SEASON: {
    START: 327,
    END: 351,
    LENGTH: 25,
  },
};

// Function Code 4 (Read Input Registers) - 읽기 전용 데이터
export const SNGIL_INPUT_REGISTERS = {
  // 필요한 경우 추가
};

// 전체 레지스터 범위 요약
export const SNGIL_REGISTER_SUMMARY = {
  FUNCTION_CODE_1: {
    description: 'Read Coils - DO 상태 및 제어',
    ranges: [
      { name: 'DO_STATUS', start: 821, end: 836, length: 16 },
      { name: 'DO_MODE', start: 352, end: 367, length: 16 },
      { name: 'DO_MANUAL', start: 368, end: 383, length: 16 },
      { name: 'SCHEDULE_STATUS', start: 470, end: 490, length: 21 },
      { name: 'DI_FUNCTION', start: 404, end: 419, length: 16 },
    ],
  },
  FUNCTION_CODE_2: {
    description: 'Read Discrete Inputs - DI 접점 상태',
    ranges: [{ name: 'DI_CONTACT_STATUS', start: 449, end: 451, length: 3 }],
  },
  FUNCTION_CODE_3: {
    description: 'Read Holding Registers - 설정값 및 데이터',
    ranges: [
      { name: 'HVAC', start: 116, end: 130, length: 15 },
      { name: 'HEAT_EXCHANGER', start: 107, end: 113, length: 7 },
      { name: 'INTEGRATED_SENSOR', start: 134, end: 141, length: 8 },
      { name: 'SCHEDULE', start: 42, end: 170, length: 129 },
      { name: 'SEASON', start: 327, end: 351, length: 25 },
    ],
  },
};
