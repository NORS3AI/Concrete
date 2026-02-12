/**
 * AR Invoice List view.
 * Filterable table of AR invoices with status, billing type, and date filters.
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
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'voided', label: 'Voided' },
];

const BILLING_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'progress', label: 'Progress' },
  { value: 'tm', label: 'T&M' },
  { value: 'unit_price', label: 'Unit Price' },
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'lump_sum', label: 'Lump Sum' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  sent: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  partial: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  overdue: 'bg-red-500/10 text-red-400 border border-red-500/20',
  voided: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  jobNumber: string;
  billingType: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  retainageAmount: number;
  balanceDue: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, billingType: string, search: string, fromDate: string, toDate: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search invoices...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of BILLING_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fromLabel = el('span', 'text-sm text-[var(--text-muted)]', 'From:');
  bar.appendChild(fromLabel);
  const fromDate = el('input', inputCls) as HTMLInputElement;
  fromDate.type = 'date';
  bar.appendChild(fromDate);

  const toLabel = el('span', 'text-sm text-[var(--text-muted)]', 'To:');
  bar.appendChild(toLabel);
  const toDate = el('input', inputCls) as HTMLInputElement;
  toDate.type = 'date';
  bar.appendChild(toDate);

  const fire = () => onFilter(statusSelect.value, typeSelect.value, searchInput.value, fromDate.value, toDate.value);
  statusSelect.addEventListener('change', fire);
  typeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);
  fromDate.addEventListener('change', fire);
  toDate.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(invoices: InvoiceRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Invoice #', 'Customer', 'Job', 'Type', 'Date', 'Due Date', 'Amount', 'Retainage', 'Balance Due', 'Status', 'Actions']) {
    const align = ['Amount', 'Retainage', 'Balance Due'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (invoices.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No invoices found. Create your first invoice to get started.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const inv of invoices) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', inv.invoiceNumber) as HTMLAnchorElement;
    link.href = `#/ar/invoices/${inv.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', inv.customerName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono', inv.jobNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', inv.billingType));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', inv.invoiceDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', inv.dueDate));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(inv.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(inv.retainageAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(inv.balanceDue)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[inv.status] ?? STATUS_BADGE.draft}`,
      inv.status.charAt(0).toUpperCase() + inv.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/ar/invoices/${inv.id}`;
    tdActions.appendChild(editLink);
    const viewLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'View') as HTMLAnchorElement;
    viewLink.href = `#/ar/invoices/${inv.id}`;
    tdActions.appendChild(viewLink);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'AR Invoices'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/ar/invoices/new';
    newBtn.textContent = 'New Invoice';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _type, _search, _from, _to) => { /* filter placeholder */ }));

    const invoices: InvoiceRow[] = [];
    wrapper.appendChild(buildTable(invoices));

    container.appendChild(wrapper);
  },
};
