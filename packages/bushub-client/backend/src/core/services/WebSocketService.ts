import { Server } from 'http';

import { WebSocket, WebSocketServer } from 'ws';

import { logInfo } from '../../logger';
import { ILogger } from '../../shared/interfaces/ILogger';
import { UnitValue } from '../../types';
import { IWebSocketRepository } from '../repositories/interfaces/IWebSocketRepository';

import { IWebSocketService, BroadcastMessage, LogMessage, CommandStatusMessage } from './interfaces/IWebSocketService';

export class WebSocketService implements IWebSocketService {
  private wss: WebSocketServer | null = null;

  constructor(private webSocketRepository: IWebSocketRepository, private logger?: ILogger) {}

  initialize(server: Server): void {
    if (this.wss) {
      this.logger?.warn('WebSocket 서비스가 이미 초기화되어 있습니다.');
      return;
    }

    try {
      this.wss = new WebSocketServer({
        server,
        path: '/ws',
      });

      this.wss.on('connection', (ws: WebSocket, req: Record<string, unknown>) => {
        this.handleConnection(ws, req);
      });

      // WebSocket 서버 에러 처리
      this.wss.on('error', (error: Error) => {
        this.logger?.error(`WebSocket 서버 에러: ${error.message}`);
      });

      // WebSocket 서버 헤더 에러 처리
      this.wss.on('headers', (headers: string[]) => {
        this.logger?.debug(`WebSocket 헤더 전송: ${headers.length}개 헤더`);
      });

      this.logger?.info('WebSocket 서비스가 초기화되었습니다.');
    } catch (error) {
      this.logger?.error(`WebSocket 서비스 초기화 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  handleConnection(ws: WebSocket, _req?: Record<string, unknown>): void {
    // WebSocket 객체 유효성 검사
    if (!ws || typeof ws.on !== 'function') {
      this.logger?.error(`유효하지 않은 WebSocket 객체: ${typeof ws}`);
      return;
    }

    // 클라이언트 ID 생성
    const clientId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientInfo = `ws://localhost:3000/ws - ${new Date().toISOString()}`;

    this.logger?.info(`WebSocket 연결 시도 감지: ${clientInfo}`);

    // 클라이언트 등록
    this.webSocketRepository.addClient({
      id: clientId,
      ws,
      connectedAt: new Date(),
    });

    // 연결 확인 메시지 전송
    this.sendToClient(ws, {
      type: 'log',
      level: 'info',
      service: 'websocket',
      message: 'WebSocket 연결이 성공했습니다.',
      timestamp: new Date().toISOString(),
    });

    // heartbeat 메시지 처리
    ws.on('message', (data: Buffer | string) => {
      const message = data.toString();
      // 메시지 수신 로깅
      logInfo(
        `[WebSocket] 메시지 수신: ${JSON.stringify({
          clientId,
          message,
          timestamp: new Date().toISOString(),
        })}`,
      );

      if (message === 'ping') {
        ws.send('pong');
        this.logger?.debug('Heartbeat ping/pong 처리');
      } else {
        // 기타 메시지에 대한 응답
        const responseMessage = 'hi from WebSocketService';
        // 기본 응답 전송 로깅
        logInfo(
          `[WebSocket] 기본 응답 전송: ${JSON.stringify({
            clientId,
            response: responseMessage,
            timestamp: new Date().toISOString(),
          })}`,
        );
        ws.send(responseMessage);
      }
    });

    // 클라이언트 연결 로그
    this.logger?.info(
      `새로운 클라이언트가 연결되었습니다. (총 ${this.webSocketRepository.getConnectedClientsCount()}개)`,
    );

    // 연결 해제 처리
    ws.on('close', (code: any, reason: any) => {
      this.logger?.info(`WebSocket 연결 해제 감지: 코드=${code}, 이유=${reason || '알 수 없음'}`);
      this.webSocketRepository.removeClient(clientId);
      this.logger?.info(
        `클라이언트 연결이 해제되었습니다. (코드: ${code}, 이유: ${
          reason || '알 수 없음'
        }, 총 ${this.webSocketRepository.getConnectedClientsCount()}개)`,
      );
    });

    // 에러 처리
    ws.on('error', (error: Error) => {
      this.logger?.error(`WebSocket 에러: ${error.message}`);
      this.webSocketRepository.removeClient(clientId);
    });
  }

  broadcast(message: BroadcastMessage): void {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    let failedCount = 0;

    const clients = this.webSocketRepository.getAllClients();
    clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
          sentCount++;
        } catch (error) {
          this.logger?.error(`메시지 전송 실패: ${error}`);
          this.webSocketRepository.removeClient(client.id);
          failedCount++;
        }
      } else {
        // 연결이 끊어진 클라이언트 제거
        this.webSocketRepository.removeClient(client.id);
        failedCount++;
      }
    });

    // 브로드캐스트 결과 로그
    if (sentCount > 0 || failedCount > 0) {
      this.logger?.debug(
        `브로드캐스트 완료: ${sentCount}개 전송, ${failedCount}개 실패 (총 ${this.webSocketRepository.getConnectedClientsCount()}개 클라이언트)`,
      );
    }
  }

  private sendToClient(ws: WebSocket, message: BroadcastMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        this.logger?.error(`클라이언트 메시지 전송 실패: ${error}`);
      }
    }
  }

  broadcastLog(
    level: 'info' | 'warn' | 'error' | 'debug',
    service: string,
    message: string,
    data?: Record<string, UnitValue>,
  ): void {
    const logMessage: LogMessage = {
      type: 'log',
      level,
      service,
      message,
      timestamp: new Date().toISOString(),
      data,
    };

    this.broadcast(logMessage);
  }

  broadcastCommandStatus(
    deviceId: string,
    unitId: string,
    action: string,
    status: 'pending' | 'success' | 'fail',
    value?: any, // value 매개변수 추가
    error?: string, // error 매개변수 추가
  ): void {
    const statusMessage: CommandStatusMessage = {
      type: 'command-status',
      level: 'info',
      service: 'device',
      message: `${deviceId} - ${unitId} ${action} 명령 ${status}`,
      timestamp: new Date().toISOString(),
      deviceId,
      unitId,
      action,
      status,
      value, // value 추가
      ...(error && { error }), // error가 있을 때만 포함
    };

    this.broadcast(statusMessage);
  }

  getConnectedClientsCount(): number {
    return this.webSocketRepository.getConnectedClientsCount();
  }

  close(): void {
    this.webSocketRepository.clearAllClients();

    this.logger?.info('WebSocket 서비스가 종료되었습니다.');
  }
}
