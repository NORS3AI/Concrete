/**
 * Service Call Log view.
 * Table of service calls with date, caller, type, priority, status, and linked WO.
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
  { value: 'new', label: 'New' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'resolved', label: 'Resolved' },
];

const CALL_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'request', label: 'Request' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'emergency', label: 'Emergency' },
];

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  dispatched: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  emergency: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CallRow {
  id: string;
  callDate: string;
  callerName: string;
  callerPhone: string;
  callType: string;
  priority: string;
  description: string;
  status: string;
  assignedTo: string;
  workOrderNumber: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, callType: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search calls...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of CALL_TYPE_OPTIONS) {
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

function buildTable(calls: CallRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Date', 'Caller', 'Phone', 'Type', 'Priority', 'Description', 'Status', 'Assigned', 'WO #', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (calls.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No service calls found. Log a new call to get started.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const call of calls) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', call.callDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', call.callerName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', call.callerPhone));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', call.callType));

    const tdPriority = el('td', 'py-2 px-3');
    const prioBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[call.priority] ?? PRIORITY_BADGE.medium}`,
      call.priority);
    tdPriority.appendChild(prioBadge);
    tr.appendChild(tdPriority);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] max-w-[200px] truncate', call.description));

    const tdStatus = el('td', 'py-2 px-3');
    const statusBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[call.status] ?? STATUS_BADGE.new}`,
      call.status.charAt(0).toUpperCase() + call.status.slice(1));
    tdStatus.appendChild(statusBadge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', call.assignedTo));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', call.workOrderNumber));

    const tdActions = el('td', 'py-2 px-3');
    const dispatchBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Dispatch');
    dispatchBtn.type = 'button';
    tdActions.appendChild(dispatchBtn);
    const resolveBtn = el('button', 'text-emerald-400 hover:underline text-sm', 'Resolve');
    resolveBtn.type = 'button';
    tdActions.appendChild(resolveBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Service Calls'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Log New Call');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* new call placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _type, _search) => { /* filter placeholder */ }));

    const calls: CallRow[] = [];
    wrapper.appendChild(buildTable(calls));

    container.appendChild(wrapper);
  },
};
