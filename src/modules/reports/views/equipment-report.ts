/**
 * Equipment Report view.
 * Renders equipment utilization reports showing hours, cost analysis,
 * job allocation, and utilization percentages. Wired to ReportsService.
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

const REPORT_TYPE_OPTIONS = [
  { value: 'utilization', label: 'Utilization Report' },
];

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

interface EquipmentRow {
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  totalHours: number;
  totalCost: number;
  averageHourlyRate: number;
  utilizationPct: number;
  jobBreakdown: Array<{ jobId: string; hours: number; cost: number }>;
}

let currentRows: EquipmentRow[] = [];

function buildKpiCards(rows: EquipmentRow[]): HTMLElement {
  const grid = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6');

  const totalEquipment = rows.length;
  const avgUtilization = rows.length > 0
    ? rows.reduce((s, r) => s + r.utilizationPct, 0) / rows.length
    : 0;
  const totalHours = rows.reduce((s, r) => s + r.totalHours, 0);
  const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);

  const cardCls = 'p-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg';

  const c1 = el('div', cardCls);
  c1.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', 'Total Equipment'));
  c1.appendChild(el('div', 'text-xl font-bold font-mono text-[var(--text)]', String(totalEquipment)));
  grid.appendChild(c1);

  const c2 = el('div', cardCls);
  c2.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', 'Avg Utilization'));
  const utilCls = avgUtilization >= 75 ? 'text-xl font-bold font-mono text-emerald-400'
    : avgUtilization >= 50 ? 'text-xl font-bold font-mono text-amber-400'
    : 'text-xl font-bold font-mono text-red-400';
  c2.appendChild(el('div', utilCls, fmtPct(avgUtilization)));
  grid.appendChild(c2);

  const c3 = el('div', cardCls);
  c3.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', 'Total Hours'));
  c3.appendChild(el('div', 'text-xl font-bold font-mono text-[var(--text)]', totalHours.toFixed(1)));
  grid.appendChild(c3);

  const c4 = el('div', cardCls);
  c4.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', 'Total Cost'));
  c4.appendChild(el('div', 'text-xl font-bold font-mono text-[var(--text)]', fmtCurrency(totalCost)));
  grid.appendChild(c4);

  return grid;
}

function buildTable(rows: EquipmentRow[], tableContainer: HTMLElement): void {
  tableContainer.innerHTML = '';

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const columns = [
    { name: 'Equipment Code', numeric: false },
    { name: 'Name', numeric: false },
    { name: 'Total Hours', numeric: true },
    { name: 'Total Cost', numeric: true },
    { name: 'Avg Rate/Hr', numeric: true },
    { name: 'Utilization %', numeric: true },
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
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No equipment data available. Select a period and generate the report.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totalHours = 0;
  let totalCost = 0;

  for (const row of rows) {
    totalHours += row.totalHours;
    totalCost += row.totalCost;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors cursor-pointer');
    tr.appendChild(el('td', 'py-2 px-3 font-medium', row.equipmentCode));
    tr.appendChild(el('td', 'py-2 px-3', row.equipmentName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.totalHours.toFixed(1)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.averageHourlyRate)));

    const utilCls = row.utilizationPct >= 75
      ? 'py-2 px-3 text-right font-mono text-emerald-400'
      : row.utilizationPct >= 50
      ? 'py-2 px-3 text-right font-mono text-amber-400'
      : 'py-2 px-3 text-right font-mono text-red-400';
    tr.appendChild(el('td', utilCls, fmtPct(row.utilizationPct)));

    // Expandable detail row for job breakdown
    const detailRow = el('tr', 'hidden');
    const detailTd = el('td', 'py-2 px-3 bg-[var(--surface)]');
    detailTd.setAttribute('colspan', '6');

    if (row.jobBreakdown.length > 0) {
      const detailTable = el('table', 'w-full text-xs ml-6');
      const dHead = el('thead');
      const dHeadRow = el('tr', 'text-left text-[var(--text-muted)]');
      dHeadRow.appendChild(el('th', 'py-1 px-2 font-medium', 'Job ID'));
      dHeadRow.appendChild(el('th', 'py-1 px-2 font-medium text-right', 'Hours'));
      dHeadRow.appendChild(el('th', 'py-1 px-2 font-medium text-right', 'Cost'));
      dHead.appendChild(dHeadRow);
      detailTable.appendChild(dHead);

      const dBody = el('tbody');
      for (const jb of row.jobBreakdown) {
        const dtr = el('tr', 'border-b border-[var(--border)]');
        dtr.appendChild(el('td', 'py-1 px-2 font-mono', jb.jobId));
        dtr.appendChild(el('td', 'py-1 px-2 text-right font-mono', jb.hours.toFixed(1)));
        dtr.appendChild(el('td', 'py-1 px-2 text-right font-mono', fmtCurrency(jb.cost)));
        dBody.appendChild(dtr);
      }
      detailTable.appendChild(dBody);
      detailTd.appendChild(detailTable);
    } else {
      detailTd.appendChild(el('span', 'text-xs text-[var(--text-muted)] italic ml-6', 'No job breakdown available.'));
    }

    detailRow.appendChild(detailTd);

    tr.addEventListener('click', () => {
      detailRow.classList.toggle('hidden');
    });

    tbody.appendChild(tr);
    tbody.appendChild(detailRow);
  }

  if (rows.length > 0) {
    const totalRow = el('tr', 'bg-[var(--surface)] font-bold border-t-2 border-[var(--border)]');
    totalRow.appendChild(el('td', 'py-2 px-3', `Totals (${rows.length} items)`));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', totalHours.toFixed(1)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalCost)));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    tbody.appendChild(totalRow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  tableContainer.appendChild(wrap);
}

function renderContent(): void {
  wrapper.innerHTML = '';

  // Header
  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment Reports'));
  const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
  backLink.href = '#/reports';
  headerRow.appendChild(backLink);
  wrapper.appendChild(headerRow);

  // Filter bar
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of REPORT_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

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
  bar.appendChild(applyBtn);
  wrapper.appendChild(bar);

  // KPI cards placeholder
  const kpiContainer = el('div');
  wrapper.appendChild(kpiContainer);

  // Table container
  const tableContainer = el('div');
  buildTable([], tableContainer);
  wrapper.appendChild(tableContainer);

  // Export bar
  const exportBar = el('div', 'flex items-center gap-3 mt-4');
  exportBar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Export:'));
  const csvBtn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'CSV');
  csvBtn.addEventListener('click', () => {
    if (currentRows.length === 0) {
      showMsg(wrapper, 'No data to export. Generate a report first.', true);
      return;
    }
    const headers = ['Equipment Code', 'Name', 'Total Hours', 'Total Cost', 'Avg Rate/Hr', 'Utilization %'];
    const csvRows = currentRows.map(r => [
      r.equipmentCode,
      r.equipmentName,
      r.totalHours.toFixed(1),
      r.totalCost.toFixed(2),
      r.averageHourlyRate.toFixed(2),
      r.utilizationPct.toFixed(1),
    ]);
    exportCSV('equipment-utilization.csv', headers, csvRows);
    showMsg(wrapper, 'CSV exported successfully.', false);
  });
  exportBar.appendChild(csvBtn);
  wrapper.appendChild(exportBar);

  // Generate button handler
  applyBtn.addEventListener('click', () => {
    const periodStart = periodStartInput.value;
    const periodEnd = periodEndInput.value;

    if (!periodStart || !periodEnd) {
      showMsg(wrapper, 'Please select both start and end dates.', true);
      return;
    }

    void (async () => {
      try {
        const svc = getReportsService();
        const rows = await svc.generateEquipmentUtilization(periodStart, periodEnd);
        currentRows = rows;

        // Update KPI cards
        kpiContainer.innerHTML = '';
        kpiContainer.appendChild(buildKpiCards(rows));

        // Update table
        buildTable(rows, tableContainer);

        showMsg(wrapper, `Report generated: ${rows.length} equipment items found.`, false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Operation failed';
        showMsg(wrapper, message, true);
      }
    })();
  });
}

void (async () => {
  try {
    const svc = getReportsService();
    void svc; // verify service is available
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    showMsg(wrapper, message, true);
  }
})();

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    currentRows = [];
    renderContent();
    container.appendChild(wrapper);
  },
};
