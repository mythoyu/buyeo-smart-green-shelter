// 네트워크 관련 기능들이 Network Control API로 이관되어
// 이 인터페이스는 더 이상 사용되지 않습니다.
// 기존 코드와의 호환성을 위해 빈 인터페이스로 유지합니다.

// 타입 정의들 (기존 코드 호환성을 위해 유지)
export interface NetworkSettings {
  interface: string;
  ip: string;
  netmask: string;
  gateway: string;
  dns: string[];
}

export interface NtpSettings {
  enabled: boolean;
  servers: string[];
}

export interface SoftapSettings {
  enabled: boolean;
  ssid: string;
  password: string;
  channel: number;
}

export interface ILinuxSystemService {
  // 모든 네트워크 관련 메서드들이 Network Control API로 이관됨
  // 기존 코드 호환성을 위한 더미 메서드들
  getCurrentNetworkSettings(): Promise<NetworkSettings>;
  getCurrentNtpSettings(): Promise<NtpSettings>;
  getDefaultSoftapSettings(): Promise<SoftapSettings>;
}
