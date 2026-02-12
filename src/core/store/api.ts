/**
 * Concrete — API Adapter (REST)
 * Phase Zed.3 Data Layer Abstraction
 *
 * Implements DataAdapter as a REST client using JSON:API-compatible
 * query parameters. This is a stub implementation for Phase 16+ when
 * the PHP backend becomes available. All methods throw if no baseUrl
 * is configured.
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
// Configuration
// ---------------------------------------------------------------------------

export interface ApiAdapterConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

// ---------------------------------------------------------------------------
// ApiAdapter
// ---------------------------------------------------------------------------

export class ApiAdapter implements DataAdapter {
  private config: ApiAdapterConfig | null;

  constructor(config?: ApiAdapterConfig) {
    this.config = config ?? null;
  }

  /** Update configuration (e.g., after user logs in and backend URL is known). */
  configure(config: ApiAdapterConfig): void {
    this.config = config;
  }

  private getConfig(): ApiAdapterConfig {
    if (!this.config || !this.config.baseUrl) {
      throw new Error(
        '[ApiAdapter] Backend not configured. Set baseUrl via configure() before making API calls.',
      );
    }
    return this.config;
  }

  private url(collection: string, id?: string): string {
    const base = this.getConfig().baseUrl.replace(/\/+$/, '');
    return id ? `${base}/${collection}/${id}` : `${base}/${collection}`;
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<T> {
    const config = this.getConfig();
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';

    const controller = new AbortController();
    const timeoutMs = config.timeout ?? 30_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url + queryString, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(config.headers ?? {}),
        },
        body: body != null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
          `[ApiAdapter] HTTP ${response.status} ${response.statusText}: ${text}`,
        );
      }

      // 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers — build JSON:API query params
  // ---------------------------------------------------------------------------

  private buildQueryParams(options: QueryOptions): Record<string, string> {
    const params: Record<string, string> = {};

    if (options.filters) {
      for (const f of options.filters) {
        // JSON:API filter convention: filter[field][operator]=value
        const op = f.operator === '=' ? 'eq' : f.operator;
        params[`filter[${f.field}][${op}]`] = String(f.value);
      }
    }

    if (options.orderBy && options.orderBy.length > 0) {
      params['sort'] = options.orderBy
        .map((o) => (o.direction === 'desc' ? `-${o.field}` : o.field))
        .join(',');
    }

    if (options.limit != null) {
      params['page[limit]'] = String(options.limit);
    }

    if (options.offset != null) {
      params['page[offset]'] = String(options.offset);
    }

    if (options.include && options.include.length > 0) {
      params['include'] = options.include.join(',');
    }

    return params;
  }

  // ---------------------------------------------------------------------------
  // DataAdapter Implementation
  // ---------------------------------------------------------------------------

  async get(collection: string, id: string): Promise<Record<string, unknown> | null> {
    try {
      const result = await this.request<{ data: Record<string, unknown> }>(
        'GET',
        this.url(collection, id),
      );
      return result.data ?? null;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('HTTP 404')) {
        return null;
      }
      throw err;
    }
  }

  async getAll(collection: string): Promise<Record<string, unknown>[]> {
    const result = await this.request<{ data: Record<string, unknown>[] }>(
      'GET',
      this.url(collection),
    );
    return result.data ?? [];
  }

  async query(
    collection: string,
    options: QueryOptions,
  ): Promise<Record<string, unknown>[]> {
    const params = this.buildQueryParams(options);
    const result = await this.request<{ data: Record<string, unknown>[] }>(
      'GET',
      this.url(collection),
      undefined,
      params,
    );
    return result.data ?? [];
  }

  async count(collection: string, filters?: QueryFilter[]): Promise<number> {
    const params: Record<string, string> = { 'meta': 'count' };
    if (filters) {
      for (const f of filters) {
        const op = f.operator === '=' ? 'eq' : f.operator;
        params[`filter[${f.field}][${op}]`] = String(f.value);
      }
    }
    const result = await this.request<{ meta: { count: number } }>(
      'GET',
      this.url(collection),
      undefined,
      params,
    );
    return result.meta?.count ?? 0;
  }

  async insert(
    collection: string,
    record: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const result = await this.request<{ data: Record<string, unknown> }>(
      'POST',
      this.url(collection),
      { data: record },
    );
    return result.data;
  }

  async update(
    collection: string,
    id: string,
    changes: Partial<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    const result = await this.request<{ data: Record<string, unknown> }>(
      'PATCH',
      this.url(collection, id),
      { data: changes },
    );
    return result.data;
  }

  async upsert(
    collection: string,
    record: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const id = record['id'] as string | undefined;
    if (id) {
      try {
        return await this.update(collection, id, record);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('HTTP 404')) {
          return this.insert(collection, record);
        }
        throw err;
      }
    }
    return this.insert(collection, record);
  }

  async remove(collection: string, id: string): Promise<void> {
    await this.request<void>('DELETE', this.url(collection, id));
  }

  async bulkInsert(
    collection: string,
    records: Record<string, unknown>[],
    options?: BulkOptions,
  ): Promise<Record<string, unknown>[]> {
    const result = await this.request<{ data: Record<string, unknown>[] }>(
      'POST',
      this.url(collection) + '/bulk',
      { data: records },
    );
    options?.onProgress?.(100);
    return result.data ?? [];
  }

  async bulkUpdate(
    collection: string,
    updates: BulkUpdateEntry[],
    options?: BulkOptions,
  ): Promise<Record<string, unknown>[]> {
    const result = await this.request<{ data: Record<string, unknown>[] }>(
      'PATCH',
      this.url(collection) + '/bulk',
      { data: updates },
    );
    options?.onProgress?.(100);
    return result.data ?? [];
  }

  async bulkRemove(
    collection: string,
    ids: string[],
    options?: BulkOptions,
  ): Promise<void> {
    await this.request<void>(
      'DELETE',
      this.url(collection) + '/bulk',
      { data: { ids } },
    );
    options?.onProgress?.(100);
  }

  async aggregate(
    collection: string,
    options: AggregateOptions,
  ): Promise<AggregateResult[]> {
    const result = await this.request<{ data: AggregateResult[] }>(
      'POST',
      this.url(collection) + '/aggregate',
      options,
    );
    return result.data ?? [];
  }

  async clear(collection: string): Promise<void> {
    await this.request<void>('DELETE', this.url(collection));
  }

  async exportCollection(collection: string): Promise<Record<string, unknown>[]> {
    const result = await this.request<{ data: Record<string, unknown>[] }>(
      'GET',
      this.url(collection) + '/export',
    );
    return result.data ?? [];
  }

  async importCollection(
    collection: string,
    records: Record<string, unknown>[],
    merge = false,
  ): Promise<void> {
    await this.request<void>(
      'POST',
      this.url(collection) + '/import',
      { data: records, merge },
    );
  }
}
