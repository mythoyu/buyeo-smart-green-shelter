import { Settings, Thermometer } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { useGetDeviceAdvancedSettings, useUpdateDeviceAdvancedSettings } from '@/api/queries/system';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { DeviceAdvancedSettings } from '@/types/systemSettings';

interface DeviceAdvancedSettingsCardProps {
  className?: string;
}

const DeviceAdvancedSettingsCard: React.FC<DeviceAdvancedSettingsCardProps> = ({ className }) => {
  const { data: deviceAdvancedSettings, isLoading } = useGetDeviceAdvancedSettings();
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

  const handleReset = () => {
    setFineTuningSummer(0);
    setFineTuningWinter(0);
  };

  const formatValue = (value: number): string => {
    return value > 0 ? `+${value}` : value.toString();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-muted rounded-lg flex items-center justify-center'>
              <Settings className='h-5 w-5 text-primary' />
            </div>
            <div>
              <CardTitle>디바이스 상세 설정</CardTitle>
              <CardDescription>로딩 중...</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`p-6 space-y-4 border border-gray-200 rounded-lg ${className}`}>
      {/* 카드 헤더 */}
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 bg-muted rounded-lg flex items-center justify-center'>
          <Settings className='h-5 w-5 text-primary' />
        </div>
        <div>
          <h3 className='text-lg font-semibold'>디바이스 상세 설정</h3>
          <p className='text-sm text-muted-foreground'>목표온도 세부조정 설정</p>
        </div>
      </div>

      {/* 설정 내용 */}
      <div className='space-y-6'>
        {/* 여름 목표온도 세부조정 */}
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <Thermometer className='h-4 w-4 text-orange-500' />
            <label className='text-sm font-medium'>여름 목표온도 세부조정</label>
            <span className='text-sm text-muted-foreground'>({formatValue(fineTuningSummer)})</span>
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
            <span className='text-sm text-muted-foreground'>({formatValue(fineTuningWinter)})</span>
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
      </div>

      {/* 버튼 */}
      <div className='flex gap-2 pt-4'>
        <Button onClick={handleSave} disabled={isSaving} className='flex-1'>
          {isSaving ? '저장 중...' : '저장'}
        </Button>
        <Button variant='outline' onClick={handleReset} disabled={isSaving}>
          초기화
        </Button>
      </div>
    </Card>
  );
};

export default DeviceAdvancedSettingsCard;
