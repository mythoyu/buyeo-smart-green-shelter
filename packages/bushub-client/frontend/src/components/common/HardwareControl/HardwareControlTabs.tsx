import React, { useState, Suspense, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';

// 지연 로딩으로 각 탭 컴포넌트 임포트
const DOPortTab = React.lazy(() => import('./tabs/DOPortTab'));
const DIPortTab = React.lazy(() => import('./tabs/DIPortTab'));
const HVACControlTab = React.lazy(() => import('./tabs/HVACControlTab'));
const SensorMonitoringTab = React.lazy(() => import('./tabs/SensorMonitoringTab'));
const SystemSettingsTab = React.lazy(() => import('./tabs/SystemSettingsTab'));

import type { HardwareControlError } from '../../../types/hardware';

// 공통 로딩 스피너 컴포넌트 (메모이제이션)
const LoadingSpinner = React.memo(() => (
  <div className='flex items-center justify-center py-8'>
    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

interface HardwareControlTabsProps {
  disabled?: boolean;
  onError?: (error: HardwareControlError) => void;
  pollingStatus?: { pollingEnabled: boolean };
  /** 외부 제어: 사이드바에서 탭 선택 시 사용 */
  activeTab?: string;
  onTabChange?: (value: string) => void;
  /** true이면 TabsList 숨김 (오른쪽 사이드바에서 선택) */
  hideTabsList?: boolean;
}

// 탭 설정 상수
const TAB_CONFIGS = [
  { value: 'do', label: 'DO' },
  { value: 'di', label: 'DI' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'sensors', label: '통합센서' },
  { value: 'system', label: '시스템' },
] as const;

// 탭 컴포넌트 매핑
const TAB_COMPONENTS = {
  do: DOPortTab,
  di: DIPortTab,
  hvac: HVACControlTab,
  sensors: SensorMonitoringTab,
  system: SystemSettingsTab,
} as const;

/**
 * 하드웨어 제어 탭 컨테이너 컴포넌트
 * 각 하드웨어 타입별로 탭을 분리하여 성능 최적화
 */
export const HardwareControlTabs: React.FC<HardwareControlTabsProps> = React.memo(
  ({
    disabled = false,
    onError,
    pollingStatus,
    activeTab: controlledTab,
    onTabChange,
    hideTabsList = false,
  }) => {
    const [internalTab, setInternalTab] = useState('do');
    const isControlled = controlledTab !== undefined && onTabChange != null;
    const activeTab = isControlled ? controlledTab : internalTab;
    const handleTabChange = useCallback(
      (value: string) => {
        if (isControlled) {
          onTabChange!(value);
        } else {
          setInternalTab(value);
        }
      },
      [isControlled, onTabChange]
    );

    // 기본 에러 핸들러
    const handleError = onError || (() => {});

    // 기본 폴링 상태
    const defaultPollingStatus = pollingStatus || { pollingEnabled: false };

    const tabsList = useMemo(
      () => (
        <TabsList className='grid w-full grid-cols-5'>
          {TAB_CONFIGS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      ),
      []
    );

    const renderTabContent = useCallback(
      (tabValue: keyof typeof TAB_COMPONENTS) => {
        const TabComponent = TAB_COMPONENTS[tabValue];
        if (TabComponent == null) {
          return <TabsContent key={tabValue} value={tabValue}  />;
        }
        return (
          <TabsContent key={tabValue} value={tabValue}>
            <Suspense fallback={<LoadingSpinner />}>
              <TabComponent disabled={disabled} onError={handleError} pollingStatus={defaultPollingStatus} />
            </Suspense>
          </TabsContent>
        );
      },
      [disabled, handleError, defaultPollingStatus]
    );

    return (
      <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
        {!hideTabsList && tabsList}
        {renderTabContent('do')}
        {renderTabContent('di')}
        {renderTabContent('hvac')}
        {renderTabContent('sensors')}
        {renderTabContent('system')}
      </Tabs>
    );
  }
);

HardwareControlTabs.displayName = 'HardwareControlTabs';
