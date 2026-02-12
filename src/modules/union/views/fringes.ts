/**
 * Fringe Benefits view.
 * Lists fringe benefit configurations per union with allocation method,
 * rate, fund details, and payable-to information.
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

const ALLOCATION_OPTIONS = [
  { value: '', label: 'All Allocations' },
  { value: 'cash', label: 'Cash' },
  { value: 'plan', label: 'Plan' },
  { value: 'split', label: 'Split' },
];

const ALLOCATION_BADGE: Record<string, string> = {
  cash: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  plan: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  split: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FringeRow {
  id: string;
  unionName: string;
  name: string;
  rate: number;
  method: string;
  payableTo: string;
  allocationMethod: string;
  fundName: string;
  fundAccountNumber: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (allocation: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search fringe benefits...';
  bar.appendChild(searchInput);

  const allocSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of ALLOCATION_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    allocSelect.appendChild(o);
  }
  bar.appendChild(allocSelect);

  const fire = () => onFilter(allocSelect.value, searchInput.value);
  allocSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(fringes: FringeRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Union', 'Benefit', 'Rate', 'Method', 'Payable To', 'Allocation', 'Fund Name', 'Account #', 'Actions']) {
    const align = col === 'Rate' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (fringes.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No fringe benefits configured.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const fringe of fringes) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', fringe.unionName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', fringe.name));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(fringe.rate)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fringe.method));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fringe.payableTo));

    const tdAlloc = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${ALLOCATION_BADGE[fringe.allocationMethod] ?? ALLOCATION_BADGE.cash}`,
      fringe.allocationMethod.charAt(0).toUpperCase() + fringe.allocationMethod.slice(1));
    tdAlloc.appendChild(badge);
    tr.appendChild(tdAlloc);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fringe.fundName || '--'));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', fringe.fundAccountNumber || '--'));

    const tdActions = el('td', 'py-2 px-3');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit');
    tdActions.appendChild(editBtn);
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    tdActions.appendChild(deleteBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Fringe Benefits'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Fringe Benefit');
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_alloc, _search) => { /* filter placeholder */ }));

    const fringes: FringeRow[] = [];
    wrapper.appendChild(buildTable(fringes));

    container.appendChild(wrapper);
  },
};
