/**
 * Concrete — Store (Main Orchestrator)
 * Phase Zed.3 Data Layer Abstraction
 *
 * The Store is the central data layer entry point. It selects and initializes
 * the appropriate adapter, provides typed Collection instances, supports
 * transactions, and offers import/export/reset/seed capabilities.
 */

import type { SchemaRegistry } from '../schema/registry';
import type { EventBus } from '../events/bus';
import type { DataAdapter } from './adapter';
import { LocalStorageAdapter } from './local-storage';
import { Collection } from './collection';

// ---------------------------------------------------------------------------
// Logger Interface (minimal contract)
// ---------------------------------------------------------------------------

interface Logger {
  info(module: string, message: string, data?: unknown): void;
  warn(module: string, message: string, data?: unknown): void;
  error(module: string, message: string, data?: unknown): void;
}

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

/**
 * A transaction accumulates writes in memory and commits them all at once.
 * For now this is a simple batch — true ACID transactions would require
 * adapter-level support (Phase 16+).
 */
export class Transaction {
  private operations: (() => Promise<void>)[] = [];
  private committed = false;
  private rolledBack = false;

  /** Queue an operation to execute on commit. */
  enqueue(operation: () => Promise<void>): void {
    if (this.committed || this.rolledBack) {
      throw new Error('[Transaction] Cannot enqueue: transaction already finalized.');
    }
    this.operations.push(operation);
  }

  /** Execute all queued operations sequentially. */
  async commit(): Promise<void> {
    if (this.committed) {
      throw new Error('[Transaction] Already committed.');
    }
    if (this.rolledBack) {
      throw new Error('[Transaction] Already rolled back.');
    }
    this.committed = true;
    for (const op of this.operations) {
      await op();
    }
  }

  /** Discard all queued operations. */
  rollback(): void {
    this.rolledBack = true;
    this.operations = [];
  }
}

// ---------------------------------------------------------------------------
// Adapter Size Threshold
// ---------------------------------------------------------------------------

/** If total records exceed this threshold, prefer IndexedDB over localStorage. */
const LARGE_DATASET_THRESHOLD = 5000;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export class Store {
  private readonly schemas: SchemaRegistry;
  private readonly events: EventBus;
  private readonly logger: Logger;

  private adapter: DataAdapter | null = null;
  private collections: Map<string, Collection<Record<string, unknown>>> = new Map();
  private initialized = false;

  constructor(schemas: SchemaRegistry, events: EventBus, logger: Logger) {
    this.schemas = schemas;
    this.events = events;
    this.logger = logger;
  }

  // ---- Initialization ----

  /**
   * Initialize the store. Selects the best adapter based on environment:
   * - Small datasets or no IndexedDB: localStorage adapter
   * - Large datasets with IndexedDB support: IndexedDB adapter
   *
   * For now, we start with LocalStorageAdapter as the default since it
   * requires no async setup and works everywhere. IndexedDB adapter can
   * be swapped in via `setAdapter()` if needed.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('store', 'Store already initialized');
      return;
    }

    this.logger.info('store', 'Initializing data store...');

    // Default to localStorage adapter
    // IndexedDB adapter selection happens when dataset grows past threshold
    this.adapter = new LocalStorageAdapter();

    // Check if we should upgrade to IndexedDB
    if (this.shouldUseIndexedDB()) {
      try {
        // Dynamic import to avoid loading idb if not needed
        const { IndexedDBAdapter } = await import('./indexeddb');
        const idbAdapter = new IndexedDBAdapter();
        // Migrate data from localStorage to IndexedDB
        await this.migrateAdapter(this.adapter, idbAdapter);
        this.adapter = idbAdapter;
        this.logger.info('store', 'Upgraded to IndexedDB adapter for large dataset');
      } catch (err) {
        this.logger.warn('store', 'IndexedDB not available, staying with localStorage', err);
      }
    }

    this.initialized = true;
    this.events.emit('store.initialized', { adapter: this.adapter.constructor.name });
    this.logger.info('store', `Store initialized with ${this.adapter.constructor.name}`);
  }

  /**
   * Check if IndexedDB should be used based on data size.
   */
  private shouldUseIndexedDB(): boolean {
    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      return false;
    }

    // Check current localStorage data size
    try {
      const raw = localStorage.getItem('concrete');
      if (!raw) return false;
      const data = JSON.parse(raw) as Record<string, unknown[]>;
      let totalRecords = 0;
      for (const collection of Object.values(data)) {
        if (Array.isArray(collection)) {
          totalRecords += collection.length;
        }
      }
      return totalRecords > LARGE_DATASET_THRESHOLD;
    } catch {
      return false;
    }
  }

  /**
   * Migrate all data from one adapter to another.
   */
  private async migrateAdapter(_from: DataAdapter, to: DataAdapter): Promise<void> {
    // We need to know which collections exist. For localStorage, we can
    // inspect the raw data. For other adapters, this would need a
    // listCollections() method.
    try {
      const raw = localStorage.getItem('concrete');
      if (!raw) return;
      const data = JSON.parse(raw) as Record<string, Record<string, unknown>[]>;
      for (const [collection, records] of Object.entries(data)) {
        if (Array.isArray(records) && records.length > 0) {
          await to.importCollection(collection, records);
        }
      }
    } catch (err) {
      this.logger.error('store', 'Migration failed', err);
      throw err;
    }
  }

  /** Replace the adapter at runtime (e.g., switching to CompositeAdapter). */
  setAdapter(adapter: DataAdapter): void {
    this.adapter = adapter;
    // Clear cached collections so they pick up the new adapter
    this.collections.clear();
    this.logger.info('store', `Adapter switched to ${adapter.constructor.name}`);
  }

  /** Get the current adapter (for advanced use). */
  getAdapter(): DataAdapter {
    this.ensureInitialized();
    return this.adapter!;
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.adapter) {
      throw new Error('[Store] Not initialized. Call initialize() first.');
    }
  }

  // ---- Collection Access ----

  /**
   * Get a typed Collection instance for the given name.
   * Collections are cached — the same instance is returned for repeated calls.
   */
  collection<T extends Record<string, unknown>>(name: string): Collection<T> {
    this.ensureInitialized();

    if (!this.collections.has(name)) {
      const col = new Collection<Record<string, unknown>>(
        name,
        this.adapter!,
        this.schemas,
        this.events,
      );
      this.collections.set(name, col);
    }

    return this.collections.get(name)! as unknown as Collection<T>;
  }

  // ---- Transactions ----

  /**
   * Execute a function within a transaction context.
   * All operations queued on the transaction are executed atomically on commit.
   *
   * Note: This is an in-memory batch commit for now. True ACID transactions
   * will be implemented when the backend supports them (Phase 16+).
   */
  async transaction(fn: (tx: Transaction) => Promise<void>): Promise<void> {
    const tx = new Transaction();
    try {
      await fn(tx);
      await tx.commit();
      this.events.emit('store.transaction.commit');
    } catch (err) {
      tx.rollback();
      this.events.emit('store.transaction.rollback', { error: err });
      throw err;
    }
  }

  // ---- Export / Import ----

  /**
   * Export all data from all known collections as a single JSON object.
   */
  async exportAll(): Promise<Record<string, Record<string, unknown>[]>> {
    this.ensureInitialized();

    const result: Record<string, Record<string, unknown>[]> = {};
    for (const [name, col] of this.collections.entries()) {
      result[name] = await col.exportJSON();
    }

    // Also check localStorage for collections not yet accessed via collection()
    try {
      const raw = localStorage.getItem('concrete');
      if (raw) {
        const data = JSON.parse(raw) as Record<string, Record<string, unknown>[]>;
        for (const [name, records] of Object.entries(data)) {
          if (!result[name] && Array.isArray(records)) {
            result[name] = records;
          }
        }
      }
    } catch {
      // Ignore parse errors
    }

    return result;
  }

  /**
   * Import data from a backup. Supports version migration if data format changes.
   */
  async importAll(data: Record<string, unknown>): Promise<void> {
    this.ensureInitialized();

    const version = (data['__version'] as number) ?? 1;
    const migratedData = this.migrateData(data, version);

    for (const [name, records] of Object.entries(migratedData)) {
      if (name.startsWith('__')) continue; // Skip meta keys
      if (!Array.isArray(records)) continue;

      const col = this.collection(name);
      await col.importJSON(records as Record<string, unknown>[], { merge: false });
    }

    this.events.emit('store.imported', { collections: Object.keys(migratedData) });
    this.logger.info('store', 'Data imported successfully');
  }

  /**
   * Migrate data from an older version to the current format.
   * Override this method or extend it as schema evolves.
   */
  private migrateData(
    data: Record<string, unknown>,
    _version: number,
  ): Record<string, unknown> {
    // Version 1 is current — no migrations needed yet.
    // Future phases will add migration logic here:
    // if (version < 2) { data = migrateV1toV2(data); }
    return data;
  }

  // ---- Seed Data ----

  /**
   * Seed the store with demo/sample data for a given profile.
   * Placeholder for now — module-specific seed functions will register
   * via the event bus or module system.
   */
  async seed(profile: string): Promise<void> {
    this.ensureInitialized();
    this.logger.info('store', `Seeding data with profile: ${profile}`);
    this.events.emit('store.seed', { profile });
    // Actual seed data will be provided by modules that listen to 'store.seed'
  }

  // ---- Reset ----

  /** Clear all data from all known collections. */
  async reset(): Promise<void> {
    this.ensureInitialized();

    this.logger.warn('store', 'Resetting all store data');

    for (const [name] of this.collections.entries()) {
      await this.adapter!.clear(name);
    }

    // Also clear the raw localStorage key
    try {
      localStorage.removeItem('concrete');
    } catch {
      // Ignore
    }

    this.collections.clear();
    this.events.emit('store.reset');
    this.logger.info('store', 'Store reset complete');
  }

  // ---- Stats ----

  /** Get record counts per collection. */
  async getStats(): Promise<Record<string, number>> {
    this.ensureInitialized();

    const stats: Record<string, number> = {};
    for (const [name] of this.collections.entries()) {
      stats[name] = await this.adapter!.count(name);
    }

    // Also check localStorage for collections not yet accessed
    try {
      const raw = localStorage.getItem('concrete');
      if (raw) {
        const data = JSON.parse(raw) as Record<string, unknown[]>;
        for (const [name, records] of Object.entries(data)) {
          if (!stats[name] && Array.isArray(records)) {
            stats[name] = records.length;
          }
        }
      }
    } catch {
      // Ignore parse errors
    }

    return stats;
  }
}
