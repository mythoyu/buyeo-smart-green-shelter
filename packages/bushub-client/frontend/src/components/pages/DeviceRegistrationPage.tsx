import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Building, Lightbulb, Fan, Thermometer, DoorOpen, Activity, Gauge, Train, Leaf } from 'lucide-react';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// React Query 훅들을 직접 import
import { ClientInfoDto } from '../../api/dto';
import { useRegisterDevice } from '../../api/queries';
import { useGetPollingState, useUpdatePollingState } from '../../api/queries/polling';
import { useDeviceRegistrationData } from '../../hooks/useDeviceRegistrationData';
import { useWebSocket } from '../../hooks/useWebSocket';
import DeviceUnitDialog from '../common/DeviceUnitDialog';
import { EmptyState } from '../common/EmptyState';
import { PollingDialog } from '../common/PollingDialog';
import { ProcessDialog } from '../common/ProcessDialog';
import { TopLogPanel } from '../common/TopLogPanel';
import { Card, CardContent, Input } from '../ui';

interface DeviceRegistrationPageProps {
  // 현재는 사용되지 않으므로 주석 처리
  // onRegistrationComplete?: () => void;
}

// ClientInfoDto를 사용하므로 로컬 Client 인터페이스 제거

interface Device {
  id: string;
  name: string;
  type: string;
  commands?: any[];
  units: Unit[];
}

interface Unit {
  id: string;
  name: string;
  type?: string;
}

interface UnitConfig {
  power?: boolean;
  connection?: boolean;
  start_time_1?: string;
  end_time_1?: string;
  start_time_2?: string;
  end_time_2?: string;
  [key: string]: any;
}

interface ModbusConfig {
  slaveId: number;
  baudRate: number;
  port: string;
  deviceType: string;
  commands: any[];
}

const DeviceRegistrationPage: React.FC<DeviceRegistrationPageProps> = () => {
  // DeviceRegistrationPage 전용 훅 사용
  const { currentClient, clients } = useDeviceRegistrationData();

  // React Query 클라이언트와 mutation 훅들
  const queryClient = useQueryClient();
  const registerDeviceMutation = useRegisterDevice();
  const navigate = useNavigate();
  const location = useLocation();
  const toastShownRef = useRef(false);

  const { isConnected } = useWebSocket({});
  // 라우트 가드에서 온 경우 안내 토스트 1회 표시
  useEffect(() => {
    if (toastShownRef.current) return;
    const state = location.state as { reason?: string } | null;
    if (state?.reason === 'client_missing') {
      toastShownRef.current = true;
      toast.info('클라이언트가 아직 등록되지 않았습니다. 장비 등록 페이지로 이동했습니다.', {
        duration: 2500,
        id: 'client-missing-redirect',
      });
      navigate('.', { replace: true, state: null });
    }
  }, [location.key, location.state, navigate]);

  // 폴링 상태 관리
  const { data: pollingState, isLoading: pollingLoading } = useGetPollingState();
  const updatePollingMutation = useUpdatePollingState();

  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientInfoDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ProcessDialog 상태 관리 추가
  const [processDialog, setProcessDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    progress: number;
    status: 'processing' | 'completed' | 'error';
  }>({
    isOpen: false,
    title: '',
    description: '',
    progress: 0,
    status: 'processing',
  });

  // 폴링 다이얼로그 상태 관리
  const [pollingDialog, setPollingDialog] = useState<{
    isOpen: boolean;
    hasShown: boolean;
  }>({
    isOpen: false,
    hasShown: false,
  });

  // 현재 선택된 클라이언트 정보 확인
  React.useEffect(() => {
    if (currentClient && clients.length > 0) {
      const matchingClient = clients.find((c: any) => c.id === currentClient.id);
      if (matchingClient) {
        console.log('현재 선택된 클라이언트:', matchingClient.name);
      }
    }
  }, [currentClient, clients]);

  // 페이지 진입 시 폴링 상태 확인
  useEffect(() => {
    if (!pollingLoading && pollingState?.pollingEnabled && !pollingDialog.hasShown) {
      // 폴링이 활성화된 상태로 진입한 경우
      setPollingDialog({
        isOpen: true,
        hasShown: true,
      });
    }
  }, [pollingState, pollingLoading, pollingDialog.hasShown]);

  // 폴링 상태 변경 감지 (진입 후)
  useEffect(() => {
    if (!pollingLoading && pollingState?.pollingEnabled && pollingDialog.hasShown) {
      // 폴링 상태가 변경되어 활성화된 경우
      setPollingDialog(prev => ({
        ...prev,
        isOpen: true,
      }));
    }
  }, [pollingState?.pollingEnabled, pollingLoading, pollingDialog.hasShown]);

  // 클라이언트 등록 상태 확인 로직 추가
  const isClientRegistered = useMemo(() => {
    return currentClient && currentClient.id === selectedClient?.id;
  }, [currentClient, selectedClient]);

  const isDifferentClient = useMemo(() => {
    return selectedClient && currentClient && currentClient.id !== selectedClient.id;
  }, [currentClient, selectedClient]);

  // 필터링 (전체 클라이언트 목록에서 필터링 - 검색만 사용)
  const filteredClients = useMemo(
    () =>
      clients.filter((c: any) => {
        const searchMatch = !search || c.name.includes(search) || c.location.includes(search);
        return searchMatch;
      }),
    [clients, search]
  );

  const handleSearchChange = useCallback((searchTerm: string) => {
    setSearch(searchTerm);
  }, []);

  const handleClientSelect = useCallback((client: ClientInfoDto) => {
    console.log('클라이언트 클릭:', { clientId: client.id, clientName: client.name });
    setSelectedClient(client);
  }, []);

  const handleOverlayClose = useCallback(() => {
    setOverlayClient(null);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSelectedClient(null);
    }
  }, []);

  // 폴링 다이얼로그 액션 핸들러
  const handlePollingAction = useCallback(
    (action: 'redirect' | 'stop') => {
      switch (action) {
        case 'redirect':
          navigate('/dashboard', { replace: true });
          break;
        case 'stop':
          updatePollingMutation.mutate(false);
          setPollingDialog(prev => ({ ...prev, isOpen: false }));
          break;
      }
    },
    [navigate, updatePollingMutation]
  );

  const handlePollingDialogClose = useCallback(() => {
    setPollingDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 장비별로 유닛을 묶는 그룹핑 함수 (모드버스 commands 포함)
  const getGroupedDevices = useCallback((client: any) => {
    if (!client || !client.devices) return [];

    return client.devices.map((device: any) => ({
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type,
      commands: device.commands || [], // 모드버스 commands 추가
      units: device.units.map((unit: any) => ({
        unitId: unit.id,
        unitName: unit.name,
        unitType: device.type,
      })),
    }));
  }, []);

  // 현장 타입에 따라 아이콘을 다르게 반환
  const getSiteIcon = useCallback((client: ClientInfoDto) => {
    if (client.type === 'sm-shelter') {
      return <Train className='h-7 w-7 text-primary' />;
    }
    if (client.type === 'sm-restplace') {
      return <Leaf className='h-7 w-7 text-primary' />;
    }
    return <MapPin className='h-7 w-7 text-primary' />; // 기본값 (나머지 타입)
  }, []);

  // 장비명에 따라 아이콘을 다르게 반환
  const getDeviceIcon = useCallback((deviceName: string) => {
    if (deviceName.includes('조명')) return <Lightbulb className='h-5 w-5 text-yellow-400' />;
    if (deviceName.includes('냉난방기')) return <Fan className='h-5 w-5 text-blue-400' />;
    if (deviceName.includes('전열교환기')) return <Thermometer className='h-5 w-5 text-red-400' />;
    if (deviceName.includes('에어커튼')) return <Fan className='h-5 w-5 text-cyan-400' />;
    if (deviceName.includes('온열벤치')) return <Activity className='h-5 w-5 text-orange-400' />;
    if (deviceName.includes('자동문')) return <DoorOpen className='h-5 w-5 text-green-400' />;
    if (deviceName.includes('통합센서')) return <Gauge className='h-5 w-5 text-purple-400' />;
    if (deviceName.includes('외부스위치')) return <Gauge className='h-5 w-5 text-gray-400' />;
    return <Gauge className='h-5 w-5 text-gray-300' />; // 기본값
  }, []);

  // 장비 오버레이 상태 관리
  const [overlayClient, setOverlayClient] = useState<ClientInfoDto | null>(null);

  // 유닛별 설정값 상태 관리
  const [unitConfigs, setUnitConfigs] = useState<Record<string, UnitConfig>>({});
  // 장비별 modbus 설정 상태 관리 (unitId 기준)
  const [unitModbus, setUnitModbus] = useState<Record<string, ModbusConfig>>({});

  // 유닛별 설정값/모드버스 초기화 (selectedClient가 바뀔 때마다)
  React.useEffect(() => {
    if (!selectedClient) return;
    const groupedDevices = getGroupedDevices(selectedClient);
    const newConfigs: Record<string, any> = {};
    const newModbus: Record<string, any> = {};

    groupedDevices.forEach((device: any) => {
      device.units.forEach((unit: any) => {
        // 백엔드에서 가져온 모드버스 commands 기반으로 초기값 설정
        const deviceCommands = device.commands || [];
        const initialConfig: Record<string, any> = {};

        // 각 command의 defaultValue로 초기화
        deviceCommands.forEach((command: any) => {
          if (command.defaultValue !== undefined) {
            initialConfig[command.key] = command.defaultValue;
          }
        });

        // 기본값이 없는 경우 기본값 설정
        if (!initialConfig.power) initialConfig.power = false;
        if (!initialConfig.connection) initialConfig.connection = true;
        if (!initialConfig.start_time_1) initialConfig.start_time_1 = '08:00';
        if (!initialConfig.end_time_1) initialConfig.end_time_1 = '18:00';
        if (!initialConfig.start_time_2) initialConfig.start_time_2 = '19:00';
        if (!initialConfig.end_time_2) initialConfig.end_time_2 = '06:00';

        newConfigs[unit.unitId] = initialConfig;

        // 모드버스 설정 초기화
        newModbus[unit.unitId] = {
          slaveId: 1,
          baudRate: 9600,
          port: 'DATA1',
          deviceType: device.deviceType,
          commands: deviceCommands,
        };
      });
    });

    setUnitConfigs(newConfigs);
    setUnitModbus(newModbus);
  }, [selectedClient, getGroupedDevices]);

  const handleConfigChange = useCallback((unitId: string, key: string, value: any) => {
    setUnitConfigs(prev => ({
      ...prev,
      [unitId]: {
        ...prev[unitId],
        [key]: value,
      },
    }));
  }, []);

  const handleSave = async (payload?: boolean | { id: string; initialize: boolean }) => {
    if (!selectedClient) return;

    const initializeHardware = typeof payload === 'object' ? payload.initialize : !!payload;
    const clientId = typeof payload === 'object' ? payload.id : selectedClient.id;

    // ProcessDialog 열기 - UI 조작 차단
    setProcessDialog({
      isOpen: true,
      title: '클라이언트 초기화',
      description: initializeHardware
        ? '하드웨어 초기화를 포함한 클라이언트 설정을 진행하고 있습니다...'
        : '클라이언트 설정을 진행하고 있습니다...',
      progress: 0,
      status: 'processing',
    });

    // 30초 타임아웃 설정
    const timeoutId = setTimeout(() => {
      setProcessDialog(prev => ({
        ...prev,
        progress: 0,
        status: 'error',
        description: '2분 타임아웃이 발생했습니다. 다시 시도해주세요.',
      }));
    }, 120000); // 2분 (백엔드와 일치)

    try {
      // 장비/유닛 정보를 백엔드 형식에 맞게 변환
      const groupedDevices = getGroupedDevices(selectedClient);
      const devicesData = groupedDevices.map((device: any) => ({
        id: device.deviceId,
        name: device.deviceName,
        type: device.deviceType,
        commands: device.commands || [],
        units: device.units.map((unit: any) => ({
          id: unit.unitId,
          name: unit.unitName,
          type: unit.unitType,
          status: 0,
          config: unitConfigs[unit.unitId] || {},
          modbus: unitModbus[unit.unitId] || undefined,
        })),
      }));

      // 클라이언트 정보와 devices를 합쳐서 전달
      const clientPayload = {
        id: clientId,
        initialize: initializeHardware || false,
      };

      console.log('POST /client 요청 body:', clientPayload);

      // POST /client API 호출
      await registerDeviceMutation.mutateAsync(clientPayload);

      // 성공 시 타임아웃 취소 및 ProcessDialog 완료 상태로 변경
      clearTimeout(timeoutId);
      setProcessDialog(prev => ({
        ...prev,
        progress: 100,
        status: 'completed',
        description: '클라이언트 초기화가 완료되었습니다.',
      }));

      // 2초 후 다이얼로그 닫기
      setTimeout(() => {
        setProcessDialog(prev => ({ ...prev, isOpen: false }));
        setSelectedClient(null);
      }, 2000);

      toast.success('장비/유닛 등록이 완료되었습니다.', { id: 'device-registration-success' });

      // 관련 쿼리 자동 무효화
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    } catch (error) {
      // 실패 시 타임아웃 취소 및 ProcessDialog 에러 상태로 변경
      clearTimeout(timeoutId);
      setProcessDialog(prev => ({
        ...prev,
        progress: 0,
        status: 'error',
        description: '클라이언트 초기화 중 오류가 발생했습니다.',
      }));

      console.error('저장 실패:', error);
      toast.error('장비/유닛 등록 중 오류가 발생했습니다.', { id: 'device-registration-error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='space-y-2'>
      {/* 로그 패널 */}
      <TopLogPanel isConnected={isConnected} />

      {/* 상단 필터바 */}
      <Card>
        <CardContent className='px-6'>
          <div className='flex flex-col sm:flex-row gap-4 items-stretch sm:items-center'>
            <div className='flex-1 min-w-0'>
              <Input
                placeholder='현장명/주소 검색'
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                className='w-full'
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 클라이언트 목록 */}
      <div key={search} className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2'>
        {filteredClients.length === 0 ? (
          <div className='col-span-full animate-in fade-in duration-300'>
            <EmptyState
              icon={<Building className='h-16 w-16 text-muted-foreground' />}
              title='현장이 없습니다'
              description='필터 조건에 맞는 현장이 없습니다.'
            />
          </div>
        ) : (
          filteredClients.map((client, index) => (
            <Card
              key={client.id}
              className={`cursor-pointer hover:bg-primary/10 transition-all duration-300
                  ${
                    selectedClient && selectedClient.id === client.id
                      ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                      : currentClient && currentClient.id === client.id
                      ? 'border-primary'
                      : ''
                  }`}
              data-selected={selectedClient && selectedClient.id === client.id}
              data-client-id={client.id}
              data-selected-id={selectedClient?.id}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.6s ease-out forwards',
              }}
              onClick={() => handleClientSelect(client)}
            >
              <CardContent className='flex flex-col items-center p-8 relative'>
                {/* 현재 선택된 클라이언트 표시 */}
                {currentClient && currentClient.id === client.id && (
                  <div className='absolute top-0 right-4 z-10'>
                    <div className='bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full shadow-lg'>
                      선택됨
                    </div>
                  </div>
                )}

                <div className='w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3'>
                  {getSiteIcon(client)}
                </div>
                <div className='text-xl font-bold text-center'>{client.name}</div>
                <div className='text-xs text-muted-foreground font-semibold mt-2'>{client.city}</div>
                <div className='text-muted-foreground text-sm mt-1 text-center'>{client.location}</div>

                {/* 디바이스 정보 표시 */}
                {client.devices && client.devices.length > 0 && (
                  <div className='mt-4 w-full'>
                    <div className='text-xs text-muted-foreground font-medium mb-2'>등록된 장비</div>
                    <div className='flex items-center gap-1 justify-center overflow-hidden'>
                      {client.devices.slice(0, 3).map((device: any) => (
                        <div
                          key={device.id}
                          className='flex items-center gap-1 bg-muted px-2 py-1 rounded-full flex-shrink-0'
                        >
                          {getDeviceIcon(device.name)}
                          <span className='text-xs truncate max-w-16'>{device.name}</span>
                        </div>
                      ))}
                      {client.devices.length > 3 && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setOverlayClient(client);
                          }}
                          className='text-xs text-primary hover:text-primary/80 font-medium bg-muted px-2 py-1 rounded-full hover:bg-accent transition-colors'
                        >
                          +{client.devices.length - 3}개
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 장비/유닛 상세 다이얼로그 */}
      <DeviceUnitDialog
        selectedClient={selectedClient}
        handleSave={handleSave}
        isSaving={isSaving}
        onOpenChange={handleDialogOpenChange}
        getGroupedDevices={getGroupedDevices}
        isClientRegistered={isClientRegistered}
        isDifferentClient={isDifferentClient}
        onSuccess={() => {
          // 성공 시 대시보드로 이동
          // window.location.href = '/dashboard';
        }}
      />

      {/* ProcessDialog 추가 */}
      <ProcessDialog
        isOpen={processDialog.isOpen}
        title={processDialog.title}
        description={processDialog.description}
        progress={processDialog.progress}
        status={processDialog.status}
        onClose={() => setProcessDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* 폴링 다이얼로그 추가 */}
      <PollingDialog
        isOpen={pollingDialog.isOpen}
        title='폴링이 활성화되어 있습니다'
        message='현재 폴링이 실행 중입니다. 실시간 모니터링이 재개되었습니다.'
        onAction={handlePollingAction}
        onClose={handlePollingDialogClose}
      />
    </div>
  );
};

export default DeviceRegistrationPage;
