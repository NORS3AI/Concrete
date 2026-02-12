/**
 * Backcharges view.
 * Filterable table of backcharges with approval and deduction workflow actions.
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
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'deducted', label: 'Deducted' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'damage', label: 'Damage Repair' },
  { value: 'defective', label: 'Defective Work' },
  { value: 'cleanup', label: 'Cleanup' },
  { value: 'safety', label: 'Safety Violation' },
  { value: 'schedule', label: 'Schedule Delay' },
  { value: 'other', label: 'Other' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  deducted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackchargeRow {
  id: string;
  subcontractNumber: string;
  vendorName: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, category: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search backcharges...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const categorySelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of CATEGORY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    categorySelect.appendChild(o);
  }
  bar.appendChild(categorySelect);

  const fire = () => onFilter(statusSelect.value, categorySelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  categorySelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(backcharges: BackchargeRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Subcontract', 'Vendor', 'Description', 'Category', 'Amount', 'Date', 'Status', 'Actions']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (backcharges.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No backcharges found.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const bc of backcharges) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', bc.subcontractNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', bc.vendorName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', bc.description));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', bc.category || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', fmtCurrency(bc.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', bc.date));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[bc.status] ?? STATUS_BADGE.pending}`,
      bc.status.charAt(0).toUpperCase() + bc.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (bc.status === 'pending') {
      const approveBtn = el('button', 'text-blue-400 hover:underline text-sm mr-2', 'Approve');
      approveBtn.type = 'button';
      approveBtn.addEventListener('click', () => { /* approve placeholder */ });
      tdActions.appendChild(approveBtn);
    }
    if (bc.status === 'approved') {
      const deductBtn = el('button', 'text-emerald-400 hover:underline text-sm', 'Deduct');
      deductBtn.type = 'button';
      deductBtn.addEventListener('click', () => { /* deduct placeholder */ });
      tdActions.appendChild(deductBtn);
    }
    if (bc.status === 'deducted') {
      tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'Deducted'));
    }
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Backcharges'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Backcharge');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* new backcharge placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _category, _search) => { /* filter placeholder */ }));

    const backcharges: BackchargeRow[] = [];
    wrapper.appendChild(buildTable(backcharges));

    container.appendChild(wrapper);
  },
};
