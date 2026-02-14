/**
 * Income Statement view.
 * Renders the income statement (P&L) with support for standard, by-job,
 * by-entity, and comparative styles. Includes period selection, entity/job
 * filters, and export controls.
 * Wired to ReportsService.generateIncomeStatement().
 */

import { getReportsService } from '../service-accessor';
import type { ReportConfig, IncomeStatementRow } from '../reports-service';

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

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

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

const STYLE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'by-job', label: 'By Job' },
  { value: 'by-entity', label: 'By Entity' },
  { value: 'comparative', label: 'Comparative' },
];

const CATEGORY_ORDER: Record<string, number> = {
  revenue: 1,
  cogs: 2,
  expense: 3,
  other: 4,
};

const CATEGORY_LABELS: Record<string, string> = {
  revenue: 'Revenue',
  cogs: 'Cost of Goods Sold',
  expense: 'Operating Expenses',
  other: 'Other Income / Expense',
};

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onApply: (style: string, periodStart: string, periodEnd: string, comparePeriodStart: string, comparePeriodEnd: string, consolidated: boolean) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const styleSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STYLE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    styleSelect.appendChild(o);
  }
  bar.appendChild(styleSelect);

  const fromLabel = el('label', 'text-sm text-[var(--text-muted)]', 'From:');
  bar.appendChild(fromLabel);
  const periodStartInput = el('input', inputCls) as HTMLInputElement;
  periodStartInput.type = 'date';
  bar.appendChild(periodStartInput);

  const toLabel = el('label', 'text-sm text-[var(--text-muted)]', 'To:');
  bar.appendChild(toLabel);
  const periodEndInput = el('input', inputCls) as HTMLInputElement;
  periodEndInput.type = 'date';
  periodEndInput.value = new Date().toISOString().split('T')[0];
  bar.appendChild(periodEndInput);

  const compareFromLabel = el('label', 'text-sm text-[var(--text-muted)]', 'Compare From:');
  bar.appendChild(compareFromLabel);
  const comparePeriodStartInput = el('input', inputCls) as HTMLInputElement;
  comparePeriodStartInput.type = 'date';
  bar.appendChild(comparePeriodStartInput);

  const compareToLabel = el('label', 'text-sm text-[var(--text-muted)]', 'Compare To:');
  bar.appendChild(compareToLabel);
  const comparePeriodEndInput = el('input', inputCls) as HTMLInputElement;
  comparePeriodEndInput.type = 'date';
  bar.appendChild(comparePeriodEndInput);

  const consolidatedLabel = el('label', 'flex items-center gap-1 text-sm text-[var(--text-muted)]');
  const consolidatedCheck = el('input') as HTMLInputElement;
  consolidatedCheck.type = 'checkbox';
  consolidatedLabel.appendChild(consolidatedCheck);
  consolidatedLabel.appendChild(document.createTextNode('Consolidated'));
  bar.appendChild(consolidatedLabel);

  // Toggle compare fields visibility based on style
  const updateCompareVisibility = (): void => {
    const isComparative = styleSelect.value === 'comparative';
    compareFromLabel.style.display = isComparative ? '' : 'none';
    comparePeriodStartInput.style.display = isComparative ? '' : 'none';
    compareToLabel.style.display = isComparative ? '' : 'none';
    comparePeriodEndInput.style.display = isComparative ? '' : 'none';
  };
  styleSelect.addEventListener('change', updateCompareVisibility);
  updateCompareVisibility();

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  applyBtn.addEventListener('click', () => {
    onApply(
      styleSelect.value,
      periodStartInput.value,
      periodEndInput.value,
      comparePeriodStartInput.value,
      comparePeriodEndInput.value,
      consolidatedCheck.checked,
    );
  });
  bar.appendChild(applyBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: IncomeStatementRow[], style: string): HTMLElement {
  const showComparative = style === 'comparative';
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');

  const columns = showComparative
    ? ['Account #', 'Account Name', 'Current', 'Prior', 'Variance']
    : ['Account #', 'Account Name', 'Amount'];

  for (const col of columns) {
    const isNumeric = col !== 'Account #' && col !== 'Account Name';
    const align = isNumeric ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  const colSpan = String(columns.length);

  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No income statement data available. Select a period and generate the report.');
    td.setAttribute('colspan', colSpan);
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  // Sort rows by category order
  const sorted = [...rows].sort((a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99));

  // Accumulate totals for computed rows
  const categoryTotals: Record<string, number> = {};

  let currentCategory = '';
  let categoryTotal = 0;

  for (const row of sorted) {
    if (row.category !== currentCategory) {
      if (currentCategory) {
        // Emit subtotal for previous category
        categoryTotals[currentCategory] = categoryTotal;
        const subtotalRow = el('tr', 'bg-[var(--surface)] font-semibold');
        subtotalRow.appendChild(el('td', 'py-2 px-3'));
        subtotalRow.appendChild(el('td', 'py-2 px-3', `Total ${CATEGORY_LABELS[currentCategory] ?? currentCategory}`));
        subtotalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(categoryTotal)));
        if (showComparative) {
          subtotalRow.appendChild(el('td', 'py-2 px-3'));
          subtotalRow.appendChild(el('td', 'py-2 px-3'));
        }
        tbody.appendChild(subtotalRow);

        // Insert Gross Profit row after COGS
        if (currentCategory === 'cogs') {
          const grossProfit = (categoryTotals['revenue'] ?? 0) - (categoryTotals['cogs'] ?? 0);
          const gpRow = el('tr', 'bg-[var(--surface)] font-bold border-t border-[var(--border)]');
          gpRow.appendChild(el('td', 'py-2 px-3'));
          gpRow.appendChild(el('td', 'py-2 px-3', 'Gross Profit'));
          const gpCls = grossProfit >= 0
            ? 'py-2 px-3 text-right font-mono text-emerald-400'
            : 'py-2 px-3 text-right font-mono text-red-400';
          gpRow.appendChild(el('td', gpCls, fmtCurrency(grossProfit)));
          if (showComparative) {
            gpRow.appendChild(el('td', 'py-2 px-3'));
            gpRow.appendChild(el('td', 'py-2 px-3'));
          }
          tbody.appendChild(gpRow);
        }

        categoryTotal = 0;
      }
      currentCategory = row.category;

      // Section header
      const sectionRow = el('tr', 'bg-[var(--surface)]');
      const sectionTd = el('td', 'py-2 px-3 font-semibold text-[var(--accent)]', CATEGORY_LABELS[currentCategory] ?? currentCategory);
      sectionTd.setAttribute('colspan', colSpan);
      sectionRow.appendChild(sectionTd);
      tbody.appendChild(sectionRow);
    }

    categoryTotal += row.currentAmount;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3', row.accountNumber));
    tr.appendChild(el('td', 'py-2 px-3', row.accountName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.currentAmount)));

    if (showComparative) {
      tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.priorAmount !== undefined ? fmtCurrency(row.priorAmount) : '-'));
      const varCls = (row.variance ?? 0) >= 0
        ? 'py-2 px-3 text-right font-mono text-emerald-400'
        : 'py-2 px-3 text-right font-mono text-red-400';
      tr.appendChild(el('td', varCls, row.variance !== undefined ? fmtCurrency(row.variance) : '-'));
    }

    tbody.appendChild(tr);
  }

  // Final category subtotal
  if (currentCategory) {
    categoryTotals[currentCategory] = categoryTotal;
    const subtotalRow = el('tr', 'bg-[var(--surface)] font-semibold');
    subtotalRow.appendChild(el('td', 'py-2 px-3'));
    subtotalRow.appendChild(el('td', 'py-2 px-3', `Total ${CATEGORY_LABELS[currentCategory] ?? currentCategory}`));
    subtotalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(categoryTotal)));
    if (showComparative) {
      subtotalRow.appendChild(el('td', 'py-2 px-3'));
      subtotalRow.appendChild(el('td', 'py-2 px-3'));
    }
    tbody.appendChild(subtotalRow);

    // Insert Gross Profit if COGS was the last category (no expense rows)
    if (currentCategory === 'cogs') {
      const grossProfit = (categoryTotals['revenue'] ?? 0) - (categoryTotals['cogs'] ?? 0);
      const gpRow = el('tr', 'bg-[var(--surface)] font-bold border-t border-[var(--border)]');
      gpRow.appendChild(el('td', 'py-2 px-3'));
      gpRow.appendChild(el('td', 'py-2 px-3', 'Gross Profit'));
      const gpCls = grossProfit >= 0
        ? 'py-2 px-3 text-right font-mono text-emerald-400'
        : 'py-2 px-3 text-right font-mono text-red-400';
      gpRow.appendChild(el('td', gpCls, fmtCurrency(grossProfit)));
      if (showComparative) {
        gpRow.appendChild(el('td', 'py-2 px-3'));
        gpRow.appendChild(el('td', 'py-2 px-3'));
      }
      tbody.appendChild(gpRow);
    }
  }

  // Net Income row
  if (rows.length > 0) {
    const grossProfit = (categoryTotals['revenue'] ?? 0) - (categoryTotals['cogs'] ?? 0);
    const netIncome = grossProfit - (categoryTotals['expense'] ?? 0) - (categoryTotals['other'] ?? 0);

    const netRow = el('tr', 'bg-[var(--surface)] font-bold text-lg border-t-2 border-[var(--border)]');
    netRow.appendChild(el('td', 'py-3 px-3'));
    netRow.appendChild(el('td', 'py-3 px-3', 'Net Income'));
    const netCls = netIncome >= 0
      ? 'py-3 px-3 text-right font-mono text-emerald-400'
      : 'py-3 px-3 text-right font-mono text-red-400';
    netRow.appendChild(el('td', netCls, fmtCurrency(netIncome)));
    if (showComparative) {
      netRow.appendChild(el('td', 'py-3 px-3'));
      netRow.appendChild(el('td', 'py-3 px-3'));
    }
    tbody.appendChild(netRow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Export Bar
// ---------------------------------------------------------------------------

function buildExportBar(wrapper: HTMLElement, getState: () => { rows: IncomeStatementRow[]; style: string }): HTMLElement {
  const bar = el('div', 'flex items-center gap-3 mt-4');
  bar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Export:'));

  const csvBtn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'CSV');
  csvBtn.addEventListener('click', () => {
    const { rows, style } = getState();
    if (rows.length === 0) {
      showMsg(wrapper, 'No data to export. Generate the report first.', true);
      return;
    }
    const showComparative = style === 'comparative';
    const headers = showComparative
      ? ['Account #', 'Account Name', 'Category', 'Current Amount', 'Prior Amount', 'Variance']
      : ['Account #', 'Account Name', 'Category', 'Amount'];
    const csvRows = rows.map(r => {
      const base = [r.accountNumber, r.accountName, r.category, String(r.currentAmount)];
      if (showComparative) {
        base.push(String(r.priorAmount ?? ''), String(r.variance ?? ''));
      }
      return base;
    });
    exportCSV('income-statement.csv', headers, csvRows);
    showMsg(wrapper, 'CSV exported successfully.', false);
  });
  bar.appendChild(csvBtn);

  const pdfBtn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'PDF');
  pdfBtn.addEventListener('click', () => {
    showMsg(wrapper, 'Export as PDF coming soon', false);
  });
  bar.appendChild(pdfBtn);

  const excelBtn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Excel');
  excelBtn.addEventListener('click', () => {
    showMsg(wrapper, 'Export as Excel coming soon', false);
  });
  bar.appendChild(excelBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

let currentRows: IncomeStatementRow[] = [];
let currentStyle = 'standard';

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    wrapper.innerHTML = '';

    currentRows = [];
    currentStyle = 'standard';

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Income Statement'));

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const tableContainer = el('div');
    tableContainer.appendChild(buildTable([], 'standard'));

    wrapper.appendChild(buildFilterBar((style, periodStart, periodEnd, comparePeriodStart, comparePeriodEnd, consolidated) => {
      void (async () => {
        try {
          const svc = getReportsService();
          const config: ReportConfig = {
            reportType: 'income-statement',
            periodStart,
            periodEnd,
            consolidated,
            style,
          };

          if (style === 'comparative' && comparePeriodStart && comparePeriodEnd) {
            config.comparePeriodStart = comparePeriodStart;
            config.comparePeriodEnd = comparePeriodEnd;
          }

          const rows = await svc.generateIncomeStatement(config);
          currentRows = rows;
          currentStyle = style;

          tableContainer.innerHTML = '';
          tableContainer.appendChild(buildTable(rows, style));

          if (rows.length === 0) {
            showMsg(wrapper, 'No income statement data found for the selected period.', false);
          } else {
            showMsg(wrapper, `Income statement generated: ${rows.length} accounts.`, false);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      })();
    }));

    wrapper.appendChild(tableContainer);
    wrapper.appendChild(buildExportBar(wrapper, () => ({ rows: currentRows, style: currentStyle })));

    container.appendChild(wrapper);
  },
};
