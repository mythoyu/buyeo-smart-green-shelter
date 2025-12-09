/**
 * 하드웨어 직접 제어 및 상태 읽기 관련 Fastify 스키마 정의
 */

// 하드웨어 직접 제어 성공 응답 스키마 (표준 응답 구조)
export const hardwareDirectCommandSuccessSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    message: { type: 'string' },
    data: {
      type: 'object',
      properties: {
        commandId: { type: 'string' },
        value: { anyOf: [{ type: 'number' }, { type: 'boolean' }, { type: 'null' }] },
      },
      required: ['commandId'],
      additionalProperties: false,
    },
  },
  required: ['success', 'message', 'data'],
  additionalProperties: true,
} as const;

// 하드웨어 직접 제어 에러 응답 스키마 (표준 응답 구조)
export const hardwareDirectCommandErrorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: false },
    message: { type: 'string' },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['code', 'message'],
      additionalProperties: false,
    },
  },
  required: ['success', 'message', 'error'],
  additionalProperties: true,
} as const;

// 하드웨어 직접 제어 응답 스키마 (모든 상태 코드 포함)
export const hardwareDirectCommandResponseSchema = {
  200: hardwareDirectCommandSuccessSchema,
  400: hardwareDirectCommandErrorSchema,
  409: hardwareDirectCommandErrorSchema,
  500: hardwareDirectCommandErrorSchema,
} as const;

// 하드웨어 직접 제어 요청 스키마 (마지막에 정의하여 다른 스키마들을 참조할 수 있도록 함)
export const hardwareDirectCommandSchema = {
  body: {
    type: 'object',
    required: ['port', 'command', 'value'],
    properties: {
      port: {
        type: 'string',
        enum: [
          'DO1',
          'DO2',
          'DO3',
          'DO4',
          'DO5',
          'DO6',
          'DO7',
          'DO8',
          'DO9',
          'DO10',
          'DO11',
          'DO12',
          'DO13',
          'DO14',
          'DO15',
          'DO16',
          'DI1',
          'DI2',
          'DI3',
          'DI4',
          'DI5',
          'DI6',
          'DI7',
          'DI8',
          'DI9',
          'DI10',
          'DI11',
          'DI12',
          'DI13',
          'DI14',
          'DI15',
          'DI16',
          'COOLER',
          'EXCHANGER',
          'SENSOR',
          'SEASONAL',
          'DDC_TIME',
        ],
        description: 'DO/DI/그룹 포트 번호',
      },
      command: {
        type: 'string',
        enum: [
          'POWER',
          'AUTO',
          'MODE',
          'SPEED',
          'SUMMER_CONT_TEMP',
          'WINTER_CONT_TEMP',
          'CUR_TEMP',
          'SCHED1_START_HOUR',
          'SCHED1_START_MIN',
          'SCHED1_END_HOUR',
          'SCHED1_END_MIN',
          'SCHED2_START_HOUR',
          'SCHED2_START_MIN',
          'SCHED2_END_HOUR',
          'SCHED2_END_MIN',
          'ENABLE',
          'SEASON',
          'YEAR',
          'MONTH',
          'DAY',
          'HOUR',
          'MINUTE',
          'SECOND',
          'PM10',
          'PM25',
          'PM100',
          'CO2',
          'VOC',
          'TEMP',
          'HUM',
          'ALARM',
        ],
        description: '하드웨어 명령어',
      },
      value: {
        type: ['boolean', 'number'],
        description: '명령어 값 (boolean 또는 number)',
      },
    },
  },
  response: hardwareDirectCommandResponseSchema,
} as const;

// 하드웨어 상태 읽기 성공 응답 스키마 (표준 응답 구조)
export const hardwareReadStatusSuccessSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    message: { type: 'string' },
    data: {
      type: 'object',
      properties: {
        commandId: { type: 'string' },
        values: { type: 'array', items: { type: 'number' } },
      },
      required: ['commandId', 'values'],
      additionalProperties: false,
    },
  },
  required: ['success', 'message'],
  additionalProperties: true,
} as const;

// 하드웨어 상태 읽기 에러 응답 스키마 (표준 응답 구조)
export const hardwareReadStatusErrorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: false },
    message: { type: 'string' },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['code', 'message'],
      additionalProperties: false,
    },
  },
  required: ['success', 'message', 'error'],
  additionalProperties: true,
} as const;

// 하드웨어 상태 읽기 응답 스키마 (모든 상태 코드 포함)
export const hardwareReadStatusResponseSchema = {
  200: hardwareReadStatusSuccessSchema,
  400: hardwareReadStatusErrorSchema,
  409: hardwareReadStatusErrorSchema,
  500: hardwareReadStatusErrorSchema,
} as const;

// 하드웨어 상태 읽기 요청 스키마
export const hardwareReadStatusSchema = {
  body: {
    type: 'object',
    required: ['port', 'command'],
    properties: {
      port: {
        type: 'string',
        enum: [
          'DO1',
          'DO2',
          'DO3',
          'DO4',
          'DO5',
          'DO6',
          'DO7',
          'DO8',
          'DO9',
          'DO10',
          'DO11',
          'DO12',
          'DO13',
          'DO14',
          'DO15',
          'DO16',
          'DI1',
          'DI2',
          'DI3',
          'DI4',
          'DI5',
          'DI6',
          'DI7',
          'DI8',
          'DI9',
          'DI10',
          'DI11',
          'DI12',
          'DI13',
          'DI14',
          'DI15',
          'DI16',
          'DI_STATUS',
          'COOLER',
          'EXCHANGER',
          'SENSOR',
          'SEASONAL',
          'DDC_TIME',
        ],
        description: 'DO/DI/그룹 포트 번호',
      },
      command: {
        type: 'string',
        enum: [
          'POWER',
          'AUTO',
          'MODE',
          'SPEED',
          'SUMMER_CONT_TEMP',
          'WINTER_CONT_TEMP',
          'CUR_TEMP',
          'STATUS',
          'SCHED1_START_HOUR',
          'SCHED1_START_MIN',
          'SCHED1_END_HOUR',
          'SCHED1_END_MIN',
          'SCHED2_START_HOUR',
          'SCHED2_START_MIN',
          'SCHED2_END_HOUR',
          'SCHED2_END_MIN',
          'ENABLE',
          'SEASON',
          'YEAR',
          'MONTH',
          'DAY',
          'HOUR',
          'MIN',
          'SECOND',
          'PM10',
          'PM25',
          'PM100',
          'CO2',
          'VOC',
          'TEMP',
          'HUM',
          'ALARM',
          'DI1',
          'DI2',
          'DI3',
          'DI4',
          'DI5',
          'DI6',
          'DI7',
          'DI8',
          'DI9',
          'DI10',
          'DI11',
          'DI12',
          'DI13',
          'DI14',
          'DI15',
          'DI16',
        ],
        description: '하드웨어 명령어',
      },
    },
  },
  response: hardwareReadStatusResponseSchema,
} as const;
