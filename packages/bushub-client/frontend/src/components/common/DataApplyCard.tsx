import { Database, Download, RotateCcw, Play, Pause, ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { internalApi } from '../../api/axiosInstance';
import { useGetClient, useGetClientData } from '../../api/queries/client';
import { useGetPollingState } from '../../api/queries/polling';
import { useGetSnapshots, useLoadSnapshot, useSaveSnapshot, useDeleteSnapshot } from '../../api/queries/snapshots';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

import { SnapshotApplyProgressDialog } from './SnapshotApplyProgressDialog';
import SnapshotListDialog from './SnapshotListDialog';

interface DataApplyCardProps {
  className?: string;
}

const DataApplyCard = React.forwardRef<HTMLDivElement, DataApplyCardProps>(({ className }, ref) => {
  const [selectedDataId, setSelectedDataId] = useState<string>('');
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // API 훅들 (조건부 호출 방지를 위해 항상 호출)
  const { data: currentClient } = useGetClient();
  const { data: pollingState } = useGetPollingState();
  const { data: snapshotsData } = useGetSnapshots(currentClient?.id || '', 'data', 100, 0);
  const loadSnapshotMutation = useLoadSnapshot();
  const saveSnapshotMutation = useSaveSnapshot();
  const deleteSnapshotMutation = useDeleteSnapshot();
  const { data: currentData } = useGetClientData();

  const handleApplyData = async () => {
    if (!selectedDataId) return;

    try {
      // 진행 상황 다이얼로그 표시
      setShowProgressDialog(true);
      setShowApplyDialog(false);

      await loadSnapshotMutation.mutateAsync(selectedDataId);
      toast.success('Data가 성공적으로 적용되었습니다', { id: `data-apply-success-${selectedDataId}` });
      setSelectedDataId('');

      // 성공 시 다이얼로그 닫기
      setTimeout(() => {
        setShowProgressDialog(false);
      }, 1000);
    } catch (error) {
      toast.error('Data 적용에 실패했습니다', { id: `data-apply-error-${selectedDataId || 'unknown'}` });
      // 실패 시 다이얼로그 닫기
      setTimeout(() => {
        setShowProgressDialog(false);
      }, 1000);
    }
  };

  return (
    <>
      <Card ref={ref} className={className}>
        <CardHeader
          className='cursor-pointer hover:bg-muted/50 transition-colors'
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <CardTitle className='flex items-center gap-2'>
                <Database className='h-5 w-5' />
                Data 적용 관리
              </CardTitle>
              <Badge
                variant={pollingState?.pollingEnabled ? 'default' : 'secondary'}
                className='flex items-center gap-1'
              >
                {pollingState?.pollingEnabled ? (
                  <>
                    <Play className='h-3 w-3' />
                    폴링 활성
                  </>
                ) : (
                  <>
                    <Pause className='h-3 w-3' />
                    폴링 비활성
                  </>
                )}
              </Badge>
            </div>
            {isExpanded ? (
              <ChevronUp className='h-4 w-4 text-muted-foreground transition-transform' />
            ) : (
              <ChevronDown className='h-4 w-4 text-muted-foreground transition-transform' />
            )}
          </div>
          <CardDescription>저장된 Data 스냅샷을 선택하여 현재 시스템에 적용할 수 있습니다</CardDescription>
        </CardHeader>

        {isExpanded && (
          <>
            {pollingState?.pollingEnabled ? (
              <CardContent>
                <div className='text-center py-8'>
                  <Pause className='h-12 w-12 mx-auto mb-4 text-muted-foreground' />
                  <h3 className='text-lg font-medium mb-2'>폴링이 활성화되어 있습니다</h3>
                  <p className='text-sm text-muted-foreground mb-4'>Data를 안전하게 적용하려면 폴링을 중지해주세요</p>
                  <Badge variant='outline' className='text-orange-600 border-orange-600'>
                    폴링 중지 후 사용 가능
                  </Badge>
                </div>
              </CardContent>
            ) : (
              <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                  <div className='space-y-2 p-3 bg-muted/10 rounded-lg border border-border/30'>
                    <h4 className='text-sm font-medium text-foreground'>Data 적용</h4>
                    <p className='text-xs text-muted-foreground'>저장된 Data 스냅샷을 현재 시스템에 적용합니다</p>
                    <div className='grid grid-cols-2 gap-2'>
                      <Select value={selectedDataId} onValueChange={setSelectedDataId}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='스냅샷 선택' />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshotsData?.snapshots?.map(snapshot => (
                            <SelectItem key={snapshot.id} value={snapshot.id}>
                              <div className='flex items-center gap-2'>
                                <span className='flex-1'>{snapshot.name}</span>
                                <span className='text-xs text-muted-foreground'>
                                  {currentClient?.name} ({currentClient?.id}) •{' '}
                                  {new Date(snapshot.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => setShowApplyDialog(true)}
                        disabled={!selectedDataId || loadSnapshotMutation.isPending}
                        className='w-full'
                      >
                        {loadSnapshotMutation.isPending ? '적용 중...' : '적용'}
                      </Button>
                    </div>
                  </div>

                  <div className='space-y-2 p-3 bg-muted/10 rounded-lg border border-border/30'>
                    <h4 className='text-sm font-medium text-foreground'>스냅샷 저장</h4>
                    <p className='text-xs text-muted-foreground'>현재 Data 설정을 백업합니다</p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={async () => {
                        try {
                          await saveSnapshotMutation.mutateAsync({
                            name: `DataSnapshot_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}`,
                            type: 'data',
                            description: 'User Data Snapshot',
                          });
                          toast.success('Data 스냅샷이 성공적으로 저장되었습니다', {
                            id: 'data-snapshot-save-success',
                          });
                        } catch (error) {
                          toast.error('Data 스냅샷 저장에 실패했습니다', { id: 'data-snapshot-save-error' });
                        }
                      }}
                      disabled={saveSnapshotMutation.isPending}
                      className='w-full border-border/50'
                    >
                      {saveSnapshotMutation.isPending ? '저장 중...' : '수동 저장'}
                    </Button>
                  </div>

                  <div className='space-y-2 p-3 bg-muted/10 rounded-lg border border-border/30'>
                    <h4 className='text-sm font-medium text-foreground'>스냅샷 목록</h4>
                    <p className='text-xs text-muted-foreground'>저장된 Data 스냅샷을 확인하고 관리합니다</p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setShowSnapshotDialog(true)}
                      className='w-full border-border/50'
                    >
                      목록 보기 ({snapshotsData?.snapshots?.length || 0}개) {currentClient && `• ${currentClient.name}`}
                    </Button>
                  </div>

                  <div className='space-y-2 p-3 bg-muted/10 rounded-lg border border-border/30'>
                    <h4 className='text-sm font-medium text-foreground'>내보내기</h4>
                    <p className='text-xs text-muted-foreground'>현재 설정을 파일로 내보냅니다</p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        if (currentData) {
                          // 현재 Data 설정을 JSON으로 내보내기
                          const dataStr = JSON.stringify(currentData, null, 2);
                          const dataBlob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(dataBlob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `현재Data설정_${new Date().toISOString().split('T')[0]}.json`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                          toast.success('현재 Data 설정이 JSON 파일로 내보내졌습니다', {
                            id: 'data-export-json-success',
                          });
                        } else {
                          toast.info('내보낼 Data 설정이 없습니다', { id: 'data-export-json-empty' });
                        }
                      }}
                      className='w-full border-border/50'
                    >
                      <Download className='h-4 w-4 mr-1' />
                      JSON 내보내기
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </>
        )}

        {/* Data 적용 확인 다이얼로그 */}
        <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <RotateCcw className='h-5 w-5' />
                Data 적용 확인
              </DialogTitle>
              <DialogDescription>
                선택한 Data 스냅샷을 현재 시스템에 적용하시겠습니까?
                <br />
                <span className='text-orange-600 font-medium'>이 작업은 되돌릴 수 없습니다.</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <div className='flex gap-2 w-full'>
                <Button variant='outline' onClick={() => setShowApplyDialog(false)} className='flex-1'>
                  취소
                </Button>
                <Button
                  onClick={handleApplyData}
                  disabled={!selectedDataId || loadSnapshotMutation.isPending}
                  className='flex-1'
                >
                  {loadSnapshotMutation.isPending ? '적용 중...' : '적용'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>

      {/* 스냅샷 목록 다이얼로그 */}
      <SnapshotListDialog
        open={showSnapshotDialog}
        onOpenChange={setShowSnapshotDialog}
        type='data'
        title='Data 스냅샷 목록'
        onApply={async (snapshotId: string) => {
          try {
            await loadSnapshotMutation.mutateAsync(snapshotId);
            toast.success('Data 스냅샷이 성공적으로 적용되었습니다', {
              id: `data-snapshot-apply-success-${snapshotId}`,
            });
            setShowSnapshotDialog(false);
          } catch (error) {
            toast.error('Data 스냅샷 적용에 실패했습니다', { id: `data-snapshot-apply-error-${snapshotId}` });
          }
        }}
        onDelete={async (snapshotId: string) => {
          try {
            await deleteSnapshotMutation.mutateAsync(snapshotId);
            toast.success('스냅샷이 성공적으로 삭제되었습니다', {
              id: `data-snapshot-delete-success-${snapshotId}`,
            });
          } catch (error) {
            toast.error('스냅샷 삭제에 실패했습니다', { id: `data-snapshot-delete-error-${snapshotId}` });
          }
        }}
        onExport={async (snapshotId: string) => {
          try {
            const response = await internalApi.get(`/snapshots/export/${snapshotId}`);
            const dataStr = JSON.stringify(response.data.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `DataSnapshot_${snapshotId}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success('스냅샷이 JSON 파일로 내보내졌습니다', {
              id: `data-snapshot-export-success-${snapshotId}`,
            });
          } catch (error) {
            toast.error('스냅샷 내보내기에 실패했습니다', { id: `data-snapshot-export-error-${snapshotId}` });
          }
        }}
      />

      {/* 🆕 스냅샷 적용 진행 상황 다이얼로그 */}
      <SnapshotApplyProgressDialog
        isOpen={showProgressDialog}
        onClose={() => setShowProgressDialog(false)}
        snapshotName={snapshotsData?.snapshots?.find(s => s.id === selectedDataId)?.name}
      />
    </>
  );
});

DataApplyCard.displayName = 'DataApplyCard';

export default DataApplyCard;
