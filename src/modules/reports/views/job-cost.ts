/**
 * Job Cost view.
 * Renders job cost detail and summary reports showing budget vs. actual,
 * committed costs, projected costs, and profitability analysis.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPORT_TYPE_OPTIONS = [
  { value: 'summary', label: 'Job Cost Summary' },
  { value: 'detail', label: 'Job Cost Detail' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobCostDisplayRow {
  jobNumber: string;
  jobName: string;
  contractAmount: number;
  approvedChangeOrders: number;
  revisedContract: number;
  totalBudget: number;
  actualCostToDate: number;
  committedCost: number;
  projectedCost: number;
  projectedProfit: number;
  projectedMarginPct: number;
  percentComplete: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onApply: (reportType: string, jobFilter: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of REPORT_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const jobInput = el('input', inputCls) as HTMLInputElement;
  jobInput.type = 'text';
  jobInput.placeholder = 'Filter by Job Number...';
  bar.appendChild(jobInput);

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  applyBtn.addEventListener('click', () => {
    onApply(typeSelect.value, jobInput.value);
  });
  bar.appendChild(applyBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Table
// ---------------------------------------------------------------------------

function buildSummaryTable(rows: JobCostDisplayRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm whitespace-nowrap');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const columns = [
    { name: 'Job', numeric: false },
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
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium', `${row.jobNumber} - ${row.jobName}`));
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

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Export Bar
// ---------------------------------------------------------------------------

function buildExportBar(): HTMLElement {
  const bar = el('div', 'flex items-center gap-3 mt-4');
  bar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Export:'));

  for (const format of ['PDF', 'CSV', 'Excel']) {
    const btn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', format);
    bar.appendChild(btn);
  }

  return bar;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Job Cost Reports'));

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_reportType, _jobFilter) => {
      /* filter action placeholder */
    }));

    const rows: JobCostDisplayRow[] = [];
    wrapper.appendChild(buildSummaryTable(rows));
    wrapper.appendChild(buildExportBar());

    container.appendChild(wrapper);
  },
};
