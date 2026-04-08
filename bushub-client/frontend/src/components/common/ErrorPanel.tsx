import React, { useState, useMemo } from 'react';
import { AlertTriangle, X, MapPin, Clock, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Card, CardContent } from '../ui';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ClientErrorDto } from '../../api/dto';
import { formatErrorTime } from '../../utils/format';

interface ErrorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ClientErrorDto | undefined;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({ isOpen, onClose, errors }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  const getErrorType = (errorId: string) => {
    if (errorId === 'e001') return '통신';
    if (errorId.startsWith('e1')) return '냉난방기';
    if (errorId.startsWith('e4')) return '전열교환기';
    if (errorId.startsWith('e5')) return '통합센서';
    return '기타';
  };

  const getErrorColor = (errorId: string) => {
    if (errorId === 'e001') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (errorId.startsWith('e1')) return 'bg-red-100 text-red-800 border-red-200';
    if (errorId.startsWith('e4')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (errorId.startsWith('e5')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // ✅ 기존 DTO 구조 활용하여 에러 리스트 생성
  const allErrorList =
    errors?.devices?.flatMap(
      device =>
        device.units?.map(unit => ({
          deviceId: device.id,
          unitId: unit.id,
          errorId: unit.errorId,
          errorDesc: unit.errorDesc,
          errorAt: unit.errorAt,
          errorType: getErrorType(unit.errorId),
        })) || []
    ) || [];

  // 🆕 필터링된 에러 리스트
  const filteredErrorList = useMemo(() => {
    let filtered = allErrorList;

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(
        error =>
          error.errorDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
          error.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          error.unitId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          error.errorId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 타입 필터링
    if (filterType !== 'all') {
      filtered = filtered.filter(error => error.errorType === filterType);
    }

    return filtered;
  }, [allErrorList, searchTerm, filterType]);

  // 🆕 표시할 에러 개수 제한 (기본 10개, showAll이 true면 모든 에러)
  const displayErrorList = showAll ? filteredErrorList : filteredErrorList.slice(0, 10);
  const hasMoreErrors = filteredErrorList.length > 10;

  // 🆕 에러 타입별 개수 계산
  const errorTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allErrorList.forEach(error => {
      counts[error.errorType] = (counts[error.errorType] || 0) + 1;
    });
    return counts;
  }, [allErrorList]);

  // 🆕 에러 확장/축소 토글
  const toggleErrorExpansion = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };

  // 🆕 조건부 렌더링을 Hook 이후로 이동
  if (!isOpen) return null;

  return (
    <div className='fixed top-16 right-4 w-96 h-[calc(100vh-5rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 flex flex-col backdrop-blur-sm'>
      {/* 헤더 */}
      <div className='flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-t-xl'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-red-100 dark:bg-red-900/30 rounded-lg'>
            <AlertTriangle className='h-5 w-5 text-red-600 dark:text-red-400' />
          </div>
          <div>
            <h3 className='font-semibold text-gray-900 dark:text-white'>실시간 에러</h3>
            <p className='text-xs text-gray-500 dark:text-gray-400'>시스템 모니터링</p>
          </div>
          <Badge variant='destructive' className='ml-2 shadow-sm'>
            {allErrorList.length}
          </Badge>
        </div>
        <Button
          size='icon'
          variant='ghost'
          onClick={onClose}
          className='hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg'
        >
          <X className='h-4 w-4' />
        </Button>
      </div>

      {/* 필터 및 검색 */}
      <div className='p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 space-y-3'>
        <div className='flex gap-2'>
          <div className='relative flex-1'>
            <Input
              placeholder='에러 검색...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent'
            />
            <Filter className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
          </div>
        </div>

        <div className='flex gap-2'>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className='flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-red-500'>
              <SelectValue placeholder='에러 타입' />
            </SelectTrigger>
            <SelectContent className='bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'>
              <SelectItem value='all' className='hover:bg-gray-100 dark:hover:bg-gray-700'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-gray-400 rounded-full'></div>
                  전체 ({allErrorList.length})
                </div>
              </SelectItem>
              <SelectItem value='통신' className='hover:bg-gray-100 dark:hover:bg-gray-700'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-purple-500 rounded-full'></div>
                  통신 ({errorTypeCounts['통신'] || 0})
                </div>
              </SelectItem>
              <SelectItem value='냉난방기' className='hover:bg-gray-100 dark:hover:bg-gray-700'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-red-500 rounded-full'></div>
                  냉난방기 ({errorTypeCounts['냉난방기'] || 0})
                </div>
              </SelectItem>
              <SelectItem value='전열교환기' className='hover:bg-gray-100 dark:hover:bg-gray-700'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-orange-500 rounded-full'></div>
                  전열교환기 ({errorTypeCounts['전열교환기'] || 0})
                </div>
              </SelectItem>
              <SelectItem value='통합센서' className='hover:bg-gray-100 dark:hover:bg-gray-700'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-yellow-500 rounded-full'></div>
                  통합센서 ({errorTypeCounts['통합센서'] || 0})
                </div>
              </SelectItem>
              <SelectItem value='기타' className='hover:bg-gray-100 dark:hover:bg-gray-700'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-gray-500 rounded-full'></div>
                  기타 ({errorTypeCounts['기타'] || 0})
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 에러 리스트 */}
      <div className='flex-1 overflow-auto p-4 bg-gradient-to-b from-white to-gray-50/30 dark:from-gray-900 dark:to-gray-800/30'>
        {displayErrorList.length === 0 ? (
          <div className='text-center text-gray-500 dark:text-gray-400 py-12'>
            <div className='w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center'>
              <AlertTriangle className='h-8 w-8 text-gray-400' />
            </div>
            <p className='text-lg font-medium mb-2'>
              {searchTerm || filterType !== 'all' ? '검색 결과가 없습니다' : '에러가 없습니다'}
            </p>
            <p className='text-sm text-gray-400'>
              {searchTerm || filterType !== 'all' ? '다른 검색어를 시도해보세요' : '시스템이 정상 작동 중입니다'}
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {displayErrorList.map((error, index) => (
              <Card
                key={index}
                className='border-l-4 border-l-red-500 hover:shadow-md transition-all duration-200 hover:scale-[1.02] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              >
                <CardContent className='py-3 px-4'>
                  {/* 첫 번째 줄: 에러 코드와 시간 */}
                  <div className='flex items-center justify-between mb-2'>
                    <div className='flex items-center gap-2'>
                      <Badge className={`${getErrorColor(error.errorId)} shadow-sm font-medium`}>{error.errorId}</Badge>
                      <span className='text-xs font-medium text-gray-600 dark:text-gray-300'>{error.errorType}</span>
                    </div>
                    <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400'>
                      <Clock className='h-3 w-3' />
                      <span>{formatErrorTime(error.errorAt)}</span>
                    </div>
                  </div>

                  {/* 두 번째 줄: 에러 설명과 위치 정보를 한 줄에 */}
                  <div className='flex items-center justify-between'>
                    <p className='text-sm font-medium text-gray-900 dark:text-white flex-1 mr-3 leading-relaxed'>
                      {error.errorDesc}
                    </p>
                    <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full whitespace-nowrap'>
                      <MapPin className='h-3 w-3' />
                      <span className='font-medium'>
                        {error.deviceId}-{error.unitId}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 더 보기 버튼 */}
        {hasMoreErrors && !showAll && (
          <div className='mt-6 text-center'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowAll(true)}
              className='w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
            >
              <ChevronDown className='h-4 w-4 mr-2' />더 보기 ({filteredErrorList.length - 10}개 더)
            </Button>
          </div>
        )}

        {/* 접기 버튼 */}
        {showAll && hasMoreErrors && (
          <div className='mt-6 text-center'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowAll(false)}
              className='w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
            >
              <ChevronUp className='h-4 w-4 mr-2' />
              접기
            </Button>
          </div>
        )}
      </div>

      {/* 하단 통계 */}
      <div className='p-4 border-t border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-b-xl'>
        <div className='flex justify-between items-center text-sm'>
          <div className='flex items-center gap-2'>
            <div className='w-2 h-2 bg-red-500 rounded-full animate-pulse'></div>
            <span className='text-gray-700 dark:text-gray-300 font-medium'>총 {allErrorList.length}개 에러</span>
          </div>
          <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400'>
            <span>표시: {displayErrorList.length}개</span>
            {filteredErrorList.length !== allErrorList.length && (
              <Badge variant='secondary' className='text-xs'>
                필터됨
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
