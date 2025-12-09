import { IWebSocketRepository, WebSocketClient } from './interfaces/IWebSocketRepository';

export class MemoryWebSocketRepository implements IWebSocketRepository {
  private clients: Map<string, WebSocketClient> = new Map();

  addClient(client: WebSocketClient): void {
    this.clients.set(client.id, client);
  }

  removeClient(clientId: string): boolean {
    return this.clients.delete(clientId);
  }

  getClient(clientId: string): WebSocketClient | null {
    return this.clients.get(clientId) || null;
  }

  getAllClients(): WebSocketClient[] {
    return Array.from(this.clients.values());
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  clearAllClients(): void {
    this.clients.clear();
  }
}
