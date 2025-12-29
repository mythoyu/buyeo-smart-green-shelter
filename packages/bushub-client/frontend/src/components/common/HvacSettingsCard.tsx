import { Snowflake, RotateCcw } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { useGetHvacSettings, useUpdateHvacSettings } from '@/api/queries/system';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HvacSettings } from '@/types/systemSettings';
import OnOffToggleButton from './OnOffToggleButton';
import SettingsCard from './SettingsCard';

interface HvacSettingsCardProps {
  className?: string;
}

const HvacSettingsCard: React.FC<HvacSettingsCardProps> = ({ className }) => {
  const { data: hvacSettings, isLoading, refetch } = useGetHvacSettings();
  const updateHvacSettings = useUpdateHvacSettings();

  const [externalControlEnabled, setExternalControlEnabled] = useState(false);
  const [manufacturer, setManufacturer] = useState<'SAMSUNG' | 'LG' | null>(null);
  const [modbusPort, setModbusPort] = useState('/dev/ttyS1');
  const [modbusBaudRate, setModbusBaudRate] = useState(9600);
  const [modbusParity, setModbusParity] = useState<'none' | 'even' | 'odd'>('even');
  const [isSaving, setIsSaving] = useState(false);

  // 냉난방기 외부제어 설정에서 초기값 로드
  useEffect(() => {
    if (hvacSettings) {
      setExternalControlEnabled(hvacSettings.externalControlEnabled ?? false);
      setManufacturer(hvacSettings.manufacturer ?? null);
      setModbusPort(hvacSettings.modbus.port ?? '/dev/ttyS1');
      setModbusBaudRate(hvacSettings.modbus.baudRate ?? 9600);
      setModbusParity(hvacSettings.modbus.parity ?? 'even');
    }
  }, [hvacSettings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const settings: Partial<HvacSettings> = {
        externalControlEnabled,
        manufacturer,
        modbus: {
          port: modbusPort,
          baudRate: modbusBaudRate,
          parity: modbusParity,
        },
      };

      await updateHvacSettings.mutateAsync(settings);

      toast.success('냉난방기 외부제어 설정이 저장되었습니다.');
    } catch (error) {
      console.error('냉난방기 외부제어 설정 저장 실패:', error);
      toast.error('냉난방기 외부제어 설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      // API에서 최신 설정값 가져오기
      const result = await refetch();
      const refreshedSettings = result.data;

      if (refreshedSettings) {
        setExternalControlEnabled(refreshedSettings.externalControlEnabled ?? false);
        setManufacturer(refreshedSettings.manufacturer ?? null);
        setModbusPort(refreshedSettings.modbus.port ?? '/dev/ttyS1');
        setModbusBaudRate(refreshedSettings.modbus.baudRate ?? 9600);
        setModbusParity(refreshedSettings.modbus.parity ?? 'even');
        toast.success('설정값을 다시 불러왔습니다.');
      } else {
        // 데이터가 없으면 기본값으로 초기화
        setExternalControlEnabled(false);
        setManufacturer(null);
        setModbusPort('/dev/ttyS1');
        setModbusBaudRate(9600);
        setModbusParity('even');
      }
    } catch (error) {
      console.error('설정값 불러오기 실패:', error);
      toast.error('설정값 불러오기에 실패했습니다.');
    }
  };

  return (
    <SettingsCard
      icon={Snowflake}
      title='냉난방기 외부제어 설정'
      description='냉난방기 직접 제어 설정'
      onApply={handleSave}
      applyDisabled={isSaving}
      isLoading={isLoading || isSaving}
      applyButtonText='적용'
      headerExtra={
        <Button
          variant='ghost'
          size='icon'
          onClick={handleReset}
          disabled={isSaving}
          title='복구'
        >
          <RotateCcw className='h-4 w-4' />
        </Button>
      }
    >
      {/* 외부제어 활성화 토글 */}
      <div className='flex items-center justify-between p-3 bg-muted rounded-lg'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium'>외부제어 활성화</span>
          <Badge
            variant={hvacSettings?.externalControlEnabled ? 'subtle-success' : 'subtle-error'}
            className='text-xs'
          >
            {hvacSettings?.externalControlEnabled ? '활성화' : '비활성화'}
          </Badge>
        </div>
        <OnOffToggleButton
          checked={externalControlEnabled}
          onChange={setExternalControlEnabled}
          labelOn='ON'
          labelOff='OFF'
        />
      </div>

      {/* 2열 그리드 레이아웃 */}
      <div className='grid grid-cols-2 gap-4'>
        {/* 제조사 선택 */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <Label className='text-sm font-medium'>제조사</Label>
            <Badge
              variant={hvacSettings?.manufacturer ? 'subtle-success' : 'subtle-error'}
              className='text-xs'
            >
              {hvacSettings?.manufacturer || '미설정'}
            </Badge>
          </div>
          <Select
            value={manufacturer || 'none'}
            onValueChange={(value: string) => setManufacturer(value === 'none' ? null : (value as 'SAMSUNG' | 'LG'))}
            disabled={!externalControlEnabled}
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='제조사 선택' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='none'>선택 안함</SelectItem>
              <SelectItem value='SAMSUNG'>삼성</SelectItem>
              <SelectItem value='LG'>LG</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Modbus 포트 */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <Label className='text-sm font-medium'>Modbus 포트</Label>
            <Badge variant='subtle-success' className='text-xs'>
              {hvacSettings?.modbus.port || '/dev/ttyS1'}
            </Badge>
          </div>
          <Input
            value={modbusPort}
            onChange={e => setModbusPort(e.target.value)}
            placeholder='/dev/ttyS1'
            disabled={true}
            className='w-full'
          />
        </div>

        {/* Baud Rate */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <Label className='text-sm font-medium'>Baud Rate</Label>
            <Badge variant='subtle-success' className='text-xs'>
              {hvacSettings?.modbus.baudRate || 9600}
            </Badge>
          </div>
          <Select
            value={modbusBaudRate.toString()}
            onValueChange={value => setModbusBaudRate(parseInt(value))}
            disabled={true}
          >
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='9600'>9600</SelectItem>
              <SelectItem value='19200'>19200</SelectItem>
              <SelectItem value='38400'>38400</SelectItem>
              <SelectItem value='57600'>57600</SelectItem>
              <SelectItem value='115200'>115200</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Parity */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <Label className='text-sm font-medium'>Parity</Label>
            <Badge variant='subtle-success' className='text-xs'>
              {hvacSettings?.modbus.parity || 'even'}
            </Badge>
          </div>
          <Select
            value={modbusParity}
            onValueChange={(value: 'none' | 'even' | 'odd') => setModbusParity(value)}
            disabled={!externalControlEnabled}
          >
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='none'>None</SelectItem>
              <SelectItem value='even'>Even</SelectItem>
              <SelectItem value='odd'>Odd</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </SettingsCard>
  );
};

export default HvacSettingsCard;

