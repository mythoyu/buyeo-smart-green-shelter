import { SYSTEM_CONFIG, FALLBACK_NTP_SERVERS } from '../config/setup.pc.config';

import { useGetNetworkInterfaces, useGetWifiInterfaces } from './useSystemSettings';

import type { SelectOption } from '../components/common/SelectWithCommand';

// 네트워크 인터페이스 상태를 한국어로 변환
const getStateText = (state: string): string => {
  switch (state) {
    case 'connected':
      return '🟢 연결됨';
    case 'disconnected':
      return '🔴 연결 해제';
    case 'unavailable':
      return '⚫ 사용 불가';
    case 'unmanaged':
      return '⚪ 관리 안함';
    default:
      return `❓ ${state}`;
  }
};

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

export const useWifiInterfaceOptions = (): SelectOption[] => {
  const { data: wifiInterfaces } = useGetWifiInterfaces();

  // 실제 API 데이터를 SelectOption 형식으로 변환
  if (wifiInterfaces && Array.isArray(wifiInterfaces)) {
    return wifiInterfaces.map(iface => {
      const stateText = getStateText(iface.state);
      const connectionText = iface.connection || '연결 없음';

      return {
        value: iface.name,
        label: `${iface.name} - ${connectionText}`,
        category: `${iface.type}-${iface.state}`, // 상태별 카테고리
        description: `${stateText}${iface.ipv4 ? ` | IP: ${iface.ipv4}` : ''}`,
      };
    });
  }

  // API 데이터가 없을 때는 빈 배열 반환
  return [];
};

export const useNetworkInterfaceOptions = (): SelectOption[] => {
  const { data: networkInterfaces } = useGetNetworkInterfaces();

  // 실제 API 데이터를 SelectOption 형식으로 변환
  if (networkInterfaces && Array.isArray(networkInterfaces)) {
    return networkInterfaces
      .filter(iface => iface.type === 'ethernet') // 유선(ethernet)만 필터링
      .map(iface => {
        const stateText = getStateText(iface.state);
        const connectionText = iface.connection || '연결 없음';

        return {
          value: iface.name,
          label: `${iface.name} - ${connectionText}`,
          category: `${iface.type}-${iface.state}`, // 상태별 카테고리
          description: `${stateText}${iface.ipv4 ? ` | IP: ${iface.ipv4}` : ''}`,
        };
      });
  }

  // API 데이터가 없을 때는 빈 배열 반환
  return [];
};

export const useNtpServerOptions = () => {
  const config = useSystemConfig();
  return config.ntpServers;
};
