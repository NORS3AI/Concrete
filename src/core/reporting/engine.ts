/**
 * Concrete -- Report Engine
 * Phase Zed.11 Reporting & PDF Engine
 *
 * Generates structured report results from report definitions.
 * Queries data from the store, applies grouping, sorting, and totals,
 * then renders as HTML tables or printable pages.
 */

import type {
  ReportDef,
  ReportResult,
  ReportColumn,
  ReportFilter,
  PdfTemplate,
} from '../types/reporting';
import type { DataAdapter, QueryFilter, QueryOptions } from '../store/adapter';

// ---------------------------------------------------------------------------
// ReportEngine
// ---------------------------------------------------------------------------

export class ReportEngine {
  private store: DataAdapter;

  constructor(store: DataAdapter) {
    this.store = store;
  }

  // -----------------------------------------------------------------------
  // Generate a report from a definition
  // -----------------------------------------------------------------------

  async generate(definition: ReportDef): Promise<ReportResult> {
    // 1. Query data from store based on collection and filters
    const queryOptions: QueryOptions = {};

    if (definition.filters && definition.filters.length > 0) {
      queryOptions.filters = definition.filters.map((f) => this.toQueryFilter(f));
    }

    if (definition.sortBy && definition.sortBy.length > 0) {
      queryOptions.orderBy = definition.sortBy.map((field) => {
        if (field.startsWith('-')) {
          return { field: field.slice(1), direction: 'desc' as const };
        }
        return { field, direction: 'asc' as const };
      });
    }

    let data = await this.store.query(definition.collection, queryOptions);

    // Filter out soft-deleted records
    data = data.filter((r) => r['deletedAt'] == null);

    // 2. Apply groupBy if specified
    if (definition.groupBy && definition.groupBy.length > 0) {
      data = this.sortByGroupKeys(data, definition.groupBy);
    }

    // 3. Apply sorting (already done in query, but re-sort if groupBy altered order)
    if (definition.sortBy && definition.sortBy.length > 0 && (!definition.groupBy || definition.groupBy.length === 0)) {
      data = this.sortData(data, definition.sortBy);
    }

    // 4. Calculate totals for specified fields
    const totals = this.calculateTotals(data, definition);

    // 5. Build metadata
    const metadata: Record<string, unknown> = {
      generatedAt: new Date().toISOString(),
      recordCount: data.length,
      collection: definition.collection,
    };

    if (definition.groupBy && definition.groupBy.length > 0) {
      const groups = this.getGroupKeys(data, definition.groupBy);
      metadata['groupCount'] = groups.length;
      metadata['groups'] = groups;
    }

    return {
      definition,
      data,
      totals: totals && Object.keys(totals).length > 0 ? totals : undefined,
      metadata,
    };
  }

  // -----------------------------------------------------------------------
  // Render report as HTML table
  // -----------------------------------------------------------------------

  renderHTML(result: ReportResult): HTMLElement {
    const container = document.createElement('div');
    container.className = 'report-container';

    // Title
    const title = document.createElement('h2');
    title.className = 'report-title';
    title.textContent = result.definition.title;
    container.appendChild(title);

    // Subtitle
    if (result.definition.subtitle) {
      const subtitle = document.createElement('h3');
      subtitle.className = 'report-subtitle';
      subtitle.textContent = result.definition.subtitle;
      container.appendChild(subtitle);
    }

    // Metadata bar
    const metaBar = document.createElement('div');
    metaBar.className = 'report-meta';
    metaBar.textContent = `${result.data.length} records | Generated ${this.formatDate(result.metadata['generatedAt'] as string)}`;
    container.appendChild(metaBar);

    // Table
    const table = document.createElement('table');
    table.className = 'report-table';

    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const col of result.definition.columns) {
      const th = document.createElement('th');
      th.textContent = col.label;
      th.style.textAlign = col.align ?? 'left';
      if (col.width) th.style.width = `${col.width}px`;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');

    if (result.definition.groupBy && result.definition.groupBy.length > 0) {
      // Grouped rendering
      this.renderGroupedRows(tbody, result);
    } else {
      // Flat rendering
      for (const record of result.data) {
        const tr = this.renderDataRow(record, result.definition.columns);
        tbody.appendChild(tr);
      }
    }

    table.appendChild(tbody);

    // Totals row
    if (result.totals) {
      const tfoot = document.createElement('tfoot');
      const totalsRow = document.createElement('tr');
      totalsRow.className = 'report-totals-row';

      for (let i = 0; i < result.definition.columns.length; i++) {
        const col = result.definition.columns[i];
        const td = document.createElement('td');
        td.style.textAlign = col.align ?? 'left';
        td.style.fontWeight = 'bold';

        if (i === 0 && !(col.field in result.totals)) {
          td.textContent = 'Totals';
        } else if (col.field in result.totals) {
          td.textContent = this.formatCellValue(result.totals[col.field], col);
        }
        totalsRow.appendChild(td);
      }

      tfoot.appendChild(totalsRow);
      table.appendChild(tfoot);
    }

    container.appendChild(table);
    return container;
  }

  // -----------------------------------------------------------------------
  // Render report as printable page
  // -----------------------------------------------------------------------

  renderPrintable(result: ReportResult, template?: PdfTemplate): HTMLElement {
    const page = document.createElement('div');
    page.className = 'report-printable';
    page.style.fontFamily = 'Arial, Helvetica, sans-serif';
    page.style.fontSize = '10pt';
    page.style.color = '#000';

    const orientation = template?.orientation ?? 'portrait';
    const margins = template?.margins ?? { top: 40, right: 40, bottom: 40, left: 40 };

    page.style.padding = `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`;

    if (orientation === 'landscape') {
      page.style.width = '297mm';
    } else {
      page.style.width = '210mm';
    }

    // Header
    const header = document.createElement('div');
    header.className = 'report-print-header';
    header.style.borderBottom = '2px solid #333';
    header.style.marginBottom = '16px';
    header.style.paddingBottom = '8px';

    if (template?.header) {
      const headerText = document.createElement('div');
      headerText.innerHTML = template.header;
      header.appendChild(headerText);
    }

    const reportTitle = document.createElement('h1');
    reportTitle.style.margin = '0 0 4px 0';
    reportTitle.style.fontSize = '16pt';
    reportTitle.textContent = result.definition.title;
    header.appendChild(reportTitle);

    if (result.definition.subtitle) {
      const subtitle = document.createElement('p');
      subtitle.style.margin = '0 0 4px 0';
      subtitle.style.fontSize = '11pt';
      subtitle.style.color = '#555';
      subtitle.textContent = result.definition.subtitle;
      header.appendChild(subtitle);
    }

    const dateLine = document.createElement('p');
    dateLine.style.margin = '0';
    dateLine.style.fontSize = '9pt';
    dateLine.style.color = '#777';
    dateLine.textContent = `Generated: ${this.formatDate(result.metadata['generatedAt'] as string)} | ${result.data.length} records`;
    header.appendChild(dateLine);

    page.appendChild(header);

    // Body: render the HTML table
    const tableElement = this.renderHTML(result);
    // Apply print-friendly styles to the table
    const tables = tableElement.querySelectorAll('table');
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      t.style.width = '100%';
      t.style.borderCollapse = 'collapse';
      t.style.fontSize = '9pt';
    }
    const cells = tableElement.querySelectorAll('td, th');
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i] as HTMLElement;
      cell.style.border = '1px solid #ccc';
      cell.style.padding = '4px 6px';
    }

    page.appendChild(tableElement);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'report-print-footer';
    footer.style.borderTop = '1px solid #999';
    footer.style.marginTop = '16px';
    footer.style.paddingTop = '8px';
    footer.style.fontSize = '8pt';
    footer.style.color = '#999';

    if (template?.footer) {
      footer.innerHTML = template.footer;
    } else {
      footer.textContent = `Concrete Construction Platform | ${result.definition.title} | Page 1`;
    }

    page.appendChild(footer);

    return page;
  }

  // -----------------------------------------------------------------------
  // Private: Helpers
  // -----------------------------------------------------------------------

  private toQueryFilter(filter: ReportFilter): QueryFilter {
    // Map the report filter operator string to a QueryOperator
    const operatorMap: Record<string, string> = {
      '=': '=',
      'eq': '=',
      '!=': '!=',
      'ne': '!=',
      '>': '>',
      'gt': '>',
      '<': '<',
      'lt': '<',
      '>=': '>=',
      'gte': '>=',
      '<=': '<=',
      'lte': '<=',
      'in': 'in',
      'contains': 'contains',
      'startsWith': 'startsWith',
      'between': 'between',
      'isNull': 'isNull',
      'isNotNull': 'isNotNull',
    };

    const mapped = operatorMap[filter.operator] ?? '=';

    return {
      field: filter.field,
      operator: mapped as QueryFilter['operator'],
      value: filter.value,
    };
  }

  private sortData(data: Record<string, unknown>[], sortBy: string[]): Record<string, unknown>[] {
    return [...data].sort((a, b) => {
      for (const field of sortBy) {
        const desc = field.startsWith('-');
        const key = desc ? field.slice(1) : field;
        const aVal = a[key];
        const bVal = b[key];

        let cmp = 0;
        if (aVal == null && bVal == null) cmp = 0;
        else if (aVal == null) cmp = -1;
        else if (bVal == null) cmp = 1;
        else if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
        else if (typeof aVal === 'string' && typeof bVal === 'string') cmp = aVal.localeCompare(bVal);
        else cmp = String(aVal).localeCompare(String(bVal));

        if (desc) cmp = -cmp;
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
  }

  private sortByGroupKeys(data: Record<string, unknown>[], groupBy: string[]): Record<string, unknown>[] {
    return [...data].sort((a, b) => {
      for (const field of groupBy) {
        const aVal = a[field];
        const bVal = b[field];
        let cmp = 0;
        if (aVal == null && bVal == null) cmp = 0;
        else if (aVal == null) cmp = -1;
        else if (bVal == null) cmp = 1;
        else cmp = String(aVal).localeCompare(String(bVal));
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
  }

  private getGroupKeys(data: Record<string, unknown>[], groupBy: string[]): string[] {
    const keys = new Set<string>();
    for (const record of data) {
      const key = groupBy.map((f) => String(record[f] ?? '')).join('|');
      keys.add(key);
    }
    return Array.from(keys);
  }

  private calculateTotals(
    data: Record<string, unknown>[],
    definition: ReportDef
  ): Record<string, unknown> | undefined {
    if (!definition.totals || definition.totals.length === 0) return undefined;

    const totals: Record<string, unknown> = {};

    for (const field of definition.totals) {
      let sum = 0;
      let count = 0;
      for (const record of data) {
        const val = record[field];
        if (typeof val === 'number' && !isNaN(val)) {
          sum += val;
          count++;
        }
      }
      totals[field] = sum;
      totals[`${field}_count`] = count;
    }

    return totals;
  }

  private renderDataRow(record: Record<string, unknown>, columns: ReportColumn[]): HTMLTableRowElement {
    const tr = document.createElement('tr');
    for (const col of columns) {
      const td = document.createElement('td');
      td.style.textAlign = col.align ?? 'left';
      td.textContent = this.formatCellValue(record[col.field], col);
      tr.appendChild(td);
    }
    return tr;
  }

  private renderGroupedRows(tbody: HTMLTableSectionElement, result: ReportResult): void {
    const groupBy = result.definition.groupBy ?? [];
    const columns = result.definition.columns;
    const totalsFields = result.definition.totals ?? [];

    let currentGroupKey = '';
    let groupData: Record<string, unknown>[] = [];

    const flushGroup = (): void => {
      if (groupData.length === 0) return;

      // Subtotal row for the group
      if (totalsFields.length > 0) {
        const subtotalRow = document.createElement('tr');
        subtotalRow.className = 'report-subtotal-row';
        subtotalRow.style.backgroundColor = '#f5f5f5';
        subtotalRow.style.fontWeight = 'bold';

        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const td = document.createElement('td');
          td.style.textAlign = col.align ?? 'left';

          if (i === 0) {
            td.textContent = `Subtotal: ${currentGroupKey}`;
          } else if (totalsFields.includes(col.field)) {
            let sum = 0;
            for (const record of groupData) {
              const val = record[col.field];
              if (typeof val === 'number') sum += val;
            }
            td.textContent = this.formatCellValue(sum, col);
          }
          subtotalRow.appendChild(td);
        }
        tbody.appendChild(subtotalRow);
      }
    };

    for (const record of result.data) {
      const key = groupBy.map((f) => String(record[f] ?? '')).join(' | ');

      if (key !== currentGroupKey) {
        flushGroup();

        // Group header row
        const groupHeaderRow = document.createElement('tr');
        groupHeaderRow.className = 'report-group-header';
        const groupTd = document.createElement('td');
        groupTd.colSpan = columns.length;
        groupTd.style.backgroundColor = '#e0e0e0';
        groupTd.style.fontWeight = 'bold';
        groupTd.style.padding = '6px';
        groupTd.textContent = key;
        groupHeaderRow.appendChild(groupTd);
        tbody.appendChild(groupHeaderRow);

        currentGroupKey = key;
        groupData = [];
      }

      const tr = this.renderDataRow(record, columns);
      tbody.appendChild(tr);
      groupData.push(record);
    }

    // Flush last group
    flushGroup();
  }

  private formatCellValue(value: unknown, column: ReportColumn): string {
    if (value === null || value === undefined) return '';

    switch (column.format) {
      case 'currency':
        return this.formatCurrency(value as number);
      case 'percentage':
        return this.formatPercentage(value as number);
      case 'date':
        return this.formatDate(value as string);
      case 'number':
        return this.formatNumber(value as number);
      case 'text':
      default:
        return String(value);
    }
  }

  private formatCurrency(value: number): string {
    if (typeof value !== 'number' || isNaN(value)) return '';
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private formatPercentage(value: number): string {
    if (typeof value !== 'number' || isNaN(value)) return '';
    return `${(value * 100).toFixed(1)}%`;
  }

  private formatNumber(value: number): string {
    if (typeof value !== 'number' || isNaN(value)) return '';
    return value.toLocaleString('en-US');
  }

  private formatDate(value: string): string {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return value;
    }
  }
}
