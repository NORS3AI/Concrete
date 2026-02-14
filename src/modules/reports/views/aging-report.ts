/**
 * Aging Report view.
 * Renders aged AP and AR reports with current, 30, 60, 90, and 120+ day
 * aging buckets. Supports toggle between AP and AR aging.
 */

import { getReportsService } from '../service-accessor';
import type { AgingReportRow } from '../reports-service';

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
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: AgingReportRow[], type: 'ap' | 'ar'): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm');

  const entityLabel = type === 'ap' ? 'Vendor' : 'Customer';

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const columns = [
    { name: `${entityLabel} Name`, numeric: false },
    { name: 'Current', numeric: true },
    { name: '31-60 Days', numeric: true },
    { name: '61-90 Days', numeric: true },
    { name: '91-120 Days', numeric: true },
    { name: '120+ Days', numeric: true },
    { name: 'Total', numeric: true },
  ];

  for (const col of columns) {
    const align = col.numeric ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col.name));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No aging data available. Generate the report to see results.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let grandCurrent = 0;
  let grand30 = 0;
  let grand60 = 0;
  let grand90 = 0;
  let grand120 = 0;
  let grandTotal = 0;

  for (const row of rows) {
    grandCurrent += row.current;
    grand30 += row.days30;
    grand60 += row.days60;
    grand90 += row.days90;
    grand120 += row.days120Plus;
    grandTotal += row.total;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium', row.entityName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.current)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.days30)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.days60)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.days90)));

    const overdueCls = row.days120Plus > 0
      ? 'py-2 px-3 text-right font-mono text-red-400'
      : 'py-2 px-3 text-right font-mono';
    tr.appendChild(el('td', overdueCls, fmtCurrency(row.days120Plus)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-semibold', fmtCurrency(row.total)));

    tbody.appendChild(tr);
  }

  if (rows.length > 0) {
    const totalRow = el('tr', 'bg-[var(--surface)] font-bold border-t-2 border-[var(--border)]');
    totalRow.appendChild(el('td', 'py-2 px-3', 'Grand Total'));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(grandCurrent)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(grand30)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(grand60)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(grand90)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(grand120)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(grandTotal)));
    tbody.appendChild(totalRow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------

function buildKpiCards(rows: AgingReportRow[]): HTMLElement {
  const container = el('div', 'grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4');

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const grandCurrent = rows.reduce((sum, r) => sum + r.current, 0);
  const over90 = rows.reduce((sum, r) => sum + r.days90 + r.days120Plus, 0);

  const currentPct = grandTotal > 0 ? (grandCurrent / grandTotal) * 100 : 0;
  const over90Pct = grandTotal > 0 ? (over90 / grandTotal) * 100 : 0;

  const cards = [
    { label: 'Total Outstanding', value: fmtCurrency(grandTotal) },
    { label: 'Current %', value: fmtPct(currentPct) },
    { label: 'Over 90 Days %', value: fmtPct(over90Pct) },
  ];

  for (const card of cards) {
    const cardEl = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    cardEl.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', card.label));
    cardEl.appendChild(el('div', 'text-xl font-bold text-[var(--text)]', card.value));
    container.appendChild(cardEl);
  }

  return container;
}

// ---------------------------------------------------------------------------
// Main wrapper
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

function buildView(): void {
  wrapper.innerHTML = '';

  // Header
  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Aging Reports'));
  const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
  backLink.href = '#/reports';
  headerRow.appendChild(backLink);
  wrapper.appendChild(headerRow);

  // Control bar
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const activeBtnCls = 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white';
  const inactiveBtnCls = 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]';

  let selectedType: 'ap' | 'ar' = 'ap';

  const apBtn = el('button', activeBtnCls, 'AP');
  const arBtn = el('button', inactiveBtnCls, 'AR');

  apBtn.addEventListener('click', () => {
    selectedType = 'ap';
    apBtn.className = activeBtnCls;
    arBtn.className = inactiveBtnCls;
  });

  arBtn.addEventListener('click', () => {
    selectedType = 'ar';
    arBtn.className = activeBtnCls;
    apBtn.className = inactiveBtnCls;
  });

  bar.appendChild(apBtn);
  bar.appendChild(arBtn);

  const asOfLabel = el('label', 'text-sm text-[var(--text-muted)]', 'As of:');
  bar.appendChild(asOfLabel);
  const asOfInput = el('input', inputCls) as HTMLInputElement;
  asOfInput.type = 'date';
  asOfInput.value = new Date().toISOString().split('T')[0];
  bar.appendChild(asOfInput);

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  bar.appendChild(applyBtn);
  wrapper.appendChild(bar);

  // KPI cards placeholder
  const kpiContainer = el('div');
  wrapper.appendChild(kpiContainer);

  // Table placeholder
  const tableContainer = el('div');
  tableContainer.appendChild(buildTable([], 'ap'));
  wrapper.appendChild(tableContainer);

  // Export bar
  const exportBar = el('div', 'flex items-center gap-3 mt-4');
  const backLink2 = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
  backLink2.href = '#/reports';
  exportBar.appendChild(backLink2);

  const csvBtn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Export CSV');
  exportBar.appendChild(csvBtn);
  wrapper.appendChild(exportBar);

  // State for current data
  let currentRows: AgingReportRow[] = [];
  let currentType: 'ap' | 'ar' = 'ap';

  // Generate handler
  applyBtn.addEventListener('click', () => {
    const asOfDate = asOfInput.value;
    if (!asOfDate) {
      showMsg(wrapper, 'Please select an As Of date.', true);
      return;
    }

    currentType = selectedType;

    void (async () => {
      try {
        const svc = getReportsService();
        const rows = await svc.generateAgingReport(selectedType, asOfDate);
        currentRows = rows;

        // Rebuild KPI cards
        kpiContainer.innerHTML = '';
        kpiContainer.appendChild(buildKpiCards(rows));

        // Rebuild table
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(rows, selectedType));

        const typeLabel = selectedType === 'ap' ? 'AP' : 'AR';
        showMsg(wrapper, `${typeLabel} aging report generated: ${rows.length} ${selectedType === 'ap' ? 'vendor' : 'customer'}(s)`, false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Operation failed';
        showMsg(wrapper, message, true);
      }
    })();
  });

  // Export CSV handler
  csvBtn.addEventListener('click', () => {
    if (currentRows.length === 0) {
      showMsg(wrapper, 'No data to export. Generate the report first.', true);
      return;
    }
    const entityLabel = currentType === 'ap' ? 'Vendor' : 'Customer';
    const headers = [
      `${entityLabel} Name`, 'Current', '31-60 Days', '61-90 Days',
      '91-120 Days', '120+ Days', 'Total',
    ];
    const csvRows = currentRows.map(r => [
      r.entityName,
      r.current.toString(),
      r.days30.toString(),
      r.days60.toString(),
      r.days90.toString(),
      r.days120Plus.toString(),
      r.total.toString(),
    ]);
    const filename = currentType === 'ap' ? 'aging-ap.csv' : 'aging-ar.csv';
    exportCSV(filename, headers, csvRows);
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

void (async () => {
  try {
    const svc = getReportsService();
    void svc; // validate service is available
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    showMsg(wrapper, message, true);
  }
})();

buildView();

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};
