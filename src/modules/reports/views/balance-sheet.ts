/**
 * Balance Sheet view.
 * Renders the balance sheet report with support for standard, comparative,
 * and consolidated views. Includes period selection and export controls.
 * Wired to ReportsService.generateBalanceSheet().
 */

import { getReportsService } from '../service-accessor';
import type { ReportConfig, BalanceSheetRow } from '../reports-service';

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
  { value: 'comparative', label: 'Comparative' },
  { value: 'consolidated', label: 'Consolidated' },
];

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onApply: (style: string, periodEnd: string, comparePeriodEnd: string, consolidated: boolean) => void,
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

  const periodLabel = el('label', 'text-sm text-[var(--text-muted)]', 'As of:');
  bar.appendChild(periodLabel);

  const periodEndInput = el('input', inputCls) as HTMLInputElement;
  periodEndInput.type = 'date';
  periodEndInput.value = new Date().toISOString().split('T')[0];
  bar.appendChild(periodEndInput);

  const compareLabel = el('label', 'text-sm text-[var(--text-muted)] compare-label', 'Compare:');
  bar.appendChild(compareLabel);

  const comparePeriodInput = el('input', inputCls + ' compare-input') as HTMLInputElement;
  comparePeriodInput.type = 'date';
  bar.appendChild(comparePeriodInput);

  const consolidatedLabel = el('label', 'flex items-center gap-1 text-sm text-[var(--text-muted)]');
  const consolidatedCheck = el('input') as HTMLInputElement;
  consolidatedCheck.type = 'checkbox';
  consolidatedLabel.appendChild(consolidatedCheck);
  consolidatedLabel.appendChild(document.createTextNode('Consolidated'));
  bar.appendChild(consolidatedLabel);

  // Toggle compare fields visibility based on style
  const updateCompareVisibility = (): void => {
    const isComparative = styleSelect.value === 'comparative';
    compareLabel.style.display = isComparative ? '' : 'none';
    comparePeriodInput.style.display = isComparative ? '' : 'none';
  };
  styleSelect.addEventListener('change', updateCompareVisibility);
  updateCompareVisibility();

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  applyBtn.addEventListener('click', () => {
    onApply(styleSelect.value, periodEndInput.value, comparePeriodInput.value, consolidatedCheck.checked);
  });
  bar.appendChild(applyBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: BalanceSheetRow[], style: string): HTMLElement {
  const showComparative = style === 'comparative';
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');

  const columns = showComparative
    ? ['Account #', 'Account Name', 'Current', 'Prior', 'Change']
    : ['Account #', 'Account Name', 'Balance'];

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
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No balance sheet data available. Generate the report to see results.');
    td.setAttribute('colspan', colSpan);
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  // Group rows by accountType: asset, liability, equity
  const typeOrder = ['asset', 'liability', 'equity'];
  const grouped = new Map<string, BalanceSheetRow[]>();
  for (const row of rows) {
    const group = grouped.get(row.accountType) ?? [];
    group.push(row);
    grouped.set(row.accountType, group);
  }

  const typeLabels: Record<string, string> = {
    asset: 'Assets',
    liability: 'Liabilities',
    equity: 'Equity',
  };

  let totalAssets = 0;
  let totalLiabilitiesEquity = 0;

  for (const accountType of typeOrder) {
    const groupRows = grouped.get(accountType);
    if (!groupRows || groupRows.length === 0) continue;

    // Section header
    const sectionRow = el('tr', 'bg-[var(--surface)]');
    const sectionTd = el('td', 'py-2 px-3 font-semibold text-[var(--accent)]', typeLabels[accountType] ?? accountType);
    sectionTd.setAttribute('colspan', colSpan);
    sectionRow.appendChild(sectionTd);
    tbody.appendChild(sectionRow);

    let typeTotal = 0;

    for (const row of groupRows) {
      typeTotal += row.currentBalance;

      const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
      tr.appendChild(el('td', 'py-2 px-3', row.accountNumber));
      tr.appendChild(el('td', 'py-2 px-3', row.accountName));
      tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.currentBalance)));

      if (showComparative) {
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.priorBalance !== undefined ? fmtCurrency(row.priorBalance) : '-'));
        const changeCls = (row.change ?? 0) >= 0
          ? 'py-2 px-3 text-right font-mono text-emerald-400'
          : 'py-2 px-3 text-right font-mono text-red-400';
        tr.appendChild(el('td', changeCls, row.change !== undefined ? fmtCurrency(row.change) : '-'));
      }

      tbody.appendChild(tr);
    }

    // Section subtotal
    const subtotalRow = el('tr', 'bg-[var(--surface)] font-semibold');
    subtotalRow.appendChild(el('td', 'py-2 px-3'));
    subtotalRow.appendChild(el('td', 'py-2 px-3', `Total ${typeLabels[accountType] ?? accountType}`));
    subtotalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(typeTotal)));
    if (showComparative) {
      subtotalRow.appendChild(el('td', 'py-2 px-3'));
      subtotalRow.appendChild(el('td', 'py-2 px-3'));
    }
    tbody.appendChild(subtotalRow);

    if (accountType === 'asset') {
      totalAssets = typeTotal;
    } else {
      totalLiabilitiesEquity += typeTotal;
    }
  }

  // Grand total rows
  if (rows.length > 0) {
    const dividerRow = el('tr', 'border-t-2 border-[var(--border)]');
    const divTd = el('td');
    divTd.setAttribute('colspan', colSpan);
    dividerRow.appendChild(divTd);
    tbody.appendChild(dividerRow);

    const totalAssetsRow = el('tr', 'bg-[var(--surface)] font-bold text-lg');
    totalAssetsRow.appendChild(el('td', 'py-3 px-3'));
    totalAssetsRow.appendChild(el('td', 'py-3 px-3', 'Total Assets'));
    totalAssetsRow.appendChild(el('td', 'py-3 px-3 text-right font-mono', fmtCurrency(totalAssets)));
    if (showComparative) {
      totalAssetsRow.appendChild(el('td', 'py-3 px-3'));
      totalAssetsRow.appendChild(el('td', 'py-3 px-3'));
    }
    tbody.appendChild(totalAssetsRow);

    const totalLERow = el('tr', 'bg-[var(--surface)] font-bold text-lg');
    totalLERow.appendChild(el('td', 'py-3 px-3'));
    totalLERow.appendChild(el('td', 'py-3 px-3', 'Total Liabilities + Equity'));
    totalLERow.appendChild(el('td', 'py-3 px-3 text-right font-mono', fmtCurrency(totalLiabilitiesEquity)));
    if (showComparative) {
      totalLERow.appendChild(el('td', 'py-3 px-3'));
      totalLERow.appendChild(el('td', 'py-3 px-3'));
    }
    tbody.appendChild(totalLERow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Export Bar
// ---------------------------------------------------------------------------

function buildExportBar(wrapper: HTMLElement, getState: () => { rows: BalanceSheetRow[]; style: string }): HTMLElement {
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
      ? ['Account #', 'Account Name', 'Account Type', 'Current Balance', 'Prior Balance', 'Change']
      : ['Account #', 'Account Name', 'Account Type', 'Balance'];
    const csvRows = rows.map(r => {
      const base = [r.accountNumber, r.accountName, r.accountType, String(r.currentBalance)];
      if (showComparative) {
        base.push(String(r.priorBalance ?? ''), String(r.change ?? ''));
      }
      return base;
    });
    exportCSV('balance-sheet.csv', headers, csvRows);
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

let currentRows: BalanceSheetRow[] = [];
let currentStyle = 'standard';

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    wrapper.innerHTML = '';

    currentRows = [];
    currentStyle = 'standard';

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Balance Sheet'));

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const tableContainer = el('div');
    tableContainer.appendChild(buildTable([], 'standard'));

    wrapper.appendChild(buildFilterBar((style, periodEnd, comparePeriodEnd, consolidated) => {
      void (async () => {
        try {
          const svc = getReportsService();
          const config: ReportConfig = {
            reportType: 'balance-sheet',
            periodStart: '1900-01-01',
            periodEnd,
            consolidated,
            style,
          };

          if (style === 'comparative' && comparePeriodEnd) {
            config.comparePeriodStart = '1900-01-01';
            config.comparePeriodEnd = comparePeriodEnd;
          }

          const rows = await svc.generateBalanceSheet(config);
          currentRows = rows;
          currentStyle = style;

          tableContainer.innerHTML = '';
          tableContainer.appendChild(buildTable(rows, style));

          if (rows.length === 0) {
            showMsg(wrapper, 'No balance sheet data found for the selected period.', false);
          } else {
            showMsg(wrapper, `Balance sheet generated: ${rows.length} accounts.`, false);
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
