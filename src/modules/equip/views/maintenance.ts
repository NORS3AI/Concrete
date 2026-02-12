/**
 * Equipment Maintenance view.
 * Displays maintenance schedule and history with status filtering.
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
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'preventive', label: 'Preventive' },
  { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' },
];

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  overdue: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  preventive: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  repair: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  inspection: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MaintenanceRow {
  id: string;
  equipmentNumber: string;
  type: string;
  description: string;
  scheduledDate: string;
  completedDate: string;
  cost: number;
  vendor: string;
  meterAtService: number;
  nextServiceDate: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, type: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search maintenance...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fire = () => onFilter(statusSelect.value, typeSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  typeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: MaintenanceRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Equipment', 'Type', 'Description', 'Scheduled', 'Completed', 'Cost', 'Meter', 'Next Service', 'Status', 'Actions']) {
    const align = col === 'Cost' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No maintenance records found. Schedule maintenance to get started.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.equipmentNumber));

    const tdType = el('td', 'py-2 px-3');
    const typeBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[row.type] ?? TYPE_BADGE.preventive}`,
      row.type.charAt(0).toUpperCase() + row.type.slice(1));
    tdType.appendChild(typeBadge);
    tr.appendChild(tdType);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.description));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.scheduledDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.completedDate));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.cost ? fmtCurrency(row.cost) : ''));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono', row.meterAtService ? String(row.meterAtService) : ''));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.nextServiceDate));

    const tdStatus = el('td', 'py-2 px-3');
    const statusLabel = row.status.replace('_', ' ');
    const statusBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.scheduled}`,
      statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1));
    tdStatus.appendChild(statusBadge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (row.status !== 'completed') {
      const completeBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Complete');
      completeBtn.addEventListener('click', () => { /* complete placeholder */ });
      tdActions.appendChild(completeBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Maintenance Schedule'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Maintenance');
    newBtn.addEventListener('click', () => { /* new maintenance placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _type, _search) => { /* filter placeholder */ }));

    const rows: MaintenanceRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
