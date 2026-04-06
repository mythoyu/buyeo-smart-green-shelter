import { SYSTEM_CONFIG, FALLBACK_NTP_SERVERS } from '../config/setup.pc.config';

import type { SelectOption } from '../components/common/SelectWithCommand';

export const useSystemConfig = () => {
  // 정적 설정만 사용 (복잡성 제거)
  return {
    ...SYSTEM_CONFIG,
    ntpServers: FALLBACK_NTP_SERVERS,
  };
};

// 🎯 개별 설정 항목별 훅들 (편의성을 위해)
export const useTimezoneOptions = () => {
  const config = useSystemConfig();
  return config.timezones;
};

export const useDnsServerOptions = () => {
  const config = useSystemConfig();
  return config.dnsServers;
};

export const usePollingIntervalOptions = () => {
  const config = useSystemConfig();
  return config.pollingIntervals;
};

export const useIpAddressOptions = () => {
  const config = useSystemConfig();
  return config.ipAddresses;
};

export const useGatewayOptions = () => {
  const config = useSystemConfig();
  return config.gateways;
};

export const useWifiSSIDOptions = () => {
  const config = useSystemConfig();
  return config.wifiSSIDs;
};

/** 네트워크 제어 UI 제거 후: 호스트에서 인터페이스 구성 */
export const useWifiInterfaceOptions = (): SelectOption[] => [];

/** 네트워크 제어 UI 제거 후: 호스트에서 인터페이스 구성 */
export const useNetworkInterfaceOptions = (): SelectOption[] => [];

export const useNtpServerOptions = () => {
  const config = useSystemConfig();
  return config.ntpServers;
};
