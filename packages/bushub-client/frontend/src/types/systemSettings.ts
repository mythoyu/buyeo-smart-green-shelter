export interface NtpSettings {
  enabled: boolean;
  primaryServer: string;
  fallbackServer?: string; // 단일 백업 서버로 변경
  timezone: string;
}

export interface NetworkSettings {
  interface: string;
  dhcp4: boolean;
  ipv4: string;
  gateway: string;
  nameservers: string[];
  subnetmask: string;
}

export interface SoftapSettings {
  enabled: boolean;
  interface: string;
  ssid: string;
  password: string;
  connectionName: string;
}

export interface DeviceAdvancedSettings {
  temp: {
    'fine-tuning-summer': number;
    'fine-tuning-winter': number;
  };
}

export interface SystemSettings {
  ntp: NtpSettings;
  network: NetworkSettings;
  softap: SoftapSettings;
}

export interface NtpStatus {
  config_ntp_server?: string;
  [key: string]: any;
}

export interface SoftapStatus {
  exists: boolean;
  addresses?: string;
  [key: string]: any;
}

export interface ValidationError {
  type: 'success' | 'error';
  text: string;
}

export interface NetworkInterface {
  name: string; // enp0s3, wlp1s0
  type: 'ethernet' | 'wifi' | 'bridge' | 'loopback' | 'wifi-p2p';
  state: 'connected' | 'disconnected' | 'unavailable' | 'unmanaged';
  connection?: string; // connection name
  mac?: string; // MAC address
  dhcp4?: boolean; // DHCP 사용 여부
}

export interface WifiInterface {
  name: string; // wlp1s0, wlan0
  type: 'wifi' | 'wifi-p2p';
  state: 'connected' | 'disconnected' | 'unavailable' | 'unmanaged';
  connection?: string; // connection name
  mac?: string; // MAC address
}

export interface NetworkStatus {
  interfaces: NetworkInterface[];
  activeConnections: string[];
  defaultGateway?: string;
}
