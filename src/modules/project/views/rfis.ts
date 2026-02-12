/**
 * RFI (Request for Information) view.
 * RFI log with number, subject, status, assigned to, due date, and priority badges.
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

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  answered: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  overdue: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  urgent: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'answered', label: 'Answered' },
  { value: 'closed', label: 'Closed' },
  { value: 'overdue', label: 'Overdue' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RFIRow {
  id: string;
  number: number;
  subject: string;
  requestedBy: string;
  assignedTo: string;
  dueDate: string;
  status: string;
  priority: string;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-3 mb-4');

  const buildCard = (label: string, value: string, colorCls: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-3 text-center');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-2xl font-bold ${colorCls}`, value));
    return card;
  };

  row.appendChild(buildCard('Open', '0', 'text-blue-400'));
  row.appendChild(buildCard('Answered', '0', 'text-emerald-400'));
  row.appendChild(buildCard('Overdue', '0', 'text-red-400'));
  row.appendChild(buildCard('Total', '0', 'text-[var(--text)]'));

  return row;
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
  searchInput.placeholder = 'Search RFIs...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_FILTER_OPTIONS) {
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

function buildTable(rfis: RFIRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['#', 'Subject', 'Requested By', 'Assigned To', 'Due Date', 'Priority', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rfis.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No RFIs found. Create an RFI to track project questions.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const rfi of rfis) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--text)]', `RFI-${String(rfi.number).padStart(3, '0')}`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', rfi.subject));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rfi.requestedBy));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rfi.assignedTo));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rfi.dueDate));

    const tdPriority = el('td', 'py-2 px-3');
    const prBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[rfi.priority] ?? PRIORITY_BADGE.medium}`,
      rfi.priority.charAt(0).toUpperCase() + rfi.priority.slice(1));
    tdPriority.appendChild(prBadge);
    tr.appendChild(tdPriority);

    const tdStatus = el('td', 'py-2 px-3');
    const stBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rfi.status] ?? STATUS_BADGE.open}`,
      rfi.status.charAt(0).toUpperCase() + rfi.status.slice(1));
    tdStatus.appendChild(stBadge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    const respondBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Respond');
    respondBtn.type = 'button';
    tdActions.appendChild(respondBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'RFIs'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New RFI');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* new rfi placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());
    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const rfis: RFIRow[] = [];
    wrapper.appendChild(buildTable(rfis));

    container.appendChild(wrapper);
  },
};
