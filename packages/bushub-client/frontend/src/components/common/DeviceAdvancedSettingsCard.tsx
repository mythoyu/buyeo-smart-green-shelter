import { Settings, Thermometer, RotateCcw } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { useGetDeviceAdvancedSettings, useUpdateDeviceAdvancedSettings } from '@/api/queries/system';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { DeviceAdvancedSettings } from '@/types/systemSettings';
import SettingsCard from './SettingsCard';

interface DeviceAdvancedSettingsCardProps {
  className?: string;
}

const DeviceAdvancedSettingsCard: React.FC<DeviceAdvancedSettingsCardProps> = ({ className }) => {
  const { data: deviceAdvancedSettings, isLoading, refetch } = useGetDeviceAdvancedSettings();
  const updateDeviceAdvancedSettings = useUpdateDeviceAdvancedSettings();

  const [fineTuningSummer, setFineTuningSummer] = useState(0);
  const [fineTuningWinter, setFineTuningWinter] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // 디바이스 상세설정에서 초기값 로드
  useEffect(() => {
    if (deviceAdvancedSettings) {
      setFineTuningSummer(deviceAdvancedSettings.temp['fine-tuning-summer'] ?? 0);
      setFineTuningWinter(deviceAdvancedSettings.temp['fine-tuning-winter'] ?? 0);
    }
  }, [deviceAdvancedSettings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const settings: DeviceAdvancedSettings = {
        temp: {
          'fine-tuning-summer': fineTuningSummer,
          'fine-tuning-winter': fineTuningWinter,
        },
      };

      await updateDeviceAdvancedSettings.mutateAsync(settings);

      toast.success('디바이스 상세 설정이 저장되었습니다.');
    } catch (error) {
      console.error('디바이스 상세 설정 저장 실패:', error);
      toast.error('디바이스 상세 설정 저장에 실패했습니다.');
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
        setFineTuningSummer(refreshedSettings.temp['fine-tuning-summer'] ?? 0);
        setFineTuningWinter(refreshedSettings.temp['fine-tuning-winter'] ?? 0);
        toast.success('설정값을 다시 불러왔습니다.');
      } else {
        // 데이터가 없으면 기본값으로 초기화
        setFineTuningSummer(0);
        setFineTuningWinter(0);
      }
    } catch (error) {
      console.error('설정값 불러오기 실패:', error);
      toast.error('설정값 불러오기에 실패했습니다.');
    }
  };

  const formatValue = (value: number): string => {
    return value > 0 ? `+${value}` : value.toString();
  };

  return (
    <SettingsCard
      icon={Settings}
      title='디바이스 상세 설정'
      description='목표온도 세부조정 설정'
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
      {/* 여름 목표온도 세부조정 */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <Thermometer className='h-4 w-4 text-orange-500' />
          <label className='text-sm font-medium'>여름 목표온도 세부조정</label>
          <Badge variant='subtle-success' className='text-xs'>
            {deviceAdvancedSettings ? formatValue(deviceAdvancedSettings.temp['fine-tuning-summer'] ?? 0) : '0'}
          </Badge>
        </div>
        <div className='px-2'>
          <Slider
            value={[fineTuningSummer]}
            onValueChange={value => setFineTuningSummer(value[0])}
            min={-5}
            max={5}
            step={1}
            className='w-full'
          />
          <div className='flex justify-between text-xs text-muted-foreground mt-1'>
            <span>-5</span>
            <span>0</span>
            <span>+5</span>
          </div>
        </div>
      </div>

      {/* 겨울 목표온도 세부조정 */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <Thermometer className='h-4 w-4 text-blue-500' />
          <label className='text-sm font-medium'>겨울 목표온도 세부조정</label>
          <Badge variant='subtle-success' className='text-xs'>
            {deviceAdvancedSettings ? formatValue(deviceAdvancedSettings.temp['fine-tuning-winter'] ?? 0) : '0'}
          </Badge>
        </div>
        <div className='px-2'>
          <Slider
            value={[fineTuningWinter]}
            onValueChange={value => setFineTuningWinter(value[0])}
            min={-5}
            max={5}
            step={1}
            className='w-full'
          />
          <div className='flex justify-between text-xs text-muted-foreground mt-1'>
            <span>-5</span>
            <span>0</span>
            <span>+5</span>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
};

export default DeviceAdvancedSettingsCard;
