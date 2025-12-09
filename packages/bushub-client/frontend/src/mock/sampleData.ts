// Vercel 배포용 샘플 데이터
// 실제 백엔드 API와 동일한 구조로 제공

// 클라이언트 정보
export const sampleClient = {
  id: 'c0101',
  type: 'bushub',
  region: 'gn',
  name: '샘플',
  location: '강원도 강릉시 하슬라로 27',
  latitude: 37.754692,
  longitude: 128.878805,
  devices: [
    {
      id: 'd011',
      name: '조명',
      type: 'lighting',
      units: [
        { id: 'u001', name: '내부조명1' },
        { id: 'u002', name: '내부조명2' },
        { id: 'u003', name: '외부조명1' },
      ],
    },
    {
      id: 'd021',
      name: '냉난방기',
      type: 'cooler',
      units: [{ id: 'u001', name: '냉난방기' }],
    },
    {
      id: 'd022',
      name: '전열교환기',
      type: 'exchanger',
      units: [{ id: 'u001', name: '전열교환기' }],
    },
    {
      id: 'd023',
      name: '에어커튼',
      type: 'aircurtain',
      units: [
        { id: 'u001', name: '에어커튼1' },
        { id: 'u002', name: '에어커튼2' },
      ],
    },
    {
      id: 'd041',
      name: '온열벤치',
      type: 'bench',
      units: [
        { id: 'u001', name: '내부벤치1' },
        { id: 'u002', name: '내부벤치2' },
      ],
    },
    {
      id: 'd051',
      name: '자동문',
      type: 'door',
      units: [
        { id: 'u001', name: '자동문1' },
        { id: 'u002', name: '자동문2' },
      ],
    },
    {
      id: 'd061',
      name: '통합센서',
      type: 'integrated_sensor',
      units: [{ id: 'u001', name: '통합센서' }],
    },
    {
      id: 'd081',
      name: '자동문외부스위치',
      type: 'externalsw',
      units: [
        { id: 'u001', name: '자동문외부스위치1' },
        { id: 'u002', name: '자동문외부스위치2' },
      ],
    },
  ],
};

// 디바이스 상태 정보
export const sampleStatus = {
  id: 'c0101',
  devices: [
    {
      id: 'd011',
      status: 0, // 정상
      units: [
        { id: 'u001', status: 0 }, // 정상
        { id: 'u002', status: 0 }, // 정상
        { id: 'u003', status: 0 }, // 정상
      ],
    },
    {
      id: 'd021',
      status: 0, // 정상
      units: [
        { id: 'u001', status: 0 }, // 정상
      ],
    },
    {
      id: 'd022',
      status: 0, // 정상
      units: [
        { id: 'u001', status: 0 }, // 정상
      ],
    },
    {
      id: 'd023',
      status: 0, // 정상
      units: [
        { id: 'u001', status: 0 }, // 정상
        { id: 'u002', status: 0 }, // 정상
      ],
    },
    {
      id: 'd041',
      status: 0, // 정상
      units: [
        { id: 'u001', status: 0 }, // 정상
        { id: 'u002', status: 0 }, // 정상
      ],
    },
    {
      id: 'd051',
      status: 0, // 정상
      units: [
        { id: 'u001', status: 0 }, // 정상
        { id: 'u002', status: 0 }, // 정상
        { id: 'u003', status: 0 }, // 정상
      ],
    },
    {
      id: 'd061',
      status: 0, // 정상
      units: [
        { id: 'u001', status: 0 }, // 정상
      ],
    },
    {
      id: 'd081',
      status: 0, // 정상
      units: [
        { id: 'u001', status: 0 }, // 정상
        { id: 'u002', status: 0 }, // 정상
      ],
    },
  ],
};

// 디바이스 데이터 정보
export const sampleData = {
  id: 'c0101',
  devices: [
    {
      id: 'd011',
      type: 'lighting',
      units: [
        {
          id: 'u001',
          data: {
            power: true,
            connection: true,
            start_time_1: '08:00',
            end_time_1: '22:00',
            start_time_2: '18:00',
            end_time_2: '06:00',
            auto_mode: true,
          },
        },
        {
          id: 'u002',
          data: {
            power: false,
            connection: true,
            start_time_1: '08:00',
            end_time_1: '22:00',
            start_time_2: '18:00',
            end_time_2: '06:00',
            auto_mode: false,
          },
        },
        {
          id: 'u003',
          data: {
            power: true,
            connection: true,
            start_time_1: '08:00',
            end_time_1: '22:00',
            start_time_2: '18:00',
            end_time_2: '06:00',
            auto_mode: true,
          },
        },
      ],
    },
    {
      id: 'd021',
      type: 'cooler',
      units: [
        {
          id: 'u001',
          data: {
            power: true,
            connection: true,
            mode: 4,
            temperature: 24,
            auto_mode: true,
          },
        },
      ],
    },
    {
      id: 'd022',
      type: 'exchanger',
      units: [
        {
          id: 'u001',
          data: {
            power: true,
            connection: true,
            speed: 2,
            auto_mode: true,
          },
        },
      ],
    },
    {
      id: 'd023',
      type: 'aircurtain',
      units: [
        {
          id: 'u001',
          data: {
            power: true,
            connection: true,
            speed: 3,
            auto_mode: true,
          },
        },
        {
          id: 'u002',
          data: {
            power: false,
            connection: true,
            speed: 2,
            auto_mode: false,
          },
        },
      ],
    },
    {
      id: 'd041',
      type: 'bench',
      units: [
        {
          id: 'u001',
          data: {
            power: true,
            connection: true,
            temperature: 30,
            auto_mode: true,
          },
        },
        {
          id: 'u002',
          data: {
            power: false,
            connection: true,
            temperature: 28,
            auto_mode: false,
          },
        },
      ],
    },
    {
      id: 'd051',
      type: 'door',
      units: [
        {
          id: 'u001',
          data: {
            power: true,
            connection: true,
            auto: true,
            status: 'closed',
          },
        },
        {
          id: 'u002',
          data: {
            power: true,
            connection: true,
            auto: false,
            status: 'open',
          },
        },
      ],
    },
    {
      id: 'd061',
      type: 'integrated_sensor',
      units: [
        {
          id: 'u001',
          data: {
            power: true,
            connection: true,
            temperature: 23,
            humidity: 45,
            enabled: true,
          },
        },
      ],
    },
    {
      id: 'd081',
      type: 'externalsw',
      units: [
        {
          id: 'u001',
          data: {
            power: true,
            connection: true,
            enabled: true,
            status: 'normal',
          },
        },
        {
          id: 'u002',
          data: {
            power: false,
            connection: true,
            enabled: false,
            status: 'normal',
          },
        },
      ],
    },
  ],
};

// 오류 로그 정보
export const sampleErrors = {
  id: 'c0101',
  devices: [
    {
      id: 'd021',
      units: [
        {
          id: 'u001',
          errorId: 'e001',
          errorDesc: '통신에러',
          errorAt: '2025-06-29T10:09:55Z',
        },
        {
          id: 'u002',
          errorId: 'e001',
          errorDesc: '통신에러',
          errorAt: '2025-06-29T10:09:58Z',
        },
      ],
    },
  ],
};

// 시스템 설정 정보
export const sampleSystem = {
  ntp: {
    enabled: true,
    server1: 'time.windows.com',
    server2: 'time.google.com',
    timezone: 'Asia/Seoul',
  },
  network: {
    dhcp: true,
    ip: '192.168.1.100',
    subnet: '255.255.255.0',
    gateway: '192.168.1.1',
    dns1: '8.8.8.8',
    dns2: '8.8.4.4',
  },
  softap: {
    enabled: false,
  },
};

// API 키 정보
export const sampleApiKeys = {
  apiKeys: [
    {
      key: 'sample-internal-key-12345',
      type: 'internal',
      description: '내부 시스템용 API 키',
      name: '내부키',
      permissions: ['read:devices', 'write:commands'],
      status: 'active',
      createdBy: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
      rateLimit: { requestsPerMinute: 100, requestsPerHour: 1000 },
    },
    {
      key: 'sample-external-key-67890',
      type: 'external',
      description: '외부 연동용 API 키',
      name: '외부키',
      permissions: ['read:devices'],
      status: 'active',
      createdBy: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
      rateLimit: { requestsPerMinute: 100, requestsPerHour: 1000 },
    },
  ],
};

// 사용자 정보
export type SampleApiKey = {
  id: string;
  name: string;
  key: string;
  type: 'universal' | 'internal' | 'external';
  permissions?: string[];
};

export type SampleUser = {
  id: string;
  username: string;
  role: 'admin' | 'internal' | 'external';
  companyId: string | null;
};

export type SampleUserApiResponse = {
  success: boolean;
  data: {
    user: SampleUser;
    token: string; // API 키가 token 필드로 전송됨
  };
};

export const sampleUserApiResponses: SampleUserApiResponse[] = [
  {
    success: true,
    data: {
      user: {
        id: '6878445622aaad055d8e2dd6',
        username: 'admin',
        role: 'admin',
        companyId: null,
      },
      token: 'admin_universal_key_2025',
    },
  },
  {
    success: true,
    data: {
      user: {
        id: '6878445622aaad055d8e2dd9',
        username: 'admin_dabom',
        role: 'internal',
        companyId: null,
      },
      token: 'admin_dabom_internal_key_2025',
    },
  },
  {
    success: true,
    data: {
      user: {
        id: '6878445622aaad055d8e2ddc',
        username: 'testuser',
        role: 'internal',
        companyId: null,
      },
      token: 'testuser_internal_key_2025',
    },
  },
  {
    success: true,
    data: {
      user: {
        id: '6878445622aaad055d8e2ddf',
        username: 'youjobs',
        role: 'external',
        companyId: 'youjobs',
      },
      token: 'youjobs_external_key',
    },
  },
  {
    success: true,
    data: {
      user: {
        id: '6878445622aaad055d8e2de2',
        username: 'nzero',
        role: 'external',
        companyId: 'nzero',
      },
      token: 'nzero_external_key_2025',
    },
  },
];

// 로그 분석용 오류 데이터
export const sampleErrorLogs = [
  {
    id: '1',
    deviceId: 'door-001',
    deviceName: '출입문 시스템',
    unitId: 'door-001-02',
    unitName: '후문',
    errorCode: 'DOOR_001',
    errorDesc: '출입문 센서 오작동 - 센서 연결이 끊어졌습니다.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    resolved: false,
  },
  {
    id: '2',
    deviceId: 'sensor-001',
    deviceName: '환경 센서 시스템',
    unitId: 'air-001-01',
    unitName: '공기질 센서',
    errorCode: 'SENSOR_001',
    errorDesc: 'PM2.5 센서 값이 정상 범위를 벗어났습니다.',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    resolved: true,
  },
];
