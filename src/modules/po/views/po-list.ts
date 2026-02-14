/**
 * Purchase Order List view.
 * Filterable table of purchase orders with status, type, vendor, and job filters.
 * Wired to POService for live data.
 */

import { getPOService } from '../service-accessor';

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

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 5000);
}

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  pending_approval: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial_receipt: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  received: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  standard: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  blanket: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  service: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PORow {
  id: string;
  poNumber: string;
  vendorId: string;
  jobId: string;
  type: string;
  description: string;
  amount: number;
  totalAmount: number;
  status: string;
  issuedDate: string;
  expectedDate: string;
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

function buildTable(
  orders: PORow[],
  onDelete: (po: PORow) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['PO #', 'Vendor', 'Job', 'Type', 'Description', 'Amount', 'Total Amount', 'Status', 'Issued', 'Expected', 'Actions']) {
    const align = ['Amount', 'Total Amount'].includes(col)
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

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', po.vendorId));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono', po.jobId));

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

    const deleteBtn = el('button', 'text-red-400 hover:text-red-300 text-sm', 'Delete');
    deleteBtn.type = 'button';
    deleteBtn.addEventListener('click', () => onDelete(po));
    tdActions.appendChild(deleteBtn);
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

const wrapper = el('div', 'space-y-0');

void (async () => {
  try {
    const svc = getPOService();

    // Load all POs (unfiltered) for initial render
    const allPOs = await svc.getPurchaseOrders();
    let allRows: PORow[] = allPOs.map((po) => ({
      id: po.id as string,
      poNumber: po.poNumber,
      vendorId: po.vendorId,
      jobId: po.jobId ?? '',
      type: po.type,
      description: po.description ?? '',
      amount: po.amount,
      totalAmount: po.totalAmount,
      status: po.status,
      issuedDate: po.issuedDate ?? '',
      expectedDate: po.expectedDate ?? '',
    }));

    // Containers for dynamic sections
    const summaryContainer = el('div');
    const filterContainer = el('div');
    const tableContainer = el('div');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Purchase Orders'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/po/new';
    newBtn.textContent = 'New Purchase Order';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);
    wrapper.appendChild(summaryContainer);
    wrapper.appendChild(filterContainer);
    wrapper.appendChild(tableContainer);

    // Apply filter and re-render dynamic sections
    const applyFilter = (status: string, type: string, search: string) => {
      let filtered = allRows;
      if (status) {
        filtered = filtered.filter((po) => po.status === status);
      }
      if (type) {
        filtered = filtered.filter((po) => po.type === type);
      }
      if (search) {
        const term = search.toLowerCase();
        filtered = filtered.filter((po) =>
          po.poNumber.toLowerCase().includes(term) ||
          po.vendorId.toLowerCase().includes(term) ||
          po.jobId.toLowerCase().includes(term) ||
          po.description.toLowerCase().includes(term),
        );
      }
      renderContent(filtered);
    };

    const handleDelete = async (po: PORow) => {
      if (!confirm(`Delete purchase order ${po.poNumber}? This action cannot be undone.`)) return;
      try {
        await svc.deletePurchaseOrder(po.id);
        allRows = allRows.filter((r) => r.id !== po.id);
        applyFilter('', '', '');
        showMsg(wrapper, `Purchase order ${po.poNumber} deleted.`, false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete purchase order';
        showMsg(wrapper, message, true);
      }
    };

    const renderContent = (rows: PORow[]) => {
      summaryContainer.innerHTML = '';
      summaryContainer.appendChild(buildSummaryCards(rows));

      tableContainer.innerHTML = '';
      tableContainer.appendChild(buildTable(rows, handleDelete));
    };

    // Build filter bar (only once)
    filterContainer.appendChild(buildFilterBar(applyFilter));

    // Initial render with all rows
    renderContent(allRows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    showMsg(wrapper, message, true);
  }
})();

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};
