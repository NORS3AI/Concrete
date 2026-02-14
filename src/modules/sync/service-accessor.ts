import { SyncService } from './sync-service';
import type { CRDTRecord, SyncSession, WebSocketConnection, LocalDBStatus, SyncConflict, SyncPriorityRule, BandwidthProfile, SelectiveSyncRule, SyncStatusIndicator, DataChecksum, RetryRecord } from './sync-service';
let _service: SyncService | null = null;
export function getSyncService(): SyncService {
  if (_service) return _service;
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) throw new Error('Sync: app not initialized');
  const s = app.store; const e = app.events;
  _service = new SyncService(s.collection<CRDTRecord>('sync/crdt'), s.collection<SyncSession>('sync/session'), s.collection<WebSocketConnection>('sync/wsConnection'), s.collection<LocalDBStatus>('sync/localDB'), s.collection<SyncConflict>('sync/conflict'), s.collection<SyncPriorityRule>('sync/priority'), s.collection<BandwidthProfile>('sync/bandwidth'), s.collection<SelectiveSyncRule>('sync/selectiveRule'), s.collection<SyncStatusIndicator>('sync/statusIndicator'), s.collection<DataChecksum>('sync/checksum'), s.collection<RetryRecord>('sync/retry'), e);
  return _service;
}
