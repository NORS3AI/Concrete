/**
 * Custom Report Builder view.
 * Provides an interface for building ad-hoc reports with configurable
 * columns, filters, grouping, and sorting. Allows saving configurations
 * as templates and exporting results. Wired to ReportsService.
 */

import { getReportsService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 5000);
}

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

function exportCSV(filename: string, headers: string[], rows: string[][]): void {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = el('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type DataSourceKey =
  | 'balance-sheet'
  | 'income-statement'
  | 'cash-flow'
  | 'wip-schedule'
  | 'job-cost-summary'
  | 'aging-ap'
  | 'aging-ar'
  | 'payroll-summary'
  | 'equipment-utilization'
  | 'bonding-capacity';

const DATA_SOURCE_OPTIONS: Array<{ value: DataSourceKey; label: string }> = [
  { value: 'balance-sheet', label: 'Balance Sheet' },
  { value: 'income-statement', label: 'Income Statement' },
  { value: 'cash-flow', label: 'Cash Flow Statement' },
  { value: 'wip-schedule', label: 'WIP Schedule' },
  { value: 'job-cost-summary', label: 'Job Cost Summary' },
  { value: 'aging-ap', label: 'AP Aging' },
  { value: 'aging-ar', label: 'AR Aging' },
  { value: 'payroll-summary', label: 'Payroll Summary' },
  { value: 'equipment-utilization', label: 'Equipment Utilization' },
  { value: 'bonding-capacity', label: 'Bonding Capacity' },
];

const COLUMNS_BY_SOURCE: Record<DataSourceKey, string[]> = {
  'balance-sheet': ['accountNumber', 'accountName', 'accountType', 'currentBalance', 'priorBalance', 'change'],
  'income-statement': ['accountNumber', 'accountName', 'category', 'currentAmount', 'priorAmount', 'variance'],
  'cash-flow': ['category', 'description', 'amount'],
  'wip-schedule': ['jobNumber', 'jobName', 'contractAmount', 'totalBudget', 'actualCostToDate', 'estimateToComplete', 'estimateAtCompletion', 'percentComplete', 'earnedRevenue', 'billedToDate', 'overUnderBilling', 'projectedGrossProfit', 'projectedMarginPct'],
  'job-cost-summary': ['jobNumber', 'jobName', 'contractAmount', 'approvedChangeOrders', 'revisedContract', 'totalBudget', 'actualCostToDate', 'committedCost', 'projectedCost', 'projectedProfit', 'projectedMarginPct', 'percentComplete'],
  'aging-ap': ['entityName', 'current', 'days30', 'days60', 'days90', 'days120Plus', 'total'],
  'aging-ar': ['entityName', 'current', 'days30', 'days60', 'days90', 'days120Plus', 'total'],
  'payroll-summary': ['employeeName', 'department', 'totalGross', 'totalFederalTax', 'totalStateTax', 'totalDeductions', 'totalNet', 'totalHours', 'totalOvertimeHours'],
  'equipment-utilization': ['equipmentCode', 'equipmentName', 'totalHours', 'totalCost', 'averageHourlyRate', 'utilizationPct'],
  'bonding-capacity': ['totalAssets', 'totalLiabilities', 'netWorth', 'workingCapital', 'currentRatio', 'debtToEquity', 'backlog', 'aggregateBondingLimit', 'singleJobLimit', 'availableCapacity', 'currentBondedWork', 'wipAdjustment'],
};

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

let previewData: Record<string, unknown>[] = [];
let selectedColumns: string[] = [];
let currentDataSource: DataSourceKey | '' = '';

function renderPreviewTable(previewPanel: HTMLElement, data: Record<string, unknown>[], columns: string[]): void {
  previewPanel.innerHTML = '';
  previewPanel.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Report Preview'));

  if (data.length === 0) {
    const placeholder = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
    placeholder.appendChild(el('p', 'text-[var(--text-muted)]', 'Select a data source and generate to preview.'));
    previewPanel.appendChild(placeholder);
    return;
  }

  const visibleCols = columns.length > 0 ? columns : Object.keys(data[0]);

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm whitespace-nowrap');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of visibleCols) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  for (const row of data) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    for (const col of visibleCols) {
      const val = row[col];
      let display: string;
      if (typeof val === 'number') {
        // Heuristic: format based on column name
        const colLower = col.toLowerCase();
        if (colLower.includes('pct') || colLower.includes('percent') || colLower.includes('margin')) {
          display = fmtPct(val);
        } else if (colLower.includes('ratio') || colLower.includes('equity')) {
          display = val.toFixed(2);
        } else if (colLower.includes('amount') || colLower.includes('cost') || colLower.includes('revenue')
          || colLower.includes('profit') || colLower.includes('balance') || colLower.includes('budget')
          || colLower.includes('billing') || colLower.includes('gross') || colLower.includes('net')
          || colLower.includes('tax') || colLower.includes('deduction') || colLower.includes('assets')
          || colLower.includes('liabilities') || colLower.includes('worth') || colLower.includes('capital')
          || colLower.includes('backlog') || colLower.includes('limit') || colLower.includes('capacity')
          || colLower.includes('bonded') || colLower.includes('adjustment') || colLower.includes('current')
          || colLower.includes('days') || colLower.includes('total') || colLower.includes('contract')
          || colLower.includes('change') || colLower.includes('committed') || colLower.includes('projected')
          || colLower.includes('billed') || colLower.includes('earned') || colLower.includes('estimate')
          || colLower.includes('revised') || colLower.includes('variance') || colLower.includes('prior')) {
          display = fmtCurrency(val);
        } else if (colLower.includes('hours')) {
          display = val.toFixed(1);
        } else {
          display = String(val);
        }
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', display));
      } else {
        display = val != null ? String(val) : '-';
        tr.appendChild(el('td', 'py-2 px-3', display));
      }
    }
    tbody.appendChild(tr);
  }

  const countRow = el('tr', 'bg-[var(--surface)] font-semibold');
  const countTd = el('td', 'py-2 px-3 text-[var(--text-muted)]', `${data.length} row(s)`);
  countTd.setAttribute('colspan', String(visibleCols.length));
  countRow.appendChild(countTd);
  tbody.appendChild(countRow);

  table.appendChild(tbody);
  wrap.appendChild(table);
  previewPanel.appendChild(wrap);
}

function renderContent(): void {
  wrapper.innerHTML = '';

  // Header
  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Custom Report Builder'));
  const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
  backLink.href = '#/reports';
  headerRow.appendChild(backLink);
  wrapper.appendChild(headerRow);

  // Two-column layout
  const layout = el('div', 'grid grid-cols-1 lg:grid-cols-2 gap-6');

  // ---- Left panel ----
  const builderPanel = el('div', 'space-y-0');
  builderPanel.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Report Configuration'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  // Data Source selector
  const dsSection = el('div', 'mb-6');
  dsSection.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-2', 'Data Source'));
  const dsSelect = el('select', inputCls + ' w-full max-w-xs') as HTMLSelectElement;
  const dsDefault = el('option', '', 'Select a data source...') as HTMLOptionElement;
  dsDefault.value = '';
  dsSelect.appendChild(dsDefault);
  for (const opt of DATA_SOURCE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    dsSelect.appendChild(o);
  }
  dsSection.appendChild(dsSelect);
  builderPanel.appendChild(dsSection);

  // Available Columns
  const colSection = el('div', 'mb-6');
  colSection.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-2', 'Available Columns'));
  const colList = el('div', 'space-y-1');
  colList.appendChild(el('p', 'text-sm text-[var(--text-muted)] italic', 'Select a data source to see available columns.'));
  colSection.appendChild(colList);
  builderPanel.appendChild(colSection);

  // Filters
  const filterSection = el('div', 'mb-6');
  filterSection.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-2', 'Filters'));

  const filterGrid = el('div', 'grid grid-cols-1 gap-2');
  const dateRow = el('div', 'flex items-center gap-2');
  dateRow.appendChild(el('label', 'text-xs text-[var(--text-muted)] w-16', 'From:'));
  const dateStartInput = el('input', inputCls + ' flex-1') as HTMLInputElement;
  dateStartInput.type = 'date';
  dateRow.appendChild(dateStartInput);
  dateRow.appendChild(el('label', 'text-xs text-[var(--text-muted)] w-10', 'To:'));
  const dateEndInput = el('input', inputCls + ' flex-1') as HTMLInputElement;
  dateEndInput.type = 'date';
  dateEndInput.value = new Date().toISOString().split('T')[0];
  dateRow.appendChild(dateEndInput);
  filterGrid.appendChild(dateRow);

  const entityRow = el('div', 'flex items-center gap-2');
  entityRow.appendChild(el('label', 'text-xs text-[var(--text-muted)] w-16', 'Entity:'));
  const entityInput = el('input', inputCls + ' flex-1') as HTMLInputElement;
  entityInput.type = 'text';
  entityInput.placeholder = 'Entity ID (optional)';
  entityRow.appendChild(entityInput);
  filterGrid.appendChild(entityRow);

  const jobRow = el('div', 'flex items-center gap-2');
  jobRow.appendChild(el('label', 'text-xs text-[var(--text-muted)] w-16', 'Job:'));
  const jobInput = el('input', inputCls + ' flex-1') as HTMLInputElement;
  jobInput.type = 'text';
  jobInput.placeholder = 'Job ID (optional)';
  jobRow.appendChild(jobInput);
  filterGrid.appendChild(jobRow);

  filterSection.appendChild(filterGrid);
  builderPanel.appendChild(filterSection);

  // Group By
  const groupSection = el('div', 'mb-6');
  groupSection.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-2', 'Group By'));
  const groupSelect = el('select', inputCls + ' w-full max-w-xs') as HTMLSelectElement;
  const groupDefault = el('option', '', 'None') as HTMLOptionElement;
  groupDefault.value = '';
  groupSelect.appendChild(groupDefault);
  groupSection.appendChild(groupSelect);
  builderPanel.appendChild(groupSection);

  // Sort By
  const sortSection = el('div', 'mb-6');
  sortSection.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-2', 'Sort By'));
  const sortSelect = el('select', inputCls + ' w-full max-w-xs') as HTMLSelectElement;
  const sortDefault = el('option', '', 'None') as HTMLOptionElement;
  sortDefault.value = '';
  sortSelect.appendChild(sortDefault);
  sortSection.appendChild(sortSelect);
  builderPanel.appendChild(sortSection);

  // Action buttons
  const actionBar = el('div', 'flex items-center gap-3 pt-4 border-t border-[var(--border)]');
  const generateBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate Preview');
  actionBar.appendChild(generateBtn);
  const saveTemplateBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Save as Template');
  actionBar.appendChild(saveTemplateBtn);
  actionBar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Export:'));
  const csvBtn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'CSV');
  actionBar.appendChild(csvBtn);
  builderPanel.appendChild(actionBar);

  layout.appendChild(builderPanel);

  // ---- Right panel ----
  const previewPanel = el('div');
  previewPanel.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Report Preview'));
  const previewArea = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
  previewArea.appendChild(el('p', 'text-[var(--text-muted)]', 'Select a data source and generate to preview.'));
  previewPanel.appendChild(previewArea);
  layout.appendChild(previewPanel);

  wrapper.appendChild(layout);

  // Column checkboxes keyed by checkbox element
  const columnCheckboxes: Array<{ field: string; checkbox: HTMLInputElement }> = [];

  function updateColumnsUI(source: DataSourceKey | ''): void {
    colList.innerHTML = '';
    columnCheckboxes.length = 0;

    // Also update group-by and sort-by options
    groupSelect.innerHTML = '';
    const gd = el('option', '', 'None') as HTMLOptionElement;
    gd.value = '';
    groupSelect.appendChild(gd);

    sortSelect.innerHTML = '';
    const sd = el('option', '', 'None') as HTMLOptionElement;
    sd.value = '';
    sortSelect.appendChild(sd);

    if (!source || !COLUMNS_BY_SOURCE[source]) {
      colList.appendChild(el('p', 'text-sm text-[var(--text-muted)] italic', 'Select a data source to see available columns.'));
      return;
    }

    const cols = COLUMNS_BY_SOURCE[source];
    for (const col of cols) {
      const item = el('div', 'flex items-center gap-2 p-2 bg-[var(--surface)] border border-[var(--border)] rounded-md');
      const cb = el('input') as HTMLInputElement;
      cb.type = 'checkbox';
      cb.checked = true;
      item.appendChild(cb);
      item.appendChild(el('span', 'text-sm text-[var(--text)] flex-1', col));
      colList.appendChild(item);
      columnCheckboxes.push({ field: col, checkbox: cb });

      // Add to group-by / sort-by selects
      const go = el('option', '', col) as HTMLOptionElement;
      go.value = col;
      groupSelect.appendChild(go);

      const so = el('option', '', col) as HTMLOptionElement;
      so.value = col;
      sortSelect.appendChild(so);
    }
  }

  dsSelect.addEventListener('change', () => {
    currentDataSource = dsSelect.value as DataSourceKey | '';
    updateColumnsUI(currentDataSource);
  });

  // Generate Preview
  generateBtn.addEventListener('click', () => {
    if (!currentDataSource) {
      showMsg(wrapper, 'Please select a data source.', true);
      return;
    }

    // Get selected columns
    selectedColumns = columnCheckboxes
      .filter(c => c.checkbox.checked)
      .map(c => c.field);

    if (selectedColumns.length === 0) {
      showMsg(wrapper, 'Please select at least one column.', true);
      return;
    }

    void (async () => {
      try {
        const svc = getReportsService();
        let rawData: Record<string, unknown>[] = [];
        const periodStart = dateStartInput.value;
        const periodEnd = dateEndInput.value;
        const jobId = jobInput.value.trim() || undefined;
        const entityId = entityInput.value.trim() || undefined;

        switch (currentDataSource) {
          case 'balance-sheet': {
            const rows = await svc.generateBalanceSheet({
              reportType: 'balance-sheet',
              periodStart: periodStart || '2000-01-01',
              periodEnd: periodEnd || new Date().toISOString().split('T')[0],
              entityId,
            });
            rawData = rows as unknown as Record<string, unknown>[];
            break;
          }
          case 'income-statement': {
            const rows = await svc.generateIncomeStatement({
              reportType: 'income-statement',
              periodStart: periodStart || '2000-01-01',
              periodEnd: periodEnd || new Date().toISOString().split('T')[0],
              entityId,
            });
            rawData = rows as unknown as Record<string, unknown>[];
            break;
          }
          case 'cash-flow': {
            const rows = await svc.generateCashFlowStatement({
              reportType: 'cash-flow',
              periodStart: periodStart || '2000-01-01',
              periodEnd: periodEnd || new Date().toISOString().split('T')[0],
              entityId,
            });
            rawData = rows as unknown as Record<string, unknown>[];
            break;
          }
          case 'wip-schedule': {
            const rows = await svc.generateWipSchedule({
              reportType: 'wip-schedule',
              periodStart: periodStart || '2000-01-01',
              periodEnd: periodEnd || new Date().toISOString().split('T')[0],
              jobId,
            });
            rawData = rows as unknown as Record<string, unknown>[];
            break;
          }
          case 'job-cost-summary': {
            const rows = await svc.generateJobCostSummary(jobId);
            rawData = rows as unknown as Record<string, unknown>[];
            break;
          }
          case 'aging-ap': {
            const asOf = periodEnd || new Date().toISOString().split('T')[0];
            const rows = await svc.generateAgingReport('ap', asOf);
            rawData = rows as unknown as Record<string, unknown>[];
            break;
          }
          case 'aging-ar': {
            const asOf = periodEnd || new Date().toISOString().split('T')[0];
            const rows = await svc.generateAgingReport('ar', asOf);
            rawData = rows as unknown as Record<string, unknown>[];
            break;
          }
          case 'payroll-summary': {
            const rows = await svc.generatePayrollSummary(
              periodStart || '2000-01-01',
              periodEnd || new Date().toISOString().split('T')[0],
            );
            rawData = rows as unknown as Record<string, unknown>[];
            break;
          }
          case 'equipment-utilization': {
            const rows = await svc.generateEquipmentUtilization(
              periodStart || '2000-01-01',
              periodEnd || new Date().toISOString().split('T')[0],
            );
            rawData = rows as unknown as Record<string, unknown>[];
            break;
          }
          case 'bonding-capacity': {
            const row = await svc.generateBondingCapacity();
            rawData = [row as unknown as Record<string, unknown>];
            break;
          }
          default:
            showMsg(wrapper, `Unsupported data source: ${currentDataSource}`, true);
            return;
        }

        // Sort if selected
        const sortField = sortSelect.value;
        if (sortField && rawData.length > 0) {
          rawData.sort((a, b) => {
            const va = a[sortField];
            const vb = b[sortField];
            if (typeof va === 'number' && typeof vb === 'number') return va - vb;
            return String(va ?? '').localeCompare(String(vb ?? ''));
          });
        }

        previewData = rawData;
        renderPreviewTable(previewPanel, rawData, selectedColumns);
        showMsg(wrapper, `Preview generated: ${rawData.length} row(s).`, false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Operation failed';
        showMsg(wrapper, message, true);
      }
    })();
  });

  // Save as Template
  saveTemplateBtn.addEventListener('click', () => {
    if (!currentDataSource) {
      showMsg(wrapper, 'Please select a data source before saving.', true);
      return;
    }

    const name = prompt('Template name:');
    if (!name || !name.trim()) return;

    const description = prompt('Description (optional):') || '';

    void (async () => {
      try {
        const svc = getReportsService();
        const cols = columnCheckboxes
          .filter(c => c.checkbox.checked)
          .map(c => c.field);

        const filters: Array<{ field: string; operator: string; value: unknown }> = [];
        if (dateStartInput.value) {
          filters.push({ field: 'periodStart', operator: '=', value: dateStartInput.value });
        }
        if (dateEndInput.value) {
          filters.push({ field: 'periodEnd', operator: '=', value: dateEndInput.value });
        }
        if (entityInput.value.trim()) {
          filters.push({ field: 'entityId', operator: '=', value: entityInput.value.trim() });
        }
        if (jobInput.value.trim()) {
          filters.push({ field: 'jobId', operator: '=', value: jobInput.value.trim() });
        }

        const groupBy: string[] = [];
        if (groupSelect.value) {
          groupBy.push(groupSelect.value);
        }

        const sortBy: Array<{ field: string; direction: 'asc' | 'desc' }> = [];
        if (sortSelect.value) {
          sortBy.push({ field: sortSelect.value, direction: 'asc' });
        }

        await svc.createTemplate({
          name: name.trim(),
          reportType: 'custom',
          description: description.trim() || undefined,
          columns: cols,
          filters,
          groupBy,
          sortBy,
        });

        showMsg(wrapper, `Template "${name.trim()}" saved successfully.`, false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Operation failed';
        showMsg(wrapper, message, true);
      }
    })();
  });

  // Export CSV
  csvBtn.addEventListener('click', () => {
    if (previewData.length === 0) {
      showMsg(wrapper, 'No data to export. Generate a preview first.', true);
      return;
    }

    const cols = selectedColumns.length > 0 ? selectedColumns : Object.keys(previewData[0]);
    const csvRows = previewData.map(row =>
      cols.map(c => {
        const v = row[c];
        return v != null ? String(v) : '';
      }),
    );
    exportCSV('custom-report.csv', cols, csvRows);
    showMsg(wrapper, 'CSV exported successfully.', false);
  });
}

void (async () => {
  try {
    const svc = getReportsService();
    void svc;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    showMsg(wrapper, message, true);
  }
})();

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    previewData = [];
    selectedColumns = [];
    currentDataSource = '';
    renderContent();
    container.appendChild(wrapper);
  },
};
