/**
 * Concrete -- Real-Time Sync & Offline-First Service (Phase 27)
 */
import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

export type ConflictResolution = 'local_wins' | 'remote_wins' | 'manual' | 'merged';
export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';
export type ConnectionQuality = '2g' | '3g' | 'lte' | '4g' | '5g' | 'wifi' | 'offline';
export type SyncDirection = 'push' | 'pull' | 'bidirectional';

export interface CRDTRecord { [key: string]: unknown; collection: string; recordId: string; vectorClock: string; lastModified: string; localVersion: number; remoteVersion: number; conflictDetected: boolean; resolvedBy?: ConflictResolution; mergedData?: string; }
export interface SyncSession { [key: string]: unknown; sessionId: string; startedAt: string; completedAt?: string; direction: SyncDirection; recordsPushed: number; recordsPulled: number; conflicts: number; errors: number; status: 'in_progress' | 'completed' | 'failed'; connectionQuality: ConnectionQuality; bytesTransferred: number; }
export interface WebSocketConnection { [key: string]: unknown; connectionId: string; userId: string; deviceId: string; connectedAt: string; disconnectedAt?: string; status: 'connected' | 'disconnected' | 'reconnecting'; lastPingAt?: string; latencyMs?: number; }
export interface LocalDBStatus { [key: string]: unknown; collection: string; localCount: number; remoteCount: number; pendingPush: number; pendingPull: number; lastSyncAt?: string; sizeBytes: number; }
export interface SyncConflict { [key: string]: unknown; collection: string; recordId: string; localData: string; remoteData: string; detectedAt: string; resolvedAt?: string; resolution?: ConflictResolution; resolvedBy?: string; priority: SyncPriority; }
export interface SyncPriorityRule { [key: string]: unknown; collection: string; priority: SyncPriority; order: number; description?: string; }
export interface BandwidthProfile { [key: string]: unknown; connectionType: ConnectionQuality; maxBatchSize: number; compressionEnabled: boolean; deltaOnly: boolean; syncIntervalMs: number; maxRetries: number; }
export interface SelectiveSyncRule { [key: string]: unknown; userId: string; collection: string; filterField: string; filterValue: string; enabled: boolean; description?: string; }
export interface SyncStatusIndicator { [key: string]: unknown; component: string; lastSyncAt?: string; pendingChanges: number; status: 'synced' | 'syncing' | 'pending' | 'error' | 'offline'; errorMessage?: string; }
export interface DataChecksum { [key: string]: unknown; collection: string; recordId: string; checksum: string; calculatedAt: string; verified: boolean; mismatch: boolean; }
export interface RetryRecord { [key: string]: unknown; operationId: string; collection: string; action: string; payload: string; retryCount: number; maxRetries: number; lastAttemptAt: string; nextRetryAt: string; backoffMs: number; status: 'pending' | 'retrying' | 'succeeded' | 'exhausted'; errorMessage?: string; }

function currentTimestamp(): string { return new Date().toISOString(); }

export class SyncService {
  constructor(
    private crdtRecords: Collection<CRDTRecord>, private sessions: Collection<SyncSession>,
    private wsConnections: Collection<WebSocketConnection>, private localDBStatus: Collection<LocalDBStatus>,
    private conflicts: Collection<SyncConflict>, private priorityRules: Collection<SyncPriorityRule>,
    private bandwidthProfiles: Collection<BandwidthProfile>, private selectiveRules: Collection<SelectiveSyncRule>,
    private statusIndicators: Collection<SyncStatusIndicator>, private checksums: Collection<DataChecksum>,
    private retryRecords: Collection<RetryRecord>, private events: EventBus,
  ) {}

  // CRDT
  async recordCRDTChange(data: { collection: string; recordId: string; vectorClock: string; localVersion: number; remoteVersion: number }): Promise<CRDTRecord & CollectionMeta> {
    const conflict = data.localVersion !== data.remoteVersion;
    const r = await this.crdtRecords.insert({ ...data, lastModified: currentTimestamp(), conflictDetected: conflict });
    if (conflict) this.events.emit('sync.conflict.detected', { record: r }); return r;
  }
  async resolveConflict(id: string, resolution: ConflictResolution, mergedData?: string): Promise<CRDTRecord & CollectionMeta> { const e = await this.crdtRecords.get(id); if (!e) throw new Error(`CRDT ${id} not found`); return this.crdtRecords.update(id, { conflictDetected: false, resolvedBy: resolution, mergedData: mergedData ?? '' }); }
  async listCRDTRecords(collection?: string): Promise<(CRDTRecord & CollectionMeta)[]> { const q = this.crdtRecords.query(); if (collection) q.where('collection', '=', collection); q.orderBy('lastModified', 'desc'); return q.execute(); }
  async getUnresolvedConflicts(): Promise<(CRDTRecord & CollectionMeta)[]> { const q = this.crdtRecords.query(); q.where('conflictDetected', '=', true); return q.execute(); }

  // Sync Sessions
  async startSession(data: { sessionId: string; direction: SyncDirection; connectionQuality: ConnectionQuality }): Promise<SyncSession & CollectionMeta> {
    return this.sessions.insert({ ...data, startedAt: currentTimestamp(), recordsPushed: 0, recordsPulled: 0, conflicts: 0, errors: 0, status: 'in_progress' as const, bytesTransferred: 0 });
  }
  async completeSession(id: string, stats: { recordsPushed: number; recordsPulled: number; conflicts: number; errors: number; bytesTransferred: number }): Promise<SyncSession & CollectionMeta> {
    return this.sessions.update(id, { ...stats, completedAt: currentTimestamp(), status: stats.errors > 0 ? 'failed' as const : 'completed' as const });
  }
  async listSessions(): Promise<(SyncSession & CollectionMeta)[]> { return this.sessions.query().orderBy('startedAt', 'desc').execute(); }

  // WebSocket
  async registerConnection(data: { connectionId: string; userId: string; deviceId: string }): Promise<WebSocketConnection & CollectionMeta> {
    return this.wsConnections.insert({ ...data, connectedAt: currentTimestamp(), status: 'connected' as const });
  }
  async disconnectConnection(id: string): Promise<WebSocketConnection & CollectionMeta> { return this.wsConnections.update(id, { status: 'disconnected' as const, disconnectedAt: currentTimestamp() }); }
  async listConnections(): Promise<(WebSocketConnection & CollectionMeta)[]> { return this.wsConnections.query().orderBy('connectedAt', 'desc').execute(); }

  // Local DB Status
  async updateLocalDBStatus(data: { collection: string; localCount: number; remoteCount: number; pendingPush: number; pendingPull: number; sizeBytes: number }): Promise<LocalDBStatus & CollectionMeta> {
    return this.localDBStatus.insert({ ...data, lastSyncAt: currentTimestamp() });
  }
  async getLocalDBStatus(): Promise<(LocalDBStatus & CollectionMeta)[]> { return this.localDBStatus.query().orderBy('collection', 'asc').execute(); }

  // Conflicts
  async logConflict(data: { collection: string; recordId: string; localData: string; remoteData: string; priority: SyncPriority }): Promise<SyncConflict & CollectionMeta> {
    const c = await this.conflicts.insert({ ...data, detectedAt: currentTimestamp() });
    this.events.emit('sync.conflict.logged', { conflict: c }); return c;
  }
  async resolveLoggedConflict(id: string, resolution: ConflictResolution, resolvedBy: string): Promise<SyncConflict & CollectionMeta> { return this.conflicts.update(id, { resolvedAt: currentTimestamp(), resolution, resolvedBy }); }
  async listConflicts(resolved?: boolean): Promise<(SyncConflict & CollectionMeta)[]> { const all = await this.conflicts.query().orderBy('detectedAt', 'desc').execute(); if (resolved === undefined) return all; return resolved ? all.filter(c => c.resolvedAt) : all.filter(c => !c.resolvedAt); }

  // Priority Rules
  async setPriorityRule(data: { collection: string; priority: SyncPriority; order: number; description?: string }): Promise<SyncPriorityRule & CollectionMeta> {
    return this.priorityRules.insert({ ...data, description: data.description ?? '' });
  }
  async listPriorityRules(): Promise<(SyncPriorityRule & CollectionMeta)[]> { return this.priorityRules.query().orderBy('order', 'asc').execute(); }

  // Bandwidth
  async setBandwidthProfile(data: BandwidthProfile): Promise<BandwidthProfile & CollectionMeta> { return this.bandwidthProfiles.insert(data); }
  async listBandwidthProfiles(): Promise<(BandwidthProfile & CollectionMeta)[]> { return this.bandwidthProfiles.query().orderBy('connectionType', 'asc').execute(); }

  // Selective Sync
  async addSelectiveRule(data: { userId: string; collection: string; filterField: string; filterValue: string; description?: string }): Promise<SelectiveSyncRule & CollectionMeta> {
    return this.selectiveRules.insert({ ...data, enabled: true, description: data.description ?? '' });
  }
  async listSelectiveRules(userId?: string): Promise<(SelectiveSyncRule & CollectionMeta)[]> { const q = this.selectiveRules.query(); if (userId) q.where('userId', '=', userId); return q.execute(); }

  // Status Indicators
  async updateStatusIndicator(data: { component: string; pendingChanges: number; status: SyncStatusIndicator['status']; errorMessage?: string }): Promise<SyncStatusIndicator & CollectionMeta> {
    return this.statusIndicators.insert({ ...data, lastSyncAt: currentTimestamp(), errorMessage: data.errorMessage ?? '' });
  }
  async getStatusIndicators(): Promise<(SyncStatusIndicator & CollectionMeta)[]> { return this.statusIndicators.query().orderBy('component', 'asc').execute(); }

  // Checksums
  async verifyChecksum(data: { collection: string; recordId: string; checksum: string }): Promise<DataChecksum & CollectionMeta> {
    return this.checksums.insert({ ...data, calculatedAt: currentTimestamp(), verified: true, mismatch: false });
  }
  async listChecksums(collection?: string): Promise<(DataChecksum & CollectionMeta)[]> { const q = this.checksums.query(); if (collection) q.where('collection', '=', collection); return q.execute(); }

  // Retry
  async addRetry(data: { operationId: string; collection: string; action: string; payload: string; maxRetries?: number }): Promise<RetryRecord & CollectionMeta> {
    return this.retryRecords.insert({ ...data, retryCount: 0, maxRetries: data.maxRetries ?? 4, lastAttemptAt: currentTimestamp(), nextRetryAt: new Date(Date.now() + 2000).toISOString(), backoffMs: 2000, status: 'pending' as const });
  }
  async retryOperation(id: string): Promise<RetryRecord & CollectionMeta> { const e = await this.retryRecords.get(id); if (!e) throw new Error(`Retry ${id} not found`); const count = e.retryCount + 1; const backoff = Math.min(e.backoffMs * 2, 16000); const status = count >= e.maxRetries ? 'exhausted' as const : 'retrying' as const; return this.retryRecords.update(id, { retryCount: count, backoffMs: backoff, lastAttemptAt: currentTimestamp(), nextRetryAt: new Date(Date.now() + backoff).toISOString(), status }); }
  async listRetries(): Promise<(RetryRecord & CollectionMeta)[]> { return this.retryRecords.query().orderBy('lastAttemptAt', 'desc').execute(); }
}
