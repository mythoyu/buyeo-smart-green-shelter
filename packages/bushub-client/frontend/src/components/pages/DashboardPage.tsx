import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Filter, LayoutGrid, Settings2 } from 'lucide-react';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

import { useExecuteDeviceAction } from '../../api/queries/device';
import { useRightSidebarContent } from '../../hooks/useRightSidebarContent';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getDeviceActions, getActionInfo, type ActionKey } from '../../meta/actions/deviceActions';
import { DashboardFilterBar } from '../common/DashboardFilterBar';
import DeviceListShowDetail from '../common/DeviceListShowDetail/index';
import { DeviceListShowDetailHandle, type DeviceCardVariant } from '../common/DeviceListShowDetail/types';
import SettingsCard from '../common/SettingsCard';
import { RightSidebarItem } from '../layout/RightSidebar';
import { TopLogPanel } from '../common/TopLogPanel';
import { Alert, AlertDescription, Button } from '../ui';
import ModeControlCard from '../common/ModeControlCard';

// 🆕 deviceTypeMap을 컴포넌트 외부로 이동하여 재생성 방지
const DEVICE_TYPE_MAP: Record<string, string> = {
  d021: 'cooler',
  d022: 'exchanger',
  d023: 'aircurtain',
  d011: 'lighting',
  d041: 'bench',
  d051: 'door',
  d061: 'integrated_sensor',
  d081: 'externalsw',
  d082: 'people_counter',
};

const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const deviceListRef = useRef<DeviceListShowDetailHandle>(null);

  // 🆕 실제 사용되는 데이터만 가져오기 (불필요한 데이터 제거)
  const { devices = [], deviceSpecs = {}, deviceStyles = {}, error } = useDashboardData();

  // 3단계: Action 실행을 위한 React Query mutation
  const executeActionMutation = useExecuteDeviceAction();

  // 기존 상태 관리 유지
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [showModeControl, setShowModeControl] = useState<boolean>(false);
  const [showCardSettings, setShowCardSettings] = useState<boolean>(false);
  const [cardVariant, setCardVariant] = useState<DeviceCardVariant>(() => {
    if (typeof window === 'undefined') {
      return 'panel';
    }
    const saved = window.localStorage.getItem('dashboard-card-variant') as DeviceCardVariant | null;
    return saved ?? 'panel';
  });
  const { isConnected } = useWebSocket({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('dashboard-card-variant', cardVariant);
  }, [cardVariant]);

  // 🆕 필터링 로직 최적화 - 의존성 배열 최소화
  const filteredDevices = useMemo(() => {
    if (!devices || devices.length === 0) return [];

    // 🆕 필터링 조건을 미리 계산하여 불필요한 반복 방지
    const isAllType = selectedType === 'all';
    const isAllStatus = selectedStatus === 'all';

    // 🆕 모든 필터가 'all'인 경우 원본 배열 반환 (최적화)
    if (isAllType && isAllStatus) {
      return devices;
    }

    // 🆕 필터링 로직 최적화 - 타입 안전한 비교
    return devices.filter(device => {
      const typeMatch = isAllType || device.type === selectedType;
      // status를 number로 변환하여 타입 안전한 비교
      const deviceStatus = Number(device.status ?? 0);
      const selectedStatusNum = Number(selectedStatus);
      const statusMatch = isAllStatus || deviceStatus === selectedStatusNum;
      return typeMatch && statusMatch;
    });
  }, [devices, selectedType, selectedStatus]);

  // 🆕 필터 변경 핸들러 최적화
  const handleSelectType = useCallback((type: string) => {
    setSelectedType(type);
  }, []);

  const handleSelectStatus = useCallback((status: string) => {
    setSelectedStatus(status);
  }, []);

  // 🆕 Action 기반 제어 함수들을 React Query mutation으로 최적화
  const executeDeviceAction = useCallback(
    async (deviceId: string, unitId: string, action: ActionKey, value?: any) => {
      try {
        // 장비 타입을 deviceId로 직접 매핑
        const deviceType = DEVICE_TYPE_MAP[deviceId] || 'exchanger';

        // Action 정보 가져오기
        const actionInfo = getActionInfo(deviceType, action);
        if (!actionInfo) {
          toast.error(`지원하지 않는 Action: ${action}`, { id: `dashboard-action-unsupported-${action}` });
          return;
        }

        // 값 검증
        if (actionInfo.minValue !== undefined && actionInfo.maxValue !== undefined) {
          if (value < actionInfo.minValue || value > actionInfo.maxValue) {
            toast.error(`${actionInfo.name}: ${actionInfo.minValue}~${actionInfo.maxValue} 범위의 값을 입력하세요`, {
              id: `dashboard-action-validate-${action}`,
            });
            return;
          }
        }

        // React Query mutation 실행
        const result = await executeActionMutation.mutateAsync({
          deviceId,
          unitId,
          action,
          value: value ?? actionInfo.defaultValue,
        });

        if (result.success) {
          toast.success(`${actionInfo.name} 실행 완료`, { id: `dashboard-action-success-${action}` });

          // 🆕 쿼리 무효화 최적화 - 필요한 것만 선택적으로 무효화
          // 전체 상태는 변경되지 않았으므로 무효화하지 않음
          // queryClient.invalidateQueries({ queryKey: ['clientStatus'] });
          // queryClient.invalidateQueries({ queryKey: ['clientData'] });

          // 🆕 변경된 장비/유닛의 데이터만 새로고침
          queryClient.invalidateQueries({ queryKey: ['deviceStatus', deviceId] });
          queryClient.invalidateQueries({ queryKey: ['deviceData', deviceId] });

          // 🆕 관련된 장비 목록만 새로고침 (전체 목록이 아닌)
          queryClient.invalidateQueries({
            queryKey: ['dashboardData'],
            exact: false,
          });
        } else {
          toast.error(`${actionInfo.name} 실행 실패`, { id: `dashboard-action-error-${action}` });
        }
      } catch (error) {
        console.error('Action 실행 오류:', error);
        toast.error('Action 실행 중 오류가 발생했습니다', { id: `dashboard-action-error-${action}` });
      }
    },
    [executeActionMutation] // 🆕 queryClient 제거 (안정적인 객체이므로 의존성 불필요)
  );

  // 기존 장비별 사용 가능한 Action 가져오기 100% 유지
  const getAvailableActions = useCallback((deviceId: string) => {
    const deviceType = DEVICE_TYPE_MAP[deviceId] || 'exchanger';
    return getDeviceActions(deviceType);
  }, []);

  // 필터/모드 제어 토글 핸들러 (메모이제이션)
  const handleToggleFilter = useCallback(() => {
    setShowFilter(prev => !prev);
  }, []);

  const handleToggleModeControl = useCallback(() => {
    setShowModeControl(prev => !prev);
  }, []);

  const handleToggleCardSettings = useCallback(() => {
    setShowCardSettings(prev => !prev);
  }, []);

  // 사이드바 컨텐츠
  const sidebarContent = useMemo(
    () => (
      <>
        <RightSidebarItem
          icon={Filter}
          label='필터'
          active={showFilter}
          onClick={handleToggleFilter}
          title='필터'
        />
        <RightSidebarItem
          icon={LayoutGrid}
          label='모드\n제어'
          active={showModeControl}
          onClick={handleToggleModeControl}
          title='모드 제어'
        />
        <RightSidebarItem
          icon={Settings2}
          label='카드\n설정'
          active={showCardSettings}
          onClick={handleToggleCardSettings}
          title='카드 설정'
        />
      </>
    ),
    [showFilter, showModeControl, showCardSettings, handleToggleFilter, handleToggleModeControl, handleToggleCardSettings]
  );

  // 오른쪽 사이드바 설정
  useRightSidebarContent(sidebarContent, [
    showFilter,
    showModeControl,
    showCardSettings,
    handleToggleFilter,
    handleToggleModeControl,
    handleToggleCardSettings,
  ]);

  // 🆕 에러 처리 로직 추가
  if (error) {
    return (
      <Alert variant='destructive'>
        <AlertCircle className='h-4 w-4' />
        <AlertDescription>데이터를 불러오는 중 오류가 발생했습니다: {error?.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className='space-y-4'>
      <TopLogPanel isConnected={isConnected} />

      {/* 필터 / 모드 제어 / 카드 설정 카드 (토글 가능, 1열로 표시) */}
      {(showFilter || showModeControl || showCardSettings) && (
        <div className='flex flex-col gap-4'>
          {showFilter && (
            <div id='dashboard-filter'>
              <DashboardFilterBar
                selectedType={selectedType}
                onSelectType={handleSelectType}
                selectedStatus={selectedStatus}
                onSelectStatus={handleSelectStatus}
                devices={devices}
              />
            </div>
          )}
          {showModeControl && (
            <div id='dashboard-mode'>
              <ModeControlCard
                devices={devices}
                deviceSpecs={deviceSpecs}
                deviceStyles={deviceStyles}
                onFormChange={(key, value, deviceId, unitId) => {
                  deviceListRef.current?.handleFormChange(key, value, deviceId, unitId);
                }}
              />
            </div>
          )}
          {showCardSettings && (
            <div id='dashboard-card-settings'>
              <SettingsCard
                icon={LayoutGrid}
                title='장비 카드 디자인'
                description='대시보드 장비 카드의 표시 방식을 선택합니다.'
                currentSettings={
                  <span>
                    현재:{' '}
                    {cardVariant === 'panel'
                      ? '패널형 카드 (기본)'
                      : '기본 카드'}
                  </span>
                }
              >
                <div className='flex flex-wrap gap-2'>
                  <Button
                    type='button'
                    variant={cardVariant === 'panel' ? 'default' : 'outline'}
                    onClick={() => setCardVariant('panel')}
                    className='flex-1 min-w-[120px]'
                  >
                    패널형 (기본)
                  </Button>
                  <Button
                    type='button'
                    variant={cardVariant === 'default' ? 'default' : 'outline'}
                    onClick={() => setCardVariant('default')}
                    className='flex-1 min-w-[120px]'
                  >
                    기존 카드
                  </Button>
                </div>
              </SettingsCard>
            </div>
          )}
        </div>
      )}

      {/* 통합 그리드: 장비 목록 (피플카운터는 기존 DeviceCard 스타일로 표시) */}
      {filteredDevices.length === 0 && devices.length > 0 ? (
        <div className='text-center py-12 space-y-2'>
          <p className='text-gray-500 dark:text-gray-400 font-medium'>선택한 필터 조건에 맞는 장비가 없습니다.</p>
          <p className='text-sm text-gray-400 dark:text-gray-500'>필터를 변경해보세요.</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
          <DeviceListShowDetail
            ref={deviceListRef}
            devices={filteredDevices as any[]}
            deviceSpecs={deviceSpecs}
            deviceStyles={deviceStyles}
            onExecuteAction={executeDeviceAction}
            getAvailableActions={getAvailableActions}
            cardVariant={cardVariant}
          />
        </div>
      )}

      {/* Toast 알림 */}
    </div>
  );
};

export default React.memo(DashboardPage);
