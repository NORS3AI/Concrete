/**
 * Concrete — Collection<T> (Typed CRUD Wrapper)
 * Phase Zed.3 Data Layer Abstraction
 *
 * Provides a typed interface over a DataAdapter for a single collection.
 * Handles schema validation, ID generation, timestamps, versioning,
 * soft-delete, and event emission for all mutations.
 */

import type { ID, ISODateString } from '../types/base';
import { generateId, now } from '../types/base';
import type { SchemaRegistry } from '../schema/registry';
import type { EventBus } from '../events/bus';
import type {
  DataAdapter,
  QueryFilter,
  BulkOptions,
  BulkUpdateEntry,
} from './adapter';
import { Query } from './query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Metadata fields automatically managed by the Collection. */
export interface CollectionMeta {
  id: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt?: ISODateString | null;
  version: number;
}

/** Handler for collection change events. */
export type CollectionChangeHandler<T> = (event: {
  type: 'insert' | 'update' | 'remove' | 'restore' | 'bulkInsert' | 'bulkUpdate' | 'bulkRemove';
  collection: string;
  records?: T[];
  ids?: string[];
}) => void;

// ---------------------------------------------------------------------------
// Collection<T>
// ---------------------------------------------------------------------------

export class Collection<T extends Record<string, unknown>> {
  private readonly name: string;
  private readonly adapter: DataAdapter;
  private readonly schemas: SchemaRegistry;
  private readonly events: EventBus;

  constructor(
    name: string,
    adapter: DataAdapter,
    schemas: SchemaRegistry,
    events: EventBus,
  ) {
    this.name = name;
    this.adapter = adapter;
    this.schemas = schemas;
    this.events = events;
  }

  // ---- Read ----

  /** Get a single record by ID (excludes soft-deleted). */
  async get(id: string): Promise<(T & CollectionMeta) | null> {
    const record = await this.adapter.get(this.name, id);
    if (!record) return null;
    // Exclude soft-deleted records
    if (record['deletedAt'] != null) return null;
    return record as T & CollectionMeta;
  }

  /** Get a single record by ID including soft-deleted records. */
  async getIncludingDeleted(id: string): Promise<(T & CollectionMeta) | null> {
    const record = await this.adapter.get(this.name, id);
    if (!record) return null;
    return record as T & CollectionMeta;
  }

  /** Get all records (excludes soft-deleted). */
  async getAll(): Promise<(T & CollectionMeta)[]> {
    const records = await this.adapter.getAll(this.name);
    return records.filter((r) => r['deletedAt'] == null) as (T & CollectionMeta)[];
  }

  /** Start building a query. Automatically excludes soft-deleted records. */
  query(): Query<T & CollectionMeta> {
    const q = new Query<T & CollectionMeta>(this.name, this.adapter);
    // Automatically filter out soft-deleted records
    q.whereNull('deletedAt');
    return q;
  }

  /** Start building a query that includes soft-deleted records. */
  queryIncludingDeleted(): Query<T & CollectionMeta> {
    return new Query<T & CollectionMeta>(this.name, this.adapter);
  }

  /** Count records (excludes soft-deleted). */
  async count(filters?: QueryFilter[]): Promise<number> {
    const allFilters: QueryFilter[] = [
      { field: 'deletedAt', operator: 'isNull', value: null },
      ...(filters ?? []),
    ];
    return this.adapter.count(this.name, allFilters);
  }

  // ---- Write: Insert ----

  /** Insert a new record. Generates id, sets timestamps and version. */
  async insert(data: Omit<T, keyof CollectionMeta> & Partial<CollectionMeta>): Promise<T & CollectionMeta> {
    const record: Record<string, unknown> = {
      ...data,
      id: (data as Record<string, unknown>)['id'] ?? generateId(),
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
      version: 1,
    };

    // Validate against schema if registered
    this.validate(record);

    this.events.emit(`${this.name}.before.insert`, { collection: this.name, record });

    const inserted = await this.adapter.insert(this.name, record);

    this.events.emit(`${this.name}.after.insert`, { collection: this.name, record: inserted });
    this.events.emit(`${this.name}.change`, {
      type: 'insert',
      collection: this.name,
      records: [inserted],
    });

    return inserted as T & CollectionMeta;
  }

  // ---- Write: Update ----

  /** Update an existing record. Increments version and updates timestamp. */
  async update(id: string, changes: Partial<T>): Promise<T & CollectionMeta> {
    const existing = await this.adapter.get(this.name, id);
    if (!existing) {
      throw new Error(`[Collection:${this.name}] Record not found: ${id}`);
    }

    const updatedRecord: Record<string, unknown> = {
      ...existing,
      ...changes,
      id, // Prevent id from being changed
      updatedAt: now(),
      version: ((existing['version'] as number) ?? 0) + 1,
    };

    // Validate the full merged record
    this.validate(updatedRecord);

    this.events.emit(`${this.name}.before.update`, {
      collection: this.name,
      id,
      changes,
      previous: existing,
    });

    const result = await this.adapter.update(this.name, id, {
      ...changes,
      updatedAt: updatedRecord['updatedAt'],
      version: updatedRecord['version'],
    });

    this.events.emit(`${this.name}.after.update`, {
      collection: this.name,
      record: result,
      previous: existing,
    });
    this.events.emit(`${this.name}.change`, {
      type: 'update',
      collection: this.name,
      records: [result],
    });

    return result as T & CollectionMeta;
  }

  // ---- Write: Upsert ----

  /** Insert or update a record. */
  async upsert(data: T & Partial<CollectionMeta>): Promise<T & CollectionMeta> {
    const id = (data as Record<string, unknown>)['id'] as string | undefined;
    if (id) {
      const existing = await this.adapter.get(this.name, id);
      if (existing) {
        return this.update(id, data as Partial<T>);
      }
    }
    return this.insert(data as Omit<T, keyof CollectionMeta> & Partial<CollectionMeta>);
  }

  // ---- Write: Remove ----

  /** Soft-delete a record (sets deletedAt timestamp). */
  async remove(id: string): Promise<void> {
    const existing = await this.adapter.get(this.name, id);
    if (!existing) {
      throw new Error(`[Collection:${this.name}] Record not found: ${id}`);
    }

    this.events.emit(`${this.name}.before.remove`, { collection: this.name, id, record: existing });

    await this.adapter.update(this.name, id, {
      deletedAt: now(),
      updatedAt: now(),
      version: ((existing['version'] as number) ?? 0) + 1,
    });

    this.events.emit(`${this.name}.after.remove`, { collection: this.name, id, record: existing });
    this.events.emit(`${this.name}.change`, {
      type: 'remove',
      collection: this.name,
      ids: [id],
    });
  }

  /** Permanently delete a record from the adapter. */
  async hardRemove(id: string): Promise<void> {
    const existing = await this.adapter.get(this.name, id);
    if (!existing) {
      throw new Error(`[Collection:${this.name}] Record not found: ${id}`);
    }

    this.events.emit(`${this.name}.before.hardRemove`, { collection: this.name, id, record: existing });

    await this.adapter.remove(this.name, id);

    this.events.emit(`${this.name}.after.hardRemove`, { collection: this.name, id, record: existing });
    this.events.emit(`${this.name}.change`, {
      type: 'remove',
      collection: this.name,
      ids: [id],
    });
  }

  /** Restore a soft-deleted record. */
  async restore(id: string): Promise<T & CollectionMeta> {
    const existing = await this.adapter.get(this.name, id);
    if (!existing) {
      throw new Error(`[Collection:${this.name}] Record not found: ${id}`);
    }
    if (existing['deletedAt'] == null) {
      throw new Error(`[Collection:${this.name}] Record is not deleted: ${id}`);
    }

    this.events.emit(`${this.name}.before.restore`, { collection: this.name, id });

    const result = await this.adapter.update(this.name, id, {
      deletedAt: null,
      updatedAt: now(),
      version: ((existing['version'] as number) ?? 0) + 1,
    });

    this.events.emit(`${this.name}.after.restore`, { collection: this.name, record: result });
    this.events.emit(`${this.name}.change`, {
      type: 'restore',
      collection: this.name,
      records: [result],
    });

    return result as T & CollectionMeta;
  }

  // ---- Bulk Operations ----

  /** Bulk insert records. Each record gets id, timestamps, and version. */
  async bulkInsert(
    data: (Omit<T, keyof CollectionMeta> & Partial<CollectionMeta>)[],
    options?: BulkOptions,
  ): Promise<(T & CollectionMeta)[]> {
    const records: Record<string, unknown>[] = data.map((item) => {
      const record: Record<string, unknown> = {
        ...item,
        id: (item as Record<string, unknown>)['id'] ?? generateId(),
        createdAt: now(),
        updatedAt: now(),
        deletedAt: null,
        version: 1,
      };
      this.validate(record);
      return record;
    });

    this.events.emit(`${this.name}.before.bulkInsert`, { collection: this.name, count: records.length });

    const results = await this.adapter.bulkInsert(this.name, records, options);

    this.events.emit(`${this.name}.after.bulkInsert`, { collection: this.name, records: results });
    this.events.emit(`${this.name}.change`, {
      type: 'bulkInsert',
      collection: this.name,
      records: results,
    });

    return results as (T & CollectionMeta)[];
  }

  /** Bulk update records. Each update increments version and sets updatedAt. */
  async bulkUpdate(
    updates: { id: string; changes: Partial<T> }[],
    options?: BulkOptions,
  ): Promise<(T & CollectionMeta)[]> {
    // Enrich each update with timestamp and version increment
    const enriched: BulkUpdateEntry[] = [];
    for (const { id, changes } of updates) {
      const existing = await this.adapter.get(this.name, id);
      if (!existing) {
        throw new Error(`[Collection:${this.name}] Record not found: ${id}`);
      }
      enriched.push({
        id,
        changes: {
          ...changes,
          updatedAt: now(),
          version: ((existing['version'] as number) ?? 0) + 1,
        },
      });
    }

    this.events.emit(`${this.name}.before.bulkUpdate`, { collection: this.name, count: enriched.length });

    const results = await this.adapter.bulkUpdate(this.name, enriched, options);

    this.events.emit(`${this.name}.after.bulkUpdate`, { collection: this.name, records: results });
    this.events.emit(`${this.name}.change`, {
      type: 'bulkUpdate',
      collection: this.name,
      records: results,
    });

    return results as (T & CollectionMeta)[];
  }

  /** Bulk soft-delete records. */
  async bulkRemove(ids: string[], options?: BulkOptions): Promise<void> {
    const updates: BulkUpdateEntry[] = [];
    for (const id of ids) {
      const existing = await this.adapter.get(this.name, id);
      if (existing) {
        updates.push({
          id,
          changes: {
            deletedAt: now(),
            updatedAt: now(),
            version: ((existing['version'] as number) ?? 0) + 1,
          },
        });
      }
    }

    this.events.emit(`${this.name}.before.bulkRemove`, { collection: this.name, ids });

    if (updates.length > 0) {
      await this.adapter.bulkUpdate(this.name, updates, options);
    }

    this.events.emit(`${this.name}.after.bulkRemove`, { collection: this.name, ids });
    this.events.emit(`${this.name}.change`, {
      type: 'bulkRemove',
      collection: this.name,
      ids,
    });
  }

  // ---- Change Subscription ----

  /** Subscribe to mutations on this collection. Returns an unsubscribe function. */
  onChange(handler: CollectionChangeHandler<T & CollectionMeta>): () => void {
    return this.events.on(`${this.name}.change`, handler as (payload: unknown) => void);
  }

  // ---- Export / Import ----

  /** Export all records (including soft-deleted) as a JSON array. */
  async exportJSON(): Promise<(T & CollectionMeta)[]> {
    const records = await this.adapter.exportCollection(this.name);
    return records as (T & CollectionMeta)[];
  }

  /** Import records from a JSON array. */
  async importJSON(
    data: (T & Partial<CollectionMeta>)[],
    options: { merge?: boolean } = {},
  ): Promise<void> {
    const records: Record<string, unknown>[] = data.map((item) => ({
      ...item,
      id: (item as Record<string, unknown>)['id'] ?? generateId(),
      createdAt: (item as Record<string, unknown>)['createdAt'] ?? now(),
      updatedAt: (item as Record<string, unknown>)['updatedAt'] ?? now(),
      deletedAt: (item as Record<string, unknown>)['deletedAt'] ?? null,
      version: (item as Record<string, unknown>)['version'] ?? 1,
    }));

    await this.adapter.importCollection(this.name, records, options.merge ?? false);

    this.events.emit(`${this.name}.change`, {
      type: 'bulkInsert',
      collection: this.name,
      records,
    });
  }

  // ---- Validation ----

  private validate(record: Record<string, unknown>): void {
    try {
      const schema = this.schemas.get(this.name);
      if (schema) {
        this.schemas.validate(this.name, record);
      }
    } catch {
      // Schema not registered for this collection — skip validation
    }
  }
}
