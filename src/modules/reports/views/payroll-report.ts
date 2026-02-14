/**
 * Payroll Report view.
 * Renders payroll summary and detail reports by employee, department,
 * and period showing gross pay, taxes, deductions, and net pay.
 */

import { getReportsService } from '../service-accessor';
import type { PayrollSummaryRow } from '../reports-service';

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

function buildTable(rows: PayrollSummaryRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm whitespace-nowrap');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const columns = [
    { name: 'Employee', numeric: false },
    { name: 'Dept', numeric: false },
    { name: 'Gross Pay', numeric: true },
    { name: 'Federal Tax', numeric: true },
    { name: 'State Tax', numeric: true },
    { name: 'FICA SS', numeric: true },
    { name: 'FICA Med', numeric: true },
    { name: 'Deductions', numeric: true },
    { name: 'Net Pay', numeric: true },
    { name: 'Hours', numeric: true },
    { name: 'OT Hours', numeric: true },
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
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No payroll data available. Select a period and generate the report.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totalGross = 0;
  let totalFederal = 0;
  let totalState = 0;
  let totalFicaSS = 0;
  let totalFicaMed = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let totalHours = 0;
  let totalOT = 0;

  for (const row of rows) {
    totalGross += row.totalGross;
    totalFederal += row.totalFederalTax;
    totalState += row.totalStateTax;
    totalFicaSS += row.totalFicaSS;
    totalFicaMed += row.totalFicaMed;
    totalDeductions += row.totalDeductions;
    totalNet += row.totalNet;
    totalHours += row.totalHours;
    totalOT += row.totalOvertimeHours;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium', row.employeeName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.department || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalGross)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalFederalTax)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalStateTax)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalFicaSS)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalFicaMed)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalDeductions)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalNet)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.totalHours.toFixed(1)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.totalOvertimeHours.toFixed(1)));

    tbody.appendChild(tr);
  }

  if (rows.length > 0) {
    const totalRow = el('tr', 'bg-[var(--surface)] font-bold border-t-2 border-[var(--border)]');
    totalRow.appendChild(el('td', 'py-2 px-3', `Totals (${rows.length} employees)`));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalGross)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalFederal)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalState)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalFicaSS)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalFicaMed)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalDeductions)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalNet)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', totalHours.toFixed(1)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', totalOT.toFixed(1)));
    tbody.appendChild(totalRow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------

function buildKpiCards(rows: PayrollSummaryRow[]): HTMLElement {
  const container = el('div', 'grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4');

  const totalEmployees = rows.length;
  const totalGross = rows.reduce((sum, r) => sum + r.totalGross, 0);
  const totalNet = rows.reduce((sum, r) => sum + r.totalNet, 0);
  const totalHours = rows.reduce((sum, r) => sum + r.totalHours, 0);

  const cards = [
    { label: 'Total Employees', value: totalEmployees.toString() },
    { label: 'Total Gross', value: fmtCurrency(totalGross) },
    { label: 'Total Net', value: fmtCurrency(totalNet) },
    { label: 'Total Hours', value: totalHours.toFixed(1) },
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
  headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Payroll Reports'));
  const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
  backLink.href = '#/reports';
  headerRow.appendChild(backLink);
  wrapper.appendChild(headerRow);

  // Control bar
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  // Default to current month
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const fromLabel = el('label', 'text-sm text-[var(--text-muted)]', 'From:');
  bar.appendChild(fromLabel);
  const periodStartInput = el('input', inputCls) as HTMLInputElement;
  periodStartInput.type = 'date';
  periodStartInput.value = firstOfMonth.toISOString().split('T')[0];
  bar.appendChild(periodStartInput);

  const toLabel = el('label', 'text-sm text-[var(--text-muted)]', 'To:');
  bar.appendChild(toLabel);
  const periodEndInput = el('input', inputCls) as HTMLInputElement;
  periodEndInput.type = 'date';
  periodEndInput.value = lastOfMonth.toISOString().split('T')[0];
  bar.appendChild(periodEndInput);

  const deptInput = el('input', inputCls) as HTMLInputElement;
  deptInput.type = 'text';
  deptInput.placeholder = 'Department filter...';
  bar.appendChild(deptInput);

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  bar.appendChild(applyBtn);
  wrapper.appendChild(bar);

  // KPI cards placeholder
  const kpiContainer = el('div');
  wrapper.appendChild(kpiContainer);

  // Table placeholder
  const tableContainer = el('div');
  tableContainer.appendChild(buildTable([]));
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
  let currentRows: PayrollSummaryRow[] = [];

  // Generate handler
  applyBtn.addEventListener('click', () => {
    const periodStart = periodStartInput.value;
    const periodEnd = periodEndInput.value;
    const deptFilter = deptInput.value.trim().toLowerCase();

    if (!periodStart || !periodEnd) {
      showMsg(wrapper, 'Please select both a start and end date.', true);
      return;
    }

    void (async () => {
      try {
        const svc = getReportsService();
        let rows = await svc.generatePayrollSummary(periodStart, periodEnd);

        // Client-side department filtering
        if (deptFilter) {
          rows = rows.filter(r =>
            r.department && r.department.toLowerCase().includes(deptFilter),
          );
        }

        currentRows = rows;

        // Rebuild KPI cards
        kpiContainer.innerHTML = '';
        kpiContainer.appendChild(buildKpiCards(rows));

        // Rebuild table
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(rows));

        showMsg(wrapper, `Payroll summary generated: ${rows.length} employee(s)`, false);
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
    const headers = [
      'Employee', 'Dept', 'Gross Pay', 'Federal Tax', 'State Tax',
      'FICA SS', 'FICA Med', 'Deductions', 'Net Pay', 'Hours', 'OT Hours',
    ];
    const csvRows = currentRows.map(r => [
      r.employeeName,
      r.department || '',
      r.totalGross.toString(),
      r.totalFederalTax.toString(),
      r.totalStateTax.toString(),
      r.totalFicaSS.toString(),
      r.totalFicaMed.toString(),
      r.totalDeductions.toString(),
      r.totalNet.toString(),
      r.totalHours.toFixed(1),
      r.totalOvertimeHours.toFixed(1),
    ]);
    exportCSV('payroll-summary.csv', headers, csvRows);
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
