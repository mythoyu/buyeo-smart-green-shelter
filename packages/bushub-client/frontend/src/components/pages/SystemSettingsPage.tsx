import { Wifi, Network, Clock, Sun, Cpu, Loader2, RefreshCcw, Users } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { useGetPeopleCounterState, useUpdatePeopleCounterState } from '../../api/queries/people-counter';
import {
  useSaveSeasonal,
  useGetSeasonal,
  useRefreshSeasonal,
  useGetDdcTime,
  useSyncDdcTime,
  useGetPollingInterval,
  useSetPollingInterval,
  useRestartHostSystem,
  useRestartBackend,
  useRefreshDdcTime,
} from '../../api/queries/system';
import {
  useSetNtp,
  useSetNetwork,
  useSetSoftap,
  useGetNtpStatus,
  useGetSoftapStatus,
  useCheckNtpConnectivity,
  useGetNetworkInterfaces,
} from '../../hooks/useSystemSettings';
import { useValidation } from '../../hooks/useValidation';
import { useWebSocket } from '../../hooks/useWebSocket';
import { cn } from '../../lib/utils';
import InputWithLabel from '../common/InputWithLabel';
import OnOffToggleButton from '../common/OnOffToggleButton';
import SelectWithCommand from '../common/SelectWithCommand';
import SelectWithLabel from '../common/SelectWithLabel';
import SettingsCard from '../common/SettingsCard';
import { TopLogPanel } from '../common/TopLogPanel';
import { Button } from '../ui/button';
import { SelectItem } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { NtpSettings, NetworkSettings, SoftapSettings } from '../../types/systemSettings';

// 월별 이름 매핑
const monthNames = {
  1: '1월',
  2: '2월',
  3: '3월',
  4: '4월',
  5: '5월',
  6: '6월',
  7: '7월',
  8: '8월',
  9: '9월',
  10: '10월',
  11: '11월',
  12: '12월',
};

// 절기 설정 데이터 타입
interface SeasonalData {
  season: number;
  january: number;
  february: number;
  march: number;
  april: number;
  may: number;
  june: number;
  july: number;
  august: number;
  september: number;
  october: number;
  november: number;
  december: number;
}

type MonthField = Exclude<keyof SeasonalData, 'season'>;

const monthFieldByIndex: Record<number, MonthField> = {
  0: 'january',
  1: 'february',
  2: 'march',
  3: 'april',
  4: 'may',
  5: 'june',
  6: 'july',
  7: 'august',
  8: 'september',
  9: 'october',
  10: 'november',
  11: 'december',
};

const SystemSettingsPage: React.FC = () => {
  const { isConnected } = useWebSocket({});

  // 커스텀 훅들
  const { validateField, hasErrors, getFieldError } = useValidation();

  // React Query 훅들
  const { data: ntpStatus } = useGetNtpStatus();
  const { data: networkIfaces } = useGetNetworkInterfaces();
  const { data: softapStatus } = useGetSoftapStatus();

  // 🌸 절기 설정 조회
  const { data: seasonalData, refetch: refetchSeasonal, isFetching: isSeasonalFetching } = useGetSeasonal();
  const refreshSeasonalMutation = useRefreshSeasonal();

  // 🕐 DDC 시간 설정 조회
  const { data: ddcTimeData, refetch: refetchDdcTime, isFetching: isDdcTimeFetching } = useGetDdcTime();

  // 🔄 폴링 간격 설정 조회
  const { data: pollingIntervalData } = useGetPollingInterval();

  // 🔄 호스트 PC 재기동 훅
  const restartHostSystemMutation = useRestartHostSystem();

  // 🔄 백엔드 재기동 훅
  const restartBackendMutation = useRestartBackend();
  const refreshDdcTimeMutation = useRefreshDdcTime();

  // (미사용 옵션 제거)

  // 네트워크 인터페이스 상태를 한국어로 변환하는 헬퍼 함수
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

  // 🌐 단일 인터페이스 데이터 소스에서 타입별로 필터링
  const allIfaces: any[] = (networkIfaces as any)?.data?.interfaces || [];

  // WiFi 인터페이스 필터링
  const wifiInterfaces = allIfaces.filter((i: any) => i?.type === 'wifi');
  const wifiInterfaceOptions = wifiInterfaces.map(iface => ({
    value: iface.name,
    label: `${iface.name} - ${iface.connection || '연결 없음'}`,
    description: `${getStateText(iface.state)}${iface.ipv4 ? ` | IP: ${iface.ipv4}` : ''}`,
    category: `${iface.type}-${iface.state}`,
  }));

  // Ethernet 인터페이스 필터링
  const ethernetInterfaces = allIfaces.filter((i: any) => i?.type === 'ethernet');
  const networkInterfaceOptions = ethernetInterfaces.map(iface => ({
    value: iface.name,
    label: `${iface.name} - ${iface.connection || '연결 없음'}`,
    description: `${getStateText(iface.state)}${iface.ipv4 ? ` | IP: ${iface.ipv4}` : ''}`,
    category: `${iface.type}-${iface.state}`,
  }));

  // 초기값 설정용 변수들
  const currentWiredInterface = ethernetInterfaces.length > 0 ? ethernetInterfaces[0]?.name || '' : '';
  const firstWifiName: string = wifiInterfaces.length > 0 ? wifiInterfaces[0]?.name || '' : '';

  // 인터페이스 초기 선택: 응답 리스트의 첫 번째 유선 인터페이스로 설정
  useEffect(() => {
    if (!networkInput?.interface && currentWiredInterface) {
      setNetworkInput(prev => ({ ...(prev as NetworkSettings), interface: currentWiredInterface } as NetworkSettings));
    }
  }, [currentWiredInterface]);

  // WiFi 인터페이스 초기 선택: 응답 리스트의 첫 번째 WiFi 인터페이스로 설정
  useEffect(() => {
    if (!softapInput?.interface && firstWifiName) {
      setSoftapInput(prev => ({ ...(prev as SoftapSettings), interface: firstWifiName } as SoftapSettings));
    }
  }, [firstWifiName]);

  // (미사용 옵션 제거)

  // 로컬 상태 (초기값은 빈 상태로 시작, useEffect에서 실제 데이터로 업데이트)
  const [ntpInput, setNtpInput] = useState<NtpSettings>({
    enabled: true,
    primaryServer: '',
    timezone: '',
  });
  const [networkInput, setNetworkInput] = useState<NetworkSettings>({
    interface: '', // 초기값은 빈 문자열, useEffect에서 실제 데이터로 업데이트
    dhcp4: true,
    ipv4: '',
    gateway: '',
    nameservers: [''],
    subnetmask: '',
  });

  // networkInput이 정의된 후에 selectedIface 계산
  const selectedIface: any = allIfaces.find((i: any) => i.name === networkInput?.interface) || null;
  const [softapInput, setSoftapInput] = useState<SoftapSettings>({
    enabled: false,
    interface: '', // 초기값은 빈 문자열, useEffect에서 실제 데이터로 업데이트
    ssid: '',
    password: '',
    connectionName: '',
  });

  // 절기 설정 상태 (DDCConfigurationPage와 동일한 구조)
  const [seasonInput, setSeasonInput] = useState<SeasonalData>({
    season: 0, // 0: 겨울, 1: 여름
    january: 0, // 0: 겨울, 1: 여름
    february: 0,
    march: 0,
    april: 0,
    may: 0,
    june: 1,
    july: 1,
    august: 1,
    september: 0,
    october: 0,
    november: 0,
    december: 0,
  });

  // 폴링 간격 상태
  const [pollingIntervalInput, setPollingIntervalInput] = useState<number>(20000);

  // 현재 시간 상태 (1초마다 업데이트)
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // 뮤테이션 훅들
  const setNtpMutation = useSetNtp();
  const checkNtpMutation = useCheckNtpConnectivity();
  const setNetworkMutation = useSetNetwork();
  const setSoftapMutation = useSetSoftap();
  const saveSeasonalMutation = useSaveSeasonal();
  const syncDdcTimeMutation = useSyncDdcTime();
  const setPollingIntervalMutation = useSetPollingInterval();
  const { data: peopleCounterData } = useGetPeopleCounterState();
  const updatePeopleCounterMutation = useUpdatePeopleCounterState();

  // 🌸 절기 설정 초기 로드 (저장된 설정이 있으면 불러오기)
  useEffect(() => {
    if (seasonalData?.data?.seasonal) {
      setSeasonInput(seasonalData.data.seasonal);
    }
  }, [seasonalData, setSeasonInput]);

  // 🔄 폴링 간격 초기 로드
  useEffect(() => {
    if (pollingIntervalData?.data?.pollingInterval) {
      setPollingIntervalInput(pollingIntervalData.data.pollingInterval);
    }
  }, [pollingIntervalData]);

  // 🌐 네트워크 설정 초기 로드 (선택된 인터페이스의 현재 설정으로 자동 채우기)
  useEffect(() => {
    if (selectedIface && !networkInput?.ipv4 && !networkInput?.gateway) {
      setNetworkInput(prev => ({
        ...prev,
        dhcp4: selectedIface?.dhcp4 ?? true,
        ipv4: selectedIface?.ipv4 || '',
        subnetmask: selectedIface?.subnetmask || '',
        gateway: selectedIface?.gateway || '',
        nameservers: selectedIface?.dns?.length ? [selectedIface.dns[0]] : [''],
      }));
    }
  }, [selectedIface]);

  // 📶 SoftAP 설정 초기 로드 (백엔드에서 받은 실제 데이터로 업데이트)
  useEffect(() => {
    if (softapStatus?.data) {
      setSoftapInput(prev => {
        // 이미 입력된 값이 있으면 유지, 없으면 API 데이터로 초기화
        const hasUserInput = prev.ssid || prev.password || prev.interface;

        if (hasUserInput) {
          // 사용자가 입력한 값이 있으면 유지
          return prev;
        } else {
          // 사용자 입력이 없으면 API 데이터로 초기화
          return {
            enabled: softapStatus.data.enabled ?? false,
            interface: firstWifiName, // WiFi 인터페이스 자동 설정
            ssid: softapStatus.data.ssid || '',
            // password는 서버에서 주지 않음: 입력값으로만 관리
            password: prev.password || '',
            connectionName: softapStatus.data.connectionName || '',
          };
        }
      });
    }
  }, [softapStatus, firstWifiName]);

  // 🕐 NTP 설정 초기 로드 (백엔드에서 받은 실제 데이터로 업데이트)
  useEffect(() => {
    if (ntpStatus?.data) {
      setNtpInput(prev => {
        // 이미 입력된 값이 있으면 유지, 없으면 API 데이터로 초기화
        const hasUserInput = prev.primaryServer || prev.timezone;

        if (hasUserInput) {
          // 사용자가 입력한 값이 있으면 유지
          return prev;
        } else {
          // 사용자 입력이 없으면 API 데이터로 초기화
          return {
            enabled: ntpStatus.data.enabled ?? true,
            primaryServer: ntpStatus.data.primaryServer || '',
            primaryServerCommented: ntpStatus.data.primaryServerCommented ?? false,
            fallbackServer: ntpStatus.data.fallbackServer || '',
            fallbackServerCommented: ntpStatus.data.fallbackServerCommented ?? false,
            timezone: ntpStatus.data.timezone || '',
          };
        }
      });
    }
  }, [ntpStatus]);

  // 입력 핸들러
  const handleInput = (section: string, field: string, value: string) => {
    validateField(section, field, value);

    if (section === 'softap') {
      const newValue = { ...softapInput, [field]: value } as SoftapSettings;
      setSoftapInput(newValue);
    } else if (section === 'network') {
      if (field === 'ipv4') {
        const newValue = { ...networkInput, ipv4: value } as NetworkSettings;
        setNetworkInput(newValue);
      } else if (field === 'nameservers') {
        // 단일 DNS 서버를 배열로 변환
        const newValue = { ...networkInput, nameservers: [value.trim()] } as NetworkSettings;
        setNetworkInput(newValue);
      } else {
        const newValue = { ...networkInput, [field]: value } as NetworkSettings;
        setNetworkInput(newValue);
      }
    } else if (section === 'ntp') {
      const newValue = { ...ntpInput, [field]: value } as NtpSettings;
      setNtpInput(newValue);
    }
  };

  // NTP 주석 상태 핸들러 (체크박스용)
  const handleNtpCommentChange = (field: 'primaryServerCommented' | 'fallbackServerCommented', checked: boolean) => {
    setNtpInput(prev => ({
      ...prev,
      [field]: checked,
    }));
  };

  // SoftAP 토글 핸들러
  const handleSoftapToggle = (enabled: boolean) => {
    const newValue = {
      ...softapInput,
      enabled,
    } as SoftapSettings;
    setSoftapInput(newValue);
  };

  // DHCP 토글 핸들러
  const handleDhcpToggle = (dhcp4: boolean) => {
    const newValue = {
      ...networkInput,
      dhcp4,
    } as NetworkSettings;
    setNetworkInput(newValue);
  };

  // 네트워크 인터페이스 선택 시 현재 설정값으로 자동 채우기
  const handleNetworkInterfaceSelect = (value: string) => {
    handleInput('network', 'interface', value);
    const iface = allIfaces.find((i: any) => i.name === value);

    setNetworkInput(
      prev =>
        ({
          ...prev,
          interface: value,
          dhcp4: iface?.dhcp4 ?? true,
          ipv4: iface?.ipv4 || '',
          subnetmask: iface?.subnetmask || '',
          gateway: iface?.gateway || prev.gateway || '',
          nameservers: iface?.dns?.length ? [iface.dns[0]] : [''],
        } as NetworkSettings)
    );
  };

  const currentMonthField = monthFieldByIndex[currentTime.getMonth()];
  const currentMonthSeasonValue = seasonInput[currentMonthField] ?? 0;

  // NTP 적용 핸들러
  const handleNtpApply = () => {
    const payload: NtpSettings = {
      enabled: ntpInput?.enabled || false,
      primaryServer: ntpInput?.primaryServer || '',
      primaryServerCommented: ntpInput?.primaryServerCommented || false,
      fallbackServer: ntpInput?.fallbackServer || '',
      fallbackServerCommented: ntpInput?.fallbackServerCommented || false,
      timezone: ntpInput?.timezone || '',
    };

    setNtpMutation.mutate(payload, {
      onSuccess: response => {
        const message = response?.message || 'NTP 설정이 저장되었습니다.';
        toast.success(message, { id: 'system-ntp-save-success' });
      },
      onError: (error: any) => {
        const message = error?.response?.data?.message || error?.response?.data?.error || 'NTP 설정 저장 실패';
        toast.error(message, { id: 'system-ntp-save-error' });
      },
    });
  };

  // 네트워크 적용 핸들러 (유선 전용)
  const handleNetworkApply = () => {
    if (!networkInput) {
      toast.error('네트워크 설정 정보가 없습니다.', { id: 'network-input-required' });
      return;
    }

    // 인터페이스 검증
    if (!networkInput.interface?.trim()) {
      toast.error('네트워크 인터페이스를 선택해주세요.', { id: 'network-interface-required' });
      return;
    }

    // 무선 인터페이스 차단
    if (/^wlan/i.test(networkInput.interface) || /^wifi/i.test(networkInput.interface)) {
      toast.error('유선 네트워크 전용 카드입니다. 무선 설정은 SoftAP 카드를 사용하세요.', {
        id: 'network-ethernet-only-error',
      });
      return;
    }

    // 정적 IP 모드일 때 필수 필드 검증
    if (!networkInput.dhcp4) {
      if (!networkInput.ipv4?.trim()) {
        toast.error('IP 주소를 입력해주세요.', { id: 'network-ipv4-required' });
        return;
      }
      if (!networkInput.gateway?.trim()) {
        toast.error('게이트웨이를 입력해주세요.', { id: 'network-gateway-required' });
        return;
      }
      if (!networkInput.subnetmask?.trim()) {
        toast.error('서브넷 마스크를 입력해주세요.', { id: 'network-subnetmask-required' });
        return;
      }
    }

    setNetworkMutation.mutate(networkInput, {
      onSuccess: response => {
        const message = response?.message || '유선 네트워크 설정이 저장되었습니다.';
        toast.success(message, { id: 'system-network-save-success' });
      },
      onError: (error: any) => {
        const message =
          error?.response?.data?.message || error?.response?.data?.error || '유선 네트워크 설정 저장 실패';
        toast.error(message, { id: 'system-network-save-error' });
      },
    });
  };

  // SoftAP 적용 핸들러
  const handleSoftapApply = () => {
    // 전송 전 추가 검증
    if (!softapInput?.interface) {
      toast.error('WiFi 인터페이스를 선택해주세요.', { id: 'softap-interface-required' });
      return;
    }

    if (softapInput?.enabled) {
      if (!softapInput?.ssid?.trim()) {
        toast.error('SSID를 입력해주세요.', { id: 'softap-ssid-required' });
        return;
      }
      if (!softapInput?.password?.trim()) {
        toast.error('비밀번호를 입력해주세요.', { id: 'softap-password-required' });
        return;
      }
    }

    const payload: SoftapSettings = softapInput?.enabled
      ? softapInput
      : {
          enabled: false,
          interface: softapInput?.interface || '',
          ssid: '', // 비활성화 시에는 빈 문자열
          password: '', // 비활성화 시에는 빈 문자열
          connectionName: 'hotspot', // 기본값
        };

    setSoftapMutation.mutate(payload, {
      onSuccess: response => {
        const message = response?.message || 'SoftAP 설정이 저장되었습니다.';
        toast.success(message, { id: 'system-softap-save-success' });
      },
      onError: (error: any) => {
        const message = error?.response?.data?.message || error?.response?.data?.error || 'SoftAP 설정 저장 실패';
        toast.error(message, { id: 'system-softap-save-error' });
      },
    });
  };

  // 절기 설정 관련 핸들러들 (DDCConfigurationPage에서 이동)
  const handleSeasonalChange = (field: keyof SeasonalData, value: number) => {
    setSeasonInput(prev => ({ ...prev, [field]: value }));
  };

  // 절기 설정 적용 핸들러
  const handleSeasonApply = async () => {
    if (seasonInput) {
      try {
        // season 필드는 readonly이므로 저장 시 제외
        const { season, ...seasonalToSave } = seasonInput;
        const result = await saveSeasonalMutation.mutateAsync(seasonalToSave);
        if (result.success) {
          const message = result.message || '절기 설정이 성공적으로 적용되었습니다.';
          toast.success(message, { id: 'system-season-save-success' });
        } else {
          const message = result.message || '절기 설정 적용 실패';
          toast.error(message, { id: 'system-season-save-error' });
        }
      } catch (error: any) {
        const message =
          error?.response?.data?.message || error?.response?.data?.error || '절기 설정 적용 중 오류가 발생했습니다.';
        toast.error(message, { id: 'system-season-save-error' });
      }
    }
  };

  // DDC 시간 동기화 핸들러
  const handleDdcTimeSync = () => {
    syncDdcTimeMutation.mutate(undefined, {
      onSuccess: response => {
        const message = response?.message || 'DDC 시간이 동기화되었습니다.';
        toast.success(message, { id: 'system-ddc-sync-success' });
        refetchDdcTime();
      },
      onError: (error: any) => {
        const message = error?.response?.data?.message || error?.response?.data?.error || 'DDC 시간 동기화 실패';
        toast.error(message, { id: 'system-ddc-sync-error' });
      },
    });
  };

  // 🔄 폴링 간격 설정 핸들러
  const handlePollingIntervalApply = async () => {
    try {
      const response = await setPollingIntervalMutation.mutateAsync(pollingIntervalInput);
      const message = response?.message || '폴링 간격이 설정되었습니다.';
      toast.success(message, { id: 'system-polling-interval-success' });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.response?.data?.error || '폴링 간격 설정에 실패했습니다.';
      toast.error(message, { id: 'system-polling-interval-error' });
      console.error('폴링 간격 설정 오류:', error);
    }
  };

  // 폴링 간격 포맷 함수
  const formatPollingInterval = (interval: number): string => {
    if (interval < 1000) return `${interval}ms`;
    if (interval < 60000) return `${interval / 1000}초`;
    return `${interval / 60000}분`;
  };

  const handlePeopleCounterToggle = async (enabled: boolean) => {
    try {
      await updatePeopleCounterMutation.mutateAsync(enabled);
      toast.success(enabled ? '피플카운터가 활성화되었습니다' : '피플카운터가 비활성화되었습니다', {
        id: 'people-counter-toggle',
      });
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || '피플카운터 설정 변경에 실패했습니다';
      toast.error(msg, { id: 'people-counter-toggle-error' });
    }
  };

  // 현재 시간을 1초마다 업데이트하는 useEffect
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // UI 렌더링
  return (
    <div className='space-y-2'>
      {/* 로그 패널 */}
      <TopLogPanel isConnected={isConnected} />

      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6'>
        {/* SoftAP 설정 */}
        <div
          style={{
            animationDelay: '0ms',
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          <SettingsCard
            icon={Wifi}
            title='SoftAP 설정'
            description='WiFi 핫스팟 설정'
            onApply={handleSoftapApply}
            applyDisabled={
              hasErrors('softap') ||
              // 인터페이스는 항상 필요 (비활성화 시에도)
              !softapInput?.interface ||
              // SoftAP 활성화 시에만 추가 필드들 필요
              (softapInput?.enabled && (!softapInput?.ssid || !softapInput?.password))
            }
            currentSettings={null}
            isLoading={setSoftapMutation.isPending}
          >
            {/* SoftAP 활성화 토글 */}
            <div className='flex items-center justify-between p-3 bg-muted rounded-lg'>
              <div>
                <span className='text-sm font-medium'>SoftAP 활성화</span>
                <p className='text-xs text-muted-foreground mt-1'>
                  현재: {softapStatus?.data?.enabled ? '활성화' : '비활성화'}
                </p>
              </div>
              <OnOffToggleButton
                checked={!!softapInput?.enabled}
                onChange={handleSoftapToggle}
                labelOn='ON'
                labelOff='OFF'
              />
            </div>
            {/* SoftAP 설정 입력들 */}
            <SelectWithCommand
              label='WiFi 인터페이스'
              value={softapInput?.interface || ''}
              onChange={value => handleInput('softap', 'interface', value)}
              placeholder='WiFi 인터페이스 선택...'
              description={`현재: ${firstWifiName || '설정되지 않음'}`}
              error={getFieldError('softap', 'interface')}
              disabled={!softapInput?.enabled}
              options={wifiInterfaceOptions}
              searchPlaceholder='WiFi 인터페이스 검색...'
              allowCustomInput={false}
            />
            <InputWithLabel
              label='WiFi 이름 (SSID)'
              value={softapInput?.ssid || ''}
              onChange={e => handleInput('softap', 'ssid', e.target.value)}
              placeholder='WiFi 이름을 입력하세요'
              description={`현재: ${softapStatus?.data?.ssid || '설정되지 않음'}`}
              error={getFieldError('softap', 'ssid')}
              disabled={!softapInput?.enabled}
              showDefaultValueButton={true}
              defaultValue='YouJobs'
            />
            <InputWithLabel
              label='WiFi 비밀번호'
              value={softapInput?.password || ''}
              onChange={e => handleInput('softap', 'password', e.target.value)}
              placeholder=''
              description={`입력된 값만 사용됩니다`}
              error={getFieldError('softap', 'password')}
              type='password'
              showPasswordToggle={true}
              showDefaultValueButton={true}
              defaultValue='1357913579'
              disabled={!softapInput?.enabled}
            />
            {/* WiFi 인터페이스 IPv4 (읽기 전용 표시) */}
            <InputWithLabel
              label='WiFi IPv4 (읽기 전용)'
              value={(() => {
                const iface = allIfaces.find((i: any) => i.name === softapInput?.interface);
                return iface?.ipv4?.split('/')?.[0] || '';
              })()}
              onChange={() => {}}
              placeholder=''
              description={`현재 WiFi 인터페이스의 IPv4 주소`}
              error={''}
              disabled={true}
            />
          </SettingsCard>
        </div>

        {/* 유선 네트워크 설정 */}
        <div
          style={{
            animationDelay: '100ms',
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          <SettingsCard
            icon={Network}
            title='유선 네트워크 설정'
            description='Ethernet 전용 IP/DHCP 설정'
            onApply={handleNetworkApply}
            applyDisabled={
              hasErrors('network') ||
              !networkInput ||
              !networkInput?.interface || // 인터페이스는 항상 필요
              // 정적 IP 모드 시: 추가 필드들 필요
              (!networkInput?.dhcp4 && (!networkInput?.ipv4 || !networkInput?.gateway || !networkInput?.subnetmask))
            }
            currentSettings={null}
            isLoading={setNetworkMutation.isPending}
          >
            {/* 네트워크 DHCP 토글 */}
            <div className='flex items-center justify-between p-3 bg-muted rounded-lg'>
              <div>
                <span className='text-sm font-medium'>DHCP 사용</span>
                <p className='text-xs text-muted-foreground mt-1'>
                  현재: {selectedIface?.dhcp4 !== undefined ? (selectedIface.dhcp4 ? 'ON' : 'OFF') : '알 수 없음'}
                </p>
              </div>
              <OnOffToggleButton
                checked={!!networkInput?.dhcp4}
                onChange={handleDhcpToggle}
                labelOn='ON'
                labelOff='OFF'
              />
            </div>
            {/* 네트워크 인터페이스 선택 */}
            <SelectWithCommand
              label='유선 네트워크 인터페이스'
              value={networkInput?.interface || ''}
              onChange={value => handleNetworkInterfaceSelect(value)}
              placeholder='유선 네트워크 인터페이스 선택...'
              description={`현재: ${currentWiredInterface || '설정되지 않음'}`}
              error={getFieldError('network', 'interface')}
              options={networkInterfaceOptions}
              searchPlaceholder='유선 네트워크 인터페이스 검색...'
              allowCustomInput={false}
            />

            {/* 네트워크 입력들 */}
            <InputWithLabel
              label='IP 주소'
              value={networkInput?.ipv4 || ''}
              onChange={e => handleInput('network', 'ipv4', e.target.value)}
              placeholder='IP 주소를 입력하세요 (예: 192.168.0.120)'
              description={`현재: ${(selectedIface?.ipv4 || '').split('/')?.[0] || '설정되지 않음'}`}
              error={getFieldError('network', 'ipv4')}
              disabled={networkInput?.dhcp4}
              showDefaultValueButton={true}
              defaultValue='192.168.0.120'
            />
            <InputWithLabel
              label='게이트웨이'
              value={networkInput?.gateway || ''}
              onChange={e => handleInput('network', 'gateway', e.target.value)}
              placeholder='게이트웨이를 입력하세요 (예: 192.168.0.1)'
              description={`현재: ${selectedIface?.gateway || '설정되지 않음'}`}
              error={getFieldError('network', 'gateway')}
              disabled={networkInput?.dhcp4}
              showDefaultValueButton={true}
              defaultValue='192.168.0.1'
            />
            <InputWithLabel
              label='서브넷 마스크'
              value={networkInput?.subnetmask || ''}
              onChange={e => handleInput('network', 'subnetmask', e.target.value)}
              placeholder='서브넷 마스크를 입력하세요 (예: 255.255.255.0)'
              description={`현재: ${selectedIface?.subnetmask || '설정되지 않음'}`}
              error={getFieldError('network', 'subnetmask')}
              disabled={networkInput?.dhcp4}
              showDefaultValueButton={true}
              defaultValue='255.255.255.0'
            />
            <InputWithLabel
              label='DNS 서버'
              value={networkInput?.nameservers?.[0] || ''}
              onChange={e => handleInput('network', 'nameservers', e.target.value)}
              placeholder='DNS 서버를 입력하세요 (예: 8.8.8.8)'
              description={`현재: ${(selectedIface?.dns && selectedIface?.dns[0]) || '설정되지 않음'}`}
              error={getFieldError('network', 'nameservers')}
              disabled={networkInput?.dhcp4}
              showDefaultValueButton={true}
              defaultValue='8.8.8.8'
            />
          </SettingsCard>
        </div>

        {/* NTP 설정 */}
        <div
          style={{
            animationDelay: '200ms',
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          <SettingsCard
            icon={Clock}
            title='NTP 설정'
            description='시스템 시간 동기화 설정'
            onApply={handleNtpApply}
            applyDisabled={hasErrors('ntp') || (!!ntpInput?.enabled && !ntpInput?.primaryServer)}
            currentSettings={null}
            isLoading={setNtpMutation.isPending}
          >
            {/* NTP 활성화 토글 */}
            {/* enabled는 실제 NTP 동기화 상태 (주석 처리 여부와 독립적) */}
            <div className='flex items-center justify-between p-3 bg-muted rounded-lg'>
              <div>
                <span className='text-sm font-medium'>NTP 서비스 활성화</span>
                <p className='text-xs text-muted-foreground mt-1'>
                  현재: {ntpStatus?.data?.enabled ? '활성화' : '비활성화'} (실제 동기화 상태)
                </p>
              </div>
              <OnOffToggleButton
                checked={!!ntpInput?.enabled}
                onChange={enabled => setNtpInput({ ...ntpInput, enabled } as NtpSettings)}
                labelOn='ON'
                labelOff='OFF'
              />
            </div>
            {/* NTP 상태 정보 */}
            {ntpStatus?.data && (
              <div className='p-3 bg-muted rounded-lg space-y-2'>
                {/* 동기화 상태 */}
                <div className='flex justify-between items-center'>
                  <span className='text-sm font-medium'>동기화 상태</span>
                  <Badge
                    variant={ntpStatus.data.synchronized ? 'default' : 'destructive'}
                    className={`text-xs ${
                      ntpStatus.data.synchronized
                        ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100'
                        : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {ntpStatus.data.synchronized ? '✅ 동기화됨' : '❌ 동기화 안됨'}
                  </Badge>
                </div>
                {/* 현재 시간 */}
                {ntpStatus.data.currentTime && (
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium'>현재 시간</span>
                    <span className='text-sm text-muted-foreground'>{ntpStatus.data.currentTime}</span>
                  </div>
                )}
                {/* 마지막 동기화 시간 */}
                {ntpStatus.data.lastSync && (
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium'>마지막 동기화</span>
                    <span className='text-sm text-muted-foreground'>{ntpStatus.data.lastSync}</span>
                  </div>
                )}
              </div>
            )}
            {/* NTP 입력들 */}
            <div>
              {/* 주 NTP 서버 */}
              <div className='mb-3'>
                <div className='flex items-center justify-between mb-1'>
                  <Label className='text-sm font-medium text-gray-700'>주 NTP 서버</Label>
                  <span className='text-xs text-gray-500 ml-2'>
                    현재: {ntpStatus?.data?.primaryServer || 'time.google.com'}{' '}
                    {ntpStatus?.data?.primaryServerCommented ? '(주석 처리됨)' : '(활성화됨)'}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Input
                    value={ntpInput?.primaryServer || ''}
                    onChange={e => handleInput('ntp', 'primaryServer', e.target.value)}
                    placeholder='NTP 서버 주소를 입력하세요 (예: time.google.com)'
                    disabled={!ntpInput?.enabled}
                    className={`flex-1 ${
                      getFieldError('ntp', 'primaryServer') ? 'border-red-400' : 'border-gray-300'
                    } ${!ntpInput?.enabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
                  />
                  <Button
                    variant='secondary'
                    size='sm'
                    className='gap-2 shrink-0'
                    onClick={async () => {
                      try {
                        const ip = (ntpInput?.primaryServer || '').trim();
                        const res = await checkNtpMutation.mutateAsync(ip);

                        // 백엔드에서 이미 성공/실패를 판단하여 응답
                        if (res.success) {
                          // 성공: 백엔드에서 200 상태 코드로 응답
                          const p = res.data?.primary;
                          const server = p?.timesync?.server || p?.ip || 'unknown';
                          const offset = p?.timesync?.offsetMs;
                          const stratum = p?.timesync?.stratum;
                          const link = res.data?.ifaceLink;

                          toast.success(
                            `✅ NTP 동기화 성공 - server: ${server}, offset: ${offset}ms, stratum: ${stratum}, link: ${link}`,
                            { id: 'ntp-check-success' }
                          );
                        } else {
                          // 실패: 백엔드에서 에러 정보 제공
                          const errorCode = res.error?.code || 'UNKNOWN';
                          const errorMessage = res.error?.message || '알 수 없는 오류';

                          toast.error(`❌ NTP 확인 실패 (${errorCode}) - ${errorMessage}`, { id: 'ntp-check-failure' });
                        }
                      } catch (e: any) {
                        // 네트워크 오류나 기타 예외
                        const errorData = e?.response?.data;
                        if (errorData?.error) {
                          toast.error(
                            `❌ NTP 확인 실패 (${errorData.error.code || 'SYSTEM_ERROR'}) - ${errorData.error.message}`,
                            { id: 'ntp-check-error' }
                          );
                        } else {
                          const msg = e?.message || 'NTP 확인 실패';
                          toast.error(msg, { id: 'ntp-check-error' });
                        }
                      }
                    }}
                    disabled={!ntpInput?.enabled || checkNtpMutation.isPending || !ntpInput?.primaryServer}
                  >
                    {checkNtpMutation.isPending ? (
                      <span className='inline-flex items-center gap-2'>
                        <Loader2 className='h-4 w-4 animate-spin' /> 확인 중...
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-2'>
                        <Network className='h-4 w-4' /> 연결 확인
                      </span>
                    )}
                  </Button>
                </div>
                {getFieldError('ntp', 'primaryServer') && (
                  <div className='text-xs text-red-500 mt-1'>{getFieldError('ntp', 'primaryServer')}</div>
                )}
              </div>
              {/* 주 NTP 서버 주석 처리 체크박스 */}
              <div className='mb-3 flex items-center gap-2'>
                <Checkbox
                  id='primary-server-commented'
                  checked={ntpInput?.primaryServerCommented || false}
                  onCheckedChange={checked => handleNtpCommentChange('primaryServerCommented', !!checked)}
                  disabled={!ntpInput?.enabled || !ntpInput?.primaryServer}
                />
                <label
                  htmlFor='primary-server-commented'
                  className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer'
                >
                  주석 처리됨
                </label>
              </div>
            </div>
            {/* Secondary NTP 서버 (편집 가능) */}
            <div>
              {/* 백업 NTP 서버 */}
              <div className='mb-3'>
                <div className='flex items-center justify-between mb-1'>
                  <Label className='text-sm font-medium text-gray-700'>백업 NTP 서버</Label>
                  <span className='text-xs text-gray-500 ml-2'>
                    현재: {ntpStatus?.data?.fallbackServer || '설정되지 않음'}{' '}
                    {ntpStatus?.data?.fallbackServerCommented
                      ? '(주석 처리됨)'
                      : ntpStatus?.data?.fallbackServer
                      ? '(활성화됨)'
                      : ''}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Input
                    value={ntpInput?.fallbackServer || ''}
                    onChange={e => handleInput('ntp', 'fallbackServer', e.target.value)}
                    placeholder='백업 NTP 서버 주소를 입력하세요 (예: ntp.ubuntu.com)'
                    disabled={!ntpInput?.enabled}
                    className={`flex-1 ${
                      getFieldError('ntp', 'fallbackServer') ? 'border-red-400' : 'border-gray-300'
                    } ${!ntpInput?.enabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
                  />
                  <Button
                    variant='secondary'
                    size='sm'
                    className='gap-2 shrink-0'
                    onClick={async () => {
                      try {
                        const fallbackServer = (ntpInput?.fallbackServer || '').trim();
                        if (!fallbackServer) {
                          toast.error('백업 NTP 서버 주소를 입력해주세요.', { id: 'ntp-fallback-check-no-ip' });
                          return;
                        }
                        const res = await checkNtpMutation.mutateAsync(fallbackServer);

                        // 백엔드에서 이미 성공/실패를 판단하여 응답
                        if (res.success) {
                          // 성공: 백엔드에서 200 상태 코드로 응답
                          const p = res.data?.primary;
                          const server = p?.timesync?.server || p?.ip || 'unknown';
                          const offset = p?.timesync?.offsetMs;
                          const stratum = p?.timesync?.stratum;
                          const link = res.data?.ifaceLink;

                          toast.success(
                            `✅ 백업 NTP 동기화 성공 - server: ${server}, offset: ${offset}ms, stratum: ${stratum}, link: ${link}`,
                            { id: 'ntp-fallback-check-success' }
                          );
                        } else {
                          // 실패: 백엔드에서 에러 정보 제공
                          const errorCode = res.error?.code || 'UNKNOWN';
                          const errorMessage = res.error?.message || '알 수 없는 오류';

                          toast.error(`❌ 백업 NTP 확인 실패 (${errorCode}) - ${errorMessage}`, {
                            id: 'ntp-fallback-check-failure',
                          });
                        }
                      } catch (e: any) {
                        // 네트워크 오류나 기타 예외
                        const errorData = e?.response?.data;
                        if (errorData?.error) {
                          toast.error(
                            `❌ 백업 NTP 확인 실패 (${errorData.error.code || 'SYSTEM_ERROR'}) - ${
                              errorData.error.message
                            }`,
                            { id: 'ntp-fallback-check-error' }
                          );
                        } else {
                          const msg = e?.message || '백업 NTP 확인 실패';
                          toast.error(msg, { id: 'ntp-fallback-check-error' });
                        }
                      }
                    }}
                    disabled={!ntpInput?.fallbackServer || checkNtpMutation.isPending || !ntpInput?.enabled}
                  >
                    {checkNtpMutation.isPending ? (
                      <span className='inline-flex items-center gap-2'>
                        <Loader2 className='h-4 w-4 animate-spin' /> 확인 중...
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-2'>
                        <Network className='h-4 w-4' /> 연결 확인
                      </span>
                    )}
                  </Button>
                </div>
                {getFieldError('ntp', 'fallbackServer') && (
                  <div className='text-xs text-red-500 mt-1'>{getFieldError('ntp', 'fallbackServer')}</div>
                )}
              </div>
              {/* 백업 NTP 서버 주석 처리 체크박스 */}
              <div className='mb-3 flex items-center gap-2'>
                <Checkbox
                  id='fallback-server-commented'
                  checked={ntpInput?.fallbackServerCommented || false}
                  onCheckedChange={checked => handleNtpCommentChange('fallbackServerCommented', !!checked)}
                  disabled={!ntpInput?.enabled || !ntpInput?.fallbackServer}
                />
                <label
                  htmlFor='fallback-server-commented'
                  className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer'
                >
                  주석 처리됨
                </label>
              </div>
            </div>
            <InputWithLabel
              label='타임존'
              value={ntpInput?.timezone || ''}
              onChange={e => handleInput('ntp', 'timezone', e.target.value)}
              placeholder='타임존을 입력하세요 (예: Asia/Seoul)'
              description={`현재: ${ntpStatus?.data?.timezone || '설정되지 않음'}`}
              error={getFieldError('ntp', 'timezone')}
              disabled={!ntpInput?.enabled}
              showDefaultValueButton={true}
              defaultValue='Asia/Seoul'
            />
          </SettingsCard>
        </div>

        {/* 절기 설정 - DDCConfigurationPage 스타일로 교체 */}
        <div
          style={{
            animationDelay: '300ms',
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          <SettingsCard
            icon={Sun}
            title='절기 설정'
            description='월별 여름/겨울 설정을 관리합니다.'
            onApply={handleSeasonApply}
            applyDisabled={false}
            currentSettings={null}
            isLoading={false}
            headerExtra={
              <Button
                variant='ghost'
                size='icon'
                onClick={async () => {
                  try {
                    const response = await refreshSeasonalMutation.mutateAsync();
                    const refreshed = response?.data?.seasonal;
                    if (refreshed) {
                      setSeasonInput(refreshed as SeasonalData);
                      toast.success(response?.message || '절기 설정을 다시 불러왔습니다.', {
                        id: 'seasonal-refresh-success',
                      });
                    } else {
                      toast.success('절기 설정을 다시 불러왔습니다.', { id: 'seasonal-refresh-success' });
                    }
                    await refetchSeasonal();
                  } catch (error: any) {
                    const message =
                      error?.response?.data?.message ||
                      error?.response?.data?.error ||
                      error?.message ||
                      '절기 설정 불러오기 실패';
                    toast.error(message, { id: 'seasonal-refresh-failure' });
                  }
                }}
                disabled={refreshSeasonalMutation.isPending || isSeasonalFetching}
              >
                <RefreshCcw
                  className={cn('h-4 w-4', (refreshSeasonalMutation.isPending || isSeasonalFetching) && 'animate-spin')}
                />
              </Button>
            }
          >
            <div className='space-y-4'>
              {/* 현재 월 동작절기 설정 */}
              <div className='flex items-center space-x-4'>
                <span className='text-sm font-medium text-gray-700'>현재 월 동작절기:</span>
                <span
                  className={`text-sm font-medium px-3 py-1 rounded ${
                    currentMonthSeasonValue === 1
                      ? 'bg-orange-100 text-orange-800 border border-orange-300'
                      : 'bg-primary/10 text-primary border border-primary/30'
                  }`}
                >
                  {currentMonthSeasonValue === 1 ? '하절기' : '동절기'}
                </span>
              </div>

              {/* 월별 설정 */}
              <div className='grid grid-cols-3 border border-gray-200 rounded-md overflow-hidden'>
                {Object.entries(monthNames).map(([month, name], index) => {
                  const monthKey =
                    month === '1'
                      ? 'january'
                      : month === '2'
                      ? 'february'
                      : month === '3'
                      ? 'march'
                      : month === '4'
                      ? 'april'
                      : month === '5'
                      ? 'may'
                      : month === '6'
                      ? 'june'
                      : month === '7'
                      ? 'july'
                      : month === '8'
                      ? 'august'
                      : month === '9'
                      ? 'september'
                      : month === '10'
                      ? 'october'
                      : month === '11'
                      ? 'november'
                      : 'december';
                  const value = (seasonInput as any)[monthKey] || 0;
                  const colIndex = index % 3;
                  const rowIndex = Math.floor(index / 3);
                  const isLastCol = colIndex === 2;
                  const isLastRow = rowIndex === 3;

                  return (
                    <div
                      key={month}
                      className={`flex items-center justify-center p-1 ${
                        !isLastCol ? 'border-r border-gray-200' : ''
                      } ${!isLastRow ? 'border-b border-gray-200' : ''}`}
                    >
                      <Button
                        variant={value === 1 ? 'default' : 'default'}
                        className={`w-full h-auto px-3 py-2 font-semibold text-xs flex flex-col items-center justify-center gap-1.5 ${
                          value === 1
                            ? 'bg-orange-500 hover:bg-orange-600 text-white' // 여름: 주황색
                            : 'bg-primary hover:bg-primary/90 text-white' // 겨울: 그린 계열
                        }`}
                        onClick={() => handleSeasonalChange(monthKey as keyof SeasonalData, value === 1 ? 0 : 1)}
                        type='button'
                      >
                        <span className='leading-none'>{name}</span>
                        <span className='leading-none text-[10px]'>{value === 1 ? '여름' : '겨울'}</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* DDC 시간 설정 */}
        <div
          style={{
            animationDelay: '400ms',
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          <SettingsCard
            icon={Clock}
            title='DDC 시간 설정'
            description='DDC 시간 동기화 설정'
            onApply={handleDdcTimeSync}
            applyDisabled={false}
            currentSettings={null}
            isLoading={syncDdcTimeMutation.isPending}
            applyButtonText='동기화'
            headerExtra={
              <Button
                variant='ghost'
                size='icon'
                onClick={async () => {
                  try {
                    const response = await refreshDdcTimeMutation.mutateAsync();
                    const message = response?.message || 'DDC 시간을 다시 불러왔습니다.';
                    toast.success(message, { id: 'system-ddc-refresh-success' });
                    await refetchDdcTime();
                  } catch (error: any) {
                    const message =
                      error?.response?.data?.message || error?.response?.data?.error || 'DDC 시간 불러오기 실패';
                    toast.error(message, { id: 'system-ddc-refresh-error' });
                  }
                }}
                disabled={refreshDdcTimeMutation.isPending || isDdcTimeFetching}
              >
                <RefreshCcw
                  className={cn('h-4 w-4', (refreshDdcTimeMutation.isPending || isDdcTimeFetching) && 'animate-spin')}
                />
              </Button>
            }
          >
            {/* 현재시간 표시 */}
            <div className='flex items-center justify-between p-3 bg-muted rounded-lg'>
              <div>
                <span className='text-sm font-medium'>현재시간</span>
                <p className='text-xs text-muted-foreground mt-1'>
                  {currentTime.toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                    timeZone: 'Asia/Seoul',
                  })}
                </p>
              </div>
            </div>

            {/* DDC시간 표시 */}
            <div className='flex items-center justify-between p-3 bg-muted rounded-lg'>
              <div>
                <span className='text-sm font-medium'>DDC시간</span>
                <p className='text-xs text-muted-foreground mt-1'>
                  {ddcTimeData?.data?.ddcTime
                    ? `${ddcTimeData.data.ddcTime.year || '0000'}-${(ddcTimeData.data.ddcTime.month || 0)
                        .toString()
                        .padStart(2, '0')}-${(ddcTimeData.data.ddcTime.day || 0).toString().padStart(2, '0')} ${(
                        ddcTimeData.data.ddcTime.hour || 0
                      )
                        .toString()
                        .padStart(2, '0')}:${(ddcTimeData.data.ddcTime.minute || 0).toString().padStart(2, '0')}:${(
                        ddcTimeData.data.ddcTime.second || 0
                      )
                        .toString()
                        .padStart(2, '0')}`
                    : '동기화 필요'}
                </p>
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* DDC 폴링 간격 설정 */}
        <div
          style={{
            animationDelay: '500ms',
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          <SettingsCard
            icon={Cpu}
            title='DDC 폴링 간격'
            description='데이터 수집 주기 설정'
            onApply={handlePollingIntervalApply}
            applyDisabled={false}
            currentSettings={null}
            isLoading={setPollingIntervalMutation.isPending}
            applyButtonText='적용'
          >
            {/* 현재 폴링 간격 표시 */}
            <div className='flex items-center justify-between p-3 bg-muted rounded-lg'>
              <div>
                <span className='text-sm font-medium'>현재 폴링 간격</span>
                <p className='text-xs text-muted-foreground mt-1'>
                  {pollingIntervalData?.data?.pollingInterval
                    ? formatPollingInterval(pollingIntervalData.data.pollingInterval)
                    : '로딩 중...'}
                </p>
              </div>
            </div>

            {/* 폴링 간격 선택 */}
            <SelectWithLabel
              label='폴링 간격'
              value={pollingIntervalInput.toString()}
              onValueChange={value => setPollingIntervalInput(parseInt(value))}
              placeholder='폴링 간격 선택'
              description='데이터 수집 주기를 설정합니다'
            >
              <SelectItem value='10000'>10초</SelectItem>
              <SelectItem value='20000'>20초</SelectItem>
              <SelectItem value='30000'>30초</SelectItem>
              <SelectItem value='60000'>1분</SelectItem>
              <SelectItem value='120000'>2분</SelectItem>
            </SelectWithLabel>
          </SettingsCard>
        </div>

        {/* 피플카운터 Enable/Disable */}
        <div
          style={{
            animationDelay: '600ms',
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          <SettingsCard
            icon={Users}
            title='피플카운터'
            description='입장 인원 계수 기능 사용 여부 (APC100 등)'
          >
            <div className='flex items-center justify-between p-3 bg-muted rounded-lg'>
              <div>
                <span className='text-sm font-medium'>피플카운터</span>
                <p className='text-xs text-muted-foreground mt-1'>
                  {updatePeopleCounterMutation.isPending
                    ? '적용 중...'
                    : peopleCounterData?.peopleCounterEnabled
                      ? '활성화'
                      : '비활성화'}
                </p>
              </div>
              <span className={cn(updatePeopleCounterMutation.isPending && 'opacity-50 pointer-events-none')}>
                <OnOffToggleButton
                  checked={!!peopleCounterData?.peopleCounterEnabled}
                  onChange={handlePeopleCounterToggle}
                  labelOn='ON'
                  labelOff='OFF'
                />
              </span>
            </div>
            <p className='text-xs text-muted-foreground'>
              피플카운터 장비가 연결된 경우에만 활성화하세요. 비활성화 시 해당 기능이 동작하지 않습니다.
            </p>
          </SettingsCard>
        </div>

        {/* 시스템 재기동 카드 */}
        <div
          style={{
            animationDelay: '700ms',
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          <SettingsCard icon={Cpu} title='시스템 재기동' description='호스트 PC 또는 백엔드 서비스를 재시작합니다'>
            <div className='space-y-4'>
              {/* 호스트 PC 재기동 */}
              <div className='flex flex-col gap-2'>
                <h4 className='text-sm font-medium'>호스트 PC 재기동</h4>
                <p className='text-xs text-muted-foreground'>
                  전체 시스템을 완전히 재시작합니다. 진행 중인 모든 작업이 종료됩니다.
                </p>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={() => {
                    if (window.confirm('호스트 PC를 재기동하시겠습니까? 진행 중인 모든 작업이 종료됩니다.')) {
                      restartHostSystemMutation.mutate(undefined, {
                        onSuccess: response => {
                          const message = response?.message || '호스트 PC 재기동이 시작되었습니다';
                          toast.success(message);
                        },
                        onError: (error: any) => {
                          const message =
                            error?.response?.data?.message ||
                            error?.response?.data?.error ||
                            '호스트 PC 재기동에 실패했습니다';
                          toast.error(message);
                        },
                      });
                    }
                  }}
                  disabled={restartHostSystemMutation.isPending || restartBackendMutation.isPending}
                  className='w-fit'
                >
                  {restartHostSystemMutation.isPending ? '재기동 중...' : '호스트 PC 재기동'}
                </Button>
              </div>

              {/* 백엔드 재기동 */}
              <div className='flex flex-col gap-2'>
                <h4 className='text-sm font-medium'>백엔드 재기동</h4>
                <p className='text-xs text-muted-foreground'>
                  백엔드 서비스만 재시작합니다. 서비스가 잠시 중단될 수 있습니다.
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    if (window.confirm('백엔드 서비스를 재기동하시겠습니까? 서비스가 잠시 중단될 수 있습니다.')) {
                      restartBackendMutation.mutate(undefined, {
                        onSuccess: response => {
                          const message = response?.message || '백엔드 재기동이 시작되었습니다';
                          toast.success(message);
                        },
                        onError: (error: any) => {
                          const message =
                            error?.response?.data?.message ||
                            error?.response?.data?.error ||
                            '백엔드 재기동에 실패했습니다';
                          toast.error(message);
                        },
                      });
                    }
                  }}
                  disabled={restartHostSystemMutation.isPending || restartBackendMutation.isPending}
                  className='w-fit'
                >
                  {restartBackendMutation.isPending ? '재기동 중...' : '백엔드 재기동'}
                </Button>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsPage;
