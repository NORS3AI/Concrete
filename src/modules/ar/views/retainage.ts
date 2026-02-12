/**
 * AR Retainage Tracking view.
 * Track retainage receivable from customers/owners, with release management.
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
  { value: 'held', label: 'Held' },
  { value: 'partial', label: 'Partially Released' },
  { value: 'released', label: 'Released' },
];

const STATUS_BADGE: Record<string, string> = {
  held: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  partial: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  released: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  held: 'Held',
  partial: 'Partial',
  released: 'Released',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RetainageRow {
  id: string;
  customerName: string;
  customerCode: string;
  jobNumber: string;
  jobName: string;
  invoiceNumber: string;
  invoiceDate: string;
  retainagePct: number;
  originalAmount: number;
  retainageHeld: number;
  retainageReleased: number;
  retainageBalance: number;
  status: string;
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
  searchInput.placeholder = 'Search customers or jobs...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
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
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold font-mono ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Total Retainage Held', fmtCurrency(0), 'text-amber-400'));
  row.appendChild(buildCard('Partially Released', fmtCurrency(0), 'text-purple-400'));
  row.appendChild(buildCard('Released YTD', fmtCurrency(0), 'text-emerald-400'));
  row.appendChild(buildCard('Net Retainage Receivable', fmtCurrency(0), 'text-[var(--accent)]'));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: RetainageRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Customer', 'Job', 'Invoice', 'Date', 'Ret %', 'Original', 'Held', 'Released', 'Balance', 'Status', 'Actions']) {
    const align = ['Ret %', 'Original', 'Held', 'Released', 'Balance'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No retainage records found. Retainage is tracked automatically when invoices with retainage are created.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdCustomer = el('td', 'py-2 px-3');
    const customerLink = el('a', 'text-[var(--accent)] hover:underline', row.customerName) as HTMLAnchorElement;
    customerLink.href = `#/ar/customers/${row.id}`;
    tdCustomer.appendChild(customerLink);
    tdCustomer.appendChild(el('div', 'text-xs text-[var(--text-muted)] font-mono', row.customerCode));
    tr.appendChild(tdCustomer);

    const tdJob = el('td', 'py-2 px-3');
    tdJob.appendChild(el('div', 'font-mono text-[var(--text)]', row.jobNumber));
    tdJob.appendChild(el('div', 'text-xs text-[var(--text-muted)]', row.jobName));
    tr.appendChild(tdJob);

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.invoiceNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.invoiceDate));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', `${row.retainagePct.toFixed(1)}%`));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.originalAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', fmtCurrency(row.retainageHeld)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(row.retainageReleased)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium text-[var(--text)]', fmtCurrency(row.retainageBalance)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.held}`,
      STATUS_LABELS[row.status] ?? row.status);
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    const releaseBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Release');
    releaseBtn.type = 'button';
    releaseBtn.addEventListener('click', () => { /* release placeholder */ });
    tdActions.appendChild(releaseBtn);
    const viewBtn = el('button', 'text-[var(--text-muted)] hover:underline text-sm', 'View');
    viewBtn.type = 'button';
    tdActions.appendChild(viewBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  // Totals row
  if (rows.length > 0) {
    const totalsRow = el('tr', 'border-t-2 border-[var(--border)] bg-[var(--surface)] font-medium');
    totalsRow.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', 'Totals'));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(0)));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', fmtCurrency(0)));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(0)));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono font-bold text-[var(--text)]', fmtCurrency(0)));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    tbody.appendChild(totalsRow);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Retainage Receivable'));
    const btnGroup = el('div', 'flex items-center gap-2');
    const releaseBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Batch Release');
    releaseBtn.type = 'button';
    releaseBtn.addEventListener('click', () => { /* batch release placeholder */ });
    btnGroup.appendChild(releaseBtn);
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    btnGroup.appendChild(exportBtn);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());
    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const rows: RetainageRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
