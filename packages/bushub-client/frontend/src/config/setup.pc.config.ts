import type { SelectOption } from '../components/common/SelectWithCommand';

export interface SystemConfigOptions {
  wifiInterfaces: SelectOption[];
  networkInterfaces: SelectOption[];
  timezones: SelectOption[];
  dnsServers: SelectOption[];
  pollingIntervals: SelectOption[];
  ipAddresses: SelectOption[];
  gateways: SelectOption[];
  wifiSSIDs: SelectOption[];
}

export const SYSTEM_CONFIG: SystemConfigOptions = {
  // 📶 WiFi 인터페이스 설정
  wifiInterfaces: [
    {
      value: 'wlp1s0',
      label: '무선 인터페이스 1 (wlp1s0)',
      category: 'wifi',
    },
  ],

  // 🌐 네트워크 인터페이스 설정
  networkInterfaces: [
    {
      value: 'enp0s0',
      label: '유선 인터페이스 1 (enp0s0)',
      category: 'ethernet',
    },
    {
      value: 'enp0s1',
      label: '유선 인터페이스 2 (enp0s1)',
      category: 'ethernet',
    },
  ],

  // 🌍 타임존 설정
  timezones: [
    {
      value: 'Asia/Seoul',
      label: '한국 표준시 (KST)',
      category: '아시아',
    },
    {
      value: 'UTC',
      label: '협정 세계시 (UTC)',
      category: '글로벌',
    },
  ],

  // 🔍 DNS 서버 설정
  dnsServers: [
    {
      value: '8.8.8.8',
      label: '강릉 ITS 도시정보센터(8.8.8.8)',
      category: 'private',
    },
  ],

  // ⏱️ 폴링 간격 설정
  pollingIntervals: [
    {
      value: '5000',
      label: '5초',
      category: 'fast',
    },
    {
      value: '10000',
      label: '10초',
      category: 'fast',
    },
    {
      value: '20000',
      label: '20초',
      category: 'normal',
    },
    {
      value: '30000',
      label: '30초',
      category: 'normal',
    },
    {
      value: '60000',
      label: '1분',
      category: 'stable',
    },
    {
      value: '120000',
      label: '2분',
      category: 'stable',
    },
  ],

  // 🌐 IP 주소 템플릿
  ipAddresses: [
    {
      value: '192.168.1.10',
      label: '강릉시외버스터미널 (192.168.1.10)',
      category: 'private',
    },
    {
      value: '192.168.0.10',
      label: '구름다리 (192.168.0.10)',
      category: 'private',
    },
    {
      value: '10.0.0.10',
      label: '안목커피거리 (10.0.0.10)',
      category: 'private',
    },
    {
      value: '172.16.0.10',
      label: '홍제동주민센터 (172.16.0.10)',
      category: 'private',
    },
    {
      value: '172.16.0.10',
      label: '서희아파트 (172.16.0.10)',
      category: 'private',
    },
  ],

  // 🚪 게이트웨이 템플릿
  gateways: [
    {
      value: '192.168.1.1',
      label: '강릉도시정보센터 (192.168.1.1)',
      category: 'router',
    },
  ],

  // 📶 WiFi SSID 템플릿
  wifiSSIDs: [
    {
      value: 'SinwooManagement',
      label: 'AS용 (SinwooManagement)',
      category: 'default',
    },
  ],
};

// 🎯 NTP 서버 폴백 옵션 (기존 코드와 호환성 유지)
export const FALLBACK_NTP_SERVERS: SelectOption[] = [
  {
    value: 'time.windows.com',
    label: '윈도우 타임 서버 (time.windows.com)',
    category: 'public',
  },
  {
    value: 'ntp.ubuntu.com',
    label: '우분투 타임 서버 (ntp.ubuntu.com)',
    category: 'public',
  },
  {
    value: '129.6.15.28',
    label: '강릉 ITS 도시정보센터 (129.6.15.28)',
    category: 'private',
  },
];
