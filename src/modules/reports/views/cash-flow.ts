/**
 * Cash Flow Statement view.
 * Renders the cash flow statement with support for direct and indirect methods.
 * Shows operating, investing, and financing categories with period selection
 * and export controls.
 * Wired to ReportsService.generateCashFlowStatement().
 */

import { getReportsService } from '../service-accessor';
import type { ReportConfig, CashFlowRow } from '../reports-service';

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

const fmtCashFlow = (v: number): string =>
  v < 0 ? `(${fmtCurrency(Math.abs(v))})` : fmtCurrency(v);

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

const METHOD_OPTIONS = [
  { value: 'indirect', label: 'Indirect Method' },
  { value: 'direct', label: 'Direct Method' },
];

const CATEGORY_LABELS: Record<string, string> = {
  operating: 'Cash from Operating Activities',
  investing: 'Cash from Investing Activities',
  financing: 'Cash from Financing Activities',
};

const CATEGORY_ORDER: Record<string, number> = {
  operating: 1,
  investing: 2,
  financing: 3,
};

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onApply: (method: string, periodStart: string, periodEnd: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const methodSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of METHOD_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    methodSelect.appendChild(o);
  }
  bar.appendChild(methodSelect);

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

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  applyBtn.addEventListener('click', () => {
    onApply(methodSelect.value, periodStartInput.value, periodEndInput.value);
  });
  bar.appendChild(applyBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: CashFlowRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  headRow.appendChild(el('th', 'py-2 px-3 font-medium', 'Description'));
  headRow.appendChild(el('th', 'py-2 px-3 font-medium text-right', 'Amount'));
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No cash flow data available. Select a period and generate the report.');
    td.setAttribute('colspan', '2');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  const sorted = [...rows].sort((a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99));

  let currentCategory = '';
  let categoryTotal = 0;
  let grandTotal = 0;

  for (const row of sorted) {
    if (row.category !== currentCategory) {
      if (currentCategory) {
        // Subtotal for previous category
        const subtotalRow = el('tr', 'bg-[var(--surface)] font-semibold');
        subtotalRow.appendChild(el('td', 'py-2 px-3', `Net ${CATEGORY_LABELS[currentCategory] ?? currentCategory}`));
        const subtotalCls = categoryTotal >= 0
          ? 'py-2 px-3 text-right font-mono text-emerald-400'
          : 'py-2 px-3 text-right font-mono text-red-400';
        subtotalRow.appendChild(el('td', subtotalCls, fmtCashFlow(categoryTotal)));
        tbody.appendChild(subtotalRow);
        grandTotal += categoryTotal;
        categoryTotal = 0;
      }
      currentCategory = row.category;

      // Section header
      const sectionRow = el('tr', 'bg-[var(--surface)]');
      const sectionTd = el('td', 'py-2 px-3 font-semibold text-[var(--accent)]', CATEGORY_LABELS[currentCategory] ?? currentCategory);
      sectionTd.setAttribute('colspan', '2');
      sectionRow.appendChild(sectionTd);
      tbody.appendChild(sectionRow);
    }

    categoryTotal += row.amount;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 pl-6', row.description));
    const amtCls = row.amount >= 0
      ? 'py-2 px-3 text-right font-mono text-emerald-400'
      : 'py-2 px-3 text-right font-mono text-red-400';
    tr.appendChild(el('td', amtCls, fmtCashFlow(row.amount)));

    tbody.appendChild(tr);
  }

  // Final category subtotal
  if (currentCategory) {
    const subtotalRow = el('tr', 'bg-[var(--surface)] font-semibold');
    subtotalRow.appendChild(el('td', 'py-2 px-3', `Net ${CATEGORY_LABELS[currentCategory] ?? currentCategory}`));
    const subtotalCls = categoryTotal >= 0
      ? 'py-2 px-3 text-right font-mono text-emerald-400'
      : 'py-2 px-3 text-right font-mono text-red-400';
    subtotalRow.appendChild(el('td', subtotalCls, fmtCashFlow(categoryTotal)));
    tbody.appendChild(subtotalRow);
    grandTotal += categoryTotal;
  }

  // Grand total: Net Change in Cash
  if (rows.length > 0) {
    const grandTotalRow = el('tr', 'bg-[var(--surface)] font-bold text-lg border-t-2 border-[var(--border)]');
    grandTotalRow.appendChild(el('td', 'py-3 px-3', 'Net Change in Cash'));
    const grandCls = grandTotal >= 0
      ? 'py-3 px-3 text-right font-mono text-emerald-400'
      : 'py-3 px-3 text-right font-mono text-red-400';
    grandTotalRow.appendChild(el('td', grandCls, fmtCashFlow(grandTotal)));
    tbody.appendChild(grandTotalRow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Export Bar
// ---------------------------------------------------------------------------

function buildExportBar(wrapper: HTMLElement, getRows: () => CashFlowRow[]): HTMLElement {
  const bar = el('div', 'flex items-center gap-3 mt-4');
  bar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Export:'));

  const csvBtn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'CSV');
  csvBtn.addEventListener('click', () => {
    const rows = getRows();
    if (rows.length === 0) {
      showMsg(wrapper, 'No data to export. Generate the report first.', true);
      return;
    }
    const headers = ['Category', 'Description', 'Amount'];
    const csvRows = rows.map(r => [r.category, r.description, String(r.amount)]);
    exportCSV('cash-flow.csv', headers, csvRows);
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

let currentRows: CashFlowRow[] = [];

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    wrapper.innerHTML = '';

    currentRows = [];

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Cash Flow Statement'));

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const tableContainer = el('div');
    tableContainer.appendChild(buildTable([]));

    wrapper.appendChild(buildFilterBar((method, periodStart, periodEnd) => {
      void (async () => {
        try {
          const svc = getReportsService();
          const config: ReportConfig = {
            reportType: 'cash-flow',
            periodStart,
            periodEnd,
            method,
          };

          const rows = await svc.generateCashFlowStatement(config);
          currentRows = rows;

          tableContainer.innerHTML = '';
          tableContainer.appendChild(buildTable(rows));

          if (rows.length === 0) {
            showMsg(wrapper, 'No cash flow data found for the selected period.', false);
          } else {
            showMsg(wrapper, `Cash flow statement generated: ${rows.length} line items.`, false);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      })();
    }));

    wrapper.appendChild(tableContainer);
    wrapper.appendChild(buildExportBar(wrapper, () => currentRows));

    container.appendChild(wrapper);
  },
};
