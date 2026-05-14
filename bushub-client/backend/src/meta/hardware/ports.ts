/**
 * 하드웨어 포트 정의
 * 모든 DO/DI/HVAC/스케줄 포트의 GET/SET을 통합하여 정의
 *
 * 📌 Modbus 주소 체계
 * - SNGIL_DDC_MODBUS_PACKETS.md와 완벽 동기화
 * - 0-based addressing 사용 (Modbus 프로토콜 표준)
 * - 1-based → 0-based 변환: Modbus frame address = Document address - 1
 *
 * 📋 레지스터 타입별 Function Code
 * - 0x Coil: 05 (Write Single Coil), 01 (Read Coils) - DO 제어, 절기 설정, DI 기능 활성화
 * - 1x Discrete Input: 02 (Read Discrete Inputs) - DI 상태 읽기
 * - 3x Input Register: 04 (Read Input Registers) - 센서 데이터 읽기
 * - 4x Holding Register: 06 (Write Single Register), 03 (Read Holding Registers) - 스케줄, 딜레이타임, DDC 시간
 */

// Modbus Function Code 상수는 @modbusConstants.ts에서 참조
// import { MODBUS_FC } from '../constants/modbusConstants';

// Modbus Function Codes
export const MODBUS_FC = {
  RD_COILS: 1, // 0x01 - DO/DI 상태 읽기 (1x 레지스터)
  RD_DIS_INPUTS: 2, // 0x02 - DI 상태 읽기 (2x 레지스터)
  RD_HLD_REG: 3, // 0x03 - 4x 레지스터 읽기
  RD_INPUT_REG: 4, // 0x04 - 3x 레지스터 읽기
  WR_SNGL_COIL: 5, // 0x05 - 단일 DO 설정
  WR_SNGL_REG: 6, // 0x06 - 단일 레지스터 쓰기
  WR_MULTI_COILS: 15, // 0x0F - 여러 DO 일괄 설정
  WR_MULTI_REG: 16, // 0x10 - 여러 레지스터 일괄 쓰기
} as const;

// 하드웨어 포트 명령어 인터페이스
export interface HardwarePortCommand {
  functionCode: number;
  address: number;
  description: string;
  length?: number;
}

// GET/SET 통합 포트 명령어 인터페이스
export interface PortCommand {
  set?: HardwarePortCommand;
  get?: HardwarePortCommand;
}

// 모든 하드웨어 포트 정의
export const HW_PORTS = {
  // 📋 주소 매핑 테이블 (SNGIL_DDC_MODBUS_PACKETS.md와 일치)
  //
  // 🎯 DO 제어 (Coil 기반 - 0x 레지스터)
  // DO1: 모드(351), 수동제어(367), 상태(820) | 스케줄1: 시작시간(41), 시작분(57), 종료시간(73), 종료분(89) | 스케줄2: 시작시간(145), 시작분(150), 종료시간(155), 종료분(160)
  // DO2: 모드(352), 수동제어(368), 상태(821) | 스케줄1: 시작시간(42), 시작분(58), 종료시간(74), 종료분(90) | 스케줄2: 시작시간(146), 시작분(151), 종료시간(156), 종료분(161)
  // DO3: 모드(353), 수동제어(369), 상태(822) | 스케줄1: 시작시간(43), 시작분(59), 종료시간(75), 종료분(91) | 스케줄2: 시작시간(147), 시작분(152), 종료시간(157), 종료분(162)
  // DO4: 모드(354), 수동제어(370), 상태(823) | 스케줄1: 시작시간(44), 시작분(60), 종료시간(76), 종료분(92) | 스케줄2: 시작시간(148), 시작분(153), 종료시간(158), 종료분(163)
  // DO5: 모드(355), 수동제어(371), 상태(824) | 스케줄1: 시작시간(45), 시작분(61), 종료시간(77), 종료분(93)
  // DO6: 모드(356), 수동제어(372), 상태(825) | 스케줄1: 시작시간(46), 시작분(62), 종료시간(78), 종료분(94)
  // DO7: 모드(357), 수동제어(373), 상태(826) | 스케줄1: 시작시간(47), 시작분(63), 종료시간(79), 종료분(95)
  // DO8: 모드(358), 수동제어(374), 상태(827) | 스케줄1: 시작시간(48), 시작분(64), 종료시간(80), 종료분(96)
  // DO9: 모드(359), 수동제어(375), 상태(828) | 스케줄1: 시작시간(49), 시작분(65), 종료시간(81), 종료분(97)
  // DO10: 모드(360), 수동제어(376), 상태(829) | 스케줄1: 시작시간(50), 시작분(66), 종료시간(82), 종료분(98)
  // DO11: 모드(361), 수동제어(377), 상태(830) | 스케줄1: 시작시간(51), 시작분(67), 종료시간(83), 종료분(99)
  // DO12: 모드(362), 수동제어(378), 상태(831) | 스케줄1: 시작시간(52), 시작분(68), 종료시간(84), 종료분(100)
  // DO13: 모드(363), 수동제어(382), 상태(832) | 스케줄1: 시작시간(53), 시작분(69), 종료시간(85), 종료분(101)
  // DO14: 모드(364), 수동제어(384), 상태(833) | 스케줄1: 시작시간(149), 시작분(154), 종료시간(159), 종료분(164)
  // DO15: 모드(365), 수동제어(385), 상태(834) | 스케줄1: 시작시간(166), 시작분(167), 종료시간(168), 종료분(169)
  // DO16: 모드(366), 수동제어(386), 상태(835) | 스케줄1: 시작시간(552), 시작분(553), 종료시간(554), 종료분(555)
  //
  // 🎯 DI 기능 (Coil 기반 - 0x 레지스터)
  // DI1-DI16: 기능활성화(403-418)
  //
  // 🎯 절기 설정 (Coil 기반 - 0x 레지스터)
  // 계절선택(326), 월별하절기(327-338), 자동계절판단(339-350)
  //
  // 🎯 DI 딜레이타임 (Holding Register 기반 - 4x 레지스터)
  // DI13(32), DI14(33), DI15(34)
  //
  // 🎯 DI 상태 읽기 (Discrete Input 기반 - 1x 레지스터)
  // DI1-DI16: 접점상태(99-114)
  //
  // 🎯 DDC 시간 (Holding Register 기반 - 4x 레지스터)
  // 년(1), 월(2), 일(3), 시(4), 분(5)
  //
  // 🎯 통합센서 (Holding Register 기반 - 4x 레지스터)
  // PM1.0(133), PM2.5(134), PM10(135), CO2(136), VOC(137), 온도(131), 습도(139), 알람(140)
  //
  // 🎯 냉난방기 (Holding Register 기반 - 4x 레지스터)
  // 모드(128), 전원(127), 속도(129), 여름온도(125), 겨울온도(126), 현재온도(119)
  //
  // 🎯 전열교환기 (Holding Register 기반 - 4x 레지스터)
  // 속도(111), 모드(112), 전원(113), 필터알람(108)
  //

  // DO 포트들 (DO1~DO16)
  DO1: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 351, description: 'DO1 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 351, description: 'DO1 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 367, description: 'DO1 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 820, description: 'DO1 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 820, description: 'DO1 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 41,
        description: 'DO1 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 41,
        description: 'DO1 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 57,
        description: 'DO1 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 57,
        description: 'DO1 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 73,
        description: 'DO1 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 73,
        description: 'DO1 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 89,
        description: 'DO1 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 89,
        description: 'DO1 스케줄1 종료분',
      },
    },
    SCHED2_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 145,
        description: 'DO1 스케줄2 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 145,
        description: 'DO1 스케줄2 시작시간',
      },
    },
    SCHED2_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 150,
        description: 'DO1 스케줄2 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 150,
        description: 'DO1 스케줄2 시작분',
      },
    },
    SCHED2_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 155,
        description: 'DO1 스케줄2 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 155,
        description: 'DO1 스케줄2 종료시간',
      },
    },
    SCHED2_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 160,
        description: 'DO1 스케줄2 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 160,
        description: 'DO1 스케줄2 종료분',
      },
    },
  },

  DO2: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 352, description: 'DO2 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 352, description: 'DO2 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 368, description: 'DO2 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 821, description: 'DO2 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 821, description: 'DO2 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 42,
        description: 'DO2 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 42,
        description: 'DO2 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 58,
        description: 'DO2 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 58,
        description: 'DO2 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 74,
        description: 'DO2 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 74,
        description: 'DO2 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 90,
        description: 'DO2 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 90,
        description: 'DO2 스케줄1 종료분',
      },
    },
    SCHED2_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 146,
        description: 'DO2 스케줄2 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 146,
        description: 'DO2 스케줄2 시작시간',
      },
    },
    SCHED2_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 151,
        description: 'DO2 스케줄2 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 151,
        description: 'DO2 스케줄2 시작분',
      },
    },
    SCHED2_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 156,
        description: 'DO2 스케줄2 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 156,
        description: 'DO2 스케줄2 종료시간',
      },
    },
    SCHED2_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 161,
        description: 'DO2 스케줄2 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 161,
        description: 'DO2 스케줄2 종료분',
      },
    },
  },

  DO3: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 353, description: 'DO3 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 353, description: 'DO3 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 369, description: 'DO3 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 822, description: 'DO3 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 822, description: 'DO3 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 43,
        description: 'DO3 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 43,
        description: 'DO3 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 59,
        description: 'DO3 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 59,
        description: 'DO3 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 75,
        description: 'DO3 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 75,
        description: 'DO3 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 91,
        description: 'DO3 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 91,
        description: 'DO3 스케줄1 종료분',
      },
    },
    SCHED2_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 147,
        description: 'DO3 스케줄2 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 147,
        description: 'DO3 스케줄2 시작시간',
      },
    },
    SCHED2_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 152,
        description: 'DO3 스케줄2 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 152,
        description: 'DO3 스케줄2 시작분',
      },
    },
    SCHED2_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 157,
        description: 'DO3 스케줄2 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 157,
        description: 'DO3 스케줄2 종료시간',
      },
    },
    SCHED2_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 162,
        description: 'DO3 스케줄2 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 162,
        description: 'DO3 스케줄2 종료분',
      },
    },
  },

  DO4: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 354, description: 'DO4 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 354, description: 'DO4 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 370, description: 'DO4 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 823, description: 'DO4 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 823, description: 'DO4 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 44,
        description: 'DO4 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 44,
        description: 'DO4 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 60,
        description: 'DO4 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 60,
        description: 'DO4 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 76,
        description: 'DO4 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 76,
        description: 'DO4 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 92,
        description: 'DO4 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 92,
        description: 'DO4 스케줄1 종료분',
      },
    },
    SCHED2_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 148,
        description: 'DO4 스케줄2 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 148,
        description: 'DO4 스케줄2 시작시간',
      },
    },
    SCHED2_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 153,
        description: 'DO4 스케줄2 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 153,
        description: 'DO4 스케줄2 시작분',
      },
    },
    SCHED2_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 158,
        description: 'DO4 스케줄2 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 158,
        description: 'DO4 스케줄2 종료시간',
      },
    },
    SCHED2_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 163,
        description: 'DO4 스케줄2 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 163,
        description: 'DO4 스케줄2 종료분',
      },
    },
  },

  DO5: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 355, description: 'DO5 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 355, description: 'DO5 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 371, description: 'DO5 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 824, description: 'DO5 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 824, description: 'DO5 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 45,
        description: 'DO5 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 45,
        description: 'DO5 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 61,
        description: 'DO5 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 61,
        description: 'DO5 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 77,
        description: 'DO5 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 77,
        description: 'DO5 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 93,
        description: 'DO5 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 93,
        description: 'DO5 스케줄1 종료분',
      },
    },
  },

  DO6: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 356, description: 'DO6 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 356, description: 'DO6 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 372, description: 'DO6 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 825, description: 'DO6 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 825, description: 'DO6 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 46,
        description: 'DO6 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 46,
        description: 'DO6 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 62,
        description: 'DO6 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 62,
        description: 'DO6 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 78,
        description: 'DO6 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 78,
        description: 'DO6 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 94,
        description: 'DO6 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 94,
        description: 'DO6 스케줄1 종료분',
      },
    },
  },

  DO7: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 357, description: 'DO7 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 357, description: 'DO7 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 373, description: 'DO7 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 826, description: 'DO7 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 826, description: 'DO7 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 47,
        description: 'DO7 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 47,
        description: 'DO7 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 63,
        description: 'DO7 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 63,
        description: 'DO7 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 79,
        description: 'DO7 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 79,
        description: 'DO7 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 95,
        description: 'DO7 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 95,
        description: 'DO7 스케줄1 종료분',
      },
    },
  },

  DO8: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 358, description: 'DO8 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 358, description: 'DO8 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 374, description: 'DO8 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 827, description: 'DO8 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 827, description: 'DO8 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 48,
        description: 'DO8 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 48,
        description: 'DO8 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 64,
        description: 'DO8 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 64,
        description: 'DO8 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 80,
        description: 'DO8 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 80,
        description: 'DO8 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 96,
        description: 'DO8 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 96,
        description: 'DO8 스케줄1 종료분',
      },
    },
  },

  DO9: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 359, description: 'DO9 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 359, description: 'DO9 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 375, description: 'DO9 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 828, description: 'DO9 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 828, description: 'DO9 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 49,
        description: 'DO9 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 49,
        description: 'DO9 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 65,
        description: 'DO9 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 65,
        description: 'DO9 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 81,
        description: 'DO9 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 81,
        description: 'DO9 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 97,
        description: 'DO9 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 97,
        description: 'DO9 스케줄1 종료분',
      },
    },
  },

  DO10: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 360, description: 'DO10 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 360, description: 'DO10 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 376, description: 'DO10 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 829, description: 'DO10 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 829, description: 'DO10 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 50,
        description: 'DO10 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 50,
        description: 'DO10 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 66,
        description: 'DO10 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 66,
        description: 'DO10 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 82,
        description: 'DO10 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 82,
        description: 'DO10 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 98,
        description: 'DO10 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 98,
        description: 'DO10 스케줄1 종료분',
      },
    },
  },

  DO11: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 361, description: 'DO11 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 361, description: 'DO11 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 377, description: 'DO11 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 830, description: 'DO11 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 830, description: 'DO11 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 52,
        description: 'DO11 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 52,
        description: 'DO11 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 68,
        description: 'DO11 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 68,
        description: 'DO11 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 84,
        description: 'DO11 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 84,
        description: 'DO11 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 100,
        description: 'DO11 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 100,
        description: 'DO11 스케줄1 종료분',
      },
    },
  },

  DO12: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 362, description: 'DO12 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 362, description: 'DO12 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 378, description: 'DO12 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 831, description: 'DO12 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 831, description: 'DO12 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 51,
        description: 'DO12 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 51,
        description: 'DO12 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 67,
        description: 'DO12 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 67,
        description: 'DO12 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 83,
        description: 'DO12 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 83,
        description: 'DO12 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 99,
        description: 'DO12 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 99,
        description: 'DO12 스케줄1 종료분',
      },
    },
  },

  DO13: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 363, description: 'DO13 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 363, description: 'DO13 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 387, description: 'DO13 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 832, description: 'DO13 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 832, description: 'DO13 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 53,
        description: 'DO13 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 53,
        description: 'DO13 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 69,
        description: 'DO13 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 69,
        description: 'DO13 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 85,
        description: 'DO13 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 85,
        description: 'DO13 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 101,
        description: 'DO13 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 101,
        description: 'DO13 스케줄1 종료분',
      },
    },
  },

  DO14: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 384, description: 'DO14 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 384, description: 'DO14 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 388, description: 'DO14 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 833, description: 'DO14 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 833, description: 'DO14 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 149,
        description: 'DO14 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 149,
        description: 'DO14 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 154,
        description: 'DO14 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 154,
        description: 'DO14 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 159,
        description: 'DO14 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 159,
        description: 'DO14 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 164,
        description: 'DO14 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 164,
        description: 'DO14 스케줄1 종료분',
      },
    },
  },

  DO15: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 385, description: 'DO15 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 385, description: 'DO15 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 389, description: 'DO15 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 834, description: 'DO15 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 834, description: 'DO15 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 166,
        description: 'DO15 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 166,
        description: 'DO15 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 167,
        description: 'DO15 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 167,
        description: 'DO15 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 168,
        description: 'DO15 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 168,
        description: 'DO15 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 169,
        description: 'DO15 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 169,
        description: 'DO15 스케줄1 종료분',
      },
    },
  },

  DO16: {
    AUTO: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 366, description: 'DO16 수동/스케쥴 모드 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 366, description: 'DO16 스케듈 작동 상태' },
    },
    POWER: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 382, description: 'DO16 수동 제어' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 835, description: 'DO16 상태 읽기' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 835, description: 'DO16 상태 읽기' },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 56,
        description: 'DO16 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 56,
        description: 'DO16 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 72,
        description: 'DO16 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 72,
        description: 'DO16 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 88,
        description: 'DO16 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 88,
        description: 'DO16 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 104,
        description: 'DO16 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 104,
        description: 'DO16 스케줄1 종료분',
      },
    },
  },

  // DI 포트들 (DI1~DI16)
  DI1: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 403, description: 'DI1 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 403, description: 'DI1 기능 상태' },
    },
  },

  DI2: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 404, description: 'DI2 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 404, description: 'DI2 기능 상태' },
    },
  },

  DI3: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 405, description: 'DI3 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 405, description: 'DI3 기능 상태' },
    },
  },

  DI4: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 406, description: 'DI4 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 406, description: 'DI4 기능 상태' },
    },
  },

  DI5: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 407, description: 'DI5 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 407, description: 'DI5 기능 상태' },
    },
  },

  DI6: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 408, description: 'DI6 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 408, description: 'DI6 기능 상태' },
    },
  },

  DI7: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 409, description: 'DI7 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 409, description: 'DI7 기능 상태' },
    },
  },

  DI8: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 410, description: 'DI8 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 410, description: 'DI8 기능 상태' },
    },
  },

  DI9: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 411, description: 'DI9 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 411, description: 'DI9 기능 상태' },
    },
  },

  DI10: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 412, description: 'DI10 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 412, description: 'DI10 기능 상태' },
    },
  },

  DI11: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 413, description: 'DI11 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 413, description: 'DI11 기능 상태' },
    },
  },

  DI12: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 414, description: 'DI12 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 414, description: 'DI12 기능 상태' },
    },
  },

  DI13: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 415, description: 'DI13 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 415, description: 'DI13 기능 상태' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 448, description: 'DI13 접점 상태' },
    },
  },

  DI14: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 416, description: 'DI14 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 416, description: 'DI14 기능 상태' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 449, description: 'DI14 접점 상태' },
    },
  },

  DI15: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 417, description: 'DI15 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 417, description: 'DI15 기능 상태' },
    },
    STATUS: {
      get: { functionCode: MODBUS_FC.RD_COILS, address: 450, description: 'DI15 접점 상태' },
    },
  },

  DI16: {
    ENABLE: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 418, description: 'DI16 기능 활성화' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 418, description: 'DI16 기능 상태' },
    },
  },

  // COOLER 포트들
  COOLER: {
    AUTO: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_COIL,
        address: 364,
        description: '냉난방기 운영 모드 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_COILS,
        address: 364,
        description: '냉난방기 운영 모드 상태',
      },
    },
    POWER: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_COIL,
        address: 380,
        description: '냉난방기 전원 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_COILS,
        address: 455,
        description: '냉난방기 전원 상태',
      },
    },
    POWER_SAMSUNG: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_COIL,
        address: 380,
        description: '삼성 냉난방기 전원 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 142,
        description: '삼성 냉난방기 전원 상태',
      },
    },
    MODE: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 128,
        description: '냉난방기 작동 모드 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 115,
        description: '냉난방기 작동 모드 상태',
      },
    },
    SPEED: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 129,
        description: '냉난방기 속도 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 116,
        description: '냉난방기 속도 상태',
      },
    },
    SUMMER_TEMP: {
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 125,
        description: '냉난방기 여름 온도 설정',
      },
    },
    WINTER_TEMP: {
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 126,
        description: '냉난방기 겨울 온도 설정',
      },
    },
    CUR_TEMP: {
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        // address: 119,
        address: 120,
        description: '냉난방기 현재 온도',
      },
    },
    ALARM: {
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 118,
        description: '냉난방기 알람 상태',
      },
    },
    SUMMER_CONT_TEMP: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 125,
        description: '냉난방기 여름 제어 온도 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 125,
        description: '냉난방기 여름 제어 온도',
      },
    },
    WINTER_CONT_TEMP: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 126,
        description: '냉난방기 겨울 제어 온도 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 126,
        description: '냉난방기 겨울 제어 온도',
      },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 54,
        description: '냉난방기 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 54,
        description: '냉난방기 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 70,
        description: '냉난방기 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 70,
        description: '냉난방기 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 86,
        description: '냉난방기 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 86,
        description: '냉난방기 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 102,
        description: '냉난방기 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 102,
        description: '냉난방기 스케줄1 종료분',
      },
    },
  },

  EXCHANGER: {
    AUTO: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_COIL,
        address: 365,
        description: '전열교환기 운영 모드 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_COILS,
        address: 365,
        description: '전열교환기 운영 모드 상태',
      },
    },
    POWER: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_COIL,
        address: 381,
        description: '전열교환기 전원 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_COILS,
        address: 381,
        description: '전열교환기 전원 상태',
      },
    },
    MODE: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 112,
        description: '전열교환기 작동 모드 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 110,
        description: '전열교환기 작동 모드 상태',
      },
    },
    SPEED: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 111,
        description: '전열교환기 속도 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 109,
        description: '전열교환기 속도 상태',
      },
    },
    SUMMER_CONT_TEMP: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 125,
        description: '전열교환기 여름 제어 온도 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 125,
        description: '전열교환기 여름 제어 온도',
      },
    },
    WINTER_CONT_TEMP: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 126,
        description: '전열교환기 겨울 제어 온도 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 126,
        description: '전열교환기 겨울 제어 온도',
      },
    },
    CUR_TEMP: {
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 119,
        description: '전열교환기 현재 온도',
      },
    },
    FILTER_ALARM: {
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 108,
        description: '전열교환기 필터 알람',
      },
    },
    ALARM: {
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 108,
        description: '전열교환기 알람 상태',
      },
    },
    SCHED1_START_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 55,
        description: '전열교환기 스케줄1 시작시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 55,
        description: '전열교환기 스케줄1 시작시간',
      },
    },
    SCHED1_START_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 71,
        description: '전열교환기 스케줄1 시작분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 71,
        description: '전열교환기 스케줄1 시작분',
      },
    },
    SCHED1_END_HOUR: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 87,
        description: '전열교환기 스케줄1 종료시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 87,
        description: '전열교환기 스케줄1 종료시간',
      },
    },
    SCHED1_END_MIN: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 103,
        description: '전열교환기 스케줄1 종료분 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 103,
        description: '전열교환기 스케줄1 종료분',
      },
    },
  },

  // 온열벤치(bench)
  // - 문서 레지스터는 1-based, 실제 Modbus address는 0-based로 사용한다.
  //   - reg 1   -> addr 0   (온열벤치#1 현재 온도)
  //   - reg 2   -> addr 1   (온열벤치#2 현재 온도)
  //   - reg 17  -> addr 16  (설정 온도)
  //   - reg 18  -> addr 17  (편차값)
  //   - reg 20  -> addr 19  (기동 체크시간)
  //   - reg 174 -> addr 173 (온열벤치#2 설정 온도)
  BENCH: {
    CUR_TEMP: {
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 0,
        description: '온열벤치#1 현재 온도',
      },
    },
    CUR_TEMP_2: {
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 1,
        description: '온열벤치#2 현재 온도',
      },
    },
    CONT_TEMP: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 16,
        description: '온열벤치 설정 온도 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 16,
        description: '온열벤치 설정 온도',
      },
    },
    CONT_TEMP_2: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 173,
        description: '온열벤치#2 설정 온도 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 173,
        description: '온열벤치#2 설정 온도',
      },
    },
    TEMP_OFFSET: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 17,
        description: '온열벤치 편차값 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 17,
        description: '온열벤치 편차값',
      },
    },
    TEMP_CHECK_INTERVAL: {
      set: {
        functionCode: MODBUS_FC.WR_SNGL_REG,
        address: 19,
        description: '온열벤치 기동 체크시간 설정',
      },
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 19,
        description: '온열벤치 기동 체크시간',
      },
    },
  },

  INTEGRATED_SENSOR: {
    PM10: {
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 133, description: '통합센서 PM1.0' },
    },
    PM25: {
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 134, description: '통합센서 PM2.5' },
    },
    PM100: {
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 135, description: '통합센서 PM10' },
    },
    CO2: {
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 136, description: '통합센서 CO2' },
    },
    VOC: {
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 137, description: '통합센서 VOC' },
    },
    TEMP: {
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 131, description: '통합센서 온도' },
    },
    HUM: {
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 139, description: '통합센서 습도' },
    },
    ALARM: {
      get: {
        functionCode: MODBUS_FC.RD_HLD_REG,
        address: 140,
        description: '통합센서 에러 상태',
      },
    },
  },

  // 🆕 절기 설정 - Coil 기반 (0x 레지스터)
  SEASONAL: {
    SEASON: {
      set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 326, description: '계절 선택 설정' },
      get: { functionCode: MODBUS_FC.RD_COILS, address: 326, description: '계절 선택 상태' },
    },
    MONTHLY_SUMMER: {
      JAN: {
        set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 327, description: '1월 하절기 설정' },
        get: { functionCode: MODBUS_FC.RD_COILS, address: 327, description: '1월 하절기 상태' },
      },
      FEB: {
        set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 328, description: '2월 하절기 설정' },
        get: { functionCode: MODBUS_FC.RD_COILS, address: 328, description: '2월 하절기 상태' },
      },
      MAR: {
        set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 329, description: '3월 하절기 설정' },
        get: { functionCode: MODBUS_FC.RD_COILS, address: 329, description: '3월 하절기 상태' },
      },
      APR: {
        set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 330, description: '4월 하절기 설정' },
        get: { functionCode: MODBUS_FC.RD_COILS, address: 330, description: '4월 하절기 상태' },
      },
      MAY: {
        set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 331, description: '5월 하절기 설정' },
        get: { functionCode: MODBUS_FC.RD_COILS, address: 331, description: '5월 하절기 상태' },
      },
      JUN: {
        set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 332, description: '6월 하절기 설정' },
        get: { functionCode: MODBUS_FC.RD_COILS, address: 332, description: '6월 하절기 상태' },
      },
      JUL: {
        set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 333, description: '7월 하절기 설정' },
        get: { functionCode: MODBUS_FC.RD_COILS, address: 333, description: '7월 하절기 상태' },
      },
      AUG: {
        set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 334, description: '8월 하절기 설정' },
        get: { functionCode: MODBUS_FC.RD_COILS, address: 334, description: '8월 하절기 상태' },
      },
      SEP: {
        set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 335, description: '9월 하절기 설정' },
        get: { functionCode: MODBUS_FC.RD_COILS, address: 335, description: '9월 하절기 상태' },
      },
      OCT: {
        set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 336, description: '10월 하절기 설정' },
        get: { functionCode: MODBUS_FC.RD_COILS, address: 336, description: '10월 하절기 상태' },
      },
      NOV: {
        set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 337, description: '11월 하절기 설정' },
        get: { functionCode: MODBUS_FC.RD_COILS, address: 337, description: '11월 하절기 상태' },
      },
      DEC: {
        set: { functionCode: MODBUS_FC.WR_SNGL_COIL, address: 338, description: '12월 하절기 설정' },
        get: { functionCode: MODBUS_FC.RD_COILS, address: 338, description: '12월 하절기 상태' },
      },
    },
  },

  // // 🆕 DDC 시스템 포트 추가 (sngilDDC.ts 기능 대체)
  // DDC_SYSTEM: {
  //   // CONFIG 포트 삭제됨
  //   STATUS: {
  //     get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 1000, description: 'DDC 상태' },
  //   },
  //   TIME: {
  //     set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 1001, description: 'DDC 시간 설정' },
  //     get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 1001, description: 'DDC 시간 조회' },
  //   },
  //   POLLING_INTERVAL: {
  //     set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 1002, description: '폴링 간격 설정' },
  //     get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 1002, description: '폴링 간격 조회' },
  //   },
  //   SLAVE_ID: {
  //     set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 1003, description: 'Slave ID 설정' },
  //     get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 1003, description: 'Slave ID 조회' },
  //   },
  //   BAUD_RATE: {
  //     set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 1004, description: 'Baud Rate 설정' },
  //     get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 1004, description: 'Baud Rate 조회' },
  //   },
  //   PORT: {
  //     set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 1005, description: '포트 설정' },
  //     get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 1005, description: '포트 조회' },
  //   },
  // },

  // 🆕 시스템 설정 포트 추가
  // SYSTEM_SETTINGS: {
  //   SEASON_MODE: {
  //     set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 2000, description: '계절 모드 설정' },
  //     get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 2000, description: '계절 모드 조회' },
  //   },
  //   SCHEDULE_MODE: {
  //     set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 2001, description: '스케줄 모드 설정' },
  //     get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 2001, description: '스케줄 모드 조회' },
  //   },
  // },

  // 🆕 DI 딜레이타임 - Holding Register 기반 (4x 레지스터)
  DI_DELAY: {
    DI13: {
      set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 32, description: 'DI13 딜레이타임 설정' },
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 32, description: 'DI13 딜레이타임 조회' },
    },
    DI14: {
      set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 33, description: 'DI14 딜레이타임 설정' },
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 33, description: 'DI14 딜레이타임 조회' },
    },
    DI15: {
      set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 34, description: 'DI15 딜레이타임 설정' },
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 34, description: 'DI15 딜레이타임 조회' },
    },
  },

  // 🆕 DI 상태 읽기 - Discrete Input 기반 (1x 레지스터)
  DI_STATUS: {
    DI1: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 99, description: 'DI1 접점 상태', length: 1 },
    },
    DI2: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 100, description: 'DI2 접점 상태', length: 1 },
    },
    DI3: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 101, description: 'DI3 접점 상태', length: 1 },
    },
    DI4: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 102, description: 'DI4 접점 상태', length: 1 },
    },
    DI5: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 103, description: 'DI5 접점 상태', length: 1 },
    },
    DI6: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 104, description: 'DI6 접점 상태', length: 1 },
    },
    DI7: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 105, description: 'DI7 접점 상태', length: 1 },
    },
    DI8: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 106, description: 'DI8 접점 상태', length: 1 },
    },
    DI9: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 107, description: 'DI9 접점 상태', length: 1 },
    },
    DI10: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 108, description: 'DI10 접점 상태', length: 1 },
    },
    DI11: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 109, description: 'DI11 접점 상태', length: 1 },
    },
    DI12: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 110, description: 'DI12 접점 상태', length: 1 },
    },
    DI13: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 111, description: 'DI13 접점 상태', length: 1 },
    },
    DI14: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 112, description: 'DI14 접점 상태', length: 1 },
    },
    DI15: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 113, description: 'DI15 접점 상태', length: 1 },
    },
    DI16: {
      get: { functionCode: MODBUS_FC.RD_DIS_INPUTS, address: 114, description: 'DI16 접점 상태', length: 1 },
    },
  },

  DDC_TIME: {
    YEAR: {
      set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 890, description: 'DDC 년도 설정' },
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 890, description: 'DDC 년도 조회' },
    },
    MONTH: {
      set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 891, description: 'DDC 월 설정' },
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 891, description: 'DDC 월 조회' },
    },
    DAY: {
      set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 892, description: 'DDC 일 설정' },
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 892, description: 'DDC 일 조회' },
    },
    DOW: {
      set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 893, description: 'DDC 일 설정' },
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 893, description: 'DDC 일 조회' },
    },
    HOUR: {
      set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 894, description: 'DDC 시간 설정' },
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 894, description: 'DDC 시간 조회' },
    },
    MIN: {
      set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 895, description: 'DDC 분 설정' },
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 895, description: 'DDC 분 조회' },
    },
    SECOND: {
      set: { functionCode: MODBUS_FC.WR_SNGL_REG, address: 896, description: 'DDC 초 설정' },
      get: { functionCode: MODBUS_FC.RD_HLD_REG, address: 896, description: 'DDC 초 조회' },
    },
  },

  // 🆕 시스템 설정 포트 추가
} as const;

// 🔄 호환성을 위한 별칭 추가 (컴파일된 JavaScript에서 사용)
export const HARDWARE_PORTS = HW_PORTS;

// 🔄 CommonJS 호환성을 위한 명시적 export (Docker Production 빌드용)
// ESM과 CommonJS 모두 지원하는 범용 export
const compatibleExports = {
  HW_PORTS,
  HARDWARE_PORTS: HW_PORTS,
  MODBUS_FC,
};

// CommonJS 지원
if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, compatibleExports);
}

// ESM default export도 지원
export default compatibleExports;

// 타입 내보내기 (중복 제거)
