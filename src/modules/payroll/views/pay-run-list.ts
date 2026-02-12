/**
 * Pay Run List view.
 * Filterable table of pay runs with status badges and actions.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'voided', label: 'Voided' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  processing: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  voided: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PayRunRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: string;
  totalGross: number;
  totalNet: number;
  totalTaxes: number;
  totalDeductions: number;
  employeeCount: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  statusSelect.addEventListener('change', () => onFilter(statusSelect.value));

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(runs: PayRunRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Period', 'Pay Date', 'Status', 'Employees', 'Gross', 'Taxes', 'Deductions', 'Net', 'Actions']) {
    const align = ['Gross', 'Taxes', 'Deductions', 'Net', 'Employees'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (runs.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No pay runs found. Create your first pay run to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const run of runs) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdPeriod = el('td', 'py-2 px-3 font-medium text-[var(--text)]');
    const link = el('a', 'text-[var(--accent)] hover:underline', `${run.periodStart} - ${run.periodEnd}`) as HTMLAnchorElement;
    link.href = `#/payroll/pay-runs/${run.id}`;
    tdPeriod.appendChild(link);
    tr.appendChild(tdPeriod);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', run.payDate));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[run.status] ?? STATUS_BADGE.draft}`,
      run.status.charAt(0).toUpperCase() + run.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(run.employeeCount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(run.totalGross)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(run.totalTaxes)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(run.totalDeductions)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(run.totalNet)));

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'View') as HTMLAnchorElement;
    editLink.href = `#/payroll/pay-runs/${run.id}`;
    tdActions.appendChild(editLink);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Pay Runs'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/payroll/pay-runs/new';
    newBtn.textContent = 'New Pay Run';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status) => { /* filter placeholder */ }));

    const runs: PayRunRow[] = [];
    wrapper.appendChild(buildTable(runs));

    container.appendChild(wrapper);
  },
};
