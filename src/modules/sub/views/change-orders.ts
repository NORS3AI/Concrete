/**
 * Change Orders view.
 * Filterable table of change orders with approval workflow actions.
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
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'addition', label: 'Addition' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'time_extension', label: 'Time Extension' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  addition: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  deduction: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  time_extension: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChangeOrderRow {
  id: string;
  subcontractNumber: string;
  vendorName: string;
  number: number;
  description: string;
  amount: number;
  type: string;
  status: string;
  date: string;
  approvedBy: string;
  approvedAt: string;
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
// Table
// ---------------------------------------------------------------------------

function buildTable(orders: ChangeOrderRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['CO #', 'Subcontract', 'Vendor', 'Description', 'Type', 'Amount', 'Date', 'Status', 'Approved By', 'Actions']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (orders.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No change orders found.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const co of orders) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--text)]', `CO-${co.number}`));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', co.subcontractNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', co.vendorName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', co.description));

    const tdType = el('td', 'py-2 px-3');
    const typeBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[co.type] ?? TYPE_BADGE.addition}`,
      co.type.replace('_', ' ').charAt(0).toUpperCase() + co.type.replace('_', ' ').slice(1));
    tdType.appendChild(typeBadge);
    tr.appendChild(tdType);

    const amountCls = co.type === 'deduction' ? 'py-2 px-3 text-right font-mono text-red-400' : 'py-2 px-3 text-right font-mono';
    tr.appendChild(el('td', amountCls, fmtCurrency(co.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', co.date));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[co.status] ?? STATUS_BADGE.pending}`,
      co.status.charAt(0).toUpperCase() + co.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', co.approvedBy || '-'));

    const tdActions = el('td', 'py-2 px-3');
    if (co.status === 'pending') {
      const approveBtn = el('button', 'text-emerald-400 hover:underline text-sm mr-2', 'Approve');
      approveBtn.type = 'button';
      approveBtn.addEventListener('click', () => { /* approve placeholder */ });
      tdActions.appendChild(approveBtn);

      const rejectBtn = el('button', 'text-red-400 hover:underline text-sm', 'Reject');
      rejectBtn.type = 'button';
      rejectBtn.addEventListener('click', () => { /* reject placeholder */ });
      tdActions.appendChild(rejectBtn);
    } else {
      tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', '-'));
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Change Orders'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Change Order');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* new CO placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _type, _search) => { /* filter placeholder */ }));

    const orders: ChangeOrderRow[] = [];
    wrapper.appendChild(buildTable(orders));

    container.appendChild(wrapper);
  },
};
