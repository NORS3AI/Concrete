/**
 * Phase Zed.2 - Import/Export Pipeline Types
 * CSV/JSON/PDF import and export definitions.
 */

import type { BaseEntity, ISODateString } from './base';

/** Steps in the import wizard */
export type ImportStep = 'upload' | 'type' | 'map' | 'preview' | 'execute' | 'results';

/** Mapping from source column to target field */
export interface ColumnMapping {
  sourceColumn: string;
  targetField?: string;
  transform?: string;
}

/** Saved mapping template for re-use */
export interface MappingTemplate {
  id: string;
  name: string;
  dataType: string;
  mappings: ColumnMapping[];
  createdAt: ISODateString;
}

/** An import batch record */
export interface ImportBatch extends BaseEntity {
  fileName: string;
  dataType: string;
  recordCount: number;
  errorCount: number;
  status: 'pending' | 'processing' | 'complete' | 'failed' | 'undone';
  mappings: ColumnMapping[];
  errors?: ImportError[];
}

/** Error encountered during import */
export interface ImportError {
  row: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

/** Preview of what an import will do */
export interface ImportPreview {
  adds: number;
  updates: number;
  skips: number;
  errors: number;
  sample: Record<string, unknown>[];
}

/** Strategy for merging duplicate records */
export type MergeStrategy = 'skip' | 'overwrite' | 'append' | 'sum' | 'manual';

/** Supported export formats */
export type ExportFormat = 'csv' | 'tsv' | 'json' | 'pdf' | 'xlsx';

/** Options for exporting data */
export interface ExportOptions {
  format: ExportFormat;
  collections: string[];
  entityFilter?: string[];
  dateRange?: { start: ISODateString; end: ISODateString };
  fields?: string[];
}
