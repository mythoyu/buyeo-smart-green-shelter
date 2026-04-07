import { WebSocket } from 'ws';

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  connectedAt: Date;
  lastPing?: Date;
  metadata?: any;
}

export interface IWebSocketRepository {
  addClient(client: WebSocketClient): void;
  removeClient(clientId: string): boolean;
  getClient(clientId: string): WebSocketClient | null;
  getAllClients(): WebSocketClient[];
  getConnectedClientsCount(): number;
  clearAllClients(): void;
}
