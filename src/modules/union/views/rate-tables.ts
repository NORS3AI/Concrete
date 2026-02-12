/**
 * Rate Tables view.
 * Lists union rate tables with classification, effective dates, and status.
 * Supports filtering by union, classification, and status.
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
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateTableRow {
  id: string;
  unionName: string;
  name: string;
  classification: string;
  effectiveDate: string;
  expirationDate: string;
  journeymanRate: number;
  apprenticePct: number;
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
  searchInput.placeholder = 'Search rate tables...';
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

function buildTable(tables: RateTableRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Union', 'Name', 'Classification', 'Effective', 'Expiration', 'Journeyman Rate', 'Apprentice %', 'Status']) {
    const align = (col === 'Journeyman Rate' || col === 'Apprentice %') ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (tables.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No rate tables found.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const rt of tables) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', rt.unionName));
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', rt.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rt.classification));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rt.effectiveDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rt.expirationDate || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(rt.journeymanRate)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', `${rt.apprenticePct}%`));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rt.status] ?? STATUS_BADGE.active}`,
      rt.status.charAt(0).toUpperCase() + rt.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Rate Tables'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Rate Table');
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const tables: RateTableRow[] = [];
    wrapper.appendChild(buildTable(tables));

    container.appendChild(wrapper);
  },
};
