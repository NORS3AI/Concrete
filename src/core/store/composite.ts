/**
 * Concrete — Composite Adapter (Offline-First)
 * Phase Zed.3 Data Layer Abstraction
 *
 * Combines a primary (local) adapter with a remote adapter.
 * Reads are served from the primary adapter for fast local access.
 * Writes go to both adapters; if the remote fails, writes are queued
 * in a pendingSync queue stored in localStorage and replayed later.
 */

import type {
  DataAdapter,
  QueryFilter,
  QueryOptions,
  AggregateOptions,
  AggregateResult,
  BulkOptions,
  BulkUpdateEntry,
} from './adapter';

// ---------------------------------------------------------------------------
// Sync Queue Types
// ---------------------------------------------------------------------------

export type SyncAction =
  | { type: 'insert'; collection: string; record: Record<string, unknown> }
  | { type: 'update'; collection: string; id: string; changes: Partial<Record<string, unknown>> }
  | { type: 'upsert'; collection: string; record: Record<string, unknown> }
  | { type: 'remove'; collection: string; id: string }
  | { type: 'bulkInsert'; collection: string; records: Record<string, unknown>[] }
  | { type: 'bulkUpdate'; collection: string; updates: BulkUpdateEntry[] }
  | { type: 'bulkRemove'; collection: string; ids: string[] }
  | { type: 'clear'; collection: string }
  | { type: 'importCollection'; collection: string; records: Record<string, unknown>[]; merge: boolean };

export interface SyncQueueEntry {
  id: string;
  action: SyncAction;
  timestamp: number;
  retries: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYNC_QUEUE_KEY = 'concrete_sync_queue';
const MAX_RETRIES = 5;

// ---------------------------------------------------------------------------
// CompositeAdapter
// ---------------------------------------------------------------------------

export class CompositeAdapter implements DataAdapter {
  private readonly primary: DataAdapter;
  private readonly remote: DataAdapter | null;
  private syncQueue: SyncQueueEntry[] = [];
  private syncing = false;

  constructor(primary: DataAdapter, remote?: DataAdapter) {
    this.primary = primary;
    this.remote = remote ?? null;
    this.loadQueue();
  }

  // ---- Sync Queue Persistence ----

  private loadQueue(): void {
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      if (raw) {
        this.syncQueue = JSON.parse(raw) as SyncQueueEntry[];
      }
    } catch {
      this.syncQueue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch {
      // Best-effort — if localStorage is full, queue stays in memory
    }
  }

  private enqueue(action: SyncAction): void {
    const entry: SyncQueueEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      action,
      timestamp: Date.now(),
      retries: 0,
    };
    this.syncQueue.push(entry);
    this.saveQueue();
  }

  /** Number of pending sync operations. */
  get pendingCount(): number {
    return this.syncQueue.length;
  }

  /** Whether a sync is currently in progress. */
  get isSyncing(): boolean {
    return this.syncing;
  }

  // ---- Remote Write Helper ----

  /**
   * Attempt to write to the remote adapter. If it fails (network error,
   * backend not configured, etc.), queue the action for later replay.
   */
  private async writeRemote(action: SyncAction): Promise<void> {
    if (!this.remote) {
      // No remote configured — nothing to sync
      return;
    }

    try {
      await this.replayAction(this.remote, action);
    } catch {
      // Remote failed — queue for later
      this.enqueue(action);
    }
  }

  /**
   * Replay a single action against a target adapter.
   */
  private async replayAction(target: DataAdapter, action: SyncAction): Promise<void> {
    switch (action.type) {
      case 'insert':
        await target.insert(action.collection, action.record);
        break;
      case 'update':
        await target.update(action.collection, action.id, action.changes);
        break;
      case 'upsert':
        await target.upsert(action.collection, action.record);
        break;
      case 'remove':
        await target.remove(action.collection, action.id);
        break;
      case 'bulkInsert':
        await target.bulkInsert(action.collection, action.records);
        break;
      case 'bulkUpdate':
        await target.bulkUpdate(action.collection, action.updates);
        break;
      case 'bulkRemove':
        await target.bulkRemove(action.collection, action.ids);
        break;
      case 'clear':
        await target.clear(action.collection);
        break;
      case 'importCollection':
        await target.importCollection(action.collection, action.records, action.merge);
        break;
    }
  }

  // ---- Public Sync API ----

  /**
   * Replay all queued writes against the remote adapter.
   * Returns the number of successfully synced entries.
   */
  async sync(): Promise<number> {
    if (!this.remote || this.syncQueue.length === 0) {
      return 0;
    }

    this.syncing = true;
    let synced = 0;
    const remaining: SyncQueueEntry[] = [];

    for (const entry of this.syncQueue) {
      try {
        await this.replayAction(this.remote, entry.action);
        synced++;
      } catch {
        entry.retries++;
        if (entry.retries < MAX_RETRIES) {
          remaining.push(entry);
        }
        // Entries that exceed MAX_RETRIES are dropped
      }
    }

    this.syncQueue = remaining;
    this.saveQueue();
    this.syncing = false;
    return synced;
  }

  /** Clear the entire sync queue (e.g., after a full re-sync from server). */
  clearQueue(): void {
    this.syncQueue = [];
    this.saveQueue();
  }

  // ---- DataAdapter: Reads (from primary) ----

  async get(collection: string, id: string): Promise<Record<string, unknown> | null> {
    return this.primary.get(collection, id);
  }

  async getAll(collection: string): Promise<Record<string, unknown>[]> {
    return this.primary.getAll(collection);
  }

  async query(collection: string, options: QueryOptions): Promise<Record<string, unknown>[]> {
    return this.primary.query(collection, options);
  }

  async count(collection: string, filters?: QueryFilter[]): Promise<number> {
    return this.primary.count(collection, filters);
  }

  async aggregate(collection: string, options: AggregateOptions): Promise<AggregateResult[]> {
    return this.primary.aggregate(collection, options);
  }

  async exportCollection(collection: string): Promise<Record<string, unknown>[]> {
    return this.primary.exportCollection(collection);
  }

  // ---- DataAdapter: Writes (primary + remote) ----

  async insert(
    collection: string,
    record: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const result = await this.primary.insert(collection, record);
    await this.writeRemote({ type: 'insert', collection, record: result });
    return result;
  }

  async update(
    collection: string,
    id: string,
    changes: Partial<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    const result = await this.primary.update(collection, id, changes);
    await this.writeRemote({ type: 'update', collection, id, changes });
    return result;
  }

  async upsert(
    collection: string,
    record: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const result = await this.primary.upsert(collection, record);
    await this.writeRemote({ type: 'upsert', collection, record: result });
    return result;
  }

  async remove(collection: string, id: string): Promise<void> {
    await this.primary.remove(collection, id);
    await this.writeRemote({ type: 'remove', collection, id });
  }

  async bulkInsert(
    collection: string,
    records: Record<string, unknown>[],
    options?: BulkOptions,
  ): Promise<Record<string, unknown>[]> {
    const results = await this.primary.bulkInsert(collection, records, options);
    await this.writeRemote({ type: 'bulkInsert', collection, records: results });
    return results;
  }

  async bulkUpdate(
    collection: string,
    updates: BulkUpdateEntry[],
    options?: BulkOptions,
  ): Promise<Record<string, unknown>[]> {
    const results = await this.primary.bulkUpdate(collection, updates, options);
    await this.writeRemote({ type: 'bulkUpdate', collection, updates });
    return results;
  }

  async bulkRemove(
    collection: string,
    ids: string[],
    options?: BulkOptions,
  ): Promise<void> {
    await this.primary.bulkRemove(collection, ids, options);
    await this.writeRemote({ type: 'bulkRemove', collection, ids });
  }

  async clear(collection: string): Promise<void> {
    await this.primary.clear(collection);
    await this.writeRemote({ type: 'clear', collection });
  }

  async importCollection(
    collection: string,
    records: Record<string, unknown>[],
    merge = false,
  ): Promise<void> {
    await this.primary.importCollection(collection, records, merge);
    await this.writeRemote({ type: 'importCollection', collection, records, merge });
  }
}
