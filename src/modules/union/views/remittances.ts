/**
 * Remittances view.
 * Lists union remittance reports with union, period, hours,
 * amount, and status workflow (draft -> submitted -> paid).
 */

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

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'paid', label: 'Paid' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  submitted: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RemittanceRow {
  id: string;
  unionName: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  totalHours: number;
  totalAmount: number;
  employeeCount: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search remittances...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => onFilter(statusSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(remittances: RemittanceRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Union', 'Period Start', 'Period End', 'Due Date', 'Hours', 'Amount', 'Employees', 'Status', 'Actions']) {
    const align = (col === 'Hours' || col === 'Amount' || col === 'Employees') ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (remittances.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No remittance reports found.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const rem of remittances) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', rem.unionName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rem.periodStart));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rem.periodEnd));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rem.dueDate || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', rem.totalHours.toFixed(2)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(rem.totalAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right', String(rem.employeeCount)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rem.status] ?? STATUS_BADGE.draft}`,
      rem.status.charAt(0).toUpperCase() + rem.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (rem.status === 'draft') {
      const submitBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Submit');
      tdActions.appendChild(submitBtn);
    }
    if (rem.status === 'submitted') {
      const payBtn = el('button', 'text-emerald-400 hover:underline text-sm mr-2', 'Mark Paid');
      tdActions.appendChild(payBtn);
    }
    const viewBtn = el('button', 'text-[var(--text-muted)] hover:underline text-sm', 'View');
    tdActions.appendChild(viewBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Union Remittances'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Remittance');
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const remittances: RemittanceRow[] = [];
    wrapper.appendChild(buildTable(remittances));

    container.appendChild(wrapper);
  },
};
