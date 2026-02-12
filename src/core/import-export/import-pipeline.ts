/**
 * Concrete -- Import Pipeline
 * Phase Zed.10 Import/Export Framework
 *
 * Implements a 9-step import process: parse, set type, auto-map,
 * set mappings, transform, validate, preview, execute, undo.
 * Handles CSV/TSV/JSON with auto-delimiter detection, fuzzy column
 * mapping, date/amount parsing, and batch audit.
 */

import type {
  ImportStep,
  ColumnMapping,
  ImportBatch,
  ImportError,
  ImportPreview,
  MergeStrategy,
} from '../types/import-export';
import type { ISODateString } from '../types/base';
import { generateId, now } from '../types/base';
import type { SchemaRegistry } from '../schema/registry';
import type { EventBus } from '../events/bus';
import type { DataAdapter } from '../store/adapter';

// ---------------------------------------------------------------------------
// Common header aliases for fuzzy auto-mapping
// ---------------------------------------------------------------------------

const HEADER_ALIASES: Record<string, string[]> = {
  id:            ['id', 'identifier', 'record_id', 'recordid', 'uid'],
  entityId:      ['entity_id', 'entityid', 'entity', 'company', 'company_id', 'companyid'],
  date:          ['date', 'transaction_date', 'transactiondate', 'trans_date', 'posting_date', 'postingdate', 'invoice_date', 'invoicedate'],
  amount:        ['amount', 'total', 'value', 'sum', 'net', 'gross', 'balance'],
  description:   ['description', 'desc', 'memo', 'note', 'notes', 'comment', 'remarks'],
  category:      ['category', 'cat', 'type', 'class', 'classification', 'account'],
  accountNumber: ['account_number', 'accountnumber', 'account_no', 'accountno', 'acct', 'acctno', 'acct_no', 'gl_account', 'glaccount'],
  vendorId:      ['vendor_id', 'vendorid', 'vendor', 'vendor_name', 'vendorname', 'supplier', 'supplier_id'],
  jobId:         ['job_id', 'jobid', 'job', 'job_number', 'jobnumber', 'project', 'project_id', 'projectid'],
  costCode:      ['cost_code', 'costcode', 'cost_type', 'costtype', 'phase_code', 'phasecode'],
  name:          ['name', 'full_name', 'fullname', 'display_name', 'displayname', 'title', 'label'],
  debit:         ['debit', 'dr', 'debit_amount', 'debitamount'],
  credit:        ['credit', 'cr', 'credit_amount', 'creditamount'],
  reference:     ['reference', 'ref', 'ref_no', 'refno', 'reference_number', 'referencenumber', 'check_no', 'checkno', 'invoice_no', 'invoiceno'],
  employeeId:    ['employee_id', 'employeeid', 'employee', 'emp_id', 'empid', 'worker_id', 'workerid'],
  hours:         ['hours', 'hrs', 'total_hours', 'totalhours', 'regular_hours', 'regularhours'],
  rate:          ['rate', 'hourly_rate', 'hourlyrate', 'pay_rate', 'payrate', 'unit_price', 'unitprice'],
  quantity:      ['quantity', 'qty', 'units', 'count'],
};

// ---------------------------------------------------------------------------
// ImportPipeline
// ---------------------------------------------------------------------------

export class ImportPipeline {
  private currentStep: ImportStep = 'upload';
  private file: File | null = null;
  private rawData: string[][] = [];
  private headers: string[] = [];
  private dataType: string = '';
  private mappings: ColumnMapping[] = [];
  private preview: ImportPreview | null = null;
  private validationErrors: ImportError[] = [];
  private store: DataAdapter;
  private schemas: SchemaRegistry;
  private events: EventBus;

  constructor(store: DataAdapter, schemas: SchemaRegistry, events: EventBus) {
    this.store = store;
    this.schemas = schemas;
    this.events = events;
  }

  // -----------------------------------------------------------------------
  // Step 1: Parse file
  // -----------------------------------------------------------------------

  async parse(file: File): Promise<{ headers: string[]; rowCount: number; sampleRows: string[][] }> {
    this.file = file;
    const text = await file.text();
    const fileName = file.name.toLowerCase();

    let parsed: string[][];

    if (fileName.endsWith('.json')) {
      parsed = this.parseJSON(text);
    } else {
      const delimiter = this.detectDelimiter(text);
      parsed = this.parseDelimited(text, delimiter);
    }

    if (parsed.length === 0) {
      throw new Error('File is empty or could not be parsed.');
    }

    this.headers = parsed[0].map((h) => h.trim());
    this.rawData = parsed.slice(1);

    const sampleRows = this.rawData.slice(0, 5);

    this.currentStep = 'type';

    return {
      headers: this.headers,
      rowCount: this.rawData.length,
      sampleRows,
    };
  }

  // -----------------------------------------------------------------------
  // Step 2: Set data type
  // -----------------------------------------------------------------------

  setDataType(type: string): void {
    this.dataType = type;
    this.currentStep = 'map';
  }

  // -----------------------------------------------------------------------
  // Step 3: Auto-detect column mappings
  // -----------------------------------------------------------------------

  autoMap(headers: string[]): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];

    // Gather target fields from the schema if available
    const schema = this.schemas.get(this.dataType);
    const schemaFieldNames: string[] = schema
      ? schema.fields.map((f) => f.name)
      : Object.keys(HEADER_ALIASES);

    for (const header of headers) {
      const normalized = this.normalizeHeader(header);
      let matched = false;

      // 1. Exact match against schema field names
      for (const fieldName of schemaFieldNames) {
        if (this.normalizeHeader(fieldName) === normalized) {
          mappings.push({ sourceColumn: header, targetField: fieldName });
          matched = true;
          break;
        }
      }

      if (matched) continue;

      // 2. Alias lookup
      for (const [targetField, aliases] of Object.entries(HEADER_ALIASES)) {
        // Only map to fields that exist in schema (if schema available)
        if (schema && !schemaFieldNames.includes(targetField)) continue;

        if (aliases.includes(normalized)) {
          mappings.push({ sourceColumn: header, targetField });
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Unmapped column
        mappings.push({ sourceColumn: header, targetField: undefined });
      }
    }

    this.mappings = mappings;
    return mappings;
  }

  // -----------------------------------------------------------------------
  // Step 4: Set manual mappings
  // -----------------------------------------------------------------------

  setMappings(mappings: ColumnMapping[]): void {
    this.mappings = mappings;
    this.currentStep = 'preview';
  }

  // -----------------------------------------------------------------------
  // Step 5: Transform a row
  // -----------------------------------------------------------------------

  transformRow(row: Record<string, string>, mappings: ColumnMapping[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const mapping of mappings) {
      if (!mapping.targetField) continue;

      const rawValue = row[mapping.sourceColumn];
      if (rawValue === undefined || rawValue === null || rawValue === '') continue;

      let value: unknown = rawValue;

      // Apply explicit transform first
      if (mapping.transform) {
        value = this.applyTransform(rawValue, mapping.transform);
      } else {
        // Auto-detect type from schema field definition
        const schema = this.schemas.get(this.dataType);
        const fieldDef = schema?.fields.find((f) => f.name === mapping.targetField);

        if (fieldDef) {
          switch (fieldDef.type) {
            case 'date':
              value = this.parseDate(rawValue);
              break;
            case 'number':
            case 'currency':
            case 'percentage':
              value = this.parseAmount(rawValue);
              break;
            case 'boolean':
              value = this.parseBoolean(rawValue);
              break;
            default:
              value = rawValue.trim();
          }
        } else {
          // Heuristic: detect date-like and numeric strings
          if (this.looksLikeDate(rawValue)) {
            value = this.parseDate(rawValue);
          } else if (this.looksLikeNumber(rawValue)) {
            value = this.parseAmount(rawValue);
          } else {
            value = rawValue.trim();
          }
        }
      }

      result[mapping.targetField] = value;
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Step 6: Validate transformed data
  // -----------------------------------------------------------------------

  validate(records: Record<string, unknown>[]): ImportError[] {
    const errors: ImportError[] = [];
    const schema = this.schemas.get(this.dataType);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // +1 for header, +1 for 1-based indexing

      if (schema) {
        // Validate against schema
        const schemaErrors = this.schemas.validate(this.dataType, record);
        for (const errMsg of schemaErrors) {
          errors.push({
            row: rowNum,
            message: errMsg,
            severity: 'error',
          });
        }
      }

      // Common validations regardless of schema
      // Check required amount/date fields aren't NaN/invalid
      for (const [key, val] of Object.entries(record)) {
        if (val !== null && val !== undefined) {
          if (typeof val === 'number' && isNaN(val)) {
            errors.push({
              row: rowNum,
              field: key,
              message: `Invalid numeric value for field "${key}"`,
              severity: 'error',
            });
          }
        }
      }
    }

    this.validationErrors = errors;
    return errors;
  }

  // -----------------------------------------------------------------------
  // Step 7: Generate preview
  // -----------------------------------------------------------------------

  async generatePreview(): Promise<ImportPreview> {
    const records = this.transformAll();
    const validationErrors = this.validate(records);
    const errorRows = new Set(validationErrors.filter((e) => e.severity === 'error').map((e) => e.row));

    let adds = 0;
    let updates = 0;
    let skips = 0;
    let errorCount = 0;

    // Attempt to detect existing records for merge detection
    let existingRecords: Record<string, unknown>[] = [];
    try {
      existingRecords = await this.store.getAll(this.dataType);
    } catch {
      // Collection may not exist yet
    }

    const existingIds = new Set(existingRecords.map((r) => r['id'] as string).filter(Boolean));

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2;
      if (errorRows.has(rowNum)) {
        errorCount++;
        continue;
      }

      const record = records[i];
      const recordId = record['id'] as string | undefined;

      if (recordId && existingIds.has(recordId)) {
        updates++;
      } else {
        adds++;
      }
    }

    // Sample: first 10 valid transformed records
    const sample = records.slice(0, 10);

    this.preview = { adds, updates, skips, errors: errorCount, sample };
    this.currentStep = 'execute';
    return this.preview;
  }

  // -----------------------------------------------------------------------
  // Step 8: Execute import
  // -----------------------------------------------------------------------

  async execute(options?: {
    mergeStrategy?: MergeStrategy;
    onProgress?: (pct: number) => void;
  }): Promise<ImportBatch> {
    const mergeStrategy = options?.mergeStrategy ?? 'skip';
    const onProgress = options?.onProgress;

    const records = this.transformAll();
    const validationErrors = this.validate(records);
    const errorRows = new Set(validationErrors.filter((e) => e.severity === 'error').map((e) => e.row));

    const batchId = generateId();
    const timestamp = now();

    // Fetch existing data for merge
    let existingRecords: Record<string, unknown>[] = [];
    try {
      existingRecords = await this.store.getAll(this.dataType);
    } catch {
      // Collection may not exist
    }
    const existingById = new Map(
      existingRecords
        .filter((r) => r['id'] != null)
        .map((r) => [r['id'] as string, r])
    );

    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: Array<{ id: string; changes: Record<string, unknown> }> = [];
    let errorCount = 0;

    const total = records.length;

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2;
      if (errorRows.has(rowNum)) {
        errorCount++;
        if (onProgress) onProgress(Math.round(((i + 1) / total) * 100));
        continue;
      }

      const record = records[i];
      record['importBatchId'] = batchId;
      record['source'] = 'import';

      const recordId = record['id'] as string | undefined;
      const existing = recordId ? existingById.get(recordId) : undefined;

      if (existing) {
        switch (mergeStrategy) {
          case 'skip':
            // Skip existing records
            break;
          case 'overwrite':
            toUpdate.push({ id: recordId!, changes: record });
            break;
          case 'append':
            // Append: give it a new ID to avoid collision
            record['id'] = generateId();
            toInsert.push(record);
            break;
          case 'sum': {
            // Sum numeric fields
            const merged: Record<string, unknown> = { ...existing };
            for (const [key, val] of Object.entries(record)) {
              if (typeof val === 'number' && typeof existing[key] === 'number') {
                merged[key] = (existing[key] as number) + val;
              } else if (val !== undefined && val !== null) {
                merged[key] = val;
              }
            }
            toUpdate.push({ id: recordId!, changes: merged });
            break;
          }
          case 'manual':
            // Manual: skip and let UI resolve
            break;
        }
      } else {
        if (!record['id']) {
          record['id'] = generateId();
        }
        record['createdAt'] = timestamp;
        record['updatedAt'] = timestamp;
        record['version'] = 1;
        toInsert.push(record);
      }

      if (onProgress) onProgress(Math.round(((i + 1) / total) * 100));
    }

    // Batch insert
    if (toInsert.length > 0) {
      await this.store.bulkInsert(this.dataType, toInsert);
    }

    // Batch update
    for (const { id, changes } of toUpdate) {
      await this.store.update(this.dataType, id, changes);
    }

    // Create the import batch audit record
    const batch: ImportBatch = {
      id: batchId,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
      fileName: this.file?.name ?? 'unknown',
      dataType: this.dataType,
      recordCount: toInsert.length + toUpdate.length,
      errorCount,
      status: errorCount > 0 && toInsert.length + toUpdate.length === 0 ? 'failed' : 'complete',
      mappings: this.mappings,
      errors: validationErrors.length > 0 ? validationErrors : undefined,
    };

    // Store the batch record
    try {
      await this.store.insert('importBatches', batch as unknown as Record<string, unknown>);
    } catch {
      // importBatches collection may not exist yet; best-effort
    }

    this.events.emit('import.complete', {
      batchId,
      dataType: this.dataType,
      inserted: toInsert.length,
      updated: toUpdate.length,
      errors: errorCount,
    });

    this.currentStep = 'results';
    return batch;
  }

  // -----------------------------------------------------------------------
  // Step 9: Undo an import batch
  // -----------------------------------------------------------------------

  async undoBatch(batchId: string): Promise<void> {
    // Find all records that were imported in this batch
    let records: Record<string, unknown>[];
    try {
      records = await this.store.query(this.dataType, {
        filters: [{ field: 'importBatchId', operator: '=', value: batchId }],
      });
    } catch {
      records = [];
    }

    if (records.length === 0) {
      throw new Error(`No records found for import batch "${batchId}"`);
    }

    // Remove all records from this batch
    const ids = records.map((r) => r['id'] as string).filter(Boolean);
    if (ids.length > 0) {
      await this.store.bulkRemove(this.dataType, ids);
    }

    // Mark the batch as undone
    try {
      await this.store.update('importBatches', batchId, {
        status: 'undone',
        updatedAt: now(),
      });
    } catch {
      // Best-effort if importBatches collection doesn't exist
    }

    this.events.emit('import.undone', {
      batchId,
      dataType: this.dataType,
      recordsRemoved: ids.length,
    });
  }

  // -----------------------------------------------------------------------
  // Accessors
  // -----------------------------------------------------------------------

  getStep(): ImportStep {
    return this.currentStep;
  }

  getErrors(): ImportError[] {
    return this.validationErrors;
  }

  getPreview(): ImportPreview | null {
    return this.preview;
  }

  reset(): void {
    this.currentStep = 'upload';
    this.file = null;
    this.rawData = [];
    this.headers = [];
    this.dataType = '';
    this.mappings = [];
    this.preview = null;
    this.validationErrors = [];
  }

  // -----------------------------------------------------------------------
  // Private: Parsing helpers
  // -----------------------------------------------------------------------

  private detectDelimiter(text: string): string {
    const firstLine = text.split('\n')[0] ?? '';
    const tabCount = (firstLine.match(/\t/g) ?? []).length;
    const commaCount = (firstLine.match(/,/g) ?? []).length;
    const semiCount = (firstLine.match(/;/g) ?? []).length;
    const pipeCount = (firstLine.match(/\|/g) ?? []).length;

    const counts: Array<[string, number]> = [
      ['\t', tabCount],
      [',', commaCount],
      [';', semiCount],
      ['|', pipeCount],
    ];

    counts.sort((a, b) => b[1] - a[1]);
    return counts[0][1] > 0 ? counts[0][0] : ',';
  }

  private parseDelimited(text: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    const lines = this.splitLines(text);

    for (const line of lines) {
      if (line.trim() === '') continue;

      const row: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (inQuotes) {
          if (char === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') {
              current += '"';
              i++; // Skip escaped quote
            } else {
              inQuotes = false;
            }
          } else {
            current += char;
          }
        } else {
          if (char === '"') {
            inQuotes = true;
          } else if (char === delimiter) {
            row.push(current);
            current = '';
          } else {
            current += char;
          }
        }
      }
      row.push(current);
      rows.push(row);
    }

    return rows;
  }

  private parseJSON(text: string): string[][] {
    const data = JSON.parse(text) as unknown;

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Assume array of objects
    const records = data as Record<string, unknown>[];
    const headers = Object.keys(records[0]);
    const rows: string[][] = [headers];

    for (const record of records) {
      const row: string[] = [];
      for (const header of headers) {
        const val = record[header];
        row.push(val === null || val === undefined ? '' : String(val));
      }
      rows.push(row);
    }

    return rows;
  }

  private splitLines(text: string): string[] {
    return text.split(/\r?\n/);
  }

  // -----------------------------------------------------------------------
  // Private: Header normalization for auto-mapping
  // -----------------------------------------------------------------------

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .replace(/[\s\-]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // -----------------------------------------------------------------------
  // Private: Value transforms
  // -----------------------------------------------------------------------

  private applyTransform(value: string, transform: string): unknown {
    switch (transform) {
      case 'number':
        return this.parseAmount(value);
      case 'date':
        return this.parseDate(value);
      case 'boolean':
        return this.parseBoolean(value);
      case 'uppercase':
        return value.toUpperCase();
      case 'lowercase':
        return value.toLowerCase();
      case 'trim':
        return value.trim();
      default:
        return value;
    }
  }

  private parseDate(value: string): ISODateString | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // ISO 8601 (YYYY-MM-DD or full ISO)
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    // US: MM/DD/YYYY or MM-DD-YYYY
    const usMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(trimmed);
    if (usMatch) {
      const month = parseInt(usMatch[1], 10);
      const day = parseInt(usMatch[2], 10);
      const year = parseInt(usMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }

    // EU: DD.MM.YYYY
    const euMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed);
    if (euMatch) {
      const day = parseInt(euMatch[1], 10);
      const month = parseInt(euMatch[2], 10);
      const year = parseInt(euMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }

    // Fallback: try native parsing
    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) return fallback.toISOString();

    return null;
  }

  private parseAmount(value: string): number {
    let trimmed = value.trim();

    // Handle parenthetical negatives: (1,234.56) -> -1234.56
    const parenMatch = /^\(([^)]+)\)$/.exec(trimmed);
    if (parenMatch) {
      trimmed = '-' + parenMatch[1];
    }

    // Strip currency symbols and whitespace
    trimmed = trimmed.replace(/[$\u20AC\u00A3\u00A5\s]/g, '');

    // Handle European format where comma is decimal: 1.234,56 -> 1234.56
    if (/\d+\.\d{3},\d{1,2}$/.test(trimmed)) {
      trimmed = trimmed.replace(/\./g, '').replace(',', '.');
    } else {
      // Standard: strip commas as thousand separators
      trimmed = trimmed.replace(/,/g, '');
    }

    const num = parseFloat(trimmed);
    return isNaN(num) ? 0 : num;
  }

  private parseBoolean(value: string): boolean {
    const lower = value.trim().toLowerCase();
    return ['true', 'yes', '1', 'y', 'on', 'x'].includes(lower);
  }

  private looksLikeDate(value: string): boolean {
    const trimmed = value.trim();
    // ISO date
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return true;
    // US date
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(trimmed)) return true;
    // EU date
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)) return true;
    return false;
  }

  private looksLikeNumber(value: string): boolean {
    const trimmed = value.trim();
    // Matches: $1,234.56, (1234.56), -1234, 1.234,56 (EU), etc.
    return /^[\($\-\u20AC\u00A3\u00A5]?[\d,.\s]+\)?$/.test(trimmed) && /\d/.test(trimmed);
  }

  // -----------------------------------------------------------------------
  // Private: Bulk transform
  // -----------------------------------------------------------------------

  private transformAll(): Record<string, unknown>[] {
    const records: Record<string, unknown>[] = [];

    for (const rawRow of this.rawData) {
      // Build a row record mapping header to value
      const row: Record<string, string> = {};
      for (let j = 0; j < this.headers.length; j++) {
        row[this.headers[j]] = rawRow[j] ?? '';
      }

      const transformed = this.transformRow(row, this.mappings);
      records.push(transformed);
    }

    return records;
  }
}
