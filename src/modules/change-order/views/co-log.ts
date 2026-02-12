/**
 * Change Order Activity Log view.
 * Filterable log of all change order activity by job, date range, action type.
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

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'request_created', label: 'Request Created' },
  { value: 'request_submitted', label: 'Request Submitted' },
  { value: 'request_withdrawn', label: 'Request Withdrawn' },
  { value: 'co_created', label: 'CO Created' },
  { value: 'co_submitted', label: 'CO Submitted' },
  { value: 'co_approved', label: 'CO Approved' },
  { value: 'co_rejected', label: 'CO Rejected' },
  { value: 'co_executed', label: 'CO Executed' },
  { value: 'co_voided', label: 'CO Voided' },
  { value: 'schedule_impact_set', label: 'Schedule Impact Set' },
  { value: 'sub_co_created', label: 'Sub CO Created' },
];

const ACTION_BADGE: Record<string, string> = {
  request_created: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  request_submitted: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  request_withdrawn: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
  co_created: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  co_submitted: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  co_approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  co_rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  co_executed: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  co_voided: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
  schedule_impact_set: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  sub_co_created: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogRow {
  id: string;
  date: string;
  action: string;
  performedBy: string;
  previousStatus: string;
  newStatus: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (action: string, search: string, dateFrom: string, dateTo: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search log...';
  bar.appendChild(searchInput);

  const actionSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of ACTION_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    actionSelect.appendChild(o);
  }
  bar.appendChild(actionSelect);

  bar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'From:'));
  const dateFrom = el('input', inputCls) as HTMLInputElement;
  dateFrom.type = 'date';
  dateFrom.name = 'dateFrom';
  bar.appendChild(dateFrom);

  bar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'To:'));
  const dateTo = el('input', inputCls) as HTMLInputElement;
  dateTo.type = 'date';
  dateTo.name = 'dateTo';
  bar.appendChild(dateTo);

  const fire = () => onFilter(actionSelect.value, searchInput.value, dateFrom.value, dateTo.value);
  actionSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);
  dateFrom.addEventListener('change', fire);
  dateTo.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: LogRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Date', 'Action', 'Performed By', 'Previous Status', 'New Status', 'Notes']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No log entries found. Activity will appear here as change orders are processed.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono text-xs', row.date));

    const tdAction = el('td', 'py-2 px-3');
    const actionLabel = row.action.replace(/_/g, ' ');
    tdAction.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_BADGE[row.action] ?? ACTION_BADGE.co_created}`,
      actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)));
    tr.appendChild(tdAction);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.performedBy || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.previousStatus || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.newStatus || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', row.notes));

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Change Order Log'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_action, _search, _dateFrom, _dateTo) => { /* filter placeholder */ }));

    const rows: LogRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
