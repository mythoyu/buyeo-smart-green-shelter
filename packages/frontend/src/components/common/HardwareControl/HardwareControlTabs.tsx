import React, { useState, Suspense, useMemo, useCallback, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';

const DOPortTab = React.lazy(() => import('./tabs/DOPortTab'));
const DIPortTab = React.lazy(() => import('./tabs/DIPortTab'));
const HVACControlTab = React.lazy(() => import('./tabs/HVACControlTab'));
const SensorMonitoringTab = React.lazy(() => import('./tabs/SensorMonitoringTab'));
const BenchTab = React.lazy(() => import('./tabs/BenchTab'));
const SystemSettingsTab = React.lazy(() => import('./tabs/SystemSettingsTab'));
const PeopleCounterApcTestTab = React.lazy(() => import('./tabs/PeopleCounterApcTestTab'));

import type { HardwareControlError } from '../../../types/hardware';

const LoadingSpinner = React.memo(() => (
  <div className='flex items-center justify-center py-8'>
    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

interface HardwareControlTabsProps {
  disabled?: boolean;
  /** 폴링 중지 후 하드웨어 제어 가능 */
  operateEnabled?: boolean;
  onError?: (error: HardwareControlError) => void;
  pollingStatus?: { pollingEnabled: boolean };
  activeTab?: string;
  onTabChange?: (value: string) => void;
  hideTabsList?: boolean;
}

const TAB_CONFIGS = [
  { value: 'do', label: 'DO' },
  { value: 'di', label: 'DI' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'sensors', label: '통합센서' },
  { value: 'bench', label: '온열벤치' },
  { value: 'system', label: '시스템' },
  { value: 'people-counter', label: '피플APC' },
] as const;

type TabValue = (typeof TAB_CONFIGS)[number]['value'];

const TAB_COMPONENTS = {
  do: DOPortTab,
  di: DIPortTab,
  hvac: HVACControlTab,
  sensors: SensorMonitoringTab,
  bench: BenchTab,
  system: SystemSettingsTab,
  'people-counter': PeopleCounterApcTestTab,
} as const;

/**
 * 하드웨어 제어 탭 — 활성 탭만 마운트, 탭 전환 시 1회 자동 읽기
 */
export const HardwareControlTabs: React.FC<HardwareControlTabsProps> = React.memo(
  ({
    disabled = false,
    operateEnabled = false,
    onError,
    pollingStatus,
    activeTab: controlledTab,
    onTabChange,
    hideTabsList = false,
  }) => {
    const [internalTab, setInternalTab] = useState<TabValue>('do');
    const isControlled = controlledTab !== undefined && onTabChange != null;
    const activeTab = (isControlled ? controlledTab : internalTab) as TabValue;
    const [autoReadToken, setAutoReadToken] = useState(0);
    const prevAutoReadRef = useRef({ operateEnabled: false, activeTab: 'do' as TabValue });

    const handleTabChange = useCallback(
      (value: string) => {
        const tab = value as TabValue;
        if (isControlled) {
          onTabChange!(tab);
        } else {
          setInternalTab(tab);
        }
      },
      [isControlled, onTabChange],
    );

    const handleError = onError || (() => {});
    const defaultPollingStatus = useMemo(
      () => pollingStatus ?? { pollingEnabled: false },
      [pollingStatus],
    );

    useEffect(() => {
      if (!operateEnabled) {
        prevAutoReadRef.current.operateEnabled = false;
        return;
      }

      const tabChanged = prevAutoReadRef.current.activeTab !== activeTab;
      const becameOperable = !prevAutoReadRef.current.operateEnabled;

      if (becameOperable || tabChanged) {
        setAutoReadToken(prev => prev + 1);
      }

      prevAutoReadRef.current = { operateEnabled: true, activeTab };
    }, [activeTab, operateEnabled]);

    const ActiveTabComponent = TAB_COMPONENTS[activeTab] ?? DOPortTab;

    const tabsList = useMemo(
      () => (
        <TabsList className='grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7'>
          {TAB_CONFIGS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      ),
      [],
    );

    return (
      <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
        {!hideTabsList && tabsList}

        <TabsContent value={activeTab} className='mt-6'>
          <Suspense fallback={<LoadingSpinner />}>
            <ActiveTabComponent
              disabled={disabled}
              autoReadToken={autoReadToken}
              onError={handleError}
              pollingStatus={defaultPollingStatus}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    );
  },
);

HardwareControlTabs.displayName = 'HardwareControlTabs';
