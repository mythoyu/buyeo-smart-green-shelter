import { Clock, Sun, Cpu, RefreshCcw, Users, Activity, Settings } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { useResetPeopleCounterData } from '../../api/queries/people-counter';
import { useRightSidebarContent } from '../../hooks/useRightSidebarContent';
import {
  useSaveSeasonal,
  useGetSeasonal,
  useRefreshSeasonal,
  useGetDdcTime,
  useSyncDdcTime,
  useGetPollingInterval,
  useSetPollingInterval,
  useRestartBackend,
  useRefreshDdcTime,
  useGetSystemTime,
} from '../../api/queries/system';
import { useWebSocket } from '../../hooks/useWebSocket';
import { cn } from '../../lib/utils';
import SelectWithLabel from '../common/SelectWithLabel';
import SettingsCard from '../common/SettingsCard';
import { TopLogPanel } from '../common/TopLogPanel';
import { Button } from '../ui/button';
import { SelectItem } from '../ui/select';
import { RightSidebarItem } from '../layout/RightSidebar';
import { ConfirmDialog } from '../common/ConfirmDialog';

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

  // 오른쪽 사이드바에서 선택된 설정 그룹 ('all'이면 모든 카드 표시, 그 외에는 해당 그룹의 카드만)
  const [selectedSettingsId, setSelectedSettingsId] = useState<string>('all');

  // 설정 그룹 정의
  const SETTINGS_GROUPS = [
    { id: 'all', label: '전체', icon: Activity, cardIds: [] },
    {
      id: 'system',
      label: '시스템',
      icon: Settings,
      cardIds: [
        'settings-system-time',
        'settings-ddc-time',
        'settings-seasonal',
        'settings-polling',
        'settings-people-counter',
        'settings-reboot',
      ],
    },
  ];

  // 🌸 절기 설정 조회
  const { data: seasonalData, refetch: refetchSeasonal, isFetching: isSeasonalFetching } = useGetSeasonal();
  const refreshSeasonalMutation = useRefreshSeasonal();

  // 🕐 DDC 시간 설정 조회
  const { data: ddcTimeData, refetch: refetchDdcTime, isFetching: isDdcTimeFetching } = useGetDdcTime();

  // 🔄 폴링 간격 설정 조회
  const { data: pollingIntervalData } = useGetPollingInterval();

  // 🕒 서버 시스템 시간 조회
  const {
    data: systemTimeData,
    refetch: refetchSystemTime,
    isFetching: isSystemTimeFetching,
  } = useGetSystemTime();

  // 🔄 백엔드 재기동 훅
  const restartBackendMutation = useRestartBackend();
  const refreshDdcTimeMutation = useRefreshDdcTime();

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
  const saveSeasonalMutation = useSaveSeasonal();
  const syncDdcTimeMutation = useSyncDdcTime();
  const setPollingIntervalMutation = useSetPollingInterval();
  const resetPeopleCounterDataMutation = useResetPeopleCounterData();
  const [openResetDialog, setOpenResetDialog] = useState(false);

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

  const currentMonthField = monthFieldByIndex[currentTime.getMonth()];
  const currentMonthSeasonValue = seasonInput[currentMonthField] ?? 0;

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

  // 현재 시간을 1초마다 업데이트하는 useEffect
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 설정 그룹 선택 핸들러 (해당 그룹의 카드만 표시)
  const handleSelectSettings = useCallback((groupId: string) => {
    setSelectedSettingsId(groupId);
  }, []);

  // 선택된 그룹에 해당하는 카드 ID 목록
  const visibleCardIds = useMemo(() => {
    if (selectedSettingsId === 'all') {
      return [
        'settings-system-time',
        'settings-ddc-time',
        'settings-seasonal',
        'settings-polling',
        'settings-people-counter',
        'settings-reboot',
      ];
    }
    const group = SETTINGS_GROUPS.find(g => g.id === selectedSettingsId);
    return group?.cardIds || [];
  }, [selectedSettingsId]);

  // 사이드바 컨텐츠
  const sidebarContent = useMemo(
    () => (
      <>
        {SETTINGS_GROUPS.map(({ id, label, icon: Icon }) => (
          <RightSidebarItem
            key={id}
            icon={Icon}
            label={label}
            active={selectedSettingsId === id}
            onClick={() => handleSelectSettings(id)}
            title={label}
          />
        ))}
      </>
    ),
    [selectedSettingsId, handleSelectSettings]
  );

  // 오른쪽 사이드바 설정
  useRightSidebarContent(sidebarContent, [selectedSettingsId, handleSelectSettings]);

  // UI 렌더링
  return (
    <div className='space-y-2'>
      {/* 로그 패널 */}
      <TopLogPanel isConnected={isConnected} />

      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6'>
        {/* 시스템 시간 테스트 (서버 시간만 표시) */}
        {visibleCardIds.includes('settings-system-time') && (
        <div
          id='settings-system-time'
          style={{
            animationDelay: '200ms',
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          <SettingsCard
            icon={Clock}
            title='시스템 시간 테스트'
            description='백엔드 서버가 인식하는 현재 시간을 확인합니다'
            currentSettings={null}
            isLoading={false}
            headerExtra={
              <Button
                variant='ghost'
                size='icon'
                onClick={async () => {
                  try {
                    await refetchSystemTime();
                    toast.success('서버 시간을 새로고침했습니다.', { id: 'system-time-refresh-success' });
                  } catch (error: any) {
                    const msg =
                      error?.response?.data?.message ||
                      error?.response?.data?.error ||
                      '서버 시간 새로고침에 실패했습니다.';
                    toast.error(msg, { id: 'system-time-refresh-error' });
                  }
                }}
                disabled={isSystemTimeFetching}
              >
                <RefreshCcw className={cn('h-4 w-4', isSystemTimeFetching && 'animate-spin')} />
              </Button>
            }
          >
            <div className='p-3 bg-muted rounded-lg space-y-2'>
              <div className='flex justify-between items-center'>
                <span className='text-sm font-medium'>서버 현재 시간 (UTC, ISO)</span>
                <span className='text-sm text-muted-foreground'>
                  {systemTimeData?.data?.nowIso || '로딩 중...'}
                </span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-sm font-medium'>서버 현재 시간 (KST)</span>
                <span className='text-sm text-muted-foreground'>
                  {systemTimeData?.data?.kst
                    ? `${systemTimeData.data.kst.year}-${String(systemTimeData.data.kst.month).padStart(2, '0')}-${String(
                        systemTimeData.data.kst.day,
                      ).padStart(2, '0')} ${String(systemTimeData.data.kst.hour).padStart(2, '0')}:${String(
                        systemTimeData.data.kst.minute,
                      ).padStart(2, '0')}:${String(systemTimeData.data.kst.second).padStart(2, '0')} (KST)`
                    : '로딩 중...'}
                </span>
              </div>
            </div>
          </SettingsCard>
        </div>
        )}

        {/* 절기 설정 - DDCConfigurationPage 스타일로 교체 */}
        {visibleCardIds.includes('settings-seasonal') && (
        <div
          id='settings-seasonal'
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
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>현재 월 동작절기:</span>
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
              <div className='grid grid-cols-3 border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden'>
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
                        !isLastCol ? 'border-r border-gray-200 dark:border-gray-600' : ''
                      } ${!isLastRow ? 'border-b border-gray-200 dark:border-gray-600' : ''}`}
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
        )}

        {/* DDC 시간 설정 */}
        {visibleCardIds.includes('settings-ddc-time') && (
        <div
          id='settings-ddc-time'
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
        )}

        {/* DDC 폴링 간격 설정 */}
        {visibleCardIds.includes('settings-polling') && (
        <div
          id='settings-polling'
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
        )}

        {/* 피플카운터 데이터 초기화 */}
        {visibleCardIds.includes('settings-people-counter') && (
        <div
          id='settings-people-counter'
          style={{
            animationDelay: '600ms',
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          <SettingsCard
            icon={Users}
            title='피플카운터'
            description='통계·히스토리용 raw 및 d082 실시간 데이터 초기화 (APC100 등)'
          >
            <div className='space-y-2'>
              <p className='text-xs font-medium text-foreground'>데이터 관리</p>
              <p className='text-[11px] text-muted-foreground'>
                people_counter_raw 및 d082 실시간 데이터를 삭제하여 피플카운터 통계/히스토리를 초기화합니다. 장비 제어에는 영향을 주지 않습니다.
              </p>
              <div className='flex justify-end'>
                <Button
                  variant='destructive'
                  size='sm'
                  className='text-[12px]'
                  onClick={() => setOpenResetDialog(true)}
                  disabled={resetPeopleCounterDataMutation.isPending}
                >
                  피플카운터 데이터 초기화
                </Button>
              </div>
            </div>
          </SettingsCard>
          <ConfirmDialog
            open={openResetDialog}
            onOpenChange={setOpenResetDialog}
            title='피플카운터 데이터 초기화'
            description='people_counter_raw와 d082 실시간 데이터를 모두 삭제합니다. 이 작업은 되돌릴 수 없습니다.'
            variant='danger'
            confirmText='초기화'
            cancelText='취소'
            onConfirm={() => {
              resetPeopleCounterDataMutation.mutate(undefined, {
                onSuccess: (res: any) => {
                  toast.success(res?.message || '피플카운터 데이터가 초기화되었습니다.');
                },
                onError: (error: any) => {
                  const msg =
                    error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    '피플카운터 데이터 초기화에 실패했습니다.';
                  toast.error(msg);
                },
              });
            }}
          />
        </div>
        )}

        {/* 시스템 재기동 카드 */}
        {visibleCardIds.includes('settings-reboot') && (
        <div
          id='settings-reboot'
          style={{
            animationDelay: '700ms',
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          <SettingsCard icon={Cpu} title='시스템 재기동' description='백엔드 API 서비스를 재시작합니다. MongoDB 등 다른 컨테이너는 그대로 유지됩니다.'>
            <div className='space-y-4'>
              {/* 백엔드 재기동 */}
              <div className='flex flex-col gap-2'>
                <h4 className='text-sm font-medium'>백엔드 재기동</h4>
                <p className='text-xs text-muted-foreground'>
                  백엔드 서비스만 재시작합니다. 서비스가 잠시 중단될 수 있습니다.
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-fit border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                  disabled={restartBackendMutation.isPending}
                >
                  {restartBackendMutation.isPending ? '재기동 중...' : '백엔드 재기동'}
                </Button>
              </div>
            </div>
          </SettingsCard>
        </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettingsPage;
