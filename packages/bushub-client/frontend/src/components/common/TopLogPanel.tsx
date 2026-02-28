import {
  Wifi,
  WifiOff,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown,
  Trash2,
  Settings,
  Server,
  Code,
} from 'lucide-react';
import React, { useCallback } from 'react';

import { useLogContext } from '../../contexts/LogContext';
import { formatToKoreanTime } from '../../utils/format';
import { Card, CardContent, Badge } from '../ui';

interface TopLogPanelProps {
  isConnected?: boolean;
  connectionStatus?: { text: string; bgColor: string };
}

export const TopLogPanel: React.FC<TopLogPanelProps> = React.memo(
  ({
    isConnected = false,
    connectionStatus = {
      text: '연결 해제',
      bgColor: 'bg-red-100 text-red-800',
    },
  }) => {
    const { isLogPanelOpen, toggleLogPanel, logs, clearLogs, logCount, isLogPanelExpanded, toggleLogPanelExpanded } =
      useLogContext();
    const [filter, setFilter] = React.useState<'all' | 'system' | 'user' | 'api' | 'value-error'>('all');

    console.log('[TopLogPanel] 렌더링, isLogPanelOpen:', isLogPanelOpen);
    console.log('[TopLogPanel] 현재 로그 상태:', {
      totalLogs: logCount,
      filteredLogs: logs.filter(log => {
        if (filter === 'all') return true;
        if (filter === 'value-error') {
          if (log.type === 'command-status') {
            return log.value || log.error;
          }
          return false;
        }
        if (log.type === 'log') {
          return log.service === filter;
        }
        if (log.type === 'command-status') {
          return filter === 'system';
        }
        return false;
      }).length,
      currentFilter: filter,
      isConnected,
      logs: logs.slice(0, 3), // 최근 3개 로그만 표시
    });

    const getLevelIcon = useCallback((level: string) => {
      switch (level) {
        case 'error':
          return <XCircle className='w-4 h-4 text-red-500' />;
        case 'warn':
          return <AlertCircle className='w-4 h-4 text-yellow-500' />;
        case 'info':
          return <Info className='w-4 h-4 text-blue-500' />;
        case 'debug':
          return <CheckCircle className='w-4 h-4 text-gray-500' />;
        default:
          return <Info className='w-4 h-4 text-gray-500' />;
      }
    }, []);

    const getServiceIcon = useCallback((service: string) => {
      switch (service) {
        case 'system':
          return <Settings className='w-4 h-4 text-purple-500' />;
        case 'device':
          return <Server className='w-4 h-4 text-green-500' />;
        case 'websocket':
          return <Wifi className='w-4 h-4 text-blue-500' />;
        case 'api':
          return <Code className='w-4 h-4 text-orange-500' />;
        default:
          return <Info className='w-4 h-4 text-gray-500' />;
      }
    }, []);

    const getServiceBadge = useCallback((service: string) => {
      switch (service) {
        case 'system':
          return { text: 'SYSTEM', className: 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800' };
        case 'device':
          return { text: 'DEVICE', className: 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800' };
        case 'websocket':
          return { text: 'WEBSOCKET', className: 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800' };
        case 'api':
          return { text: 'API', className: 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800' };
        case 'user':
          return { text: 'USER', className: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800' };
        case 'UnifiedLogService':
          return { text: 'LOG', className: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600' };
        default:
          return { text: service.toUpperCase(), className: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600' };
      }
    }, []);

    const getLevelColor = useCallback((level: string) => {
      switch (level) {
        case 'error':
          return 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
        case 'warn':
          return 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
        case 'info':
          return 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
        case 'debug':
          return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
        default:
          return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
      }
    }, []);

    const getStatusColor = useCallback((status: string) => {
      switch (status) {
        case 'success':
          return 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
        case 'fail':
          return 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
        case 'pending':
          return 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
        default:
          return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
      }
    }, []);

    const formatTimestamp = useCallback((timestamp: string) => {
      return formatToKoreanTime(timestamp, { showSeconds: true, showMilliseconds: true });
    }, []);

    // 로그 필터링
    const filteredLogs = logs.filter(log => {
      if (filter === 'all') return true;
      if (filter === 'value-error') {
        if (log.type === 'command-status') {
          return log.value || log.error;
        }
        return false;
      }
      if (log.type === 'log') {
        return log.service === filter;
      }
      if (log.type === 'command-status') {
        // command-status는 장비 관련이므로 system 필터에 포함
        return filter === 'system';
      }
      return false;
    });

    return (
      <Card
        className={`sticky top-0 z-40 w-full mb-4 transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] p-0 ${
          isLogPanelOpen
            ? 'opacity-100 transform translate-y-0 scale-100 max-h-[500px] mb-2'
            : 'opacity-0 transform -translate-y-4 scale-95 pointer-events-none max-h-0 mb-0  overflow-hidden'
        }`}
      >
        <CardContent className='p-4'>
          {/* 헤더 */}
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-3'>
              <h3 className='font-semibold'>실시간 로그</h3>
              <div className='flex items-center gap-2'>
                {isConnected ? (
                  <Wifi className='w-4 h-4 text-green-500' />
                ) : (
                  <WifiOff className='w-4 h-4 text-red-500' />
                )}
                <Badge variant='outline' className='text-xs'>
                  {filteredLogs.length}/{logCount}개
                </Badge>
              </div>
            </div>
            <div className='flex items-center gap-1'>
              <button
                onClick={toggleLogPanelExpanded}
                className='p-1 hover:bg-accent rounded transition-colors'
                title={isLogPanelExpanded ? '축소' : '확장'}
              >
                {isLogPanelExpanded ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
              </button>
              <button
                onClick={toggleLogPanel}
                className='p-1 hover:bg-accent rounded transition-colors'
                title='패널 닫기'
              >
                <XCircle className='w-4 h-4' />
              </button>
            </div>
          </div>

          {/* 필터 버튼들 */}
          <div className='flex items-center gap-2 mb-3'>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilter('system')}
              className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                filter === 'system' ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200' : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              <Settings className='w-3 h-3' />
              시스템
            </button>
            <button
              onClick={() => setFilter('user')}
              className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                filter === 'user' ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200' : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              <Info className='w-3 h-3' />
              사용자
            </button>
            <button
              onClick={() => setFilter('api')}
              className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                filter === 'api' ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200' : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              <Code className='w-3 h-3' />
              API
            </button>
            <button
              onClick={() => setFilter('value-error')}
              className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                filter === 'value-error' ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200' : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              <Info className='w-3 h-3' />
              값/오류
            </button>
            <button
              onClick={clearLogs}
              className='px-3 py-1 text-xs rounded-full bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1'
              title='로그 지우기'
            >
              <Trash2 className='w-3 h-3' />
              지우기
            </button>
          </div>

          {/* 로그 목록 */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isLogPanelExpanded
                ? 'max-h-96 opacity-100 transform translate-y-0 scale-100'
                : 'max-h-24 opacity-100 transform translate-y-0 scale-100'
            }`}
          >
            <div
              className={`overflow-y-auto space-y-1 custom-scrollbar ${isLogPanelExpanded ? 'max-h-96' : 'max-h-20'}`}
            >
              {filteredLogs.length === 0 ? (
                <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
                  <Info className='w-8 h-8 mx-auto mb-2 opacity-50' />
                  <p>로그가 없습니다.</p>
                </div>
              ) : (
                (isLogPanelExpanded ? filteredLogs : filteredLogs.slice(0, 3)).map((log, index) => {
                  return (
                    <div
                      key={index}
                      className='flex items-center gap-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors py-1'
                    >
                      {log.type === 'log' ? (
                        <>
                          <div className='scale-75'>{getLevelIcon(log.level)}</div>
                          <div className='scale-75'>{getServiceIcon(log.service)}</div>
                          <Badge variant='outline' className={`text-xs ${getLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </Badge>
                          <Badge variant='outline' className={`text-xs ${getServiceBadge(log.service).className}`}>
                            {getServiceBadge(log.service).text}
                          </Badge>
                          <span className='text-gray-900 dark:text-gray-100 truncate flex-1 text-xs'>{log.message}</span>
                          <span className='text-xs text-gray-500 dark:text-gray-400 flex-shrink-0'>{formatTimestamp(log.timestamp)}</span>
                        </>
                      ) : (
                        <>
                          <div className='scale-75'>{getLevelIcon(log.level)}</div>
                          <div className='scale-75'>{getServiceIcon(log.service)}</div>
                          <Badge variant='outline' className={`text-xs ${getLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </Badge>
                          <Badge variant='outline' className={`text-xs ${getServiceBadge(log.service).className}`}>
                            {getServiceBadge(log.service).text}
                          </Badge>
                          <Badge variant='outline' className={`text-xs ${getStatusColor(log.status)}`}>
                            {log.status.toUpperCase()}
                          </Badge>

                          {/* 메시지 */}
                          <span className='text-gray-900 dark:text-gray-100 truncate flex-1 text-xs'>{log.message}</span>

                          {/* value 정보 표시 (성공/실패 모두) */}
                          {log.value != null && (
                            <Badge
                              variant='outline'
                              className={`text-xs ${
                                log.status === 'success'
                                  ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800'
                                  : 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                              }`}
                              title={log.status === 'success' ? '변경된 값' : '시도했던 값'}
                            >
                              {log.status === 'success' ? '값' : '시도값'}: {String(log.value)}
                            </Badge>
                          )}

                          {/* error 정보 표시 (실패 시에만) */}
                          {log.error != null && log.status === 'fail' && (
                            <Badge
                              variant='outline'
                              className='text-xs bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
                              title='오류 메시지'
                            >
                              오류: {String(log.error)}
                            </Badge>
                          )}

                          <span className='text-xs text-gray-500 dark:text-gray-400 flex-shrink-0'>{formatTimestamp(log.timestamp)}</span>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
