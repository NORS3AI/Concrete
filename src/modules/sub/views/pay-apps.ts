/**
 * Payment Applications (AIA G702) view.
 * Filterable table of pay apps with submission and approval workflow actions.
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

interface PayAppRow {
  id: string;
  subcontractNumber: string;
  vendorName: string;
  applicationNumber: number;
  periodTo: string;
  previouslyBilled: number;
  currentBilled: number;
  materialStored: number;
  totalBilled: number;
  retainageAmount: number;
  netPayable: number;
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
  searchInput.placeholder = 'Search pay applications...';
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

function buildSummaryCards(payApps: PayAppRow[]): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const totalBilled = payApps.reduce((s, p) => s + p.currentBilled, 0);
  const totalRetainage = payApps.reduce((s, p) => s + p.retainageAmount, 0);
  const totalNetPayable = payApps.reduce((s, p) => s + p.netPayable, 0);
  const pendingApproval = payApps.filter((p) => p.status === 'submitted').length;

  const cards = [
    { label: 'Total Current Billed', value: fmtCurrency(totalBilled) },
    { label: 'Total Retainage', value: fmtCurrency(totalRetainage) },
    { label: 'Total Net Payable', value: fmtCurrency(totalNetPayable) },
    { label: 'Pending Approval', value: pendingApproval.toString() },
  ];

  for (const card of cards) {
    const div = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    div.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', card.label));
    div.appendChild(el('div', 'text-xl font-bold text-[var(--text)]', card.value));
    row.appendChild(div);
  }

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(payApps: PayAppRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['App #', 'Subcontract', 'Vendor', 'Period To', 'Prev Billed', 'Current', 'Material', 'Total', 'Retainage', 'Net Payable', 'Status', 'Actions']) {
    const align = ['Prev Billed', 'Current', 'Material', 'Total', 'Retainage', 'Net Payable'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (payApps.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No payment applications found.');
    td.setAttribute('colspan', '12');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const pa of payApps) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--text)]', `#${pa.applicationNumber}`));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', pa.subcontractNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', pa.vendorName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pa.periodTo));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(pa.previouslyBilled)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(pa.currentBilled)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(pa.materialStored)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(pa.totalBilled)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(pa.retainageAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium text-[var(--accent)]', fmtCurrency(pa.netPayable)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[pa.status] ?? STATUS_BADGE.draft}`,
      pa.status.charAt(0).toUpperCase() + pa.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (pa.status === 'draft') {
      const submitBtn = el('button', 'text-amber-400 hover:underline text-sm mr-2', 'Submit');
      submitBtn.type = 'button';
      submitBtn.addEventListener('click', () => { /* submit placeholder */ });
      tdActions.appendChild(submitBtn);
    }
    if (pa.status === 'submitted') {
      const approveBtn = el('button', 'text-emerald-400 hover:underline text-sm mr-2', 'Approve');
      approveBtn.type = 'button';
      approveBtn.addEventListener('click', () => { /* approve placeholder */ });
      tdActions.appendChild(approveBtn);
    }
    if (pa.status === 'approved') {
      const payBtn = el('button', 'text-blue-400 hover:underline text-sm', 'Mark Paid');
      payBtn.type = 'button';
      payBtn.addEventListener('click', () => { /* pay placeholder */ });
      tdActions.appendChild(payBtn);
    }
    if (pa.status === 'paid') {
      tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'Complete'));
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Payment Applications'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Pay App');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* new pay app placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    const payApps: PayAppRow[] = [];
    wrapper.appendChild(buildSummaryCards(payApps));
    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));
    wrapper.appendChild(buildTable(payApps));

    container.appendChild(wrapper);
  },
};
