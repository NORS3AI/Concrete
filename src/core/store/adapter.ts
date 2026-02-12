/**
 * Concrete — Data Adapter Interface
 * Phase Zed.3 Data Layer Abstraction
 *
 * Abstract storage interface that all adapters must implement.
 * Provides CRUD, query, aggregation, and bulk operations.
 */

// ---------------------------------------------------------------------------
// Query Types
// ---------------------------------------------------------------------------

export type QueryOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'between'
  | 'isNull'
  | 'isNotNull';

export interface QueryFilter {
  field: string;
  operator: QueryOperator;
  value: unknown;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
  include?: string[];
}

// ---------------------------------------------------------------------------
// Aggregation Types
// ---------------------------------------------------------------------------

export type AggregateFn = 'sum' | 'avg' | 'min' | 'max' | 'count';

export interface AggregateOptions {
  groupBy?: string[];
  aggregates: { field: string; fn: AggregateFn }[];
  filters?: QueryFilter[];
}

export interface AggregateResult {
  groups: Record<string, unknown>;
  values: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Bulk Operation Types
// ---------------------------------------------------------------------------

export interface BulkOptions {
  onProgress?: (percent: number) => void;
}

export interface BulkUpdateEntry {
  id: string;
  changes: Partial<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// DataAdapter Interface
// ---------------------------------------------------------------------------

export interface DataAdapter {
  // ---- Single Record CRUD ----
  get(collection: string, id: string): Promise<Record<string, unknown> | null>;
  getAll(collection: string): Promise<Record<string, unknown>[]>;
  insert(collection: string, record: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(collection: string, id: string, changes: Partial<Record<string, unknown>>): Promise<Record<string, unknown>>;
  upsert(collection: string, record: Record<string, unknown>): Promise<Record<string, unknown>>;
  remove(collection: string, id: string): Promise<void>;

  // ---- Query ----
  query(collection: string, options: QueryOptions): Promise<Record<string, unknown>[]>;
  count(collection: string, filters?: QueryFilter[]): Promise<number>;

  // ---- Bulk Operations ----
  bulkInsert(
    collection: string,
    records: Record<string, unknown>[],
    options?: BulkOptions,
  ): Promise<Record<string, unknown>[]>;
  bulkUpdate(
    collection: string,
    updates: BulkUpdateEntry[],
    options?: BulkOptions,
  ): Promise<Record<string, unknown>[]>;
  bulkRemove(collection: string, ids: string[], options?: BulkOptions): Promise<void>;

  // ---- Aggregation ----
  aggregate(collection: string, options: AggregateOptions): Promise<AggregateResult[]>;

  // ---- Collection Management ----
  clear(collection: string): Promise<void>;
  exportCollection(collection: string): Promise<Record<string, unknown>[]>;
  importCollection(collection: string, records: Record<string, unknown>[], merge?: boolean): Promise<void>;
}
