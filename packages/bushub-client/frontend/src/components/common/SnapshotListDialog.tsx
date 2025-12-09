import { Database, Settings, Calendar, Trash2, Download, RotateCcw, Eye } from 'lucide-react';
import React, { useState } from 'react';

import { useGetClient } from '../../api/queries/client';
import { useGetSnapshots } from '../../api/queries/snapshots';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';

import { SnapshotApplyProgressDialog } from './SnapshotApplyProgressDialog';
import SnapshotDetailDialog from './SnapshotDetailDialog';

interface Snapshot {
  id: string;
  name: string;
  type: 'system' | 'data';
  description?: string;
  createdAt: string;
  createdBy: string;
  size: number;
  clientId?: string;
  clientName?: string;
  clientDescription?: string;
}

interface SnapshotListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: 'system' | 'data';
  onApply?: (snapshotId: string) => void;
  onDelete?: (snapshotId: string) => void;
  onExport?: (snapshotId: string) => void;
  title?: string;
}

const SnapshotListDialog: React.FC<SnapshotListDialogProps> = ({
  open,
  onOpenChange,
  type,
  onApply,
  onDelete,
  onExport,
  title = '스냅샷 목록',
}) => {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [limit] = useState(50);
  const [offset] = useState(0);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [applyingSnapshotId, setApplyingSnapshotId] = useState<string | null>(null);

  // 현재 클라이언트 정보 조회
  const { data: currentClient } = useGetClient();

  // 스냅샷 목록 조회 (클라이언트별 필터링)
  const { data: snapshotsData, isLoading, error } = useGetSnapshots(currentClient?.id || '', type, limit, offset);

  // 날짜 포맷팅 함수
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

  // 정렬된 스냅샷 목록
  const sortedSnapshots = React.useMemo(() => {
    if (!snapshotsData?.snapshots) return [];

    return [...snapshotsData.snapshots].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [snapshotsData?.snapshots, sortOrder]);

  // 더보기 버튼 클릭 핸들러
  const handleShowDetail = (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
    setShowDetailDialog(true);
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
              {getTypeIcon(type || 'data')}
              {title}
              <Badge variant='outline'>{snapshotsData?.snapshots?.length || 0}개</Badge>
            </DialogTitle>
            <div className='flex items-center gap-2'>
              <Select value={sortOrder} onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='newest'>최신순</SelectItem>
                  <SelectItem value='oldest'>오래된순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto'>
          {error && (
            <div className='text-center text-red-600 p-4 md:p-6'>
              <p>스냅샷 목록을 불러오는 중 오류가 발생했습니다.</p>
              <Button variant='outline' onClick={() => window.location.reload()} className='mt-2'>
                다시 시도
              </Button>
            </div>
          )}

          {isLoading && (
            <div className='space-y-4 p-4 md:p-6'>
              {[...Array(5)].map((_, i) => (
                <div key={i} className='flex items-center space-x-4'>
                  <Skeleton className='h-12 w-12 rounded' />
                  <div className='space-y-2 flex-1'>
                    <Skeleton className='h-4 w-[200px]' />
                    <Skeleton className='h-3 w-[150px]' />
                  </div>
                  <Skeleton className='h-8 w-[100px]' />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && (!snapshotsData?.snapshots || snapshotsData.snapshots.length === 0) && (
            <div className='text-center text-muted-foreground p-4 md:p-6'>
              <Database className='h-12 w-12 mx-auto mb-4 opacity-50' />
              <p className='text-lg font-medium'>저장된 스냅샷이 없습니다</p>
              <p className='text-sm'>새로운 스냅샷을 생성해보세요.</p>
            </div>
          )}

          {!isLoading && !error && snapshotsData?.snapshots && snapshotsData.snapshots.length > 0 && (
            <div className='space-y-3 p-4 md:p-6'>
              {sortedSnapshots.map(snapshot => (
                <div
                  key={snapshot.id}
                  className='flex flex-col p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-muted/50 transition-colors gap-3'
                >
                  <div className='flex items-center gap-3 md:gap-4 flex-1 min-w-0'>
                    <div className='flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-muted rounded-lg flex-shrink-0'>
                      {getTypeIcon(snapshot.type)}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex flex-col md:flex-row md:items-center gap-1 md:gap-2 mb-1'>
                        <h4 className='font-medium text-sm md:text-base'>{snapshot.name}</h4>
                      </div>
                      <div className='flex flex-col gap-2 text-xs md:text-sm text-muted-foreground'>
                        <div className='flex items-center gap-1'>
                          <Calendar className='h-3 w-3' />
                          <span className='hidden sm:inline'>{formatDate(snapshot.createdAt)}</span>
                          <span className='sm:hidden'>{new Date(snapshot.createdAt).toLocaleDateString()}</span>
                        </div>
                        {currentClient && (
                          <Badge variant='default' className='w-fit text-xs'>
                            {currentClient.name} ({currentClient.id})
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-1 md:gap-2 w-full justify-end border-t border-gray-200 pt-3'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleShowDetail(snapshot)}
                      className='flex items-center gap-1 text-xs md:text-sm border-gray-300'
                    >
                      <Eye className='h-3 w-3' />
                      <span className='hidden sm:inline'>더보기</span>
                      <span className='sm:hidden'>더보기</span>
                    </Button>
                    {onApply && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={async () => {
                          if (
                            confirm(
                              `"${snapshot.name}" 스냅샷을 적용하시겠습니까?\n\n⚠️ 주의: 현재 설정이 백업되고 스냅샷 데이터로 복원됩니다.`
                            )
                          ) {
                            setApplyingSnapshotId(snapshot.id);
                            setShowProgressDialog(true);

                            try {
                              await onApply(snapshot.id);
                              // 성공 시 다이얼로그 닫기
                              setTimeout(() => {
                                setShowProgressDialog(false);
                                setApplyingSnapshotId(null);
                              }, 1000);
                            } catch (error) {
                              // 실패 시 다이얼로그 닫기
                              setTimeout(() => {
                                setShowProgressDialog(false);
                                setApplyingSnapshotId(null);
                              }, 1000);
                            }
                          }
                        }}
                        className='flex items-center gap-1 text-xs md:text-sm border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                      >
                        <RotateCcw className='h-3 w-3' />
                        <span className='hidden sm:inline'>적용</span>
                        <span className='sm:hidden'>적용</span>
                      </Button>
                    )}
                    {onExport && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => onExport(snapshot.id)}
                        className='flex items-center gap-1 text-xs md:text-sm border-gray-300'
                      >
                        <Download className='h-3 w-3' />
                        <span className='hidden sm:inline'>내보내기</span>
                        <span className='sm:hidden'>내보내기</span>
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          if (confirm(`"${snapshot.name}" 스냅샷을 삭제하시겠습니까?`)) {
                            onDelete(snapshot.id);
                          }
                        }}
                        className='flex items-center gap-1 text-red-600 hover:text-red-700 text-xs md:text-sm border-gray-300'
                      >
                        <Trash2 className='h-3 w-3' />
                        <span className='hidden sm:inline'>삭제</span>
                        <span className='sm:hidden'>삭제</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      {/* 스냅샷 상세 다이얼로그 */}
      {selectedSnapshot && (
        <SnapshotDetailDialog
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          snapshotId={selectedSnapshot.id}
          snapshotName={selectedSnapshot.name}
          snapshotType={selectedSnapshot.type}
        />
      )}

      {/* 🆕 스냅샷 적용 진행 상황 다이얼로그 */}
      <SnapshotApplyProgressDialog
        isOpen={showProgressDialog}
        onClose={() => {
          setShowProgressDialog(false);
          setApplyingSnapshotId(null);
        }}
        snapshotName={snapshotsData?.snapshots?.find(s => s.id === applyingSnapshotId)?.name}
      />
    </Dialog>
  );
};

export default SnapshotListDialog;
