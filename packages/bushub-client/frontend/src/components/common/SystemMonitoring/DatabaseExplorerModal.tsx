import { X, ChevronLeft, ChevronRight, Database, Eye } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

import { internalApi } from '../../../api/axiosInstance';
import { useGetDatabaseCollections, useGetCollectionData } from '../../../api/queries/system-monitoring';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

interface DatabaseExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DatabaseExplorerModal: React.FC<DatabaseExplorerModalProps> = ({ isOpen, onClose }) => {
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: collections, isLoading: collectionsLoading } = useGetDatabaseCollections();
  const { data: collectionData, isLoading: dataLoading } = useGetCollectionData(selectedCollection, currentPage, 20);

  const [search, setSearch] = useState('');
  // 정렬은 인덱스 순 유지 (비활성화)
  const [pageInput, setPageInput] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const handleCollectionChange = (collectionName: string) => {
    setSelectedCollection(collectionName);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 동적 컬럼 추출 (현재 페이지 데이터 기준)
  const columns = useMemo(() => {
    const cols = new Set<string>();
    (collectionData?.data || []).forEach((doc: any) => {
      Object.keys(doc || {}).forEach(k => cols.add(k));
    });
    // _id가 있으면 첫 컬럼로
    const list = Array.from(cols);
    list.sort();
    if (list.includes('_id')) {
      return ['_id', ...list.filter(c => c !== '_id')];
    }
    return list;
  }, [collectionData]);

  // 컬럼별 대표 타입 계산 (현재 페이지 데이터 샘플 기준)
  const columnTypes = useMemo(() => {
    const typeOfValue = (v: any): string => {
      if (v === null || v === undefined) return 'null';
      if (typeof v === 'number') return 'number';
      if (typeof v === 'boolean') return 'boolean';
      if (typeof v === 'string') {
        // 날짜 형태 감지(간단)
        const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:.+Z$/;
        if (iso.test(v)) return 'string';
        return 'string';
      }
      if (Array.isArray(v)) return 'array';
      if (typeof v === 'object') return 'object';
      return 'string';
    };

    const map: Record<string, string> = {};
    columns.forEach(col => {
      const counts: Record<string, number> = {};
      (collectionData?.data || []).forEach((row: any) => {
        const t = typeOfValue(row?.[col]);
        counts[t] = (counts[t] || 0) + 1;
      });
      // 최빈 타입 선택
      let bestType = 'string';
      let bestCount = -1;
      Object.entries(counts).forEach(([t, c]) => {
        if (c > bestCount) {
          bestType = t;
          bestCount = c;
        }
      });
      map[col] = bestType || 'string';
    });
    return map;
  }, [columns, collectionData]);

  const typeToBadgeClass = (t: string): string => {
    switch (t) {
      case 'string':
        return 'bg-blue-100 text-blue-700';
      case 'number':
        return 'bg-green-100 text-green-700';
      case 'boolean':
        return 'bg-amber-100 text-amber-800';
      case 'array':
        return 'bg-purple-100 text-purple-700';
      case 'object':
        return 'bg-cyan-100 text-cyan-700';
      case 'null':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  // 검색 적용된 뷰 데이터 (현재 페이지 범위 내에서만 클라이언트 처리)
  const viewRows = useMemo(() => {
    let rows = collectionData?.data || [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((row: any) => columns.some(col => String(row?.[col]).toLowerCase().includes(q)));
    }
    return rows;
  }, [collectionData, search, columns]);

  // 전체 페이지 데이터 수집 (API 응답 형태 유연 처리)
  const fetchAllRows = async (): Promise<any[]> => {
    if (!selectedCollection) return [];
    // 첫 페이지로 메타 정보 조회
    const first = await internalApi.get(`/database/collection/${selectedCollection}?page=1&limit=100`);
    const metaWrapper = first?.data?.data; // success wrapper
    const meta = metaWrapper?.data ?? metaWrapper; // unwrap { data: ... }
    const firstData = Array.isArray(meta?.data) ? meta.data : Array.isArray(meta) ? meta : [];
    const totalPages: number = typeof meta?.totalPages === 'number' ? meta.totalPages : 1;
    let all: any[] = Array.isArray(firstData) ? firstData : [];

    for (let page = 2; page <= totalPages; page++) {
      const resp = await internalApi.get(`/database/collection/${selectedCollection}?page=${page}&limit=100`);
      const payloadWrapper = resp?.data?.data;
      const payload = payloadWrapper?.data ?? payloadWrapper;
      const chunk = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
      if (Array.isArray(chunk) && chunk.length) {
        all = all.concat(chunk);
      }
    }
    return all;
  };

  const exportJSON = async () => {
    try {
      setIsExporting(true);
      const allRows = await fetchAllRows();
      const blob = new Blob([JSON.stringify(allRows, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedCollection || 'collection'}_all.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const exportXLSX = async () => {
    try {
      setIsExporting(true);
      const allRows = await fetchAllRows();
      // 전체 컬럼 추출
      const colSet = new Set<string>();
      (Array.isArray(allRows) ? allRows : []).forEach((row: any) => Object.keys(row || {}).forEach(k => colSet.add(k)));
      const allColumns = Array.from(colSet);
      if (allColumns.includes('_id')) {
        // _id 우선
        allColumns.splice(allColumns.indexOf('_id'), 1);
        allColumns.unshift('_id');
      }
      const flatRows = allRows.map((row: any) => {
        const obj: Record<string, any> = {};
        allColumns.forEach(col => {
          const v = row?.[col];
          obj[col] = typeof v === 'object' ? JSON.stringify(v) : v;
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(flatRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, selectedCollection || 'Sheet1');
      XLSX.writeFile(wb, `${selectedCollection || 'collection'}_all.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') {
      if (value.length > 50) return value.substring(0, 50) + '...';
      return value;
    }
    return String(value);
  };

  // 필드 타입 배지 제거로 미사용

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col'>
        {/* 헤더 */}
        <div className='flex items-center justify-between p-6 border-b'>
          <div className='flex items-center gap-3'>
            <Database className='h-6 w-6 text-blue-600' />
            <div>
              <h2 className='text-xl font-semibold'>데이터베이스 탐색</h2>
              <p className='text-sm text-muted-foreground'>컬렉션 데이터를 확인할 수 있습니다</p>
            </div>
          </div>
          <Button variant='ghost' size='sm' onClick={onClose}>
            <X className='h-4 w-4' />
          </Button>
        </div>

        {/* 컨텐츠 */}
        <div className='flex-1 p-6 overflow-hidden'>
          <div className='h-full flex flex-col gap-4'>
            {/* 컬렉션 선택 */}
            <div className='flex items-center gap-4'>
              <label className='text-sm font-medium'>컬렉션 선택:</label>
              <Select value={selectedCollection} onValueChange={handleCollectionChange}>
                <SelectTrigger className='w-64'>
                  <SelectValue placeholder='컬렉션을 선택하세요' />
                </SelectTrigger>
                <SelectContent>
                  {collectionsLoading ? (
                    <SelectItem value='' disabled>
                      로딩 중...
                    </SelectItem>
                  ) : (
                    Array.isArray(collections) &&
                    collections?.map(collection => (
                      <SelectItem key={collection.name} value={collection.name}>
                        {collection.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 데이터 표시 */}
            <div className='flex-1 overflow-auto'>
              {!selectedCollection ? (
                <div className='flex items-center justify-center h-full text-muted-foreground'>
                  <div className='text-center'>
                    <Eye className='h-12 w-12 mx-auto mb-4 opacity-50' />
                    <p>컬렉션을 선택하면 데이터를 확인할 수 있습니다</p>
                  </div>
                </div>
              ) : dataLoading ? (
                <div className='flex items-center justify-center h-full'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
                </div>
              ) : (
                <div className='space-y-4'>
                  {/* 데이터 테이블 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='text-lg'>
                        {selectedCollection} 컬렉션
                        {collectionData && (
                          <span className='text-sm font-normal text-muted-foreground ml-2'>
                            (총 {collectionData.total}개 문서)
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* 툴바: 검색/내보내기 */}
                      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3'>
                        <div className='flex items-center gap-2'>
                          <input
                            className='border border-neutral-300 rounded px-2 py-1 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                            placeholder='검색 (현재 페이지)'
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                          />
                        </div>
                        <div className='flex items-center gap-2'>
                          <Button
                            variant='secondary'
                            size='sm'
                            className='hover:opacity-90'
                            onClick={exportJSON}
                            disabled={isExporting}
                          >
                            JSON 다운로드
                          </Button>
                          <Button
                            variant='secondary'
                            size='sm'
                            className='hover:opacity-90'
                            onClick={exportXLSX}
                            disabled={isExporting}
                          >
                            XLSX 다운로드
                          </Button>
                        </div>
                      </div>

                      <div className='overflow-x-auto'>
                        <table className='w-full text-sm'>
                          <thead>
                            <tr className='border-b border-neutral-200'>
                              {columns.map(col => (
                                <th key={col} className='text-left p-2 font-medium'>
                                  <div className='flex items-center gap-2'>
                                    <span>{col}</span>
                                    <Badge
                                      className={`text-[10px] px-1 py-0.5 ${typeToBadgeClass(
                                        columnTypes[col] || 'string'
                                      )}`}
                                    >
                                      {columnTypes[col] || 'string'}
                                    </Badge>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {viewRows.map((doc, rowIndex) => (
                              <tr key={rowIndex} className='border-b border-neutral-200 align-top'>
                                {columns.map(col => (
                                  <td key={col} className='p-2 text-xs'>
                                    <div className='break-all'>{formatValue(doc?.[col])}</div>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 페이지네이션 */}
                  {collectionData && collectionData.totalPages > 1 && (
                    <div className='flex items-center justify-between'>
                      <div className='text-sm text-muted-foreground'>
                        페이지 {collectionData.page} / {collectionData.totalPages}
                      </div>
                      <div className='flex items-center gap-2'>
                        {/* 페이지 점프 */}
                        <input
                          className='border border-neutral-300 rounded px-2 py-1 text-sm w-20 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                          placeholder='이동'
                          value={pageInput}
                          onChange={e => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && collectionData) {
                              const n = Number(pageInput || '');
                              if (!Number.isNaN(n) && n >= 1 && n <= collectionData.totalPages) {
                                handlePageChange(n);
                                setPageInput('');
                              }
                            }
                          }}
                        />
                        <Button
                          variant='outline'
                          size='sm'
                          className='hover:bg-neutral-100'
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage <= 1}
                        >
                          <ChevronLeft className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          className='hover:bg-neutral-100'
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= collectionData.totalPages}
                        >
                          <ChevronRight className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseExplorerModal;
