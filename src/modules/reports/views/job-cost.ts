/**
 * Job Cost view.
 * Renders job cost detail and summary reports showing budget vs. actual,
 * committed costs, projected costs, and profitability analysis.
 */

import { getReportsService } from '../service-accessor';
import type { JobCostSummaryRow } from '../reports-service';

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

function buildTable(rows: JobCostSummaryRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm whitespace-nowrap');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const columns = [
    { name: 'Job #', numeric: false },
    { name: 'Job Name', numeric: false },
    { name: 'Contract', numeric: true },
    { name: 'Change Orders', numeric: true },
    { name: 'Revised Contract', numeric: true },
    { name: 'Budget', numeric: true },
    { name: 'Actual Cost', numeric: true },
    { name: 'Committed', numeric: true },
    { name: 'Projected Cost', numeric: true },
    { name: 'Projected Profit', numeric: true },
    { name: 'Margin %', numeric: true },
    { name: '% Complete', numeric: true },
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
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No job cost data available. Generate the report to see results.');
    td.setAttribute('colspan', '12');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totalContract = 0;
  let totalCO = 0;
  let totalRevised = 0;
  let totalBudget = 0;
  let totalActual = 0;
  let totalCommitted = 0;
  let totalProjCost = 0;
  let totalProfit = 0;

  for (const row of rows) {
    totalContract += row.contractAmount;
    totalCO += row.approvedChangeOrders;
    totalRevised += row.revisedContract;
    totalBudget += row.totalBudget;
    totalActual += row.actualCostToDate;
    totalCommitted += row.committedCost;
    totalProjCost += row.projectedCost;
    totalProfit += row.projectedProfit;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium', row.jobNumber));
    tr.appendChild(el('td', 'py-2 px-3', row.jobName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.contractAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.approvedChangeOrders)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.revisedContract)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalBudget)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.actualCostToDate)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.committedCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.projectedCost)));

    const profitCls = row.projectedProfit >= 0
      ? 'py-2 px-3 text-right font-mono text-emerald-400'
      : 'py-2 px-3 text-right font-mono text-red-400';
    tr.appendChild(el('td', profitCls, fmtCurrency(row.projectedProfit)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtPct(row.projectedMarginPct)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtPct(row.percentComplete)));

    tbody.appendChild(tr);
  }

  if (rows.length > 0) {
    const totalRow = el('tr', 'bg-[var(--surface)] font-bold border-t-2 border-[var(--border)]');
    totalRow.appendChild(el('td', 'py-2 px-3', 'Totals'));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalContract)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalCO)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalRevised)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalBudget)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalActual)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalCommitted)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalProjCost)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalProfit)));
    totalRow.appendChild(el('td', 'py-2 px-3'));
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
  headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Job Cost Reports'));
  const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
  backLink.href = '#/reports';
  headerRow.appendChild(backLink);
  wrapper.appendChild(headerRow);

  // Control bar
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

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
  let currentRows: JobCostSummaryRow[] = [];

  // Generate handler
  applyBtn.addEventListener('click', () => {
    const jobId = jobInput.value.trim() || undefined;

    void (async () => {
      try {
        const svc = getReportsService();
        const rows = await svc.generateJobCostSummary(jobId);
        currentRows = rows;
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(rows));
        showMsg(wrapper, `Job cost summary generated: ${rows.length} job(s)`, false);
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
      'Job #', 'Job Name', 'Contract', 'Change Orders', 'Revised Contract',
      'Budget', 'Actual Cost', 'Committed', 'Projected Cost',
      'Projected Profit', 'Margin %', '% Complete',
    ];
    const csvRows = currentRows.map(r => [
      r.jobNumber,
      r.jobName,
      r.contractAmount.toString(),
      r.approvedChangeOrders.toString(),
      r.revisedContract.toString(),
      r.totalBudget.toString(),
      r.actualCostToDate.toString(),
      r.committedCost.toString(),
      r.projectedCost.toString(),
      r.projectedProfit.toString(),
      r.projectedMarginPct.toFixed(1),
      r.percentComplete.toFixed(1),
    ]);
    exportCSV('job-cost-summary.csv', headers, csvRows);
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
