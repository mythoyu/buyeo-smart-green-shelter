import { RefreshCw, Search, FileText, Download, AlertCircle, ArrowUp, ArrowDown, X, AlertTriangle, Info, Bug, Activity } from 'lucide-react';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';

import { useGetLogFiles, useGetLogContent, useSearchLogs, downloadLogFile } from '../../api/queries/logs';
import { useRightSidebarContent } from '../../hooks/useRightSidebarContent';
import { useWebSocket } from '../../hooks/useWebSocket';
import { RightSidebarItem } from '../layout/RightSidebar';
import { TopLogPanel } from '../common/TopLogPanel';
import {
  Badge,
  Button,
  Card,
  CardContent,
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
  const [linesToShow, setLinesToShow] = useState<number | 'all'>(100);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshStatus, setRefreshStatus] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('all'); // 'all' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE' | 'FATAL'

  // 정렬 순서 상태 (localStorage에서 읽어오기, 기본값: 'asc' - 시간오름차순)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('logSortOrder');
    return saved === 'asc' || saved === 'desc' ? saved : 'asc';
  });

  // 정렬 순서 변경 핸들러
  const handleSortToggle = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    localStorage.setItem('logSortOrder', newOrder);
  };

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
    ...(linesToShow !== 'all' && { lines: linesToShow }),
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

  // 로그 라인 파싱 함수 - 유연한 파싱 (JSON, 텍스트 형식 모두 지원)
  const parseLogLine = (line: string) => {
    // 1. JSON 형식 파싱 시도 (winston.format.json())
    try {
      const jsonData = JSON.parse(line);
      if (jsonData.timestamp && jsonData.level && jsonData.message) {
        return {
          timestamp: jsonData.timestamp,
          level: String(jsonData.level).toUpperCase(),
          message: String(jsonData.message),
          raw: line,
        };
      }
    } catch {
      // JSON 파싱 실패 시 다음 단계로
    }

    // 2. [timestamp] LEVEL : message 형식 파싱
    const bracketMatch = line.match(/^\[([^\]]+)\]\s+(\w+)\s+:\s+(.*)$/);
    if (bracketMatch) {
      return {
        timestamp: bracketMatch[1],
        level: bracketMatch[2].toUpperCase(),
        message: bracketMatch[3],
        raw: line,
      };
    }

    // 3. timestamp LEVEL message 형식 파싱 (공백으로 분리)
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 3) {
      // 타임스탬프 형식 확인 (YYYY-MM-DD 또는 YYYY-MM-DD HH:mm:ss 등)
      const timestampPattern = /^\d{4}-\d{2}-\d{2}/;
      if (timestampPattern.test(parts[0])) {
        // 첫 번째가 타임스탬프일 가능성이 높음
        const possibleLevel = parts.find(part => /^(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)$/i.test(part));
        if (possibleLevel) {
          const timestampIndex = 0;
          const levelIndex = parts.indexOf(possibleLevel);
          const messageStart = levelIndex + 1;

          return {
            timestamp: parts.slice(timestampIndex, levelIndex).join(' '),
            level: possibleLevel.toUpperCase(),
            message: parts.slice(messageStart).join(' '),
            raw: line,
          };
        }
      }
    }

    // 4. 파싱 실패 시 전체를 메시지로 표시
    return {
      timestamp: undefined,
      level: undefined,
      message: line,
      raw: line,
    };
  };

  // 로그 레벨별 색상/스타일 가져오기 (배경색과 텍스트 색상 명확하게 구분)
  const getLevelStyle = (level?: string) => {
    if (!level) return { bgColor: 'bg-muted', textColor: 'text-muted-foreground' };

    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return { bgColor: 'bg-red-600', textColor: 'text-white' };
      case 'WARN':
      case 'WARNING':
        return { bgColor: 'bg-yellow-500', textColor: 'text-yellow-950' };
      case 'INFO':
        return { bgColor: 'bg-blue-600', textColor: 'text-white' };
      case 'DEBUG':
      case 'TRACE':
        return { bgColor: 'bg-gray-400', textColor: 'text-gray-900' };
      default:
        return { bgColor: 'bg-muted', textColor: 'text-muted-foreground' };
    }
  };

  const processedLogContent = useMemo(() => {
    if (searchData && typeof searchData === 'object' && 'success' in searchData && searchData.success) {
      const results = (searchData as { results?: string[] }).results;
      const totalResults = (searchData as { totalResults?: number }).totalResults;
      return {
        filename: selectedFile || '검색 결과',
        lines: Array.isArray(results) ? results : [],
        totalLines: typeof totalResults === 'number' ? totalResults : 0,
        isCompressed: selectedFile ? selectedFile.endsWith('.gz') || selectedFile.endsWith('.zip') : false,
      };
    }
    if (logContentData && typeof logContentData === 'object' && 'success' in logContentData && logContentData.success) {
      const lines = (logContentData as { lines?: string[] }).lines;
      return {
        ...logContentData,
        lines: Array.isArray(lines) ? lines : [],
        isCompressed: selectedFile ? selectedFile.endsWith('.gz') || selectedFile.endsWith('.zip') : false,
      };
    }
    return null;
  }, [logContentData, searchData, selectedFile]);

  // 파싱된 로그 데이터 메모이제이션 (성능 최적화)
  const parsedLogs = useMemo(() => {
    if (!processedLogContent || !Array.isArray(processedLogContent.lines)) return [];
    const logs = processedLogContent.lines.map((line: string, index: number) => {
      const parsed = parseLogLine(String(line));
      return {
        ...parsed,
        index,
        levelStyle: getLevelStyle(parsed.level),
      };
    });

    // 로그 레벨 필터링
    const filteredLogs =
      selectedLogLevel === 'all'
        ? logs
        : logs.filter(log => log.level && log.level.toUpperCase() === selectedLogLevel.toUpperCase());

    // 정렬 순서에 따라 정렬 (시간오름차순/시간내림차순)
    if (sortOrder === 'desc') {
      // 시간내림차순: 최신 로그가 위에 (배열을 복사한 후 역순)
      return [...filteredLogs].reverse();
    }
    // 시간오름차순: 오래된 로그가 위에 (기본값, 원본 순서 유지)
    return filteredLogs;
  }, [processedLogContent, sortOrder, selectedLogLevel]);

  // 가상화를 위한 스크롤 컨테이너 ref
  const parentRef = useRef<HTMLDivElement>(null);

  // 가상화 설정
  const virtualizer = useVirtualizer({
    count: parsedLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // 각 로그 라인의 예상 높이 (px)
    overscan: 5, // 화면 밖에 미리 렌더링할 아이템 수
  });

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
  const handleSearch = useCallback(() => {
    refetchSearch();
  }, [refetchSearch]);

  // 전체 새로고침 (파일 목록 + 선택된 파일 내용)
  const handleFullRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setRefreshStatus('새로고침 중...');

      await refetchFiles({ cancelRefetch: false });

      if (selectedFile) {
        setRefreshStatus('새로고침 중...');
        await refetchContent({ cancelRefetch: false });
      }

      toast.success('전체 로그가 새로고침되었습니다.', { id: 'logs-refresh-success' });
    } catch (error) {
      console.error('새로고침 실패:', error);
      toast.error('새로고침 중 오류가 발생했습니다.', { id: 'logs-refresh-error' });
    } finally {
      setIsRefreshing(false);
      setRefreshStatus('');
    }
  }, [selectedFile, refetchFiles, refetchContent]);

  // 에러 메시지 생성
  const getErrorMessage = (error: any) => {
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return '알 수 없는 오류가 발생했습니다.';
  };

  // 파일 선택 시 첫 번째 파일 자동 선택
  useEffect(() => {
    if (processedLogFiles.length > 0 && !selectedFile) {
      setSelectedFile(processedLogFiles[0].filename);
    }
  }, [processedLogFiles, selectedFile]);

  // 로그 파일 다운로드 (압축 파일은 해제된 내용으로 다운로드, 설정값에 맞게 다운로드)
  const handleDownloadLogFile = useCallback(async (filename: string) => {
    try {
      // 설정값(linesToShow)에 맞게 다운로드
      const downloadParams: { filename: string; lines?: number } = { filename };
      if (linesToShow !== 'all') {
        downloadParams.lines = linesToShow;
      }
      // lines가 없으면 전체 다운로드

      // React Query 함수 사용
      const result = await downloadLogFile(downloadParams);

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
        const lineInfo = linesToShow === 'all' ? '전체' : `${linesToShow}줄`;
        toast.success(`${downloadName} 파일 (${lineInfo})이 다운로드되었습니다.`, {
          id: `logs-download-success-${downloadName}`,
        });
      } else {
        toast.error('로그 파일 다운로드에 실패했습니다.', { id: `logs-download-error-${filename}` });
      }
    } catch (error) {
      console.error('로그 파일 다운로드 실패:', error);
      toast.error('로그 파일 다운로드 중 오류가 발생했습니다.', { id: `logs-download-error-${filename}` });
    }
  }, [linesToShow]);

  // 파일명 표시 (압축 파일 표시)
  const getDisplayFilename = (filename: string) => {
    if (filename.endsWith('.gz')) {
      return `${filename.slice(0, -3)} (GZIP 압축됨)`;
    } else if (filename.endsWith('.zip')) {
      return `${filename.slice(0, -4)} (ZIP 압축됨)`;
    }
    return filename;
  };

  // 핸들러 메모이제이션
  const handleToggleSearch = useCallback(() => {
    setShowSearch(prev => !prev);
  }, []);

  // 로그 레벨 필터 핸들러
  const handleLogLevelFilter = useCallback((level: string) => {
    setSelectedLogLevel(level);
  }, []);

  // 사이드바 컨텐츠
  const sidebarContent = useMemo(
    () => (
      <>
        <RightSidebarItem
          icon={Search}
          label='검색'
          active={showSearch}
          onClick={handleToggleSearch}
          title='검색'
        />
        <RightSidebarItem
          icon={Activity}
          label='전체'
          active={selectedLogLevel === 'all'}
          onClick={() => handleLogLevelFilter('all')}
          title='전체 로그'
        />
        <RightSidebarItem
          icon={AlertCircle}
          label='ERROR'
          active={selectedLogLevel === 'ERROR'}
          onClick={() => handleLogLevelFilter('ERROR')}
          title='ERROR 레벨'
        />
        <RightSidebarItem
          icon={AlertTriangle}
          label='WARN'
          active={selectedLogLevel === 'WARN'}
          onClick={() => handleLogLevelFilter('WARN')}
          title='WARN 레벨'
        />
        <RightSidebarItem
          icon={Info}
          label='INFO'
          active={selectedLogLevel === 'INFO'}
          onClick={() => handleLogLevelFilter('INFO')}
          title='INFO 레벨'
        />
        <RightSidebarItem
          icon={Bug}
          label='DEBUG'
          active={selectedLogLevel === 'DEBUG'}
          onClick={() => handleLogLevelFilter('DEBUG')}
          title='DEBUG 레벨'
        />
      </>
    ),
    [showSearch, handleToggleSearch, selectedLogLevel, handleLogLevelFilter]
  );

  // 오른쪽 사이드바 설정
  useRightSidebarContent(sidebarContent, [showSearch, handleToggleSearch, selectedLogLevel, handleLogLevelFilter]);

  return (
    <div className='flex flex-col' style={{ height: 'calc(100vh - 6rem)' }}>
      {/* 로그 패널 */}
      <div className='flex-shrink-0'>
        <TopLogPanel isConnected={isConnected} />
      </div>

      <div className='flex-1 flex flex-col space-y-6 min-h-0'>
        {/* 컨트롤 패널 (검색, 파일 선택 등) - 토글 가능 */}
        {showSearch && (
          <Card>
            <CardContent className='py-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* 검색바 */}
                <div id='log-search' className='flex flex-wrap items-center gap-2'>
                  <Input
                    type='text'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder='검색어 입력... (GZIP, ZIP 압축 파일도 검색)'
                    onKeyPress={e => e.key === 'Enter' && handleSearch()}
                    className='flex-1 min-w-[200px]'
                  />
                  <Button onClick={handleSearch} disabled={isSearchLoading || !searchQuery.trim()} size='sm'>
                    <Search className={`w-4 h-4 mr-2 ${isSearchLoading ? 'animate-spin' : ''}`} />
                    검색
                  </Button>
                  <Button onClick={() => setSearchQuery('')} variant='outline' size='sm' disabled={isSearchLoading}>
                    <X className='w-4 h-4 mr-2' />
                    초기화
                  </Button>
                </div>
                {/* 파일 선택 */}
                <div id='log-file' className='flex flex-wrap items-center gap-2'>
                <Select value={selectedFile} onValueChange={setSelectedFile} disabled={isFilesLoading}>
                  <SelectTrigger className='w-[200px]'>
                    <SelectValue placeholder={isFilesLoading ? '로딩 중...' : '로그 파일 선택'} />
                  </SelectTrigger>
                  <SelectContent>
                    {isFilesLoading ? (
                      <div className='p-2 text-center text-sm text-muted-foreground'>로딩 중...</div>
                    ) : (
                      processedLogFiles.map((file: any) => (
                        <SelectItem key={file.filename} value={file.filename}>
                          {getDisplayFilename(file.filename)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Select
                  value={linesToShow.toString()}
                  onValueChange={value => setLinesToShow(value === 'all' ? 'all' : Number(value))}
                  disabled={isContentLoading}
                >
                  <SelectTrigger className='w-[100px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>전체</SelectItem>
                    <SelectItem value='50'>50줄</SelectItem>
                    <SelectItem value='100'>100줄</SelectItem>
                    <SelectItem value='200'>200줄</SelectItem>
                    <SelectItem value='500'>500줄</SelectItem>
                    <SelectItem value='1000'>1000줄</SelectItem>
                  </SelectContent>
                </Select>
                {selectedFile && (
                  <>
                    <Button
                      onClick={() => handleDownloadLogFile(selectedFile)}
                      variant='outline'
                      size='sm'
                      disabled={isContentLoading}
                    >
                      <Download className='w-4 h-4 mr-2' />
                      다운로드
                    </Button>
                    <Button
                      onClick={handleSortToggle}
                      variant='outline'
                      size='sm'
                      disabled={isContentLoading || !processedLogContent}
                      title={sortOrder === 'asc' ? '시간 내림차순' : '시간 오름차순'}
                    >
                      {sortOrder === 'asc' ? <ArrowDown className='w-4 h-4 mr-2' /> : <ArrowUp className='w-4 h-4 mr-2' />}
                      {sortOrder === 'asc' ? '내림' : '오름'}
                    </Button>
                  </>
                )}
                <Button onClick={handleFullRefresh} variant='outline' size='sm' disabled={isRefreshing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? refreshStatus || '새로고침...' : '새로고침'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* 로그 내용 */}
        <Card className='flex-1 flex flex-col min-h-0 overflow-hidden'>
          <CardContent className='p-0 flex-1 flex flex-col min-h-0 overflow-hidden'>
            {/* 파일 목록 에러 */}
            {hasFilesError && (
              <div className='flex-1 flex items-center justify-center'>
                <div className='text-center py-8'>
                  <AlertCircle className='w-8 h-8 mx-auto mb-2 text-destructive' />
                  <p className='text-destructive'>로그 파일 목록을 불러올 수 없습니다.</p>
                  <p className='text-muted-foreground text-sm mt-1'>{getErrorMessage(filesError)}</p>
                  <Button onClick={() => refetchFiles()} variant='outline' size='sm' className='mt-2'>
                    다시 시도
                  </Button>
                </div>
              </div>
            )}

            {/* 로그 내용 에러 */}
            {hasContentError && (
              <div className='flex-1 flex items-center justify-center'>
                <div className='text-center py-8'>
                  <AlertCircle className='w-8 h-8 mx-auto mb-2 text-destructive' />
                  <p className='text-destructive'>로그 내용을 불러올 수 없습니다.</p>
                  <p className='text-muted-foreground text-sm mt-1'>{getErrorMessage(contentError)}</p>
                  <Button onClick={() => refetchContent()} variant='outline' size='sm' className='mt-2'>
                    다시 시도
                  </Button>
                </div>
              </div>
            )}

            {/* 검색 에러 */}
            {hasSearchError && (
              <div className='flex-1 flex items-center justify-center'>
                <div className='text-center py-8'>
                  <AlertCircle className='w-8 h-8 mx-auto mb-2 text-destructive' />
                  <p className='text-destructive'>검색 중 오류가 발생했습니다.</p>
                  <p className='text-muted-foreground text-sm mt-1'>{getErrorMessage(searchError)}</p>
                  <Button onClick={() => refetchSearch()} variant='outline' size='sm' className='mt-2'>
                    다시 시도
                  </Button>
                </div>
              </div>
            )}

            {/* 파일 목록 로딩 */}
            {isFilesLoading && (
              <div className='flex-1 flex items-center justify-center'>
                <div className='text-center py-8'>
                  <RefreshCw className='w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground' />
                  <p className='text-muted-foreground'>파일 목록을 불러오는 중...</p>
                </div>
              </div>
            )}

            {/* 로그 내용 로딩 */}
            {isContentLoading && (
              <div className='flex-1 flex items-center justify-center'>
                <div className='text-center py-8'>
                  <RefreshCw className='w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground' />
                  <p className='text-muted-foreground'>로그 내용을 불러오는 중...</p>
                </div>
              </div>
            )}

            {/* 검색 로딩 */}
            {isSearchLoading && (
              <div className='flex-1 flex items-center justify-center'>
                <div className='text-center py-8'>
                  <RefreshCw className='w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground' />
                  <p className='text-muted-foreground'>검색 중...</p>
                </div>
              </div>
            )}

            {/* 로그 내용 표시 */}
            {processedLogContent && !isAnyLoading && !hasContentError && !hasSearchError ? (
              <div ref={parentRef} className='flex-1 overflow-y-auto bg-muted custom-scrollbar min-h-0'>
                {parsedLogs.length === 0 ? (
                  <div className='text-center py-8'>
                    <FileText className='w-8 h-8 mx-auto mb-2 text-muted-foreground' />
                    <p className='text-muted-foreground'>로그 내용이 없습니다.</p>
                  </div>
                ) : (
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {virtualizer.getVirtualItems().map(virtualItem => {
                      const logItem = parsedLogs[virtualItem.index];
                      if (!logItem) return null;

                      return (
                        <div
                          key={virtualItem.key}
                          data-index={virtualItem.index}
                          ref={virtualizer.measureElement}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          <div className='grid grid-cols-[180px_80px_1fr] gap-4 items-center py-1.5 px-3 hover:bg-accent/50 transition-colors'>
                            {/* 타임스탬프 */}
                            <span className='text-xs text-muted-foreground font-mono'>{logItem.timestamp || ''}</span>

                            {/* 레벨 */}
                            {logItem.level ? (
                              <Badge
                                className={`${logItem.levelStyle.bgColor} ${logItem.levelStyle.textColor} w-fit text-xs font-medium px-2 py-0.5 rounded-md border-0`}
                              >
                                {logItem.level}
                              </Badge>
                            ) : (
                              <span className='text-xs text-muted-foreground'>-</span>
                            )}

                            {/* 메시지 */}
                            <span className='text-sm font-mono break-words'>{logItem.message}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : !isAnyLoading && !hasFilesError && !hasContentError && !hasSearchError ? (
              <div className='flex-1 flex items-center justify-center'>
                <div className='text-center py-8'>
                  <FileText className='w-8 h-8 mx-auto mb-2 text-muted-foreground' />
                  <p className='text-muted-foreground'>로그 파일을 선택하거나 검색어를 입력하세요.</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Toast 알림 */}
    </div>
  );
}
