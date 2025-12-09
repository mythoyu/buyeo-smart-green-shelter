export interface IDdcTimeSyncService {
  syncDdcTime(): Promise<void>;
  startScheduledSync(): Promise<void>;
  stopScheduledSync(): void;
  getLastSyncTime(): Date | null;
  getNextSyncTime(): Date | null;
  getSyncStatus(): string;
  getClientId(): string | null;
}
