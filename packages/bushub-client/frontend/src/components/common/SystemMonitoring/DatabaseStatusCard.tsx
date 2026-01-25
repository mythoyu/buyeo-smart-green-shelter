import { Database, Eye } from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface DatabaseStatusCardProps {
  data?: {
    status: string;
    readyState: number;
    readyStateText: string;
    collections?: number;
    size?: number;
    indexes?: number;
    objects?: number;
    avgObjSize?: number;
    error?: string;
    timestamp: string;
  };
  onViewData?: () => void;
}

const DatabaseStatusCard: React.FC<DatabaseStatusCardProps> = ({ data, onViewData }) => {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Database className='h-5 w-5' />
            데이터베이스
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center h-20'>
            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600'></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'connected':
        return 'default';
      case 'disconnected':
        return 'destructive';
      case 'connecting':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return '연결됨';
      case 'disconnected':
        return '연결안됨';
      case 'connecting':
        return '연결중';
      case 'error':
        return '오류';
      default:
        return '알 수 없음';
    }
  };

  const getReadyStateText = (readyState: number) => {
    switch (readyState) {
      case 0:
        return '연결 해제됨';
      case 1:
        return '연결됨';
      case 2:
        return '연결 중';
      case 3:
        return '연결 해제 중';
      default:
        return '알 수 없음';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Database className='h-5 w-5' />
          데이터베이스
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {/* 연결 상태 */}
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>상태</span>
            <Badge variant={getStatusVariant(data.status)}>{getStatusText(data.status)}</Badge>
          </div>

          {/* 연결 상태 상세 */}
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>연결 상태</span>
            <span className='text-sm text-muted-foreground'>{getReadyStateText(data.readyState)}</span>
          </div>

          {/* 에러가 있는 경우 */}
          {data.error && (
            <div className='p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700'>
              <div className='font-medium'>오류:</div>
              <div>{data.error}</div>
            </div>
          )}

          {/* 연결된 경우에만 상세 정보 표시 */}
          {data.status === 'connected' && (
            <>
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span>컬렉션</span>
                  <span className='font-medium'>{data.collections}개</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span>데이터 크기</span>
                  <span className='font-medium'>{data.size}MB</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span>인덱스</span>
                  <span className='font-medium'>{data.indexes}개</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span>문서 수</span>
                  <span className='font-medium'>{data.objects?.toLocaleString()}개</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span>평균 문서 크기</span>
                  <span className='font-medium'>{data.avgObjSize}KB</span>
                </div>
              </div>

              {/* 데이터 보기 버튼 */}
              <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-full border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  onClick={onViewData}
                >
                  <Eye className='h-4 w-4 mr-2' />
                  데이터 보기
                </Button>
              </div>
            </>
          )}

          {/* 연결되지 않은 경우 */}
          {data.status !== 'connected' && !data.error && (
            <div className='text-center py-4'>
              <div className='text-sm text-muted-foreground'>데이터베이스 연결을 확인해주세요</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseStatusCard;
