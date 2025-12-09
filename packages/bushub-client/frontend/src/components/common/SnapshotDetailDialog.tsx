import { Database, Settings, Calendar, User, Copy, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { internalApi } from '../../api/axiosInstance';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface SnapshotDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
  snapshotName: string;
  snapshotType: 'system' | 'data';
}

interface SnapshotDetailData {
  id: string;
  name: string;
  type: 'system' | 'data';
  description?: string;
  createdAt: string;
  createdBy: string;
  data: any;
}

const SnapshotDetailDialog: React.FC<SnapshotDetailDialogProps> = ({
  open,
  onOpenChange,
  snapshotId,
  snapshotName,
  snapshotType,
}) => {
  const [snapshotData, setSnapshotData] = useState<SnapshotDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'formatted' | 'raw'>('formatted');

  // 스냅샷 상세 데이터 로드
  const loadSnapshotDetail = async () => {
    if (!snapshotId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await internalApi.get(`/snapshots/export/${snapshotId}`);
      console.log('[DEBUG] 프론트엔드 응답:', response.data);
      setSnapshotData(response.data.data);
    } catch (error) {
      console.error('스냅샷 상세 조회 오류:', error);
      setError('스냅샷 데이터를 불러오는 중 오류가 발생했습니다.');
      toast.error('스냅샷 데이터 조회에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 다이얼로그가 열릴 때 데이터 로드
  React.useEffect(() => {
    if (open && snapshotId) {
      loadSnapshotDetail();
    }
  }, [open, snapshotId]);

  // JSON 복사 기능
  const copyToClipboard = async () => {
    if (!snapshotData) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshotData, null, 2));
      toast.success('JSON 데이터가 클립보드에 복사되었습니다');
    } catch (error) {
      toast.error('클립보드 복사에 실패했습니다');
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 타입별 아이콘
  const getTypeIcon = (type: 'system' | 'data') => {
    return type === 'system' ? <Settings className='h-4 w-4' /> : <Database className='h-4 w-4' />;
  };

  // 타입별 배지 색상
  const getTypeBadgeVariant = (type: 'system' | 'data') => {
    return type === 'system' ? 'default' : 'secondary';
  };

  // 데이터 구조화 렌더링 (Data 스냅샷용)
  const renderDataSnapshot = (data: any) => {
    if (!data) {
      return (
        <div className='text-center py-8'>
          <Database className='h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50' />
          <p className='text-muted-foreground'>스냅샷 데이터가 비어있습니다</p>
        </div>
      );
    }

    if (!data.devices || (Array.isArray(data.devices) && data.devices.length === 0)) {
      return (
        <div className='text-center py-8'>
          <Database className='h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50' />
          <p className='text-muted-foreground'>장비 데이터가 없습니다</p>
          {data.id && <p className='text-sm text-muted-foreground mt-2'>클라이언트 ID: {data.id}</p>}
        </div>
      );
    }

    return (
      <div className='space-y-4'>
        <div className='p-3 bg-muted/10 rounded-lg'>
          <h4 className='font-medium mb-2'>클라이언트 정보</h4>
          <p className='text-sm text-muted-foreground'>ID: {data.id}</p>
        </div>

        <div className='space-y-3'>
          <h4 className='font-medium'>장비 데이터 ({data.devices.length}개)</h4>
          {data.devices.map((device: any, deviceIndex: number) => (
            <div key={deviceIndex} className='border rounded-lg p-3'>
              <div className='flex items-center gap-2 mb-2'>
                <Badge variant='outline'>{device.id}</Badge>
                <span className='text-sm font-medium'>{device.type}</span>
              </div>

              {device.units && device.units.length > 0 ? (
                device.units.map((unit: any, unitIndex: number) => (
                  <div key={unitIndex} className='ml-4 mt-2 p-2 bg-muted/5 rounded border-l-2 border-muted'>
                    <div className='flex items-center gap-2 mb-2'>
                      <Badge variant='secondary' className='text-xs'>
                        Unit {unit.id}
                      </Badge>
                    </div>

                    {unit.data && Object.keys(unit.data).length > 0 ? (
                      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs'>
                        {Object.entries(unit.data).map(([key, value]) => (
                          <div key={key} className='flex flex-col'>
                            <span className='font-medium text-muted-foreground'>{key}</span>
                            <span className='truncate'>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='text-xs text-muted-foreground'>유닛 데이터가 없습니다</p>
                    )}
                  </div>
                ))
              ) : (
                <p className='text-sm text-muted-foreground ml-4'>유닛이 없습니다</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 데이터 구조화 렌더링 (System 스냅샷용)
  const renderSystemSnapshot = (data: any) => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <div className='text-center py-8'>
          <Settings className='h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50' />
          <p className='text-muted-foreground'>시스템 설정 데이터가 비어있습니다</p>
        </div>
      );
    }

    return (
      <div className='space-y-4'>
        <div className='p-3 bg-muted/10 rounded-lg'>
          <h4 className='font-medium mb-2'>시스템 설정 ({Object.keys(data).length}개 섹션)</h4>
        </div>
        {Object.entries(data).map(([section, sectionData]) => (
          <div key={section} className='border rounded-lg p-3'>
            <h4 className='font-medium mb-2 capitalize'>{section}</h4>
            <div className='bg-muted/5 rounded p-2'>
              <pre className='text-xs overflow-x-auto'>{JSON.stringify(sectionData, null, 2)}</pre>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border-0 shadow-none'
        showCloseButton={false}
      >
        <DialogHeader>
          <div className='flex items-center justify-between'>
            <DialogTitle className='flex items-center gap-2'>
              {getTypeIcon(snapshotType)}
              스냅샷 상세 정보
              <Badge variant={getTypeBadgeVariant(snapshotType)}>
                {snapshotType === 'system' ? '시스템' : '데이터'}
              </Badge>
            </DialogTitle>
            <div className='flex items-center gap-2'>
              <Button variant='outline' size='sm' onClick={copyToClipboard} disabled={!snapshotData}>
                <Copy className='h-3 w-3 mr-1' />
                복사
              </Button>
              <Button variant='outline' size='sm' onClick={() => onOpenChange(false)}>
                <X className='h-3 w-3 mr-1' />
                닫기
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-hidden'>
          {error && (
            <div className='text-center text-red-600 p-4'>
              <p>{error}</p>
              <Button variant='outline' onClick={loadSnapshotDetail} className='mt-2'>
                다시 시도
              </Button>
            </div>
          )}

          {isLoading && (
            <div className='space-y-4 p-4'>
              <Skeleton className='h-4 w-[200px]' />
              <Skeleton className='h-32 w-full' />
              <Skeleton className='h-32 w-full' />
            </div>
          )}

          {!isLoading && !error && snapshotData && (
            <div className='h-full flex flex-col'>
              {/* 스냅샷 메타 정보 */}
              <div className='p-4 border-b bg-muted/10'>
                <div className='space-y-2 text-sm'>
                  <div className='flex items-center gap-2'>
                    <Calendar className='h-3 w-3 text-muted-foreground' />
                    <span className='text-muted-foreground'>생성일:</span>
                    <span>{formatDate(snapshotData.createdAt)}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <User className='h-3 w-3 text-muted-foreground' />
                    <span className='text-muted-foreground'>생성자:</span>
                    <span>{snapshotData.createdBy}</span>
                  </div>
                  {snapshotData.description && (
                    <div className='flex items-center gap-2'>
                      <span className='text-muted-foreground'>설명:</span>
                      <span>{snapshotData.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 데이터 표시 탭 */}
              <div className='flex-1 overflow-hidden'>
                <Tabs
                  value={activeTab}
                  onValueChange={(value: string) => setActiveTab(value as 'formatted' | 'raw')}
                  className='h-full flex flex-col'
                >
                  <TabsList className='grid w-full grid-cols-2'>
                    <TabsTrigger value='formatted'>구조화된 보기</TabsTrigger>
                    <TabsTrigger value='raw'>원본 JSON</TabsTrigger>
                  </TabsList>

                  <TabsContent value='formatted' className='flex-1 overflow-hidden mt-0'>
                    <ScrollArea className='h-full p-4'>
                      {snapshotType === 'data'
                        ? renderDataSnapshot(snapshotData.data)
                        : renderSystemSnapshot(snapshotData.data)}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value='raw' className='flex-1 overflow-hidden mt-0'>
                    <ScrollArea className='h-full p-4'>
                      <pre className='text-xs bg-muted/5 rounded p-3 overflow-x-auto'>
                        {JSON.stringify(snapshotData, null, 2)}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SnapshotDetailDialog;
