import {
  Activity,
  BarChart2,
  Clock,
  Cpu,
  Database,
  Network,
  Package,
  RefreshCw,
  RotateCw,
  Server,
  Sun,
  Users,
  Wifi,
} from 'lucide-react';

/**
 * 시스템 설정 페이지 사이드바 네비게이션 항목
 */
export const SETTINGS_NAV = [
  { id: 'settings-softap', icon: Wifi, label: 'SoftAP' },
  { id: 'settings-network', icon: Network, label: '유선' },
  { id: 'settings-ntp', icon: Clock, label: 'NTP' },
  { id: 'settings-ddc-time', icon: Clock, label: 'DDC\n시간' },
  { id: 'settings-seasonal', icon: Sun, label: '절기' },
  { id: 'settings-polling', icon: Cpu, label: '폴링' },
  { id: 'settings-people-counter', icon: Users, label: '피플' },
  { id: 'settings-reboot', icon: RotateCw, label: '재기동' },
] as const;

/**
 * 시스템 모니터링 페이지 사이드바 네비게이션 항목
 */
export const MONITOR_NAV = [
  { id: 'monitor-superior-server', icon: Server, label: '상위' },
  { id: 'monitor-ping-test', icon: Wifi, label: '핑' },
  { id: 'monitor-server', icon: Server, label: '서버' },
  { id: 'monitor-database', icon: Database, label: 'DB' },
  { id: 'monitor-services', icon: Package, label: '서비스' },
  { id: 'monitor-hardware', icon: Cpu, label: 'HW' },
  { id: 'monitor-polling', icon: Activity, label: '폴링' },
  { id: 'monitor-polling-recovery', icon: RefreshCw, label: '복구' },
  { id: 'monitor-ddc-time-sync', icon: Activity, label: '동기화' },
  { id: 'monitor-system-summary', icon: BarChart2, label: '요약' },
] as const;
