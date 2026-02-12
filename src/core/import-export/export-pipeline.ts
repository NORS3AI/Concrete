/**
 * Concrete -- Export Pipeline
 * Phase Zed.10 Import/Export Framework
 *
 * Exports data from the store in CSV, TSV, JSON, or PDF format.
 * Supports entity filtering, date range filtering, field selection,
 * full backup export, and browser download triggering.
 */

import type { ExportOptions, ExportFormat } from '../types/import-export';
import type { DataAdapter, QueryFilter } from '../store/adapter';

// ---------------------------------------------------------------------------
// ExportPipeline
// ---------------------------------------------------------------------------

export class ExportPipeline {
  private store: DataAdapter;

  constructor(store: DataAdapter) {
    this.store = store;
  }

  // -----------------------------------------------------------------------
  // Export a collection to a specific format
  // -----------------------------------------------------------------------

  async export(options: ExportOptions): Promise<Blob> {
    let allData: Record<string, unknown>[] = [];

    for (const collection of options.collections) {
      const filters: QueryFilter[] = [];

      // Entity filter
      if (options.entityFilter && options.entityFilter.length > 0) {
        filters.push({
          field: 'entityId',
          operator: 'in',
          value: options.entityFilter,
        });
      }

      // Date range filter
      if (options.dateRange) {
        filters.push({
          field: 'date',
          operator: '>=',
          value: options.dateRange.start,
        });
        filters.push({
          field: 'date',
          operator: '<=',
          value: options.dateRange.end,
        });
      }

      let data: Record<string, unknown>[];

      if (filters.length > 0) {
        data = await this.store.query(collection, { filters });
      } else {
        data = await this.store.getAll(collection);
      }

      // Filter to active (non-deleted) records
      data = data.filter((r) => r['deletedAt'] == null);

      // If multiple collections, tag each record with its collection
      if (options.collections.length > 1) {
        data = data.map((r) => ({ ...r, _collection: collection }));
      }

      allData = allData.concat(data);
    }

    // Select specific fields if provided
    if (options.fields && options.fields.length > 0) {
      allData = this.selectFields(allData, options.fields);
    }

    return this.formatBlob(allData, options.format, options.fields);
  }

  // -----------------------------------------------------------------------
  // Trigger browser download
  // -----------------------------------------------------------------------

  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Cleanup after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  }

  // -----------------------------------------------------------------------
  // Full backup export
  // -----------------------------------------------------------------------

  async exportFullBackup(): Promise<Blob> {
    const backup: Record<string, Record<string, unknown>[]> = {};

    // Export known core collections
    const coreCollections = [
      'entities', 'chartOfAccounts', 'glEntries', 'glJournals',
      'jobs', 'costCodes', 'jobCostEntries', 'changeOrders',
      'vendors', 'apInvoices', 'apPayments',
      'arInvoices', 'arReceipts',
      'employees', 'payrollRuns', 'paychecks', 'unionClasses',
      'importBatches',
    ];

    for (const collection of coreCollections) {
      try {
        const data = await this.store.exportCollection(collection);
        if (data.length > 0) {
          backup[collection] = data;
        }
      } catch {
        // Collection may not exist -- skip silently
      }
    }

    const json = JSON.stringify(backup, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  // -----------------------------------------------------------------------
  // Private: Formatting
  // -----------------------------------------------------------------------

  private formatBlob(
    data: Record<string, unknown>[],
    format: ExportFormat,
    fields?: string[]
  ): Blob {
    switch (format) {
      case 'csv': {
        const csv = this.formatCSV(data, fields);
        return new Blob([csv], { type: 'text/csv;charset=utf-8' });
      }
      case 'tsv': {
        const tsv = this.formatTSV(data, fields);
        return new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' });
      }
      case 'json': {
        const json = this.formatJSON(data);
        return new Blob([json], { type: 'application/json;charset=utf-8' });
      }
      case 'pdf':
      case 'xlsx':
        // PDF and XLSX are handled by separate engines; return JSON as fallback
        return new Blob([this.formatJSON(data)], { type: 'application/json;charset=utf-8' });
    }
  }

  private formatCSV(data: Record<string, unknown>[], fields?: string[]): string {
    if (data.length === 0) return '';

    const headers = fields ?? this.extractHeaders(data);
    const lines: string[] = [];

    // Header row
    lines.push(headers.map((h) => this.escapeCSVField(h)).join(','));

    // Data rows
    for (const record of data) {
      const row = headers.map((h) => {
        const val = record[h];
        return this.escapeCSVField(this.formatValue(val));
      });
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  private formatTSV(data: Record<string, unknown>[], fields?: string[]): string {
    if (data.length === 0) return '';

    const headers = fields ?? this.extractHeaders(data);
    const lines: string[] = [];

    // Header row
    lines.push(headers.join('\t'));

    // Data rows
    for (const record of data) {
      const row = headers.map((h) => {
        const val = record[h];
        return this.formatValue(val).replace(/\t/g, ' ');
      });
      lines.push(row.join('\t'));
    }

    return lines.join('\n');
  }

  private formatJSON(data: Record<string, unknown>[]): string {
    return JSON.stringify(data, null, 2);
  }

  // -----------------------------------------------------------------------
  // Private: Helpers
  // -----------------------------------------------------------------------

  private extractHeaders(data: Record<string, unknown>[]): string[] {
    const headerSet = new Set<string>();
    for (const record of data) {
      for (const key of Object.keys(record)) {
        headerSet.add(key);
      }
    }
    return Array.from(headerSet);
  }

  private selectFields(
    data: Record<string, unknown>[],
    fields: string[]
  ): Record<string, unknown>[] {
    return data.map((record) => {
      const filtered: Record<string, unknown> = {};
      for (const field of fields) {
        if (field in record) {
          filtered[field] = record[field];
        }
      }
      return filtered;
    });
  }

  private escapeCSVField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }

  private formatValue(val: unknown): string {
    if (val === null || val === undefined) return '';
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }
}
