/**
 * Concrete — IndexedDB Adapter
 * Phase Zed.3 Data Layer Abstraction
 *
 * Implements DataAdapter using IndexedDB for larger dataset support.
 * Uses the 'idb' library for a promise-based API wrapper.
 * Complex queries fall back to getAll + in-memory filtering.
 */

import type { IDBPDatabase } from 'idb';
import { openDB } from 'idb';
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
// Helpers — reuse filtering/sorting from local-storage
// ---------------------------------------------------------------------------

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function matchesFilter(record: Record<string, unknown>, filter: QueryFilter): boolean {
  const value = getNestedValue(record, filter.field);
  const target = filter.value;

  switch (filter.operator) {
    case '=':
      return value === target;
    case '!=':
      return value !== target;
    case '>':
      return (value as number) > (target as number);
    case '<':
      return (value as number) < (target as number);
    case '>=':
      return (value as number) >= (target as number);
    case '<=':
      return (value as number) <= (target as number);
    case 'in':
      return Array.isArray(target) && target.includes(value);
    case 'notIn':
      return Array.isArray(target) && !target.includes(value);
    case 'contains':
      return typeof value === 'string' && typeof target === 'string' && value.includes(target);
    case 'startsWith':
      return typeof value === 'string' && typeof target === 'string' && value.startsWith(target);
    case 'between': {
      if (!Array.isArray(target) || target.length !== 2) return false;
      const num = value as number;
      return num >= (target[0] as number) && num <= (target[1] as number);
    }
    case 'isNull':
      return value == null;
    case 'isNotNull':
      return value != null;
    default:
      return false;
  }
}

function applyFilters(
  records: Record<string, unknown>[],
  filters: QueryFilter[],
): Record<string, unknown>[] {
  return records.filter((rec) => filters.every((f) => matchesFilter(rec, f)));
}

function applySorting(
  records: Record<string, unknown>[],
  orderBy: { field: string; direction: 'asc' | 'desc' }[],
): Record<string, unknown>[] {
  const sorted = [...records];
  sorted.sort((a, b) => {
    for (const { field, direction } of orderBy) {
      const aVal = getNestedValue(a, field);
      const bVal = getNestedValue(b, field);
      let cmp = 0;
      if (aVal == null && bVal == null) cmp = 0;
      else if (aVal == null) cmp = -1;
      else if (bVal == null) cmp = 1;
      else if (typeof aVal === 'string' && typeof bVal === 'string') cmp = aVal.localeCompare(bVal);
      else if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
      else cmp = String(aVal).localeCompare(String(bVal));

      if (cmp !== 0) return direction === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
  return sorted;
}

// ---------------------------------------------------------------------------
// IndexedDBAdapter
// ---------------------------------------------------------------------------

const DB_NAME = 'concrete';

export class IndexedDBAdapter implements DataAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: IDBPDatabase | null = null;
  private knownStores: Set<string> = new Set();
  private version = 1;

  /**
   * Open (or reopen) the database, creating any missing object stores.
   * IndexedDB requires a version bump to modify the schema, so we track
   * known stores and reopen with a new version when a new collection appears.
   */
  private async ensureDB(collection?: string): Promise<IDBPDatabase> {
    // If we already have a db and the collection exists (or none requested), return it
    if (this.db && (!collection || this.knownStores.has(collection))) {
      return this.db;
    }

    // Need to (re)open to add a new store
    if (collection) {
      this.knownStores.add(collection);
    }

    if (this.db) {
      this.db.close();
      this.db = null;
      this.version++;
    }

    const storeNames = [...this.knownStores];
    const version = this.version;

    this.db = await openDB(DB_NAME, version, {
      upgrade(db) {
        for (const storeName of storeNames) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      },
    });

    return this.db;
  }

  // ---- Single Record CRUD ----

  async get(collection: string, id: string): Promise<Record<string, unknown> | null> {
    const db = await this.ensureDB(collection);
    const result = await db.get(collection, id);
    return (result as Record<string, unknown>) ?? null;
  }

  async getAll(collection: string): Promise<Record<string, unknown>[]> {
    const db = await this.ensureDB(collection);
    const results = await db.getAll(collection);
    return results as Record<string, unknown>[];
  }

  async insert(
    collection: string,
    record: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const db = await this.ensureDB(collection);
    const clone = { ...record };
    await db.put(collection, clone);
    return clone;
  }

  async update(
    collection: string,
    id: string,
    changes: Partial<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    const db = await this.ensureDB(collection);
    const existing = await db.get(collection, id);
    if (!existing) {
      throw new Error(`[IndexedDBAdapter] Record not found: ${collection}/${id}`);
    }
    const updated = { ...(existing as Record<string, unknown>), ...changes };
    await db.put(collection, updated);
    return updated;
  }

  async upsert(
    collection: string,
    record: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const db = await this.ensureDB(collection);
    const id = record['id'] as string | undefined;
    if (id) {
      const existing = await db.get(collection, id);
      if (existing) {
        const merged = { ...(existing as Record<string, unknown>), ...record };
        await db.put(collection, merged);
        return merged;
      }
    }
    const clone = { ...record };
    await db.put(collection, clone);
    return clone;
  }

  async remove(collection: string, id: string): Promise<void> {
    const db = await this.ensureDB(collection);
    await db.delete(collection, id);
  }

  // ---- Query (falls back to getAll + filter) ----

  async query(
    collection: string,
    options: QueryOptions,
  ): Promise<Record<string, unknown>[]> {
    let results = await this.getAll(collection);

    if (options.filters && options.filters.length > 0) {
      results = applyFilters(results, options.filters);
    }

    if (options.orderBy && options.orderBy.length > 0) {
      results = applySorting(results, options.orderBy);
    }

    if (options.offset != null && options.offset > 0) {
      results = results.slice(options.offset);
    }

    if (options.limit != null && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async count(collection: string, filters?: QueryFilter[]): Promise<number> {
    if (!filters || filters.length === 0) {
      const db = await this.ensureDB(collection);
      return await db.count(collection);
    }
    const all = await this.getAll(collection);
    return applyFilters(all, filters).length;
  }

  // ---- Bulk Operations ----

  async bulkInsert(
    collection: string,
    records: Record<string, unknown>[],
    options?: BulkOptions,
  ): Promise<Record<string, unknown>[]> {
    const db = await this.ensureDB(collection);
    const tx = db.transaction(collection, 'readwrite');
    const store = tx.objectStore(collection);
    const inserted: Record<string, unknown>[] = [];
    const total = records.length;

    for (let i = 0; i < total; i++) {
      const clone = { ...records[i] };
      await store.put(clone);
      inserted.push(clone);
      if (options?.onProgress && total > 0) {
        options.onProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    await tx.done;
    return inserted;
  }

  async bulkUpdate(
    collection: string,
    updates: BulkUpdateEntry[],
    options?: BulkOptions,
  ): Promise<Record<string, unknown>[]> {
    const db = await this.ensureDB(collection);
    const tx = db.transaction(collection, 'readwrite');
    const store = tx.objectStore(collection);
    const results: Record<string, unknown>[] = [];
    const total = updates.length;

    for (let i = 0; i < total; i++) {
      const { id, changes } = updates[i];
      const existing = await store.get(id);
      if (!existing) {
        throw new Error(`[IndexedDBAdapter] Record not found: ${collection}/${id}`);
      }
      const updated = { ...(existing as Record<string, unknown>), ...changes };
      await store.put(updated);
      results.push(updated);
      if (options?.onProgress && total > 0) {
        options.onProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    await tx.done;
    return results;
  }

  async bulkRemove(
    collection: string,
    ids: string[],
    options?: BulkOptions,
  ): Promise<void> {
    const db = await this.ensureDB(collection);
    const tx = db.transaction(collection, 'readwrite');
    const store = tx.objectStore(collection);
    const total = ids.length;

    for (let i = 0; i < total; i++) {
      await store.delete(ids[i]);
      if (options?.onProgress && total > 0) {
        options.onProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    await tx.done;
  }

  // ---- Aggregation (falls back to getAll + in-memory) ----

  async aggregate(
    collection: string,
    options: AggregateOptions,
  ): Promise<AggregateResult[]> {
    let records = await this.getAll(collection);

    if (options.filters && options.filters.length > 0) {
      records = applyFilters(records, options.filters);
    }

    const groupBy = options.groupBy ?? [];
    const groupMap = new Map<string, Record<string, unknown>[]>();

    for (const record of records) {
      const groupKey = groupBy.map((field) => String(getNestedValue(record, field) ?? '')).join('||');
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(record);
    }

    if (groupBy.length === 0 && !groupMap.has('')) {
      groupMap.set('', records);
    }

    const results: AggregateResult[] = [];

    for (const [groupKey, groupRecords] of groupMap.entries()) {
      const groups: Record<string, unknown> = {};
      if (groupBy.length > 0) {
        const keyParts = groupKey.split('||');
        for (let i = 0; i < groupBy.length; i++) {
          groups[groupBy[i]] = keyParts[i];
        }
      }

      const values: Record<string, number> = {};
      for (const agg of options.aggregates) {
        const key = `${agg.fn}_${agg.field}`;
        switch (agg.fn) {
          case 'count':
            values[key] = groupRecords.length;
            break;
          case 'sum': {
            let total = 0;
            for (const r of groupRecords) {
              const v = getNestedValue(r, agg.field);
              if (typeof v === 'number') total += v;
            }
            values[key] = total;
            break;
          }
          case 'avg': {
            let sum = 0;
            let cnt = 0;
            for (const r of groupRecords) {
              const v = getNestedValue(r, agg.field);
              if (typeof v === 'number') {
                sum += v;
                cnt++;
              }
            }
            values[key] = cnt > 0 ? sum / cnt : 0;
            break;
          }
          case 'min': {
            let min = Infinity;
            for (const r of groupRecords) {
              const v = getNestedValue(r, agg.field);
              if (typeof v === 'number' && v < min) min = v;
            }
            values[key] = min === Infinity ? 0 : min;
            break;
          }
          case 'max': {
            let max = -Infinity;
            for (const r of groupRecords) {
              const v = getNestedValue(r, agg.field);
              if (typeof v === 'number' && v > max) max = v;
            }
            values[key] = max === -Infinity ? 0 : max;
            break;
          }
        }
      }

      results.push({ groups, values });
    }

    return results;
  }

  // ---- Collection Management ----

  async clear(collection: string): Promise<void> {
    const db = await this.ensureDB(collection);
    await db.clear(collection);
  }

  async exportCollection(collection: string): Promise<Record<string, unknown>[]> {
    return this.getAll(collection);
  }

  async importCollection(
    collection: string,
    records: Record<string, unknown>[],
    merge = false,
  ): Promise<void> {
    const db = await this.ensureDB(collection);

    if (!merge) {
      await db.clear(collection);
    }

    const tx = db.transaction(collection, 'readwrite');
    const store = tx.objectStore(collection);

    for (const record of records) {
      if (merge) {
        const id = record['id'] as string | undefined;
        if (id) {
          const existing = await store.get(id);
          if (existing) {
            await store.put({
              ...(existing as Record<string, unknown>),
              ...record,
            });
            continue;
          }
        }
      }
      await store.put({ ...record });
    }

    await tx.done;
  }

  /** Close the database connection. */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
