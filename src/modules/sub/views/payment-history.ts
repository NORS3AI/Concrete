/**
 * Sub Payment History view.
 * Filterable table of all payment applications across subcontracts
 * with vendor and job context. Supports CSV export.
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
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  submitted: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentHistoryRow {
  subcontractNumber: string;
  vendorName: string;
  applicationNumber: number;
  periodTo: string;
  currentBilled: number;
  retainageAmount: number;
  netPayable: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, search: string, fromDate: string, toDate: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search by vendor or subcontract...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fromLabel = el('span', 'text-sm text-[var(--text-muted)]', 'From:');
  bar.appendChild(fromLabel);
  const fromDate = el('input', inputCls) as HTMLInputElement;
  fromDate.type = 'date';
  fromDate.name = 'fromDate';
  bar.appendChild(fromDate);

  const toLabel = el('span', 'text-sm text-[var(--text-muted)]', 'To:');
  bar.appendChild(toLabel);
  const toDate = el('input', inputCls) as HTMLInputElement;
  toDate.type = 'date';
  toDate.name = 'toDate';
  bar.appendChild(toDate);

  const fire = () => onFilter(statusSelect.value, searchInput.value, fromDate.value, toDate.value);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);
  fromDate.addEventListener('change', fire);
  toDate.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: PaymentHistoryRow[]): HTMLElement {
  const container = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const totalBilled = rows.reduce((s, r) => s + r.currentBilled, 0);
  const totalRetainage = rows.reduce((s, r) => s + r.retainageAmount, 0);
  const totalNetPayable = rows.reduce((s, r) => s + r.netPayable, 0);
  const totalPaid = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.netPayable, 0);

  const cards = [
    { label: 'Total Billed', value: fmtCurrency(totalBilled) },
    { label: 'Total Retainage', value: fmtCurrency(totalRetainage) },
    { label: 'Total Net Payable', value: fmtCurrency(totalNetPayable) },
    { label: 'Total Paid', value: fmtCurrency(totalPaid) },
  ];

  for (const card of cards) {
    const div = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    div.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', card.label));
    div.appendChild(el('div', 'text-xl font-bold text-[var(--text)]', card.value));
    container.appendChild(div);
  }

  return container;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: PaymentHistoryRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Subcontract', 'Vendor', 'App #', 'Period To', 'Current Billed', 'Retainage', 'Net Payable', 'Status']) {
    const align = ['Current Billed', 'Retainage', 'Net Payable'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No payment history found.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.subcontractNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.vendorName));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', `#${row.applicationNumber}`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.periodTo));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.currentBilled)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.retainageAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(row.netPayable)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
      row.status.charAt(0).toUpperCase() + row.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Sub Payment History'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Export CSV');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export CSV placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    const rows: PaymentHistoryRow[] = [];
    wrapper.appendChild(buildSummaryCards(rows));
    wrapper.appendChild(buildFilterBar((_status, _search, _from, _to) => { /* filter placeholder */ }));
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
