import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { useExecuteDeviceAction } from '../../api/queries/device';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getDeviceActions, getActionInfo, type ActionKey } from '../../meta/actions/deviceActions';
import { DashboardFilterBar } from '../common/DashboardFilterBar';
import DeviceListShowDetail from '../common/DeviceListShowDetail/index';
import { DeviceListShowDetailHandle } from '../common/DeviceListShowDetail/types';
import { TopLogPanel } from '../common/TopLogPanel';
import { Alert, AlertDescription } from '../ui';
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
} as const;

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
  const { isConnected } = useWebSocket({});

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
      {/* 로그 패널 - 항상 렌더링하되 CSS로 애니메이션 처리 */}
      <TopLogPanel isConnected={isConnected} />

      {/* Data 적용 카드 - 현재 버전에서는 대시보드에서 숨김 처리 */}
      {/* <DataApplyCard /> */}
      {/* 모드 제어 카드와 필터바 - 2열 레이아웃 (모바일: 2행) */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* 필터바 - devices prop 추가 */}
        <DashboardFilterBar
          selectedType={selectedType}
          onSelectType={handleSelectType}
          selectedStatus={selectedStatus}
          onSelectStatus={handleSelectStatus}
          devices={devices}
        />

        {/* 🆕 Mode Switch 카드 */}
        <ModeControlCard
          devices={devices}
          deviceSpecs={deviceSpecs}
          deviceStyles={deviceStyles}
          onFormChange={(key, value, deviceId, unitId) => {
            deviceListRef.current?.handleFormChange(key, value, deviceId, unitId);
          }}
        />
      </div>

      {/* 장비 목록 - 타입 안전성을 위해 any 타입 사용 */}
      {filteredDevices.length === 0 && devices.length > 0 ? (
        <div className='text-center py-12 space-y-2'>
          <p className='text-gray-500 font-medium'>선택한 필터 조건에 맞는 장비가 없습니다.</p>
          <p className='text-sm text-gray-400'>필터를 변경해보세요.</p>
        </div>
      ) : (
        <DeviceListShowDetail
          ref={deviceListRef}
          devices={filteredDevices as any[]}
          deviceSpecs={deviceSpecs}
          deviceStyles={deviceStyles}
          onExecuteAction={executeDeviceAction}
          getAvailableActions={getAvailableActions}
        />
      )}

      {/* Toast 알림 */}
    </div>
  );
};

export default React.memo(DashboardPage);
