/**
 * Customer Equipment Registry view.
 * Table of customer equipment with name, model, serial, warranty, and next service.
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'retired', label: 'Retired' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  retired: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EquipmentRow {
  id: string;
  name: string;
  customerName: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  warrantyEndDate: string;
  nextServiceDate: string;
  location: string;
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
  searchInput.placeholder = 'Search equipment...';
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

function buildTable(equipment: EquipmentRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Customer', 'Manufacturer', 'Model', 'Serial #', 'Warranty End', 'Next Service', 'Location', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (equipment.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No equipment registered. Register customer equipment to get started.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const eq of equipment) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', eq.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', eq.customerName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', eq.manufacturer));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', eq.model));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', eq.serialNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', eq.warrantyEndDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', eq.nextServiceDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', eq.location));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[eq.status] ?? STATUS_BADGE.active}`,
      eq.status.charAt(0).toUpperCase() + eq.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit');
    editBtn.type = 'button';
    tdActions.appendChild(editBtn);
    const retireBtn = el('button', 'text-red-400 hover:underline text-sm', 'Retire');
    retireBtn.type = 'button';
    tdActions.appendChild(retireBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Customer Equipment'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Register Equipment');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* register placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const equipment: EquipmentRow[] = [];
    wrapper.appendChild(buildTable(equipment));

    container.appendChild(wrapper);
  },
};
