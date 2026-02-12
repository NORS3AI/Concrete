/**
 * WIP Schedule view.
 * Renders the Work-In-Progress schedule showing earned revenue, overbilling,
 * underbilling, and projected profitability for active jobs. Supports cost,
 * units, and efforts percentage-of-completion methods.
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

const METHOD_OPTIONS = [
  { value: 'cost', label: 'Cost Method' },
  { value: 'units', label: 'Units Method' },
  { value: 'efforts', label: 'Efforts Method' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WipDisplayRow {
  jobNumber: string;
  jobName: string;
  contractAmount: number;
  actualCostToDate: number;
  estimateToComplete: number;
  estimateAtCompletion: number;
  percentComplete: number;
  earnedRevenue: number;
  billedToDate: number;
  overUnderBilling: number;
  projectedGrossProfit: number;
  projectedMarginPct: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onApply: (method: string, jobId: string) => void,
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

  const jobInput = el('input', inputCls) as HTMLInputElement;
  jobInput.type = 'text';
  jobInput.placeholder = 'Filter by Job Number...';
  bar.appendChild(jobInput);

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  applyBtn.addEventListener('click', () => {
    onApply(methodSelect.value, jobInput.value);
  });
  bar.appendChild(applyBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: WipDisplayRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm whitespace-nowrap');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const columns = [
    { name: 'Job', numeric: false },
    { name: 'Contract', numeric: true },
    { name: 'Actual Cost', numeric: true },
    { name: 'ETC', numeric: true },
    { name: 'EAC', numeric: true },
    { name: '% Complete', numeric: true },
    { name: 'Earned Revenue', numeric: true },
    { name: 'Billed', numeric: true },
    { name: 'Over/(Under)', numeric: true },
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
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totalContract = 0;
  let totalActual = 0;
  let totalEarned = 0;
  let totalBilled = 0;
  let totalOverUnder = 0;
  let totalProfit = 0;

  for (const row of rows) {
    totalContract += row.contractAmount;
    totalActual += row.actualCostToDate;
    totalEarned += row.earnedRevenue;
    totalBilled += row.billedToDate;
    totalOverUnder += row.overUnderBilling;
    totalProfit += row.projectedGrossProfit;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium', `${row.jobNumber} - ${row.jobName}`));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.contractAmount)));
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
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalContract)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalActual)));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3'));
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'WIP Schedule'));

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_method, _jobId) => {
      /* filter action placeholder */
    }));

    const rows: WipDisplayRow[] = [];
    wrapper.appendChild(buildTable(rows));
    wrapper.appendChild(buildExportBar());

    container.appendChild(wrapper);
  },
};
