import { useCallback, useMemo } from 'react';
import useWebSocketLib, { ReadyState } from 'react-use-websocket';

import { devBackendWsUrl, fieldNginxWsUrl } from '@/constants/devPorts';

import { UnitValue } from '../types/database';

// 공통 메시지 인터페이스
export interface BaseMessage {
  type: 'log' | 'command-status' | 'polling-recovery-prompt' | 'polling-recovery-resolved';
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
  timestamp: string;
}

export interface LogMessage extends BaseMessage {
  type: 'log';
  data?: Record<string, UnitValue>;
}

export interface CommandStatusMessage extends BaseMessage {
  type: 'command-status';
  level: 'info'; // command-status는 항상 info 레벨
  deviceId: string;
  unitId: string;
  action: string;
  status: 'pending' | 'success' | 'fail';
  value?: any; // value 속성 추가
  error?: string; // error 속성 추가
}

export interface PollingRecoveryPromptMessage extends BaseMessage {
  type: 'polling-recovery-prompt';
  data: {
    promptId: string;
    autoDismissSec: number;
    expiresAt: string;
  };
}

export interface PollingRecoveryResolvedMessage extends BaseMessage {
  type: 'polling-recovery-resolved';
  data: {
    promptId: string;
    reason: 'accepted' | 'dismissed' | 'expired';
  };
}

export type WebSocketMessage =
  | LogMessage
  | CommandStatusMessage
  | PollingRecoveryPromptMessage
  | PollingRecoveryResolvedMessage;

export interface UseWebSocketOptions {
  onLog?: (message: LogMessage) => void;
  onCommandStatus?: (message: CommandStatusMessage) => void;
  onPollingRecoveryPrompt?: (message: PollingRecoveryPromptMessage) => void;
  onPollingRecoveryResolved?: (message: PollingRecoveryResolvedMessage) => void;
  onConnect?: () => void;
  onDisconnect?: (code?: number, reason?: string) => void;
  onError?: (error: Event | Error) => void;
  // 추가 옵션들
  shouldReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

const getWebSocketUrl = (): string => {
  const wsUrl = import.meta.env.VITE_WS_URL;

  if (wsUrl) {
    if (wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://')) {
      return wsUrl;
    }
    if (wsUrl.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}${wsUrl}`;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${wsUrl}`;
  }

  if (import.meta.env.PROD) {
    return fieldNginxWsUrl();
  }

  const { hostname } = window.location;
  const host = hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost' : hostname;
  const base = devBackendWsUrl(host);
  return window.location.protocol === 'https:' ? base.replace('ws://', 'wss://') : base;
};

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const wsUrl = getWebSocketUrl();

  // 기본값 설정
  const { shouldReconnect = true, reconnectInterval = 3000, maxReconnectAttempts = 5, ...eventHandlers } = options;

  const { lastMessage, readyState, sendMessage, sendJsonMessage, getWebSocket } = useWebSocketLib(wsUrl, {
    shouldReconnect: () => shouldReconnect,
    reconnectInterval,
    reconnectAttempts: maxReconnectAttempts,
    onOpen: () => {
      eventHandlers.onConnect?.();
    },
    onClose: event => {
      eventHandlers.onDisconnect?.(event.code, event.reason);
    },
    onError: error => {
      console.error('❌ WebSocket 오류 발생:', error);
      eventHandlers.onError?.(error);
    },
    onMessage: event => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        if (data.type === 'log') {
          eventHandlers.onLog?.(data);
        } else if (data.type === 'command-status') {
          eventHandlers.onCommandStatus?.(data);
        } else if (data.type === 'polling-recovery-prompt') {
          eventHandlers.onPollingRecoveryPrompt?.(data);
        } else if (data.type === 'polling-recovery-resolved') {
          eventHandlers.onPollingRecoveryResolved?.(data);
        }
      } catch (error) {
        console.error('WebSocket 메시지 파싱 오류:', error);
      }
    },
  });

  // 연결 상태 메모이제이션
  const isConnected = useMemo(() => readyState === ReadyState.OPEN, [readyState]);

  const connectionStatus = useMemo(() => {
    const getConnectionStatusText = () => {
      switch (readyState) {
        case ReadyState.CONNECTING:
          return '연결 중...';
        case ReadyState.OPEN:
          return '연결됨';
        case ReadyState.CLOSING:
          return '연결 해제 중...';
        case ReadyState.CLOSED:
          return '연결 해제됨';
        default:
          return '알 수 없음';
      }
    };

    const getConnectionStatusBgColor = () => {
      switch (readyState) {
        case ReadyState.CONNECTING:
          return 'bg-yellow-100 text-yellow-800';
        case ReadyState.OPEN:
          return 'bg-green-100 text-green-800';
        case ReadyState.CLOSING:
          return 'bg-orange-100 text-orange-800';
        case ReadyState.CLOSED:
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    return {
      text: getConnectionStatusText(),
      bgColor: getConnectionStatusBgColor(),
    };
  }, [readyState]);

  // 안전한 메시지 전송 함수들
  const safeSendMessage = useCallback(
    (message: string) => {
      if (isConnected) {
        sendMessage(message);
      } else {
        console.warn('WebSocket이 연결되지 않았습니다. 메시지를 전송할 수 없습니다.');
      }
    },
    [isConnected, sendMessage]
  );

  const safeSendJsonMessage = useCallback(
    (message: any) => {
      if (isConnected) {
        sendJsonMessage(message);
      } else {
        console.warn('WebSocket이 연결되지 않았습니다. JSON 메시지를 전송할 수 없습니다.');
      }
    },
    [isConnected, sendJsonMessage]
  );

  // 연결 강제 해제
  const disconnect = useCallback(() => {
    const ws = getWebSocket();
    if (ws) {
      ws.close();
    }
  }, [getWebSocket]);

  // 연결 상태 정보
  const connectionInfo = useMemo(
    () => ({
      isConnected,
      readyState,
      url: wsUrl,
      lastMessage: lastMessage?.data,
    }),
    [isConnected, readyState, wsUrl, lastMessage]
  );

  return {
    // 기본 기능
    isConnected,
    connectionStatus,
    sendMessage: safeSendMessage,
    sendJsonMessage: safeSendJsonMessage,
    getWebSocket,
    lastMessage,
    readyState,

    // 추가 기능
    disconnect,
    connectionInfo,

    // 유틸리티
    canSend: isConnected,
  };
};

export { ReadyState };
