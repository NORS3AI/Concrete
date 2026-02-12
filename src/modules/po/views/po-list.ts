/**
 * Purchase Order List view.
 * Filterable table of purchase orders with status, type, vendor, and job filters.
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
  { value: 'partial_receipt', label: 'Partial Receipt' },
  { value: 'received', label: 'Received' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'standard', label: 'Standard' },
  { value: 'blanket', label: 'Blanket' },
  { value: 'service', label: 'Service' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending_approval: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  partial_receipt: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  received: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  standard: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  blanket: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  service: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PORow {
  id: string;
  poNumber: string;
  vendorName: string;
  jobNumber: string;
  type: string;
  description: string;
  amount: number;
  totalAmount: number;
  status: string;
  issuedDate: string;
  expectedDate: string;
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
  searchInput.placeholder = 'Search purchase orders...';
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

function buildTable(orders: PORow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['PO #', 'Vendor', 'Job', 'Type', 'Description', 'Amount', 'Total', 'Status', 'Issued', 'Expected', 'Actions']) {
    const align = ['Amount', 'Total'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (orders.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No purchase orders found. Create your first PO to get started.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const po of orders) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', po.poNumber) as HTMLAnchorElement;
    link.href = `#/po/${po.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', po.vendorName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono', po.jobNumber));

    const tdType = el('td', 'py-2 px-3');
    const typeBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[po.type] ?? TYPE_BADGE.standard}`,
      po.type.charAt(0).toUpperCase() + po.type.slice(1));
    tdType.appendChild(typeBadge);
    tr.appendChild(tdType);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[200px]', po.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(po.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(po.totalAmount)));

    const tdStatus = el('td', 'py-2 px-3');
    const statusLabel = po.status.replace(/_/g, ' ');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[po.status] ?? STATUS_BADGE.draft}`,
      statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', po.issuedDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', po.expectedDate));

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/po/${po.id}`;
    tdActions.appendChild(editLink);
    const viewLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'View') as HTMLAnchorElement;
    viewLink.href = `#/po/${po.id}`;
    tdActions.appendChild(viewLink);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(orders: PORow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const totalPOs = orders.length;
  const openPOs = orders.filter((o) => o.status !== 'closed' && o.status !== 'cancelled').length;
  const totalValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingApproval = orders.filter((o) => o.status === 'pending_approval').length;

  const cardData = [
    { label: 'Total POs', value: String(totalPOs), cls: 'text-[var(--text)]' },
    { label: 'Open POs', value: String(openPOs), cls: 'text-blue-400' },
    { label: 'Total Value', value: fmtCurrency(totalValue), cls: 'text-emerald-400' },
    { label: 'Pending Approval', value: String(pendingApproval), cls: 'text-amber-400' },
  ];

  for (const card of cardData) {
    const cardEl = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    cardEl.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', card.label));
    cardEl.appendChild(el('div', `text-2xl font-bold ${card.cls}`, card.value));
    section.appendChild(cardEl);
  }

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Purchase Orders'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/po/new';
    newBtn.textContent = 'New Purchase Order';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    const orders: PORow[] = [];
    wrapper.appendChild(buildSummaryCards(orders));
    wrapper.appendChild(buildFilterBar((_status, _type, _search) => { /* filter placeholder */ }));
    wrapper.appendChild(buildTable(orders));

    container.appendChild(wrapper);
  },
};
