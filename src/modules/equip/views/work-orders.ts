/**
 * Equipment Work Orders view.
 * Displays work orders with priority, status filtering, and completion actions.
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
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  low: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkOrderRow {
  id: string;
  number: string;
  equipmentNumber: string;
  description: string;
  priority: string;
  assignedTo: string;
  reportedDate: string;
  completedDate: string;
  laborHours: number;
  totalCost: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, priority: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search work orders...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const prioritySelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of PRIORITY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    prioritySelect.appendChild(o);
  }
  bar.appendChild(prioritySelect);

  const fire = () => onFilter(statusSelect.value, prioritySelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  prioritySelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: WorkOrderRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['WO #', 'Equipment', 'Description', 'Priority', 'Assigned To', 'Reported', 'Completed', 'Hours', 'Cost', 'Status', 'Actions']) {
    const align = ['Hours', 'Cost'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No work orders found. Create a work order to get started.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', row.number));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.equipmentNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.description));

    const tdPriority = el('td', 'py-2 px-3');
    const priBadge = el('span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[row.priority] ?? PRIORITY_BADGE.medium}`,
      row.priority.charAt(0).toUpperCase() + row.priority.slice(1));
    tdPriority.appendChild(priBadge);
    tr.appendChild(tdPriority);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.assignedTo));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.reportedDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.completedDate));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.laborHours ? String(row.laborHours) : ''));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.totalCost ? fmtCurrency(row.totalCost) : ''));

    const tdStatus = el('td', 'py-2 px-3');
    const statusLabel = row.status.replace('_', ' ');
    const statusBadge = el('span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.open}`,
      statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1));
    tdStatus.appendChild(statusBadge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (row.status === 'open' || row.status === 'in_progress') {
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Work Orders'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Work Order');
    newBtn.addEventListener('click', () => { /* new work order placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _priority, _search) => { /* filter placeholder */ }));

    const rows: WorkOrderRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
