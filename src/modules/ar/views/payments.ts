/**
 * AR Payments view.
 * Payment receipt list with application, filtering by status and method.
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
  { value: 'applied', label: 'Applied' },
  { value: 'voided', label: 'Voided' },
];

const METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'check', label: 'Check' },
  { value: 'ach', label: 'ACH' },
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'credit-card', label: 'Credit Card' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  applied: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  voided: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentRow {
  id: string;
  customerName: string;
  paymentDate: string;
  method: string;
  referenceNumber: string;
  amount: number;
  appliedAmount: number;
  unappliedAmount: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, method: string, search: string, fromDate: string, toDate: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search payments...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const methodSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of METHOD_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    methodSelect.appendChild(o);
  }
  bar.appendChild(methodSelect);

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

  const fire = () => onFilter(statusSelect.value, methodSelect.value, searchInput.value, fromDate.value, toDate.value);
  statusSelect.addEventListener('change', fire);
  methodSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);
  fromDate.addEventListener('change', fire);
  toDate.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const buildCard = (label: string, value: string, accent?: boolean): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold font-mono ${accent ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Total Received', fmtCurrency(0)));
  row.appendChild(buildCard('Applied', fmtCurrency(0), true));
  row.appendChild(buildCard('Unapplied Cash', fmtCurrency(0)));
  row.appendChild(buildCard('Received This Month', fmtCurrency(0)));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(payments: PaymentRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Customer', 'Date', 'Method', 'Reference #', 'Amount', 'Applied', 'Unapplied', 'Status', 'Actions']) {
    const align = ['Amount', 'Applied', 'Unapplied'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (payments.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No payments found. Record customer payments to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const pmt of payments) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', pmt.customerName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pmt.paymentDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pmt.method));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', pmt.referenceNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(pmt.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(pmt.appliedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', fmtCurrency(pmt.unappliedAmount)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[pmt.status] ?? STATUS_BADGE.pending}`,
      pmt.status.charAt(0).toUpperCase() + pmt.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    const applyBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Apply');
    applyBtn.type = 'button';
    tdActions.appendChild(applyBtn);
    const voidBtn = el('button', 'text-red-400 hover:underline text-sm', 'Void');
    voidBtn.type = 'button';
    tdActions.appendChild(voidBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Payments'));
    const btnGroup = el('div', 'flex items-center gap-2');
    const receiveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Receive Payment');
    receiveBtn.type = 'button';
    receiveBtn.addEventListener('click', () => { /* receive placeholder */ });
    btnGroup.appendChild(receiveBtn);
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    btnGroup.appendChild(exportBtn);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());
    wrapper.appendChild(buildFilterBar((_status, _method, _search, _from, _to) => { /* filter placeholder */ }));

    const payments: PaymentRow[] = [];
    wrapper.appendChild(buildTable(payments));

    container.appendChild(wrapper);
  },
};
