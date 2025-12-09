import { RefreshCw, Search, FileText, Download, Archive, AlertCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

import { useGetLogFiles, useGetLogContent, useSearchLogs, downloadLogFile } from '../../api/queries/logs';
import { useWebSocket } from '../../hooks/useWebSocket';
import { TopLogPanel } from '../common/TopLogPanel';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui';

// 인터페이스는 타입 추론으로 처리

export default function LogAnalysisPage() {
  const { isConnected } = useWebSocket({});

  const [selectedFile, setSelectedFile] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [linesToShow, setLinesToShow] = useState<number>(100);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshStatus, setRefreshStatus] = useState<string>('');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // React Query 훅 직접 사용
  const {
    data: logFilesData,
    isLoading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
  } = useGetLogFiles({
    staleTime: 5 * 60 * 1000, // 5분 캐시
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
  const {
    data: logContentData,
    isLoading: contentLoading,
    error: contentError,
    refetch: refetchContent,
  } = useGetLogContent({
    filename: selectedFile,
    lines: linesToShow,
    enabled: !!selectedFile,
    staleTime: 2 * 60 * 1000, // 2분 캐시
    refetchOnWindowFocus: false, // 로그 내용은 자동 갱신 불필요
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 15000),
  });
  const {
    data: searchData,
    isLoading: searchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useSearchLogs({
    query: searchQuery,
    filename: selectedFile,
    enabled: false, // 수동으로 호출
    staleTime: 1 * 60 * 1000, // 1분 캐시
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // 데이터 처리
  const processedLogFiles = useMemo(() => {
    if (!logFilesData?.success || !logFilesData.files) return [];
    return logFilesData.files.map((filename: string) => ({
      filename,
      isCompressed: filename.endsWith('.gz') || filename.endsWith('.zip'),
    }));
  }, [logFilesData]);

  const processedLogContent = useMemo(() => {
    if (searchData && typeof searchData === 'object' && 'success' in searchData && searchData.success) {
      return {
        filename: selectedFile || '검색 결과',
        lines: (searchData as any).results || [],
        totalLines: (searchData as any).totalResults || 0,
        isCompressed: selectedFile ? selectedFile.endsWith('.gz') || selectedFile.endsWith('.zip') : false,
      };
    }
    if (logContentData && typeof logContentData === 'object' && 'success' in logContentData && logContentData.success) {
      return {
        ...logContentData,
        isCompressed: selectedFile ? selectedFile.endsWith('.gz') || selectedFile.endsWith('.zip') : false,
      };
    }
    return null;
  }, [logContentData, searchData, selectedFile]);

  // 로딩 상태 세분화
  const isFilesLoading = filesLoading;
  const isContentLoading = contentLoading;
  const isSearchLoading = searchLoading;
  const isAnyLoading = isFilesLoading || isContentLoading || isSearchLoading;

  // 에러 상태 개별 관리
  const hasFilesError = !!filesError;
  const hasContentError = !!contentError;
  const hasSearchError = !!searchError;

  // 검색 실행
  const handleSearch = () => {
    refetchSearch();
  };

  // 전체 새로고침 (파일 목록 + 선택된 파일 내용)
  const handleFullRefresh = async () => {
    try {
      setIsRefreshing(true);
      setRefreshStatus('파일 목록 새로고침 중...');

      // 파일 목록 새로고침
      await refetchFiles({ cancelRefetch: false });

      if (selectedFile) {
        setRefreshStatus('파일 내용 새로고침 중...');
        await refetchContent({ cancelRefetch: false });
      }

      setRefreshStatus('새로고침 완료');
      setLastRefreshTime(new Date());
      toast.success('전체 로그가 새로고침되었습니다.', { id: 'logs-refresh-success' });
    } catch (error) {
      console.error('새로고침 실패:', error);
      toast.error('새로고침 중 오류가 발생했습니다.', { id: 'logs-refresh-error' });
    } finally {
      setIsRefreshing(false);
      setRefreshStatus('');
    }
  };

  // 에러 메시지 생성
  const getErrorMessage = (error: any) => {
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return '알 수 없는 오류가 발생했습니다.';
  };

  // 파일 선택 시 첫 번째 파일 자동 선택
  useMemo(() => {
    if (processedLogFiles.length > 0 && !selectedFile) {
      setSelectedFile(processedLogFiles[0].filename);
    }
  }, [processedLogFiles, selectedFile]);

  // 로그 파일 다운로드 (압축 파일은 해제된 내용으로 다운로드)
  const handleDownloadLogFile = async (filename: string) => {
    try {
      // React Query 함수 사용
      const result = await downloadLogFile({ filename, lines: 10000 });

      if (result.success) {
        const content = result.data;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // 압축 파일인 경우 확장자 제거
        const downloadName = filename.endsWith('.gz')
          ? filename.slice(0, -3) // .gz 제거
          : filename.endsWith('.zip')
          ? filename.slice(0, -4) // .zip 제거
          : filename;

        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`${downloadName} 파일이 다운로드되었습니다.`, {
          id: `logs-download-success-${downloadName}`,
        });
      } else {
        toast.error('로그 파일 다운로드에 실패했습니다.', { id: `logs-download-error-${filename}` });
      }
    } catch (error) {
      console.error('로그 파일 다운로드 실패:', error);
      toast.error('로그 파일 다운로드 중 오류가 발생했습니다.', { id: `logs-download-error-${filename}` });
    }
  };

  // 파일명 표시 (압축 파일 표시)
  const getDisplayFilename = (filename: string) => {
    if (filename.endsWith('.gz')) {
      return `${filename.slice(0, -3)} (GZIP 압축됨)`;
    } else if (filename.endsWith('.zip')) {
      return `${filename.slice(0, -4)} (ZIP 압축됨)`;
    }
    return filename;
  };

  // 마지막 새로고침 시간 포맷팅
  const formatLastRefreshTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
      return `${seconds}초 전`;
    } else if (minutes < 60) {
      return `${minutes}분 전`;
    } else if (hours < 24) {
      return `${hours}시간 전`;
    }
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className='space-y-2'>
      {/* 로그 패널 */}
      <TopLogPanel isConnected={isConnected} />

      <div className='flex flex-col space-y-6'>
        {/* 헤더 */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 flex items-center justify-center bg-muted rounded-full'>
              <FileText className='w-5 h-5 text-primary' />
            </div>
            <div>
              <h1 className='text-xl font-bold'>로그 분석</h1>
              <p className='text-muted-foreground text-sm'>
                시스템 로그를 분석하고 검색할 수 있습니다
                {lastRefreshTime && (
                  <span className='ml-2 text-xs'>• 마지막 새로고침: {formatLastRefreshTime(lastRefreshTime)}</span>
                )}
              </p>
            </div>
          </div>
          <Button onClick={handleFullRefresh} disabled={isRefreshing || isFilesLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? refreshStatus || '전체 새로고침 중...' : '전체 새로고침'}
          </Button>
        </div>

        {/* 컨트롤 패널 */}
        <Card>
          <CardContent className='py-0'>
            <div className='flex items-center gap-4 flex-wrap'>
              <div className='flex items-center gap-2'>
                <label className='text-sm font-medium'>파일:</label>
                <Select value={selectedFile} onValueChange={setSelectedFile} disabled={isFilesLoading}>
                  <SelectTrigger className='w-[200px]'>
                    <SelectValue placeholder={isFilesLoading ? '로딩 중...' : '로그 파일을 선택하세요'} />
                  </SelectTrigger>
                  <SelectContent>
                    {isFilesLoading ? (
                      <div className='p-2 text-center text-sm text-muted-foreground'>
                        <RefreshCw className='w-4 h-4 animate-spin mx-auto mb-2' />
                        로딩 중...
                      </div>
                    ) : (
                      processedLogFiles.map((file: any) => (
                        <SelectItem key={file.filename} value={file.filename}>
                          {getDisplayFilename(file.filename)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className='flex items-center gap-2'>
                <label className='text-sm font-medium'>라인:</label>
                <Select
                  value={linesToShow.toString()}
                  onValueChange={value => setLinesToShow(Number(value))}
                  disabled={isContentLoading}
                >
                  <SelectTrigger className='w-[100px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='50'>50줄</SelectItem>
                    <SelectItem value='100'>100줄</SelectItem>
                    <SelectItem value='200'>200줄</SelectItem>
                    <SelectItem value='500'>500줄</SelectItem>
                    <SelectItem value='1000'>1000줄</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedFile && (
                <Button
                  onClick={() => handleDownloadLogFile(selectedFile)}
                  variant='outline'
                  size='sm'
                  disabled={isContentLoading}
                >
                  <Download className='w-4 h-4 mr-2' />
                  다운로드
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 검색 패널 */}
        <Card>
          <CardContent className='py-0'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 flex items-center justify-center bg-muted rounded-full'>
                <Search className='w-4 h-4 text-primary' />
              </div>
              <div className='flex-1 flex gap-2'>
                <Input
                  type='text'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder='검색어를 입력하세요... (GZIP, ZIP 압축 파일도 검색됩니다)'
                  onKeyPress={e => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearchLoading || !searchQuery.trim()}>
                  <Search className={`w-4 h-4 mr-2 ${isSearchLoading ? 'animate-spin' : ''}`} />
                  {isSearchLoading ? '검색 중...' : '검색'}
                </Button>
                <Button onClick={() => setSearchQuery('')} variant='outline' disabled={isSearchLoading}>
                  초기화
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 로그 내용 */}
        <Card className='flex-1'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 flex items-center justify-center bg-muted rounded-full'>
                  <FileText className='w-4 h-4 text-primary' />
                </div>
                <CardTitle>로그 내용</CardTitle>
              </div>
              <div className='flex items-center gap-2'>
                {processedLogContent && <Badge variant='secondary'>{processedLogContent.totalLines}줄</Badge>}
                {processedLogContent?.isCompressed && (
                  <Badge variant='outline'>
                    <Archive className='w-3 h-3 mr-1' />
                    {selectedFile?.endsWith('.gz')
                      ? 'GZIP 해제됨'
                      : selectedFile?.endsWith('.zip')
                      ? 'ZIP 해제됨'
                      : '압축 해제됨'}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className='p-0'>
            {/* 파일 목록 에러 */}
            {hasFilesError && (
              <div className='text-center py-8'>
                <AlertCircle className='w-8 h-8 mx-auto mb-2 text-destructive' />
                <p className='text-destructive'>로그 파일 목록을 불러올 수 없습니다.</p>
                <p className='text-muted-foreground text-sm mt-1'>{getErrorMessage(filesError)}</p>
                <Button onClick={() => refetchFiles()} variant='outline' size='sm' className='mt-2'>
                  다시 시도
                </Button>
              </div>
            )}

            {/* 로그 내용 에러 */}
            {hasContentError && (
              <div className='text-center py-8'>
                <AlertCircle className='w-8 h-8 mx-auto mb-2 text-destructive' />
                <p className='text-destructive'>로그 내용을 불러올 수 없습니다.</p>
                <p className='text-muted-foreground text-sm mt-1'>{getErrorMessage(contentError)}</p>
                <Button onClick={() => refetchContent()} variant='outline' size='sm' className='mt-2'>
                  다시 시도
                </Button>
              </div>
            )}

            {/* 검색 에러 */}
            {hasSearchError && (
              <div className='text-center py-8'>
                <AlertCircle className='w-8 h-8 mx-auto mb-2 text-destructive' />
                <p className='text-destructive'>검색 중 오류가 발생했습니다.</p>
                <p className='text-muted-foreground text-sm mt-1'>{getErrorMessage(searchError)}</p>
                <Button onClick={() => refetchSearch()} variant='outline' size='sm' className='mt-2'>
                  다시 시도
                </Button>
              </div>
            )}

            {/* 파일 목록 로딩 */}
            {isFilesLoading && (
              <div className='text-center py-8'>
                <RefreshCw className='w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground' />
                <p className='text-muted-foreground'>파일 목록을 불러오는 중...</p>
              </div>
            )}

            {/* 로그 내용 로딩 */}
            {isContentLoading && (
              <div className='text-center py-8'>
                <RefreshCw className='w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground' />
                <p className='text-muted-foreground'>로그 내용을 불러오는 중...</p>
              </div>
            )}

            {/* 검색 로딩 */}
            {isSearchLoading && (
              <div className='text-center py-8'>
                <RefreshCw className='w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground' />
                <p className='text-muted-foreground'>검색 중...</p>
              </div>
            )}

            {/* 로그 내용 표시 */}
            {processedLogContent && !isAnyLoading && !hasContentError && !hasSearchError ? (
              <div className='h-[calc(100vh-16rem)] overflow-y-auto bg-muted p-4 font-mono text-sm border-t custom-scrollbar'>
                {processedLogContent.lines.length === 0 ? (
                  <div className='text-center py-8'>
                    <FileText className='w-8 h-8 mx-auto mb-2 text-muted-foreground' />
                    <p className='text-muted-foreground'>로그 내용이 없습니다.</p>
                  </div>
                ) : (
                  processedLogContent.lines.map((line: any, index: any) => (
                    <div key={index} className='py-1 hover:bg-accent px-2 rounded transition-colors'>
                      {line}
                    </div>
                  ))
                )}
              </div>
            ) : !isAnyLoading && !hasFilesError && !hasContentError && !hasSearchError ? (
              <div className='text-center py-8'>
                <FileText className='w-8 h-8 mx-auto mb-2 text-muted-foreground' />
                <p className='text-muted-foreground'>로그 파일을 선택하거나 검색어를 입력하세요.</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Toast 알림 */}
    </div>
  );
}
