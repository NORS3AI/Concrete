/**
 * Open PO Report view.
 * Shows all open (non-closed, non-cancelled) purchase orders with remaining amounts.
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

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending_approval: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  partial_receipt: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  received: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  standard: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  blanket: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  service: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpenPORow {
  poId: string;
  poNumber: string;
  vendorName: string;
  jobId: string;
  type: string;
  description: string;
  status: string;
  amount: number;
  totalAmount: number;
  receivedAmount: number;
  invoicedAmount: number;
  remainingAmount: number;
  issuedDate: string;
  expectedDate: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (vendor: string, job: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const vendorInput = el('input', inputCls) as HTMLInputElement;
  vendorInput.type = 'text';
  vendorInput.placeholder = 'Filter by vendor...';
  bar.appendChild(vendorInput);

  const jobInput = el('input', inputCls) as HTMLInputElement;
  jobInput.type = 'text';
  jobInput.placeholder = 'Filter by job...';
  bar.appendChild(jobInput);

  const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]', 'Export CSV');
  exportBtn.type = 'button';
  exportBtn.addEventListener('click', () => { /* export placeholder */ });
  bar.appendChild(exportBtn);

  const fire = () => onFilter(vendorInput.value, jobInput.value);
  vendorInput.addEventListener('input', fire);
  jobInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Open PO Table
// ---------------------------------------------------------------------------

function buildOpenPOTable(openPOs: OpenPORow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['PO #', 'Vendor', 'Job', 'Type', 'Description', 'Amount', 'Received', 'Invoiced', 'Remaining', 'Status', 'Issued', 'Expected']) {
    const align = ['Amount', 'Received', 'Invoiced', 'Remaining'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (openPOs.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No open purchase orders found.');
    td.setAttribute('colspan', '12');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const po of openPOs) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', po.poNumber) as HTMLAnchorElement;
    link.href = `#/po/${po.poId}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', po.vendorName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono', po.jobId));

    const tdType = el('td', 'py-2 px-3');
    const typeBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[po.type] ?? TYPE_BADGE.standard}`,
      po.type.charAt(0).toUpperCase() + po.type.slice(1));
    tdType.appendChild(typeBadge);
    tr.appendChild(tdType);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[150px]', po.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(po.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(po.receivedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(po.invoicedAmount)));

    const remainCls = po.remainingAmount > 0 ? 'text-amber-400' : 'text-emerald-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono font-medium ${remainCls}`, fmtCurrency(po.remainingAmount)));

    const tdStatus = el('td', 'py-2 px-3');
    const statusLabel = po.status.replace(/_/g, ' ');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[po.status] ?? STATUS_BADGE.draft}`,
      statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', po.issuedDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', po.expectedDate));

    tbody.appendChild(tr);
  }

  // Totals row
  if (openPOs.length > 0) {
    const totalRow = el('tr', 'bg-[var(--surface)] font-medium');
    const tdLabel = el('td', 'py-2 px-3', 'Totals');
    tdLabel.setAttribute('colspan', '5');
    totalRow.appendChild(tdLabel);

    const totalAmount = openPOs.reduce((sum, po) => sum + po.amount, 0);
    const totalReceived = openPOs.reduce((sum, po) => sum + po.receivedAmount, 0);
    const totalInvoiced = openPOs.reduce((sum, po) => sum + po.invoicedAmount, 0);
    const totalRemaining = openPOs.reduce((sum, po) => sum + po.remainingAmount, 0);

    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalAmount)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalReceived)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalInvoiced)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono font-bold', fmtCurrency(totalRemaining)));

    const emptyTd = el('td', 'py-2 px-3');
    emptyTd.setAttribute('colspan', '3');
    totalRow.appendChild(emptyTd);

    tbody.appendChild(totalRow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(openPOs: OpenPORow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const totalOpen = openPOs.length;
  const totalAmount = openPOs.reduce((sum, po) => sum + po.amount, 0);
  const totalReceived = openPOs.reduce((sum, po) => sum + po.receivedAmount, 0);
  const totalRemaining = openPOs.reduce((sum, po) => sum + po.remainingAmount, 0);

  const cardData = [
    { label: 'Open POs', value: String(totalOpen), cls: 'text-[var(--text)]' },
    { label: 'Total Committed', value: fmtCurrency(totalAmount), cls: 'text-blue-400' },
    { label: 'Received', value: fmtCurrency(totalReceived), cls: 'text-emerald-400' },
    { label: 'Remaining', value: fmtCurrency(totalRemaining), cls: 'text-amber-400' },
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Open Purchase Orders'));
    wrapper.appendChild(headerRow);

    const openPOs: OpenPORow[] = [];
    wrapper.appendChild(buildSummaryCards(openPOs));
    wrapper.appendChild(buildFilterBar((_vendor, _job) => { /* filter placeholder */ }));
    wrapper.appendChild(buildOpenPOTable(openPOs));

    container.appendChild(wrapper);
  },
};
