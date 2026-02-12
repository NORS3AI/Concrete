/**
 * Change Order List view.
 * Filterable table of change orders with number, type, status, amount, job.
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
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'executed', label: 'Executed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'voided', label: 'Voided' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'owner', label: 'Owner' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'internal', label: 'Internal' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending_approval: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  executed: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  voided: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  owner: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  subcontractor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  internal: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CORow {
  id: string;
  number: string;
  title: string;
  type: string;
  status: string;
  amount: number;
  approvedAmount: number;
  effectiveDate: string;
  scheduleExtensionDays: number;
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
  searchInput.placeholder = 'Search change orders...';
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
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-3 mb-4');

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-3 text-center');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-lg font-bold font-mono ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Total COs', '0', 'text-[var(--text)]'));
  row.appendChild(buildCard('Approved', fmtCurrency(0), 'text-emerald-400'));
  row.appendChild(buildCard('Pending', fmtCurrency(0), 'text-amber-400'));
  row.appendChild(buildCard('Net Impact', fmtCurrency(0), 'text-[var(--accent)]'));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: CORow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Number', 'Title', 'Type', 'Status', 'Amount', 'Approved', 'Effective Date', 'Schedule Ext.', 'Actions']) {
    const align = ['Amount', 'Approved', 'Schedule Ext.'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No change orders found. Create a new change order to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.number) as HTMLAnchorElement;
    link.href = `#/change-orders/${row.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.title));

    const tdType = el('td', 'py-2 px-3');
    tdType.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[row.type] ?? TYPE_BADGE.internal}`,
      row.type.charAt(0).toUpperCase() + row.type.slice(1)));
    tr.appendChild(tdType);

    const tdStatus = el('td', 'py-2 px-3');
    const statusLabel = row.status.replace('_', ' ');
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
      statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)));
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(row.approvedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.effectiveDate || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]',
      row.scheduleExtensionDays > 0 ? `${row.scheduleExtensionDays} days` : '-'));

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'View') as HTMLAnchorElement;
    editLink.href = `#/change-orders/${row.id}`;
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Change Orders'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/change-orders/new';
    newBtn.textContent = 'New Change Order';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());
    wrapper.appendChild(buildFilterBar((_status, _type, _search) => { /* filter placeholder */ }));

    const rows: CORow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
