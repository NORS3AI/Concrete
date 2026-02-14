/**
 * WIP Schedule view.
 * Renders the Work-In-Progress schedule showing earned revenue, overbilling,
 * underbilling, and projected profitability for active jobs. Supports cost,
 * units, and efforts percentage-of-completion methods.
 */

import { getReportsService } from '../service-accessor';
import type { ReportConfig, WipScheduleRow } from '../reports-service';

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

const METHOD_OPTIONS = [
  { value: 'cost', label: 'Cost Method' },
  { value: 'units', label: 'Units Method' },
  { value: 'efforts', label: 'Efforts Method' },
];

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: WipScheduleRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm whitespace-nowrap');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const columns = [
    { name: 'Job #', numeric: false },
    { name: 'Job Name', numeric: false },
    { name: 'Contract', numeric: true },
    { name: 'Budget', numeric: true },
    { name: 'Actual Cost', numeric: true },
    { name: 'ETC', numeric: true },
    { name: 'EAC', numeric: true },
    { name: '% Complete', numeric: true },
    { name: 'Earned Revenue', numeric: true },
    { name: 'Billed', numeric: true },
    { name: 'Over/(Under) Billing', numeric: true },
    { name: 'Proj. Profit', numeric: true },
    { name: 'Margin %', numeric: true },
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
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No WIP data available. Generate the report to see results.');
    td.setAttribute('colspan', '13');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totalContract = 0;
  let totalBudget = 0;
  let totalActual = 0;
  let totalETC = 0;
  let totalEAC = 0;
  let totalEarned = 0;
  let totalBilled = 0;
  let totalOverUnder = 0;
  let totalProfit = 0;

  for (const row of rows) {
    totalContract += row.contractAmount;
    totalBudget += row.totalBudget;
    totalActual += row.actualCostToDate;
    totalETC += row.estimateToComplete;
    totalEAC += row.estimateAtCompletion;
    totalEarned += row.earnedRevenue;
    totalBilled += row.billedToDate;
    totalOverUnder += row.overUnderBilling;
    totalProfit += row.projectedGrossProfit;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium', row.jobNumber));
    tr.appendChild(el('td', 'py-2 px-3', row.jobName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.contractAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalBudget)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.actualCostToDate)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.estimateToComplete)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.estimateAtCompletion)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtPct(row.percentComplete)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.earnedRevenue)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.billedToDate)));

    const overUnderCls = row.overUnderBilling >= 0
      ? 'py-2 px-3 text-right font-mono text-amber-400'
      : 'py-2 px-3 text-right font-mono text-blue-400';
    tr.appendChild(el('td', overUnderCls, fmtCurrency(row.overUnderBilling)));

    const profitCls = row.projectedGrossProfit >= 0
      ? 'py-2 px-3 text-right font-mono text-emerald-400'
      : 'py-2 px-3 text-right font-mono text-red-400';
    tr.appendChild(el('td', profitCls, fmtCurrency(row.projectedGrossProfit)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtPct(row.projectedMarginPct)));

    tbody.appendChild(tr);
  }

  if (rows.length > 0) {
    const totalRow = el('tr', 'bg-[var(--surface)] font-bold border-t-2 border-[var(--border)]');
    totalRow.appendChild(el('td', 'py-2 px-3', 'Totals'));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalContract)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalBudget)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalActual)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalETC)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalEAC)));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalEarned)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalBilled)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalOverUnder)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalProfit)));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    tbody.appendChild(totalRow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Main wrapper
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

function buildView(): void {
  wrapper.innerHTML = '';

  // Header
  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'WIP Schedule'));
  const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
  backLink.href = '#/reports';
  headerRow.appendChild(backLink);
  wrapper.appendChild(headerRow);

  // Control bar
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const methodSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of METHOD_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    methodSelect.appendChild(o);
  }
  bar.appendChild(methodSelect);

  const jobInput = el('input', inputCls) as HTMLInputElement;
  jobInput.type = 'text';
  jobInput.placeholder = 'Filter by Job ID (blank = all)...';
  bar.appendChild(jobInput);

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  bar.appendChild(applyBtn);
  wrapper.appendChild(bar);

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
  let currentRows: WipScheduleRow[] = [];

  // Generate handler
  applyBtn.addEventListener('click', () => {
    const method = methodSelect.value as 'cost' | 'units' | 'efforts';
    const jobId = jobInput.value.trim() || undefined;

    const config: ReportConfig = {
      reportType: 'wip-schedule',
      method,
      jobId,
      periodStart: '',
      periodEnd: '',
    };

    void (async () => {
      try {
        const svc = getReportsService();
        const rows = await svc.generateWipSchedule(config);
        currentRows = rows;
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(rows));
        showMsg(wrapper, `WIP schedule generated: ${rows.length} job(s)`, false);
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
      'Job #', 'Job Name', 'Contract', 'Budget', 'Actual Cost', 'ETC', 'EAC',
      '% Complete', 'Earned Revenue', 'Billed', 'Over/(Under) Billing',
      'Proj. Profit', 'Margin %',
    ];
    const csvRows = currentRows.map(r => [
      r.jobNumber,
      r.jobName,
      r.contractAmount.toString(),
      r.totalBudget.toString(),
      r.actualCostToDate.toString(),
      r.estimateToComplete.toString(),
      r.estimateAtCompletion.toString(),
      r.percentComplete.toFixed(1),
      r.earnedRevenue.toString(),
      r.billedToDate.toString(),
      r.overUnderBilling.toString(),
      r.projectedGrossProfit.toString(),
      r.projectedMarginPct.toFixed(1),
    ]);
    exportCSV('wip-schedule.csv', headers, csvRows);
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
