/**
 * Concrete — LocalStorage Adapter
 * Phase Zed.3 Data Layer Abstraction
 *
 * Implements DataAdapter backed by browser localStorage.
 * Maintains an in-memory cache that syncs to localStorage on writes
 * with a 100ms debounce to batch rapid mutations.
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
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'concrete';
const DEBOUNCE_MS = 100;

// ---------------------------------------------------------------------------
// Filter Evaluation
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
    default: {
      // Exhaustiveness — should never reach here
      const _exhaustive: never = filter.operator as never;
      void _exhaustive;
      return false;
    }
  }
}

function applyFilters(
  records: Record<string, unknown>[],
  filters: QueryFilter[],
): Record<string, unknown>[] {
  return records.filter((rec) => filters.every((f) => matchesFilter(rec, f)));
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

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
// LocalStorageAdapter
// ---------------------------------------------------------------------------

export class LocalStorageAdapter implements DataAdapter {
  private cache: Map<string, Record<string, unknown>[]> = new Map();
  private loaded = false;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Lifecycle ----

  private ensureLoaded(): void {
    if (this.loaded) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>[]>;
        for (const [key, value] of Object.entries(parsed)) {
          if (Array.isArray(value)) {
            this.cache.set(key, value);
          }
        }
      }
    } catch {
      // Corrupted data — start fresh
      this.cache.clear();
    }
    this.loaded = true;
  }

  private schedulePersist(): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persistNow();
    }, DEBOUNCE_MS);
  }

  private persistNow(): void {
    const obj: Record<string, Record<string, unknown>[]> = {};
    for (const [key, value] of this.cache.entries()) {
      obj[key] = value;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (err: unknown) {
      // Handle QuotaExceededError gracefully
      if (
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' || err.code === 22)
      ) {
        console.warn(
          '[LocalStorageAdapter] localStorage quota exceeded. Data persisted only in memory.',
        );
      } else {
        throw err;
      }
    }
  }

  /** Force immediate persistence (useful for tests or shutdown). */
  flush(): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.persistNow();
  }

  private getCollection(collection: string): Record<string, unknown>[] {
    this.ensureLoaded();
    if (!this.cache.has(collection)) {
      this.cache.set(collection, []);
    }
    return this.cache.get(collection)!;
  }

  // ---- Single Record CRUD ----

  async get(collection: string, id: string): Promise<Record<string, unknown> | null> {
    const records = this.getCollection(collection);
    return records.find((r) => r['id'] === id) ?? null;
  }

  async getAll(collection: string): Promise<Record<string, unknown>[]> {
    return [...this.getCollection(collection)];
  }

  async insert(
    collection: string,
    record: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const records = this.getCollection(collection);
    const clone = { ...record };
    records.push(clone);
    this.schedulePersist();
    return clone;
  }

  async update(
    collection: string,
    id: string,
    changes: Partial<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    const records = this.getCollection(collection);
    const idx = records.findIndex((r) => r['id'] === id);
    if (idx === -1) {
      throw new Error(`[LocalStorageAdapter] Record not found: ${collection}/${id}`);
    }
    const updated = { ...records[idx], ...changes };
    records[idx] = updated;
    this.schedulePersist();
    return updated;
  }

  async upsert(
    collection: string,
    record: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const id = record['id'] as string | undefined;
    if (id) {
      const existing = await this.get(collection, id);
      if (existing) {
        return this.update(collection, id, record);
      }
    }
    return this.insert(collection, record);
  }

  async remove(collection: string, id: string): Promise<void> {
    const records = this.getCollection(collection);
    const idx = records.findIndex((r) => r['id'] === id);
    if (idx !== -1) {
      records.splice(idx, 1);
      this.schedulePersist();
    }
  }

  // ---- Query ----

  async query(
    collection: string,
    options: QueryOptions,
  ): Promise<Record<string, unknown>[]> {
    let results = [...this.getCollection(collection)];

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
    let records = this.getCollection(collection);
    if (filters && filters.length > 0) {
      records = applyFilters(records, filters);
    }
    return records.length;
  }

  // ---- Bulk Operations ----

  async bulkInsert(
    collection: string,
    records: Record<string, unknown>[],
    options?: BulkOptions,
  ): Promise<Record<string, unknown>[]> {
    const col = this.getCollection(collection);
    const inserted: Record<string, unknown>[] = [];
    const total = records.length;

    for (let i = 0; i < total; i++) {
      const clone = { ...records[i] };
      col.push(clone);
      inserted.push(clone);
      if (options?.onProgress && total > 0) {
        options.onProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    this.schedulePersist();
    return inserted;
  }

  async bulkUpdate(
    collection: string,
    updates: BulkUpdateEntry[],
    options?: BulkOptions,
  ): Promise<Record<string, unknown>[]> {
    const records = this.getCollection(collection);
    const results: Record<string, unknown>[] = [];
    const total = updates.length;

    for (let i = 0; i < total; i++) {
      const { id, changes } = updates[i];
      const idx = records.findIndex((r) => r['id'] === id);
      if (idx === -1) {
        throw new Error(`[LocalStorageAdapter] Record not found: ${collection}/${id}`);
      }
      const updated = { ...records[idx], ...changes };
      records[idx] = updated;
      results.push(updated);
      if (options?.onProgress && total > 0) {
        options.onProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    this.schedulePersist();
    return results;
  }

  async bulkRemove(
    collection: string,
    ids: string[],
    options?: BulkOptions,
  ): Promise<void> {
    const records = this.getCollection(collection);
    const idSet = new Set(ids);
    const total = ids.length;
    let removed = 0;

    for (let i = records.length - 1; i >= 0; i--) {
      if (idSet.has(records[i]['id'] as string)) {
        records.splice(i, 1);
        removed++;
        if (options?.onProgress && total > 0) {
          options.onProgress(Math.round((removed / total) * 100));
        }
      }
    }

    this.schedulePersist();
  }

  // ---- Aggregation ----

  async aggregate(
    collection: string,
    options: AggregateOptions,
  ): Promise<AggregateResult[]> {
    let records = [...this.getCollection(collection)];

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

    // If no groupBy, all records form a single group
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
    this.cache.set(collection, []);
    this.schedulePersist();
  }

  async exportCollection(collection: string): Promise<Record<string, unknown>[]> {
    return [...this.getCollection(collection)];
  }

  async importCollection(
    collection: string,
    records: Record<string, unknown>[],
    merge = false,
  ): Promise<void> {
    if (merge) {
      const existing = this.getCollection(collection);
      const existingIds = new Set(existing.map((r) => r['id'] as string));
      for (const record of records) {
        const id = record['id'] as string | undefined;
        if (id && existingIds.has(id)) {
          const idx = existing.findIndex((r) => r['id'] === id);
          existing[idx] = { ...existing[idx], ...record };
        } else {
          existing.push({ ...record });
        }
      }
    } else {
      this.cache.set(collection, records.map((r) => ({ ...r })));
    }
    this.schedulePersist();
  }
}
