import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { useSetAllUnitsToScheduleMode, useSetAllUnitsToManualMode } from '../../api/queries/system';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface ModeControlCardProps {
  className?: string;
}

const ModeControlCard = React.forwardRef<HTMLDivElement, ModeControlCardProps>(({ className }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mode Switch 관련 훅 (조건부 호출 방지를 위해 항상 호출)
  const setAllUnitsToScheduleModeMutation = useSetAllUnitsToScheduleMode();
  const setAllUnitsToManualModeMutation = useSetAllUnitsToManualMode();

  // Mode Switch 핸들러
  const handleModeChange = async (isAutoMode: boolean) => {
    try {
      if (isAutoMode) {
        await setAllUnitsToScheduleModeMutation.mutateAsync();
        toast.success('자동 모드가 활성화되었습니다');
      } else {
        await setAllUnitsToManualModeMutation.mutateAsync();
        toast.success('수동 모드가 활성화되었습니다');
      }
    } catch (error) {
      console.error('모드 변경 실패:', error);
      toast.error('모드 변경에 실패했습니다');
    }
  };

  return (
    <Card ref={ref} className={className}>
      <CardHeader
        className='cursor-pointer hover:bg-muted/50 transition-colors'
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <CardTitle className='flex items-center gap-2'>
              <Settings className='h-5 w-5' />
              전체 모드 제어
            </CardTitle>
            <Badge variant='outline' className='flex items-center gap-1'>
              <Settings className='h-3 w-3' />
              일괄 제어
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className='h-4 w-4 text-muted-foreground transition-transform' />
          ) : (
            <ChevronDown className='h-4 w-4 text-muted-foreground transition-transform' />
          )}
        </div>
        <CardDescription>모든 유닛의 자동/수동 모드를 일괄 변경할 수 있습니다</CardDescription>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2 p-3 bg-muted/10 rounded-lg border border-border/30'>
              <h4 className='text-sm font-medium text-foreground'>수동 모드</h4>
              <p className='text-xs text-muted-foreground'>모든 유닛을 수동 모드로 변경합니다</p>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleModeChange(false)}
                disabled={setAllUnitsToManualModeMutation.isPending || setAllUnitsToScheduleModeMutation.isPending}
                className='w-full border-border/50'
              >
                {setAllUnitsToManualModeMutation.isPending ? '변경 중...' : '전체 수동모드'}
              </Button>
            </div>

            <div className='space-y-2 p-3 bg-muted/10 rounded-lg border border-border/30'>
              <h4 className='text-sm font-medium text-foreground'>자동 모드</h4>
              <p className='text-xs text-muted-foreground'>모든 유닛을 자동 모드로 변경합니다</p>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleModeChange(true)}
                disabled={setAllUnitsToManualModeMutation.isPending || setAllUnitsToScheduleModeMutation.isPending}
                className='w-full border-border/50'
              >
                {setAllUnitsToScheduleModeMutation.isPending ? '변경 중...' : '전체 자동모드'}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
});

ModeControlCard.displayName = 'ModeControlCard';

export default ModeControlCard;
