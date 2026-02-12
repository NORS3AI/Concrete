/**
 * Concrete — Store Module Public API
 * Phase Zed.3 Data Layer Abstraction
 *
 * Re-exports the Store, Collection, Query, DataAdapter interface,
 * and all concrete adapter implementations.
 */

// ---- Core ----
export { Store, Transaction } from './store';
export { Collection } from './collection';
export type { CollectionMeta, CollectionChangeHandler } from './collection';
export { Query } from './query';

// ---- Adapter Interface & Types ----
export type {
  DataAdapter,
  QueryFilter,
  QueryOperator,
  QueryOptions,
  AggregateFn,
  AggregateOptions,
  AggregateResult,
  BulkOptions,
  BulkUpdateEntry,
} from './adapter';

// ---- Adapter Implementations ----
export { LocalStorageAdapter } from './local-storage';
export { IndexedDBAdapter } from './indexeddb';
export { ApiAdapter } from './api';
export type { ApiAdapterConfig } from './api';
export { CompositeAdapter } from './composite';
export type { SyncAction, SyncQueueEntry } from './composite';

// ---- Query Utilities (shared across adapters & consumers) ----
export { getNestedValue, matchesFilter, applyFilters, applySorting } from './query-utils';
