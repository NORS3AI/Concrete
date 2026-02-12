/**
 * Phase Zed.2 - Report Types
 * Report definitions, columns, filters, and PDF templates.
 */

/** Report layout types */
export type ReportType = 'tabular' | 'summary' | 'matrix' | 'detail';

/** Column definition within a report */
export interface ReportColumn {
  field: string;
  label: string;
  width?: number;
  format?: 'currency' | 'percentage' | 'date' | 'number' | 'text';
  align?: 'left' | 'center' | 'right';
}

/** Filter applied to a report */
export interface ReportFilter {
  field: string;
  operator: string;
  value: unknown;
}

/** Complete report definition */
export interface ReportDef {
  id: string;
  title: string;
  subtitle?: string;
  type: ReportType;
  collection: string;
  columns: ReportColumn[];
  groupBy?: string[];
  sortBy?: string[];
  filters?: ReportFilter[];
  totals?: string[];
  chart?: Record<string, unknown>;
}

/** Result of executing a report */
export interface ReportResult {
  definition: ReportDef;
  data: Record<string, unknown>[];
  totals?: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

/** PDF output template */
export interface PdfTemplate {
  id: string;
  name: string;
  header?: string;
  footer?: string;
  orientation: 'portrait' | 'landscape';
  pageSize: string;
  margins: { top: number; right: number; bottom: number; left: number };
}
