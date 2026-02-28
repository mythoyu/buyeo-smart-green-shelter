import { Type } from '@sinclair/typebox';

// 디바이스 상세설정 전용 스키마
export const DeviceAdvancedRequestSchema = Type.Object({
  temp: Type.Object({
    'fine-tuning-summer': Type.Number({
      description: '여름 목표온도 세부조정',
      minimum: -5,
      maximum: 5,
    }),
    'fine-tuning-winter': Type.Number({
      description: '겨울 목표온도 세부조정',
      minimum: -5,
      maximum: 5,
    }),
  }),
});

export const DeviceAdvancedResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    temp: Type.Object({
      'fine-tuning-summer': Type.Number(),
      'fine-tuning-winter': Type.Number(),
    }),
  }),
});

// 시스템 설정 조회 응답 스키마
export const SystemSettingsResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    network: Type.Object({
      interface: Type.String({ description: '네트워크 인터페이스' }),
      ipAddress: Type.String({ description: 'IP 주소' }),
      netmask: Type.String({ description: '서브넷 마스크' }),
      gateway: Type.String({ description: '게이트웨이' }),
      dns: Type.Array(Type.String(), { description: 'DNS 서버 목록' }),
    }),
    ntp: Type.Object({
      enabled: Type.Boolean({ description: 'NTP 활성화 여부' }),
      servers: Type.Array(Type.String(), { description: 'NTP 서버 목록' }),
      timezone: Type.String({ description: '타임존' }),
    }),
    softap: Type.Object({
      enabled: Type.Boolean({ description: 'SoftAP 활성화 여부' }),
      ssid: Type.String({ description: 'SSID' }),
      password: Type.String({ description: '비밀번호' }),
      channel: Type.Number({ description: '채널' }),
    }),
    client: Type.Object({
      id: Type.String({ description: '클라이언트 ID' }),
      name: Type.String({ description: '클라이언트 이름' }),
      location: Type.String({ description: '위치' }),
    }),
    runtime: Type.Optional(
      Type.Object({
        pollingEnabled: Type.Boolean({ description: '폴링 활성화 여부' }),
        pollingInterval: Type.Number({ description: '폴링 간격(ms)' }),
        applyInProgress: Type.Boolean({ description: '설정 적용 진행 여부' }),
        peopleCounterEnabled: Type.Optional(
          Type.Boolean({ description: '피플카운터 기능 활성화 여부' }),
        ),
        rebootSchedule: Type.Optional(
          Type.Object({
            enabled: Type.Boolean({ description: '자동 재부팅 사용 여부' }),
            mode: Type.Union(
              [Type.Literal('daily'), Type.Literal('weekly')],
              { description: '스케줄 모드(daily/weekly)' },
            ),
            hour: Type.Number({
              description: '재부팅 시각(시 단위, 0~23)',
              minimum: 0,
              maximum: 23,
            }),
            daysOfWeek: Type.Optional(
              Type.Array(Type.Number({ minimum: 0, maximum: 6 }), {
                description: '요일 배열(0:일요일 ~ 6:토요일)',
              }),
            ),
            lastExecutedAt: Type.Optional(
              Type.String({ description: '마지막 재부팅 실행 시각(ISO 문자열)' }),
            ),
          }),
        ),
      }),
    ),
  }),
});

// 시스템 설정 수정 요청 스키마
export const SystemSettingsUpdateRequestSchema = Type.Object({
  network: Type.Optional(
    Type.Object({
      interface: Type.String(),
      ipAddress: Type.String(),
      netmask: Type.String(),
      gateway: Type.String(),
      dns: Type.Array(Type.String()),
    }),
  ),
  ntp: Type.Optional(
    Type.Object({
      enabled: Type.Boolean(),
      servers: Type.Array(Type.String()),
      timezone: Type.String(),
    }),
  ),
  softap: Type.Optional(
    Type.Object({
      enabled: Type.Boolean(),
      ssid: Type.String(),
      password: Type.String(),
      channel: Type.Number(),
    }),
  ),
  client: Type.Optional(
    Type.Object({
      id: Type.String(),
      name: Type.String(),
      location: Type.String(),
    }),
  ),
});

// 시스템 모드 전환 요청 스키마
export const SystemModeRequestSchema = Type.Object({
  mode: Type.Union([Type.Literal('auto'), Type.Literal('manual')], { description: '시스템 모드' }),
});

// 시스템 모드 전환 응답 스키마
export const SystemModeResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    message: Type.String(),
    mode: Type.String(),
    modeText: Type.String(),
  }),
});

// 시스템 설정 조회 응답 예시
export const SYSTEM_SETTINGS_RESPONSE_EXAMPLE = {
  success: true,
  message: '시스템 환경설정 조회 성공',
  data: {
    network: {
      interface: 'eth0',
      ipAddress: '192.168.1.100',
      netmask: '255.255.255.0',
      gateway: '192.168.1.1',
      dns: ['8.8.8.8', '8.8.4.4'],
    },
    ntp: {
      enabled: true,
      servers: ['time.google.com', 'time.windows.com'],
      timezone: 'Asia/Seoul',
    },
    softap: {
      enabled: false,
      ssid: 'BushubAP',
      password: 'bushub1234',
      channel: 6,
    },
    client: {
      id: 'c0101',
      name: '강릉시외버스터미널',
      location: '강원도 강릉시 하슬라로 27',
    },
    runtime: {
      pollingEnabled: true,
      pollingInterval: 20000,
      applyInProgress: false,
      peopleCounterEnabled: false,
      rebootSchedule: {
        enabled: false,
        mode: 'daily',
        hour: 3,
      },
    },
  },
};

// 시스템 설정 수정 요청 예시
export const SYSTEM_SETTINGS_UPDATE_REQUEST_EXAMPLE = {
  network: {
    interface: 'eth0',
    ipAddress: '192.168.1.101',
    netmask: '255.255.255.0',
    gateway: '192.168.1.1',
    dns: ['8.8.8.8', '8.8.4.4'],
  },
};

// 시스템 모드 전환 요청 예시
export const SYSTEM_MODE_REQUEST_EXAMPLE = {
  mode: 'auto',
};

// 시스템 모드 전환 응답 예시
export const SYSTEM_MODE_RESPONSE_EXAMPLE = {
  success: true,
  message: '시스템 모드가 성공적으로 전환되었습니다.',
  data: {
    message: '시스템이 자동 모드로 전환되었습니다.',
    mode: 'auto',
    modeText: '자동 모드',
  },
};
