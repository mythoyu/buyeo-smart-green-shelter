import { RefreshCw, Thermometer } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { type BenchData, type BenchFieldReading, useBenchRead, useBenchSet } from '../../../../api/queries/hardware';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui';

import {
  encodeBenchContTemp,
  encodeBenchTempCheckInterval,
  encodeBenchTempOffset,
} from '../../../../utils/benchModbus';
import { useHardwareTabAutoRead } from '../useHardwareTabAutoRead';
import type { HardwareControlError } from '../../../../types/hardware';

export interface BenchFormState {
  cur_temp: number | null;
  cur_temp_2: number | null;
  cont_temp: number;
  cont_temp_2: number;
  temp_offset: number;
  temp_check_interval: number;
}

const LIMITS = {
  contTemp: { min: -20, max: 80 },
  tempOffset: { min: 0, max: 20 },
  tempCheckInterval: { min: 0, max: 600 },
} as const;

const formatNumber = (value: number, fractionDigits: number): string => value.toFixed(fractionDigits);

interface BenchSettingFieldProps {
  id: string;
  label: string;
  valueUnit: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  encode: (v: number) => number;
  readRaw?: number | null;
  onChange: (value: number) => void;
}

/** 설정은 셀렉터(°C/초), 레지스터(raw)는 별도 줄에 표시 */
const BenchSettingField: React.FC<BenchSettingFieldProps> = ({
  id,
  label,
  valueUnit,
  value,
  min,
  max,
  disabled,
  encode,
  readRaw,
  onChange,
}) => {
  const options = useMemo(() => {
    const items: number[] = [];
    for (let n = min; n <= max; n += 1) {
      items.push(n);
    }
    return items;
  }, [min, max]);

  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={String(value)}
        onValueChange={v => onChange(parseInt(v, 10))}
        disabled={disabled}
      >
        <SelectTrigger id={id} className='w-full'>
          <SelectValue placeholder={`${label} 선택`} />
        </SelectTrigger>
        <SelectContent className='max-h-60'>
          {options.map(n => (
            <SelectItem key={n} value={String(n)}>
              {n}
              {valueUnit}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className='text-xs text-muted-foreground tabular-nums'>
        레지스터 (적용): <span className='font-mono text-foreground'>{encode(value)}</span>
      </p>
      {readRaw != null && (
        <p className='text-xs text-muted-foreground tabular-nums'>
          레지스터 (읽기): <span className='font-mono text-foreground'>{readRaw}</span>
        </p>
      )}
    </div>
  );
};

interface BenchReadoutProps {
  label: string;
  field: BenchFieldReading | null | undefined;
  unit?: string;
  fractionDigits?: number;
  prominent?: boolean;
}

const BenchReadout: React.FC<BenchReadoutProps> = ({
  label,
  field,
  unit = '',
  fractionDigits = 1,
  prominent = false,
}) => (
  <div className='rounded-lg border p-4'>
    <p className='text-sm text-muted-foreground mb-1'>{label}</p>
    <p
      className={
        prominent
          ? 'text-2xl font-semibold tabular-nums'
          : 'text-sm font-medium tabular-nums text-foreground'
      }
    >
      {field == null ? '—' : `${formatNumber(field.value, fractionDigits)}${unit}`}
    </p>
    {field != null && (
      <p className='text-xs text-muted-foreground tabular-nums mt-1'>
        레지스터: <span className='font-mono text-foreground'>{field.raw}</span>
      </p>
    )}
  </div>
);

interface BenchTabProps {
  disabled?: boolean;
  autoReadToken?: number;
  onError?: (error: HardwareControlError) => void;
  pollingStatus?: { pollingEnabled: boolean };
}

export const BenchTab: React.FC<BenchTabProps> = ({
  disabled = false,
  autoReadToken,
  onError,
  pollingStatus,
}) => {
  const benchRead = useBenchRead();
  const benchSet = useBenchSet();
  const [isApplying, setIsApplying] = useState(false);
  const [readings, setReadings] = useState<BenchData | null>(null);

  const [form, setForm] = useState<BenchFormState>({
    cur_temp: null,
    cur_temp_2: null,
    cont_temp: 30,
    cont_temp_2: 30,
    temp_offset: 0,
    temp_check_interval: 0,
  });

  const applyReadData = (data: BenchData) => {
    setReadings(data);
    setForm(prev => ({
      ...prev,
      cur_temp: data.cur_temp.value,
      cur_temp_2: data.cur_temp_2.value,
      cont_temp: data.cont_temp.value,
      cont_temp_2: data.cont_temp_2.value,
      temp_offset: data.temp_offset.value,
      temp_check_interval: data.temp_check_interval.value,
    }));
  };

  const handleRead = async () => {
    try {
      const result = await benchRead.mutateAsync();
      if (result.success && result.data) {
        applyReadData(result.data);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.response?.data?.error?.message || error.message || '알 수 없는 오류';
      toast.error(`온열벤치 읽기 실패: ${message}`, { id: 'hw-bench-read-error' });
      onError?.({
        type: 'hardware_error',
        message,
        details: '온열벤치 읽기',
      });
    }
  };

  const readRef = useRef(handleRead);
  readRef.current = handleRead;
  useHardwareTabAutoRead(autoReadToken, {
    disabled,
    pollingEnabled: pollingStatus?.pollingEnabled,
    onRead: () => readRef.current(),
  });

  const handleApply = async () => {
    const { cont_temp, cont_temp_2, temp_offset, temp_check_interval } = form;
    if (
      cont_temp < LIMITS.contTemp.min ||
      cont_temp > LIMITS.contTemp.max ||
      cont_temp_2 < LIMITS.contTemp.min ||
      cont_temp_2 > LIMITS.contTemp.max ||
      temp_offset < LIMITS.tempOffset.min ||
      temp_offset > LIMITS.tempOffset.max ||
      temp_check_interval < LIMITS.tempCheckInterval.min ||
      temp_check_interval > LIMITS.tempCheckInterval.max
    ) {
      toast.error('입력값이 허용 범위를 벗어났습니다.', { id: 'hw-bench-apply-validation' });
      return;
    }

    try {
      setIsApplying(true);
      await benchSet.mutateAsync({
        cont_temp,
        cont_temp_2,
        temp_offset,
        temp_check_interval,
      });
      await handleRead();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.response?.data?.error?.message || error.message || '알 수 없는 오류';
      toast.error(`온열벤치 설정 실패: ${message}`, { id: 'hw-bench-apply-error' });
      onError?.({
        type: 'hardware_error',
        message,
        details: '온열벤치 설정',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const isLoading = benchRead.isPending || benchSet.isPending || isApplying;
  const inputsDisabled = disabled || isLoading || pollingStatus?.pollingEnabled;

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <Thermometer className='h-5 w-5' />
              온열벤치 모니터링
            </CardTitle>
            <CardDescription>
              현재 온도는 °C로 표시하고, 레지스터(raw)는 아래에 따로 표시합니다. (CUR_TEMP: (raw−2000)/10)
            </CardDescription>
          </div>
          {!pollingStatus?.pollingEnabled && (
            <Button
              onClick={() => void handleRead()}
              disabled={isLoading}
              variant='outline'
              size='sm'
              className='flex items-center gap-2'
            >
              <RefreshCw className={`h-4 w-4 ${benchRead.isPending ? 'animate-spin' : ''}`} />
              상태 읽기
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <BenchReadout
              label='온열벤치#1 온도 (CUR_TEMP)'
              field={readings?.cur_temp}
              unit='°C'
              prominent
            />
            <BenchReadout
              label='온열벤치#2 온도 (CUR_TEMP_2)'
              field={readings?.cur_temp_2}
              unit='°C'
              prominent
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>온열벤치 설정</CardTitle>
          <CardDescription>
            설정값은 °C·초로 선택하고, 레지스터(raw)는 아래에 표시합니다. (설정온도: raw=(°C×10+2000), 편차·체크: raw/10)
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            <BenchSettingField
              id='bench-cont-temp'
              label='온열벤치#1 설정 온도 CONT_TEMP'
              valueUnit='°C'
              value={form.cont_temp}
              min={LIMITS.contTemp.min}
              max={LIMITS.contTemp.max}
              disabled={inputsDisabled}
              encode={encodeBenchContTemp}
              readRaw={readings?.cont_temp.raw}
              onChange={v => setForm(p => ({ ...p, cont_temp: v }))}
            />
            <BenchSettingField
              id='bench-cont-temp-2'
              label='온열벤치#2 설정 온도 CONT_TEMP_2'
              valueUnit='°C'
              value={form.cont_temp_2}
              min={LIMITS.contTemp.min}
              max={LIMITS.contTemp.max}
              disabled={inputsDisabled}
              encode={encodeBenchContTemp}
              readRaw={readings?.cont_temp_2.raw}
              onChange={v => setForm(p => ({ ...p, cont_temp_2: v }))}
            />
            <BenchSettingField
              id='bench-temp-offset'
              label='편차값 TEMP_OFFSET'
              valueUnit='°C'
              value={form.temp_offset}
              min={LIMITS.tempOffset.min}
              max={LIMITS.tempOffset.max}
              disabled={inputsDisabled}
              encode={encodeBenchTempOffset}
              readRaw={readings?.temp_offset.raw}
              onChange={v => setForm(p => ({ ...p, temp_offset: v }))}
            />
            <BenchSettingField
              id='bench-check-interval'
              label='기동 체크시간 TEMP_CHECK_INTERVAL'
              valueUnit='초'
              value={form.temp_check_interval}
              min={LIMITS.tempCheckInterval.min}
              max={LIMITS.tempCheckInterval.max}
              disabled={inputsDisabled}
              encode={encodeBenchTempCheckInterval}
              readRaw={readings?.temp_check_interval.raw}
              onChange={v => setForm(p => ({ ...p, temp_check_interval: v }))}
            />
          </div>

          <div className='flex justify-end'>
            <Button disabled={inputsDisabled || isApplying} onClick={() => void handleApply()}>
              {isApplying ? '적용 중…' : '적용'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BenchTab;
