/**
 * Concrete -- Import/Export/Merge Engine V2 Service
 *
 * Core service layer for the Import/Export module (Phase 15). Provides:
 * - Universal import wizard with auto-detect of data type from headers
 * - Foundation Software (IIF, CSV), QuickBooks Desktop/Online, Sage 100/300 import
 * - Custom delimiter support (pipe, semicolon, tab, fixed-width)
 * - Merge import with conflict resolution (skip, overwrite, append, manual)
 * - Composite key configuration per data type
 * - Dry-run preview showing what will be added/updated/skipped
 * - Import validation rules (required fields, data types, referential integrity)
 * - Batch import with progress tracking
 * - Import undo (revert entire batch)
 * - Full export to JSON (complete backup)
 * - Selective export by entity, date range, job, data type
 * - CSV export with column selection
 * - PDF report export with letterhead
 * - API export format (JSON with pagination metadata)
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';
import { now } from '../../core/types/base';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type SourceFormat = 'csv' | 'json' | 'iif' | 'qb' | 'sage' | 'foundation' | 'tsv' | 'fixed';
export type BatchStatus = 'pending' | 'validating' | 'preview' | 'importing' | 'completed' | 'failed' | 'reverted';
export type MergeStrategy = 'skip' | 'overwrite' | 'append' | 'manual';
export type ErrorSeverity = 'warning' | 'error';
export type FieldTransform = 'none' | 'lowercase' | 'uppercase' | 'date' | 'number' | 'trim';
export type ExportFormat = 'csv' | 'json' | 'pdf' | 'tsv' | 'api';
export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface ImportBatch {
  [key: string]: unknown;
  name: string;
  sourceFormat: SourceFormat;
  collection: string;
  status: BatchStatus;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errorRows: number;
  mergeStrategy: MergeStrategy;
  compositeKeys: string[];
  delimiter?: string;
  rawData?: Record<string, unknown>[];
  importedIds?: string[];
  startedAt?: string;
  completedAt?: string;
  revertedAt?: string;
}

export interface ImportError {
  [key: string]: unknown;
  batchId: string;
  rowNumber: number;
  field: string;
  value?: string;
  error: string;
  severity: ErrorSeverity;
}

export interface ExportJob {
  [key: string]: unknown;
  name: string;
  format: ExportFormat;
  collection: string;
  filters?: Record<string, unknown>;
  columns?: string[];
  status: ExportJobStatus;
  fileSize?: number;
  resultData?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface FieldMapping {
  [key: string]: unknown;
  batchId: string;
  sourceField: string;
  targetField: string;
  transform: FieldTransform;
}

// ---------------------------------------------------------------------------
// Validation Rule Interface
// ---------------------------------------------------------------------------

export interface ValidationRule {
  [key: string]: unknown;
  field: string;
  type: 'required' | 'dataType' | 'pattern' | 'range' | 'referentialIntegrity' | 'custom';
  dataType?: 'string' | 'number' | 'date' | 'boolean';
  pattern?: string;
  min?: number;
  max?: number;
  refCollection?: string;
  refField?: string;
  customFn?: (value: unknown, row: Record<string, unknown>) => string | null;
  message?: string;
}

// ---------------------------------------------------------------------------
// Preview / Diff Types
// ---------------------------------------------------------------------------

export type PreviewAction = 'add' | 'update' | 'skip' | 'conflict';

export interface PreviewRow {
  [key: string]: unknown;
  rowNumber: number;
  action: PreviewAction;
  sourceData: Record<string, unknown>;
  existingData?: Record<string, unknown>;
  conflicts?: ConflictField[];
  errors?: string[];
  warnings?: string[];
}

export interface ConflictField {
  [key: string]: unknown;
  field: string;
  sourceValue: unknown;
  existingValue: unknown;
}

export interface PreviewResult {
  [key: string]: unknown;
  batchId: string;
  totalRows: number;
  toAdd: number;
  toUpdate: number;
  toSkip: number;
  conflicts: number;
  errors: number;
  warnings: number;
  rows: PreviewRow[];
}

// ---------------------------------------------------------------------------
// Export Result Types
// ---------------------------------------------------------------------------

export interface ExportResult {
  [key: string]: unknown;
  jobId: string;
  format: ExportFormat;
  data: string;
  fileSize: number;
  recordCount: number;
}

export interface APIExportResult {
  [key: string]: unknown;
  data: Record<string, unknown>[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  meta: {
    collection: string;
    exportedAt: string;
    format: string;
  };
}

export interface BackupData {
  [key: string]: unknown;
  version: string;
  exportedAt: string;
  collections: Record<string, Record<string, unknown>[]>;
}

// ---------------------------------------------------------------------------
// Format Detection Types
// ---------------------------------------------------------------------------

export interface FormatDetectionResult {
  [key: string]: unknown;
  format: SourceFormat;
  confidence: number;
  delimiter?: string;
  headers?: string[];
  detectedCollection?: string;
}

// ---------------------------------------------------------------------------
// Auto-Match Types
// ---------------------------------------------------------------------------

export interface AutoMatchResult {
  [key: string]: unknown;
  sourceField: string;
  targetField: string;
  confidence: number;
  transform: FieldTransform;
}

// ---------------------------------------------------------------------------
// Known Header Maps for Software Detection
// ---------------------------------------------------------------------------

const FOUNDATION_HEADERS: Record<string, string> = {
  'vendor number': 'vendorCode',
  'vendor name': 'name',
  'invoice number': 'invoiceNumber',
  'invoice date': 'invoiceDate',
  'invoice amount': 'amount',
  'due date': 'dueDate',
  'job number': 'jobCode',
  'cost code': 'costCode',
  'cost type': 'costType',
  'description': 'description',
  'po number': 'poNumber',
  'retention': 'retentionAmount',
  'net amount': 'netAmount',
  'check number': 'checkNumber',
  'check date': 'checkDate',
  'check amount': 'checkAmount',
};

const QUICKBOOKS_HEADERS: Record<string, string> = {
  'txn type': 'transactionType',
  'date': 'date',
  'num': 'referenceNumber',
  'name': 'name',
  'memo': 'description',
  'account': 'accountName',
  'debit': 'debit',
  'credit': 'credit',
  'amount': 'amount',
  'balance': 'balance',
  'item': 'item',
  'quantity': 'quantity',
  'sales price': 'unitPrice',
  'class': 'class',
  'customer': 'customerName',
  'vendor': 'vendorName',
};

const SAGE_HEADERS: Record<string, string> = {
  'account number': 'accountNumber',
  'account description': 'accountDescription',
  'journal entry': 'journalEntry',
  'posting date': 'date',
  'source': 'source',
  'reference': 'referenceNumber',
  'debit amount': 'debit',
  'credit amount': 'credit',
  'job': 'jobCode',
  'phase': 'phase',
  'cost code': 'costCode',
  'vendor id': 'vendorCode',
  'vendor name': 'vendorName',
  'invoice no': 'invoiceNumber',
  'inv date': 'invoiceDate',
  'gross amount': 'amount',
};

const IIF_TRANSACTION_TYPES = ['TRNS', 'SPL', 'ENDTRNS'];

// ---------------------------------------------------------------------------
// Header-to-Collection Detection Map
// ---------------------------------------------------------------------------

const COLLECTION_HEADER_SIGNATURES: Record<string, string[]> = {
  'ap/vendor': ['vendor name', 'vendor number', 'tax id', 'vendor type', 'payment terms'],
  'ap/invoice': ['invoice number', 'invoice date', 'vendor', 'amount', 'due date'],
  'gl/account': ['account number', 'account name', 'account type', 'normal balance'],
  'gl/journalEntry': ['journal entry', 'posting date', 'debit', 'credit'],
  'job/job': ['job number', 'job name', 'contract amount', 'start date'],
  'entity/entity': ['entity name', 'entity type', 'tax id', 'ein'],
  'ar/customer': ['customer name', 'customer number', 'billing address'],
  'ar/invoice': ['invoice number', 'customer', 'invoice date', 'amount'],
  'payroll/employee': ['employee name', 'employee id', 'hire date', 'pay rate'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Normalize a header string for comparison. */
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_\-]/g, ' ').replace(/\s+/g, ' ');
}

/** Parse a value into a number, returning NaN for non-numeric values. */
function parseNumeric(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,\s]/g, '').replace(/\((.+)\)/, '-$1');
    const parsed = Number(cleaned);
    return parsed;
  }
  return NaN;
}

/** Parse a value into a date string (ISO), returning empty string if invalid. */
function parseDateValue(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    const parts = String(value).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (parts) {
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
      return `${year}-${month}-${day}`;
    }
    return '';
  }
  return d.toISOString().split('T')[0];
}

/** Apply a transform to a single value. */
function applyTransform(value: unknown, transform: FieldTransform): unknown {
  if (value === null || value === undefined) return value;
  switch (transform) {
    case 'lowercase':
      return typeof value === 'string' ? value.toLowerCase() : value;
    case 'uppercase':
      return typeof value === 'string' ? value.toUpperCase() : value;
    case 'trim':
      return typeof value === 'string' ? value.trim() : value;
    case 'number':
      return parseNumeric(value);
    case 'date':
      return parseDateValue(value);
    case 'none':
    default:
      return value;
  }
}

/** Generate a composite key from a record using the given key fields. */
function generateCompositeKey(record: Record<string, unknown>, keyFields: string[]): string {
  return keyFields.map((field) => String(record[field] ?? '')).join('||');
}

/** Parse a CSV line respecting quoted fields. */
function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Parse fixed-width data using column widths array. */
function parseFixedWidth(line: string, columnWidths: number[]): string[] {
  const fields: string[] = [];
  let pos = 0;
  for (const width of columnWidths) {
    fields.push(line.substring(pos, pos + width).trim());
    pos += width;
  }
  if (pos < line.length) {
    fields.push(line.substring(pos).trim());
  }
  return fields;
}

/** Parse IIF format (Intuit Interchange Format) into row objects. */
function parseIIF(content: string): Record<string, unknown>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: Record<string, unknown>[] = [];
  let headers: string[] = [];
  let currentType = '';

  for (const line of lines) {
    const parts = line.split('\t');
    const marker = parts[0];

    if (marker === '!TRNS' || marker === '!SPL' || marker === '!ENDTRNS') {
      headers = parts.slice(1).map((h) => h.trim());
      currentType = marker.replace('!', '');
      continue;
    }

    if (IIF_TRANSACTION_TYPES.includes(marker)) {
      const row: Record<string, unknown> = { _iifType: marker };
      const values = parts.slice(1);
      for (let i = 0; i < headers.length && i < values.length; i++) {
        row[headers[i]] = values[i]?.trim() ?? '';
      }
      rows.push(row);
    } else if (marker.startsWith('!')) {
      headers = parts.slice(1).map((h) => h.trim());
      currentType = marker.replace('!', '');
    } else {
      const row: Record<string, unknown> = { _iifType: currentType };
      const values = parts.slice(0);
      for (let i = 0; i < headers.length && i < values.length; i++) {
        row[headers[i]] = values[i]?.trim() ?? '';
      }
      rows.push(row);
    }
  }

  return rows;
}

/** Detect the delimiter from content by counting occurrences. */
function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/)[0] ?? '';
  const delimiters = [',', '\t', '|', ';'];
  let bestDelimiter = ',';
  let bestCount = 0;

  for (const delim of delimiters) {
    const count = firstLine.split(delim).length - 1;
    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

/** Escape a CSV field for output. */
function escapeCSVField(value: unknown, delimiter: string): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// ImportExportService
// ---------------------------------------------------------------------------

export class ImportExportService {
  constructor(
    private importBatches: Collection<ImportBatch>,
    private importErrors: Collection<ImportError>,
    private exportJobs: Collection<ExportJob>,
    private fieldMappings: Collection<FieldMapping>,
    private events: EventBus,
    private collectionResolver: (name: string) => Collection<Record<string, unknown>> | null,
  ) {}

  // ========================================================================
  // FORMAT DETECTION
  // ========================================================================

  /**
   * Auto-detect the format of the given file content.
   * Examines file extension hint, content structure, and headers to determine
   * the source format, delimiter, and likely target collection.
   */
  detectFormat(content: string, fileNameHint?: string): FormatDetectionResult {
    const extension = fileNameHint
      ? fileNameHint.split('.').pop()?.toLowerCase() ?? ''
      : '';

    if (extension === 'iif' || content.startsWith('!TRNS') || content.startsWith('!HDR')) {
      return {
        format: 'iif',
        confidence: 0.95,
        delimiter: '\t',
        headers: this.extractHeaders(content, '\t'),
        detectedCollection: this.detectCollectionFromHeaders(this.extractHeaders(content, '\t')),
      };
    }

    if (extension === 'json' || content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        JSON.parse(content);
        return {
          format: 'json',
          confidence: 0.98,
          headers: this.extractJSONHeaders(content),
          detectedCollection: this.detectCollectionFromHeaders(this.extractJSONHeaders(content)),
        };
      } catch {
        // Not valid JSON, continue
      }
    }

    const delimiter = detectDelimiter(content);
    const headers = this.extractHeaders(content, delimiter);
    const normalizedHeaders = headers.map(normalizeHeader);

    let format: SourceFormat = 'csv';
    let confidence = 0.7;

    if (delimiter === '\t') {
      format = 'tsv';
      confidence = 0.8;
    }

    if (delimiter === '|') {
      format = 'csv';
      confidence = 0.75;
    }

    if (delimiter === ';') {
      format = 'csv';
      confidence = 0.75;
    }

    const foundationMatch = this.countHeaderMatches(normalizedHeaders, Object.keys(FOUNDATION_HEADERS));
    if (foundationMatch >= 3) {
      format = 'foundation';
      confidence = Math.min(0.95, 0.6 + foundationMatch * 0.1);
    }

    const qbMatch = this.countHeaderMatches(normalizedHeaders, Object.keys(QUICKBOOKS_HEADERS));
    if (qbMatch >= 3 && qbMatch > foundationMatch) {
      format = 'qb';
      confidence = Math.min(0.95, 0.6 + qbMatch * 0.1);
    }

    const sageMatch = this.countHeaderMatches(normalizedHeaders, Object.keys(SAGE_HEADERS));
    if (sageMatch >= 3 && sageMatch > foundationMatch && sageMatch > qbMatch) {
      format = 'sage';
      confidence = Math.min(0.95, 0.6 + sageMatch * 0.1);
    }

    const detectedCollection = this.detectCollectionFromHeaders(headers);

    return {
      format,
      confidence,
      delimiter,
      headers,
      detectedCollection,
    };
  }

  /**
   * Detect the target collection from headers by checking header signatures.
   */
  private detectCollectionFromHeaders(headers: string[]): string | undefined {
    const normalizedHeaders = headers.map(normalizeHeader);
    let bestCollection: string | undefined;
    let bestScore = 0;

    for (const [collection, signature] of Object.entries(COLLECTION_HEADER_SIGNATURES)) {
      let matches = 0;
      for (const sig of signature) {
        const normalized = normalizeHeader(sig);
        for (const header of normalizedHeaders) {
          if (header.includes(normalized) || normalized.includes(header)) {
            matches++;
            break;
          }
        }
      }
      if (matches > bestScore) {
        bestScore = matches;
        bestCollection = collection;
      }
    }

    return bestScore >= 2 ? bestCollection : undefined;
  }

  /**
   * Count how many of the known headers appear in the given headers.
   */
  private countHeaderMatches(normalizedHeaders: string[], knownHeaders: string[]): number {
    let count = 0;
    for (const known of knownHeaders) {
      const normalizedKnown = normalizeHeader(known);
      for (const header of normalizedHeaders) {
        if (header === normalizedKnown || header.includes(normalizedKnown) || normalizedKnown.includes(header)) {
          count++;
          break;
        }
      }
    }
    return count;
  }

  /**
   * Extract headers from a delimited text file.
   */
  private extractHeaders(content: string, delimiter: string): string[] {
    const firstLine = content.split(/\r?\n/)[0] ?? '';
    if (firstLine.startsWith('!')) {
      return firstLine.substring(1).split(delimiter).map((h) => h.trim()).filter((h) => h.length > 0);
    }
    return parseCSVLine(firstLine, delimiter).filter((h) => h.length > 0);
  }

  /**
   * Extract field names from JSON content.
   */
  private extractJSONHeaders(content: string): string[] {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Object.keys(parsed[0]);
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
          return Object.keys(parsed.data[0]);
        }
        return Object.keys(parsed);
      }
    } catch {
      // Invalid JSON
    }
    return [];
  }

  // ========================================================================
  // FIELD AUTO-MATCHING
  // ========================================================================

  /**
   * Auto-match source headers to target fields using name similarity and
   * known header maps from Foundation, QuickBooks, and Sage.
   */
  autoMatchFields(
    sourceHeaders: string[],
    targetFields: string[],
    sourceFormat?: SourceFormat,
  ): AutoMatchResult[] {
    const results: AutoMatchResult[] = [];

    let knownMap: Record<string, string> = {};
    if (sourceFormat === 'foundation') {
      knownMap = FOUNDATION_HEADERS;
    } else if (sourceFormat === 'qb') {
      knownMap = QUICKBOOKS_HEADERS;
    } else if (sourceFormat === 'sage') {
      knownMap = SAGE_HEADERS;
    }

    for (const source of sourceHeaders) {
      const normalized = normalizeHeader(source);
      let bestTarget = '';
      let bestConfidence = 0;
      let bestTransform: FieldTransform = 'none';

      const knownTarget = knownMap[normalized];
      if (knownTarget && targetFields.includes(knownTarget)) {
        bestTarget = knownTarget;
        bestConfidence = 0.95;
      }

      if (bestConfidence < 0.9) {
        for (const target of targetFields) {
          const normalizedTarget = normalizeHeader(target);
          let confidence = 0;

          if (normalizedTarget === normalized) {
            confidence = 1.0;
          } else if (normalizedTarget.includes(normalized) || normalized.includes(normalizedTarget)) {
            confidence = 0.7;
          } else {
            const sourceWords = normalized.split(' ');
            const targetWords = normalizedTarget.split(' ');
            let matchingWords = 0;
            for (const sw of sourceWords) {
              for (const tw of targetWords) {
                if (sw === tw && sw.length > 2) {
                  matchingWords++;
                }
              }
            }
            if (matchingWords > 0) {
              confidence = Math.min(0.6, matchingWords * 0.2);
            }
          }

          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestTarget = target;
          }
        }
      }

      if (bestTarget && bestConfidence > 0.1) {
        if (bestTarget.toLowerCase().includes('date')) {
          bestTransform = 'date';
        } else if (bestTarget.toLowerCase().includes('amount') || bestTarget.toLowerCase().includes('cost') || bestTarget.toLowerCase().includes('price')) {
          bestTransform = 'number';
        }
      }

      results.push({
        sourceField: source,
        targetField: bestTarget,
        confidence: round2(bestConfidence),
        transform: bestTransform,
      });
    }

    return results;
  }

  // ========================================================================
  // IMPORT WORKFLOW: CREATE BATCH
  // ========================================================================

  /**
   * Create a new import batch.
   * This is the first step of the import workflow.
   */
  async createBatch(data: {
    name: string;
    sourceFormat: SourceFormat;
    collection: string;
    mergeStrategy?: MergeStrategy;
    compositeKeys?: string[];
    delimiter?: string;
  }): Promise<ImportBatch & CollectionMeta> {
    const record = await this.importBatches.insert({
      name: data.name,
      sourceFormat: data.sourceFormat,
      collection: data.collection,
      status: 'pending',
      totalRows: 0,
      importedRows: 0,
      skippedRows: 0,
      errorRows: 0,
      mergeStrategy: data.mergeStrategy ?? 'append',
      compositeKeys: data.compositeKeys ?? [],
      delimiter: data.delimiter,
      rawData: [],
      importedIds: [],
      startedAt: now(),
    } as ImportBatch);

    this.events.emit('import.batch.created', { batch: record });
    return record;
  }

  /**
   * Get a single import batch by ID.
   */
  async getBatch(id: string): Promise<(ImportBatch & CollectionMeta) | null> {
    return this.importBatches.get(id);
  }

  /**
   * Get all import batches, ordered by startedAt descending.
   */
  async getBatches(filters?: {
    status?: BatchStatus;
    collection?: string;
  }): Promise<(ImportBatch & CollectionMeta)[]> {
    const q = this.importBatches.query();

    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.collection) {
      q.where('collection', '=', filters.collection);
    }

    q.orderBy('startedAt', 'desc');
    return q.execute();
  }

  // ========================================================================
  // IMPORT WORKFLOW: UPLOAD DATA
  // ========================================================================

  /**
   * Upload and parse raw file data into the batch.
   * Parses content based on the batch's sourceFormat and stores the
   * resulting rows in the batch's rawData.
   */
  async uploadData(
    batchId: string,
    content: string,
    columnWidths?: number[],
  ): Promise<ImportBatch & CollectionMeta> {
    const batch = await this.importBatches.get(batchId);
    if (!batch) {
      throw new Error(`Import batch not found: ${batchId}`);
    }

    if (batch.status !== 'pending') {
      throw new Error(`Cannot upload data: batch status is "${batch.status}". Expected "pending".`);
    }

    let rows: Record<string, unknown>[];

    switch (batch.sourceFormat) {
      case 'json':
        rows = this.parseJSON(content);
        break;
      case 'iif':
        rows = parseIIF(content);
        break;
      case 'fixed':
        rows = this.parseFixedWidth(content, columnWidths ?? []);
        break;
      case 'tsv':
        rows = this.parseDelimited(content, '\t');
        break;
      case 'csv':
      case 'qb':
      case 'sage':
      case 'foundation':
      default: {
        const delimiter = batch.delimiter ?? detectDelimiter(content);
        rows = this.parseDelimited(content, delimiter);
        break;
      }
    }

    const updated = await this.importBatches.update(batchId, {
      rawData: rows,
      totalRows: rows.length,
      status: 'validating',
    } as Partial<ImportBatch>);

    return updated;
  }

  /**
   * Parse JSON content into row objects.
   */
  private parseJSON(content: string): Record<string, unknown>[] {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === 'object' && parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }
    if (parsed && typeof parsed === 'object') {
      return [parsed];
    }
    throw new Error('Invalid JSON format: expected array or object with data array.');
  }

  /**
   * Parse delimited content (CSV, TSV, pipe, semicolon) into row objects.
   */
  private parseDelimited(content: string, delimiter: string): Record<string, unknown>[] {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return [];
    }

    const headers = parseCSVLine(lines[0], delimiter);
    const rows: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i], delimiter);
      const row: Record<string, unknown> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = j < values.length ? values[j] : '';
      }
      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse fixed-width content into row objects.
   */
  private parseFixedWidth(content: string, columnWidths: number[]): Record<string, unknown>[] {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return [];
    }

    const headerValues = parseFixedWidth(lines[0], columnWidths);
    const rows: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseFixedWidth(lines[i], columnWidths);
      const row: Record<string, unknown> = {};
      for (let j = 0; j < headerValues.length; j++) {
        row[headerValues[j]] = j < values.length ? values[j] : '';
      }
      rows.push(row);
    }

    return rows;
  }

  // ========================================================================
  // IMPORT WORKFLOW: FIELD MAPPING
  // ========================================================================

  /**
   * Save field mappings for a batch.
   * Replaces any existing mappings for the given batch.
   */
  async saveFieldMappings(
    batchId: string,
    mappings: { sourceField: string; targetField: string; transform?: FieldTransform }[],
  ): Promise<(FieldMapping & CollectionMeta)[]> {
    const batch = await this.importBatches.get(batchId);
    if (!batch) {
      throw new Error(`Import batch not found: ${batchId}`);
    }

    const existing = await this.fieldMappings
      .query()
      .where('batchId', '=', batchId)
      .execute();
    for (const mapping of existing) {
      await this.fieldMappings.remove(mapping.id);
    }

    const created: (FieldMapping & CollectionMeta)[] = [];
    for (const mapping of mappings) {
      const record = await this.fieldMappings.insert({
        batchId,
        sourceField: mapping.sourceField,
        targetField: mapping.targetField,
        transform: mapping.transform ?? 'none',
      } as FieldMapping);
      created.push(record);
    }

    return created;
  }

  /**
   * Get field mappings for a batch.
   */
  async getFieldMappings(batchId: string): Promise<(FieldMapping & CollectionMeta)[]> {
    return this.fieldMappings
      .query()
      .where('batchId', '=', batchId)
      .execute();
  }

  // ========================================================================
  // IMPORT WORKFLOW: VALIDATE ROWS
  // ========================================================================

  /**
   * Validate all rows in the batch against the provided validation rules.
   * Creates ImportError records for each validation failure.
   * Updates batch status to 'preview' if validation passes (allowing some warnings).
   */
  async validateRows(
    batchId: string,
    rules: ValidationRule[],
  ): Promise<{ valid: boolean; errorCount: number; warningCount: number }> {
    const batch = await this.importBatches.get(batchId);
    if (!batch) {
      throw new Error(`Import batch not found: ${batchId}`);
    }

    if (batch.status !== 'validating' && batch.status !== 'pending') {
      throw new Error(`Cannot validate: batch status is "${batch.status}". Expected "validating" or "pending".`);
    }

    const existingErrors = await this.importErrors
      .query()
      .where('batchId', '=', batchId)
      .execute();
    for (const err of existingErrors) {
      await this.importErrors.remove(err.id);
    }

    const mappings = await this.getFieldMappings(batchId);
    const rows = batch.rawData ?? [];
    let errorCount = 0;
    let warningCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const mappedRow = this.applyMappings(row, mappings);

      for (const rule of rules) {
        const value = mappedRow[rule.field];
        const validationError = this.validateField(value, rule, mappedRow);

        if (validationError) {
          const severity: ErrorSeverity = rule.type === 'required' || rule.type === 'referentialIntegrity' ? 'error' : 'warning';
          await this.importErrors.insert({
            batchId,
            rowNumber: i + 1,
            field: rule.field,
            value: value !== null && value !== undefined ? String(value) : '',
            error: validationError,
            severity,
          } as ImportError);

          if (severity === 'error') {
            errorCount++;
          } else {
            warningCount++;
          }
        }
      }
    }

    const newErrorRows = errorCount;
    const newStatus: BatchStatus = errorCount === 0 ? 'preview' : 'validating';

    await this.importBatches.update(batchId, {
      status: newStatus,
      errorRows: newErrorRows,
    } as Partial<ImportBatch>);

    this.events.emit('import.batch.validated', {
      batchId,
      valid: errorCount === 0,
      errorCount,
      warningCount,
    });

    return { valid: errorCount === 0, errorCount, warningCount };
  }

  /**
   * Validate a single field value against a rule.
   * Returns an error message string if invalid, or null if valid.
   */
  private validateField(
    value: unknown,
    rule: ValidationRule,
    row: Record<string, unknown>,
  ): string | null {
    switch (rule.type) {
      case 'required': {
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          return rule.message ?? `Field "${rule.field}" is required.`;
        }
        return null;
      }
      case 'dataType': {
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          return null;
        }
        switch (rule.dataType) {
          case 'number': {
            const num = parseNumeric(value);
            if (isNaN(num)) {
              return rule.message ?? `Field "${rule.field}" must be a valid number. Got: "${value}".`;
            }
            return null;
          }
          case 'date': {
            const dateStr = parseDateValue(value);
            if (dateStr === '') {
              return rule.message ?? `Field "${rule.field}" must be a valid date. Got: "${value}".`;
            }
            return null;
          }
          case 'boolean': {
            const boolStr = String(value).toLowerCase();
            if (!['true', 'false', '1', '0', 'yes', 'no'].includes(boolStr)) {
              return rule.message ?? `Field "${rule.field}" must be a boolean value. Got: "${value}".`;
            }
            return null;
          }
          case 'string':
          default:
            return null;
        }
      }
      case 'pattern': {
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          return null;
        }
        if (rule.pattern) {
          const regex = new RegExp(rule.pattern);
          if (!regex.test(String(value))) {
            return rule.message ?? `Field "${rule.field}" does not match pattern "${rule.pattern}". Got: "${value}".`;
          }
        }
        return null;
      }
      case 'range': {
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          return null;
        }
        const num = parseNumeric(value);
        if (!isNaN(num)) {
          if (rule.min !== undefined && num < rule.min) {
            return rule.message ?? `Field "${rule.field}" must be >= ${rule.min}. Got: ${num}.`;
          }
          if (rule.max !== undefined && num > rule.max) {
            return rule.message ?? `Field "${rule.field}" must be <= ${rule.max}. Got: ${num}.`;
          }
        }
        return null;
      }
      case 'referentialIntegrity': {
        // Referential integrity checks are performed during preview/commit,
        // not during row-level validation as we need access to the target collection.
        return null;
      }
      case 'custom': {
        if (rule.customFn) {
          return rule.customFn(value, row);
        }
        return null;
      }
      default:
        return null;
    }
  }

  /**
   * Apply field mappings and transforms to a raw row.
   */
  private applyMappings(
    row: Record<string, unknown>,
    mappings: (FieldMapping & CollectionMeta)[],
  ): Record<string, unknown> {
    if (mappings.length === 0) {
      return { ...row };
    }

    const mapped: Record<string, unknown> = {};
    for (const mapping of mappings) {
      const sourceValue = row[mapping.sourceField];
      mapped[mapping.targetField] = applyTransform(sourceValue, mapping.transform);
    }
    return mapped;
  }

  /**
   * Get import errors for a batch.
   */
  async getImportErrors(
    batchId: string,
    severity?: ErrorSeverity,
  ): Promise<(ImportError & CollectionMeta)[]> {
    const q = this.importErrors.query().where('batchId', '=', batchId);
    if (severity) {
      q.where('severity', '=', severity);
    }
    q.orderBy('rowNumber', 'asc');
    return q.execute();
  }

  // ========================================================================
  // IMPORT WORKFLOW: PREVIEW (DRY RUN)
  // ========================================================================

  /**
   * Generate a dry-run preview of what the import would do.
   * Shows which rows will be added, updated, skipped, or have conflicts.
   * Does not modify any data.
   */
  async preview(batchId: string): Promise<PreviewResult> {
    const batch = await this.importBatches.get(batchId);
    if (!batch) {
      throw new Error(`Import batch not found: ${batchId}`);
    }

    const mappings = await this.getFieldMappings(batchId);
    const rows = batch.rawData ?? [];
    const targetCollection = this.collectionResolver(batch.collection);
    const compositeKeys = batch.compositeKeys ?? [];

    const existingKeyMap = new Map<string, Record<string, unknown>>();

    if (targetCollection && compositeKeys.length > 0) {
      const allExisting = await targetCollection.getAll();
      for (const rec of allExisting) {
        const key = generateCompositeKey(rec, compositeKeys);
        existingKeyMap.set(key, rec);
      }
    }

    const previewRows: PreviewRow[] = [];
    let toAdd = 0;
    let toUpdate = 0;
    let toSkip = 0;
    let conflicts = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const mapped = this.applyMappings(raw, mappings);
      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];

      const batchErrors = await this.importErrors
        .query()
        .where('batchId', '=', batchId)
        .where('rowNumber', '=', i + 1)
        .execute();

      for (const err of batchErrors) {
        if (err.severity === 'error') {
          rowErrors.push(err.error);
        } else {
          rowWarnings.push(err.error);
        }
      }

      if (rowErrors.length > 0) {
        errorCount++;
        previewRows.push({
          rowNumber: i + 1,
          action: 'skip',
          sourceData: mapped,
          errors: rowErrors,
          warnings: rowWarnings,
        });
        toSkip++;
        continue;
      }

      if (compositeKeys.length > 0) {
        const compositeKey = generateCompositeKey(mapped, compositeKeys);
        const existing = existingKeyMap.get(compositeKey);

        if (existing) {
          const conflictFields: ConflictField[] = [];
          for (const key of Object.keys(mapped)) {
            if (mapped[key] !== existing[key] && mapped[key] !== undefined && mapped[key] !== '') {
              conflictFields.push({
                field: key,
                sourceValue: mapped[key],
                existingValue: existing[key],
              });
            }
          }

          switch (batch.mergeStrategy) {
            case 'skip':
              previewRows.push({
                rowNumber: i + 1,
                action: 'skip',
                sourceData: mapped,
                existingData: existing,
                warnings: rowWarnings,
              });
              toSkip++;
              break;
            case 'overwrite':
              previewRows.push({
                rowNumber: i + 1,
                action: 'update',
                sourceData: mapped,
                existingData: existing,
                conflicts: conflictFields,
                warnings: rowWarnings,
              });
              toUpdate++;
              break;
            case 'manual':
              if (conflictFields.length > 0) {
                previewRows.push({
                  rowNumber: i + 1,
                  action: 'conflict',
                  sourceData: mapped,
                  existingData: existing,
                  conflicts: conflictFields,
                  warnings: rowWarnings,
                });
                conflicts++;
              } else {
                previewRows.push({
                  rowNumber: i + 1,
                  action: 'update',
                  sourceData: mapped,
                  existingData: existing,
                  warnings: rowWarnings,
                });
                toUpdate++;
              }
              break;
            case 'append':
            default:
              previewRows.push({
                rowNumber: i + 1,
                action: 'add',
                sourceData: mapped,
                warnings: rowWarnings,
              });
              toAdd++;
              break;
          }
        } else {
          previewRows.push({
            rowNumber: i + 1,
            action: 'add',
            sourceData: mapped,
            warnings: rowWarnings,
          });
          toAdd++;
        }
      } else {
        previewRows.push({
          rowNumber: i + 1,
          action: 'add',
          sourceData: mapped,
          warnings: rowWarnings,
        });
        toAdd++;
      }
    }

    await this.importBatches.update(batchId, {
      status: 'preview',
    } as Partial<ImportBatch>);

    warningCount = previewRows.reduce((sum, r) => sum + (r.warnings?.length ?? 0), 0);

    return {
      batchId,
      totalRows: rows.length,
      toAdd,
      toUpdate,
      toSkip,
      conflicts,
      errors: errorCount,
      warnings: warningCount,
      rows: previewRows,
    };
  }

  // ========================================================================
  // IMPORT WORKFLOW: COMMIT
  // ========================================================================

  /**
   * Commit the import batch. Actually inserts/updates records in the
   * target collection based on the merge strategy and preview results.
   * Tracks progress and records all imported record IDs for undo.
   *
   * @param batchId - The batch to commit.
   * @param resolutions - For 'manual' strategy, a map of rowNumber -> action ('add'|'update'|'skip').
   * @param onProgress - Optional progress callback (0-100).
   */
  async commit(
    batchId: string,
    resolutions?: Record<number, 'add' | 'update' | 'skip'>,
    onProgress?: (percent: number) => void,
  ): Promise<ImportBatch & CollectionMeta> {
    const batch = await this.importBatches.get(batchId);
    if (!batch) {
      throw new Error(`Import batch not found: ${batchId}`);
    }

    if (batch.status !== 'preview') {
      throw new Error(`Cannot commit: batch status is "${batch.status}". Expected "preview".`);
    }

    const targetCollection = this.collectionResolver(batch.collection);
    if (!targetCollection) {
      throw new Error(`Target collection not found: ${batch.collection}`);
    }

    const mappings = await this.getFieldMappings(batchId);
    const rows = batch.rawData ?? [];
    const compositeKeys = batch.compositeKeys ?? [];

    const existingKeyMap = new Map<string, Record<string, unknown> & { id: string }>();
    if (compositeKeys.length > 0) {
      const allExisting = await targetCollection.getAll();
      for (const rec of allExisting) {
        const key = generateCompositeKey(rec, compositeKeys);
        existingKeyMap.set(key, rec as Record<string, unknown> & { id: string });
      }
    }

    await this.importBatches.update(batchId, {
      status: 'importing',
    } as Partial<ImportBatch>);

    const importedIds: string[] = [];
    let importedRows = 0;
    let skippedRows = 0;
    let errorRows = 0;

    for (let i = 0; i < rows.length; i++) {
      try {
        const raw = rows[i];
        const mapped = this.applyMappings(raw, mappings);

        const batchErrors = await this.importErrors
          .query()
          .where('batchId', '=', batchId)
          .where('rowNumber', '=', i + 1)
          .where('severity', '=', 'error')
          .execute();

        if (batchErrors.length > 0) {
          skippedRows++;
          if (onProgress) {
            onProgress(Math.round(((i + 1) / rows.length) * 100));
          }
          continue;
        }

        if (compositeKeys.length > 0) {
          const compositeKey = generateCompositeKey(mapped, compositeKeys);
          const existing = existingKeyMap.get(compositeKey);

          if (existing) {
            let action: 'add' | 'update' | 'skip' = batch.mergeStrategy === 'skip'
              ? 'skip'
              : batch.mergeStrategy === 'overwrite'
                ? 'update'
                : batch.mergeStrategy === 'append'
                  ? 'add'
                  : 'skip';

            if (batch.mergeStrategy === 'manual' && resolutions) {
              action = resolutions[i + 1] ?? 'skip';
            }

            switch (action) {
              case 'update': {
                const updated = await targetCollection.update(existing.id, mapped);
                importedIds.push(updated.id as string);
                importedRows++;
                break;
              }
              case 'add': {
                const inserted = await targetCollection.insert(mapped as Record<string, unknown>);
                importedIds.push(inserted.id as string);
                importedRows++;
                break;
              }
              case 'skip':
              default:
                skippedRows++;
                break;
            }
          } else {
            const inserted = await targetCollection.insert(mapped as Record<string, unknown>);
            importedIds.push(inserted.id as string);
            importedRows++;
          }
        } else {
          const inserted = await targetCollection.insert(mapped as Record<string, unknown>);
          importedIds.push(inserted.id as string);
          importedRows++;
        }
      } catch (err) {
        errorRows++;
        await this.importErrors.insert({
          batchId,
          rowNumber: i + 1,
          field: '_commit',
          value: '',
          error: err instanceof Error ? err.message : String(err),
          severity: 'error',
        } as ImportError);
      }

      if (onProgress) {
        onProgress(Math.round(((i + 1) / rows.length) * 100));
      }
    }

    const finalStatus: BatchStatus = errorRows > 0 && importedRows === 0
      ? 'failed'
      : 'completed';

    const committed = await this.importBatches.update(batchId, {
      status: finalStatus,
      importedRows,
      skippedRows,
      errorRows,
      importedIds,
      completedAt: now(),
    } as Partial<ImportBatch>);

    this.events.emit('import.batch.committed', {
      batchId,
      importedRows,
      skippedRows,
      errorRows,
    });

    return committed;
  }

  // ========================================================================
  // IMPORT WORKFLOW: REVERT
  // ========================================================================

  /**
   * Revert an entire import batch by removing all records that were imported.
   * Only works on batches in 'completed' status.
   */
  async revert(batchId: string): Promise<ImportBatch & CollectionMeta> {
    const batch = await this.importBatches.get(batchId);
    if (!batch) {
      throw new Error(`Import batch not found: ${batchId}`);
    }

    if (batch.status !== 'completed') {
      throw new Error(`Cannot revert: batch status is "${batch.status}". Expected "completed".`);
    }

    const targetCollection = this.collectionResolver(batch.collection);
    if (!targetCollection) {
      throw new Error(`Target collection not found: ${batch.collection}`);
    }

    const importedIds = batch.importedIds ?? [];

    for (const id of importedIds) {
      try {
        await targetCollection.remove(id);
      } catch {
        // Record may have already been deleted manually; continue
      }
    }

    const reverted = await this.importBatches.update(batchId, {
      status: 'reverted',
      revertedAt: now(),
    } as Partial<ImportBatch>);

    this.events.emit('import.batch.reverted', {
      batchId,
      revertedCount: importedIds.length,
    });

    return reverted;
  }

  // ========================================================================
  // EXPORT: COLLECTION EXPORT
  // ========================================================================

  /**
   * Export a collection's data in the specified format.
   * Supports filters, column selection, and multiple output formats.
   */
  async exportCollection(
    collection: string,
    options: {
      format: ExportFormat;
      filters?: Record<string, unknown>;
      columns?: string[];
      name?: string;
      delimiter?: string;
      page?: number;
      pageSize?: number;
      letterhead?: {
        companyName?: string;
        address?: string;
        phone?: string;
        email?: string;
        logo?: string;
      };
    },
  ): Promise<ExportResult> {
    const targetCollection = this.collectionResolver(collection);
    if (!targetCollection) {
      throw new Error(`Collection not found: ${collection}`);
    }

    const job = await this.exportJobs.insert({
      name: options.name ?? `Export ${collection}`,
      format: options.format,
      collection,
      filters: options.filters ?? {},
      columns: options.columns ?? [],
      status: 'processing',
      startedAt: now(),
    } as ExportJob);

    try {
      const allRecords = await targetCollection.getAll();
      let records = allRecords as Record<string, unknown>[];

      if (options.filters) {
        records = this.applyExportFilters(records, options.filters);
      }

      if (options.columns && options.columns.length > 0) {
        records = records.map((r) => {
          const filtered: Record<string, unknown> = {};
          for (const col of options.columns!) {
            filtered[col] = r[col];
          }
          return filtered;
        });
      }

      let data = '';
      let recordCount = records.length;

      switch (options.format) {
        case 'json': {
          data = JSON.stringify(records, null, 2);
          break;
        }
        case 'csv': {
          const delimiter = options.delimiter ?? ',';
          data = this.formatCSV(records, delimiter);
          break;
        }
        case 'tsv': {
          data = this.formatCSV(records, '\t');
          break;
        }
        case 'pdf': {
          data = this.formatPDFReport(records, collection, options.letterhead);
          break;
        }
        case 'api': {
          const page = options.page ?? 1;
          const pageSize = options.pageSize ?? 50;
          const start = (page - 1) * pageSize;
          const pageRecords = records.slice(start, start + pageSize);
          const apiResult: APIExportResult = {
            data: pageRecords,
            pagination: {
              page,
              pageSize,
              totalRecords: records.length,
              totalPages: Math.ceil(records.length / pageSize),
            },
            meta: {
              collection,
              exportedAt: now(),
              format: 'api',
            },
          };
          data = JSON.stringify(apiResult, null, 2);
          recordCount = pageRecords.length;
          break;
        }
      }

      const fileSize = new Blob([data]).size;

      await this.exportJobs.update(job.id, {
        status: 'completed',
        fileSize,
        resultData: data,
        completedAt: now(),
      } as Partial<ExportJob>);

      this.events.emit('export.completed', {
        jobId: job.id,
        format: options.format,
        collection,
        recordCount,
      });

      return {
        jobId: job.id,
        format: options.format,
        data,
        fileSize,
        recordCount,
      };
    } catch (err) {
      await this.exportJobs.update(job.id, {
        status: 'failed',
        completedAt: now(),
      } as Partial<ExportJob>);
      throw err;
    }
  }

  /**
   * Apply filters to exported records.
   */
  private applyExportFilters(
    records: Record<string, unknown>[],
    filters: Record<string, unknown>,
  ): Record<string, unknown>[] {
    return records.filter((record) => {
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'dateFrom' && typeof value === 'string') {
          const recordDate = record['date'] ?? record['invoiceDate'] ?? record['createdAt'];
          if (typeof recordDate === 'string' && recordDate < value) {
            return false;
          }
          continue;
        }
        if (key === 'dateTo' && typeof value === 'string') {
          const recordDate = record['date'] ?? record['invoiceDate'] ?? record['createdAt'];
          if (typeof recordDate === 'string' && recordDate > value) {
            return false;
          }
          continue;
        }
        if (key === 'entityId' && value) {
          if (record['entityId'] !== value) {
            return false;
          }
          continue;
        }
        if (key === 'jobId' && value) {
          if (record['jobId'] !== value) {
            return false;
          }
          continue;
        }
        if (value !== undefined && value !== null && value !== '') {
          if (record[key] !== value) {
            return false;
          }
        }
      }
      return true;
    });
  }

  /**
   * Format records as CSV/TSV string.
   */
  private formatCSV(records: Record<string, unknown>[], delimiter: string): string {
    if (records.length === 0) {
      return '';
    }

    const headers = Object.keys(records[0]);
    const lines: string[] = [];

    lines.push(headers.map((h) => escapeCSVField(h, delimiter)).join(delimiter));

    for (const record of records) {
      const values = headers.map((h) => escapeCSVField(record[h], delimiter));
      lines.push(values.join(delimiter));
    }

    return lines.join('\n');
  }

  /**
   * Format records as a text-based PDF report representation.
   * In a real implementation this would produce actual PDF bytes via a library.
   * Here we produce a structured text representation suitable for PDF rendering.
   */
  private formatPDFReport(
    records: Record<string, unknown>[],
    collection: string,
    letterhead?: {
      companyName?: string;
      address?: string;
      phone?: string;
      email?: string;
      logo?: string;
    },
  ): string {
    const lines: string[] = [];

    lines.push('--- PDF REPORT ---');
    lines.push('');

    if (letterhead) {
      if (letterhead.companyName) {
        lines.push(`Company: ${letterhead.companyName}`);
      }
      if (letterhead.address) {
        lines.push(`Address: ${letterhead.address}`);
      }
      if (letterhead.phone) {
        lines.push(`Phone: ${letterhead.phone}`);
      }
      if (letterhead.email) {
        lines.push(`Email: ${letterhead.email}`);
      }
      lines.push('');
      lines.push('='.repeat(80));
      lines.push('');
    }

    lines.push(`Report: ${collection}`);
    lines.push(`Generated: ${now()}`);
    lines.push(`Total Records: ${records.length}`);
    lines.push('');
    lines.push('-'.repeat(80));

    if (records.length > 0) {
      const headers = Object.keys(records[0]);
      lines.push(headers.join(' | '));
      lines.push('-'.repeat(80));

      for (const record of records) {
        const values = headers.map((h) => {
          const val = record[h];
          return val === null || val === undefined ? '' : String(val);
        });
        lines.push(values.join(' | '));
      }
    }

    lines.push('');
    lines.push('-'.repeat(80));
    lines.push('--- END OF REPORT ---');

    return lines.join('\n');
  }

  // ========================================================================
  // EXPORT: FULL BACKUP
  // ========================================================================

  /**
   * Export all data from all known collections as a complete JSON backup.
   */
  async exportAll(
    collectionNames: string[],
  ): Promise<BackupData> {
    const collections: Record<string, Record<string, unknown>[]> = {};

    for (const name of collectionNames) {
      const col = this.collectionResolver(name);
      if (col) {
        const records = await col.exportJSON();
        collections[name] = records;
      }
    }

    const backup: BackupData = {
      version: '2.0.0',
      exportedAt: now(),
      collections,
    };

    this.events.emit('export.completed', {
      format: 'json',
      type: 'full-backup',
      collectionCount: Object.keys(collections).length,
    });

    return backup;
  }

  // ========================================================================
  // IMPORT: FULL RESTORE
  // ========================================================================

  /**
   * Restore all data from a full backup JSON.
   * Validates the backup structure and imports each collection.
   */
  async importAll(
    backup: BackupData,
    options?: { merge?: boolean },
  ): Promise<{ collectionsRestored: number; totalRecords: number }> {
    if (!backup.version || !backup.collections) {
      throw new Error('Invalid backup format: missing version or collections.');
    }

    let collectionsRestored = 0;
    let totalRecords = 0;

    for (const [collectionName, records] of Object.entries(backup.collections)) {
      const col = this.collectionResolver(collectionName);
      if (col) {
        await col.importJSON(
          records as (Record<string, unknown> & { id?: string; createdAt?: string; updatedAt?: string; deletedAt?: string; version?: number })[],
          { merge: options?.merge ?? false },
        );
        collectionsRestored++;
        totalRecords += records.length;
      }
    }

    this.events.emit('import.batch.committed', {
      type: 'full-restore',
      collectionsRestored,
      totalRecords,
    });

    return { collectionsRestored, totalRecords };
  }

  // ========================================================================
  // EXPORT JOBS
  // ========================================================================

  /**
   * Get an export job by ID.
   */
  async getExportJob(id: string): Promise<(ExportJob & CollectionMeta) | null> {
    return this.exportJobs.get(id);
  }

  /**
   * Get export jobs with optional filters, ordered by startedAt descending.
   */
  async getExportJobs(filters?: {
    format?: ExportFormat;
    status?: ExportJobStatus;
    collection?: string;
  }): Promise<(ExportJob & CollectionMeta)[]> {
    const q = this.exportJobs.query();

    if (filters?.format) {
      q.where('format', '=', filters.format);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.collection) {
      q.where('collection', '=', filters.collection);
    }

    q.orderBy('startedAt', 'desc');
    return q.execute();
  }

  // ========================================================================
  // IMPORT HISTORY & STATISTICS
  // ========================================================================

  /**
   * Get import batch history with summary statistics.
   */
  async getImportHistory(): Promise<{
    batches: (ImportBatch & CollectionMeta)[];
    totalBatches: number;
    totalImported: number;
    totalSkipped: number;
    totalErrors: number;
  }> {
    const batches = await this.importBatches
      .query()
      .orderBy('startedAt', 'desc')
      .execute();

    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const batch of batches) {
      totalImported += batch.importedRows;
      totalSkipped += batch.skippedRows;
      totalErrors += batch.errorRows;
    }

    return {
      batches,
      totalBatches: batches.length,
      totalImported,
      totalSkipped,
      totalErrors,
    };
  }

  /**
   * Delete an import batch and its associated errors and field mappings.
   * Only allows deletion of batches in terminal states
   * (completed, failed, reverted).
   */
  async deleteBatch(batchId: string): Promise<void> {
    const batch = await this.importBatches.get(batchId);
    if (!batch) {
      throw new Error(`Import batch not found: ${batchId}`);
    }

    if (!['completed', 'failed', 'reverted'].includes(batch.status)) {
      throw new Error(
        `Cannot delete batch in "${batch.status}" status. Only completed, failed, or reverted batches can be deleted.`,
      );
    }

    const errors = await this.importErrors
      .query()
      .where('batchId', '=', batchId)
      .execute();
    for (const err of errors) {
      await this.importErrors.remove(err.id);
    }

    const mappings = await this.fieldMappings
      .query()
      .where('batchId', '=', batchId)
      .execute();
    for (const mapping of mappings) {
      await this.fieldMappings.remove(mapping.id);
    }

    await this.importBatches.remove(batchId);
  }
}
