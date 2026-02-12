/**
 * Concrete — Query Builder
 * Phase Zed.3 Data Layer Abstraction
 *
 * Fluent query builder that constructs QueryOptions and executes
 * against a DataAdapter. Supports filtering, sorting, pagination,
 * relation includes, and aggregation shortcuts.
 */

import type {
  DataAdapter,
  QueryFilter,
  QueryOperator,
  QueryOptions,
} from './adapter';

// ---------------------------------------------------------------------------
// Query<T>
// ---------------------------------------------------------------------------

export class Query<T extends Record<string, unknown>> {
  private readonly _collection: string;
  private readonly adapter: DataAdapter;
  private _filters: QueryFilter[] = [];
  private _orderBy: { field: string; direction: 'asc' | 'desc' }[] = [];
  private _limit?: number;
  private _offset?: number;
  private _includes: string[] = [];

  constructor(collection: string, adapter: DataAdapter) {
    this._collection = collection;
    this.adapter = adapter;
  }

  // ---- Filter ----

  where(field: string, operator: QueryOperator, value: unknown): Query<T> {
    this._filters.push({ field, operator, value });
    return this;
  }

  /** Convenience: where(field, '=', value) */
  whereEq(field: string, value: unknown): Query<T> {
    return this.where(field, '=', value);
  }

  /** Convenience: where(field, 'in', values) */
  whereIn(field: string, values: unknown[]): Query<T> {
    return this.where(field, 'in', values);
  }

  /** Convenience: where(field, 'isNull', null) */
  whereNull(field: string): Query<T> {
    return this.where(field, 'isNull', null);
  }

  /** Convenience: where(field, 'isNotNull', null) */
  whereNotNull(field: string): Query<T> {
    return this.where(field, 'isNotNull', null);
  }

  /** Convenience: where(field, 'between', [low, high]) */
  whereBetween(field: string, low: unknown, high: unknown): Query<T> {
    return this.where(field, 'between', [low, high]);
  }

  // ---- Sorting ----

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): Query<T> {
    this._orderBy.push({ field, direction });
    return this;
  }

  // ---- Pagination ----

  limit(n: number): Query<T> {
    this._limit = n;
    return this;
  }

  offset(n: number): Query<T> {
    this._offset = n;
    return this;
  }

  // ---- Relations ----

  include(relation: string): Query<T> {
    this._includes.push(relation);
    return this;
  }

  // ---- Build ----

  /** Build the QueryOptions object (useful for debugging or passing around). */
  build(): QueryOptions {
    const options: QueryOptions = {};

    if (this._filters.length > 0) {
      options.filters = [...this._filters];
    }

    if (this._orderBy.length > 0) {
      options.orderBy = [...this._orderBy];
    }

    if (this._limit != null) {
      options.limit = this._limit;
    }

    if (this._offset != null) {
      options.offset = this._offset;
    }

    if (this._includes.length > 0) {
      options.include = [...this._includes];
    }

    return options;
  }

  // ---- Execute ----

  /** Execute the query and return all matching records. */
  async execute(): Promise<T[]> {
    const results = await this.adapter.query(this._collection, this.build());
    return results as T[];
  }

  /** Execute the query and return the first matching record, or null. */
  async first(): Promise<T | null> {
    const original = this._limit;
    this._limit = 1;
    const results = await this.execute();
    this._limit = original;
    return results.length > 0 ? results[0] : null;
  }

  /** Count records matching the current filters (ignores orderBy/limit/offset). */
  async count(): Promise<number> {
    return this.adapter.count(this._collection, this._filters);
  }

  /** Sum a numeric field across matching records. */
  async sum(field: string): Promise<number> {
    const results = await this.adapter.aggregate(this._collection, {
      aggregates: [{ field, fn: 'sum' }],
      filters: this._filters.length > 0 ? this._filters : undefined,
    });
    return results.length > 0 ? (results[0].values[`sum_${field}`] ?? 0) : 0;
  }

  /** Average a numeric field across matching records. */
  async avg(field: string): Promise<number> {
    const results = await this.adapter.aggregate(this._collection, {
      aggregates: [{ field, fn: 'avg' }],
      filters: this._filters.length > 0 ? this._filters : undefined,
    });
    return results.length > 0 ? (results[0].values[`avg_${field}`] ?? 0) : 0;
  }

  /** Minimum of a numeric field across matching records. */
  async min(field: string): Promise<number> {
    const results = await this.adapter.aggregate(this._collection, {
      aggregates: [{ field, fn: 'min' }],
      filters: this._filters.length > 0 ? this._filters : undefined,
    });
    return results.length > 0 ? (results[0].values[`min_${field}`] ?? 0) : 0;
  }

  /** Maximum of a numeric field across matching records. */
  async max(field: string): Promise<number> {
    const results = await this.adapter.aggregate(this._collection, {
      aggregates: [{ field, fn: 'max' }],
      filters: this._filters.length > 0 ? this._filters : undefined,
    });
    return results.length > 0 ? (results[0].values[`max_${field}`] ?? 0) : 0;
  }
}
