/**
 * Equipment List view.
 * Filterable table of equipment with category, status, and search filters.
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

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'owned', label: 'Owned' },
  { value: 'leased', label: 'Leased' },
  { value: 'rented', label: 'Rented' },
  { value: 'idle', label: 'Idle' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'disposed', label: 'Disposed' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  disposed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const CATEGORY_BADGE: Record<string, string> = {
  owned: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  leased: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  rented: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  idle: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EquipmentRow {
  id: string;
  equipmentNumber: string;
  description: string;
  year: number;
  make: string;
  model: string;
  category: string;
  status: string;
  currentValue: number;
  meterReading: number;
  meterUnit: string;
  assignedJob: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (category: string, status: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search equipment...';
  bar.appendChild(searchInput);

  const categorySelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of CATEGORY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    categorySelect.appendChild(o);
  }
  bar.appendChild(categorySelect);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => onFilter(categorySelect.value, statusSelect.value, searchInput.value);
  categorySelect.addEventListener('change', fire);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(items: EquipmentRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Equip #', 'Description', 'Year', 'Make/Model', 'Category', 'Status', 'Current Value', 'Meter', 'Actions']) {
    const align = col === 'Current Value' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (items.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No equipment found. Add your first piece of equipment to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const item of items) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', item.equipmentNumber) as HTMLAnchorElement;
    link.href = `#/equipment/${item.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', item.description));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', item.year ? String(item.year) : ''));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${item.make} ${item.model}`.trim()));

    const tdCat = el('td', 'py-2 px-3');
    const catBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_BADGE[item.category] ?? CATEGORY_BADGE.owned}`,
      item.category.charAt(0).toUpperCase() + item.category.slice(1));
    tdCat.appendChild(catBadge);
    tr.appendChild(tdCat);

    const tdStatus = el('td', 'py-2 px-3');
    const statusBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] ?? STATUS_BADGE.active}`,
      item.status.charAt(0).toUpperCase() + item.status.slice(1));
    tdStatus.appendChild(statusBadge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(item.currentValue)));

    const meterText = item.meterReading ? `${item.meterReading.toLocaleString()} ${item.meterUnit}` : '';
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono', meterText));

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/equipment/${item.id}`;
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/equipment/new';
    newBtn.textContent = 'New Equipment';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_category, _status, _search) => { /* filter placeholder */ }));

    const items: EquipmentRow[] = [];
    wrapper.appendChild(buildTable(items));

    container.appendChild(wrapper);
  },
};
