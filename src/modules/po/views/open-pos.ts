/**
 * Open PO Report view.
 * Shows all open (non-closed, non-cancelled) purchase orders with remaining amounts.
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

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending_approval: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  partial_receipt: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  received: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  standard: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  blanket: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  service: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const inputCls =
  'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpenPORow {
  poId: string;
  poNumber: string;
  vendorId: string;
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
// Module state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');
let allRows: OpenPORow[] = [];
let filteredRows: OpenPORow[] = [];
let vendorFilter = '';
let jobFilter = '';

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

async function loadData(): Promise<void> {
  const svc = getPOService();
  const rows = await svc.getOpenPOReport();
  allRows = rows.map((r) => ({
    poId: r.poId,
    poNumber: r.poNumber,
    vendorId: r.vendorId,
    vendorName: r.vendorName || r.vendorId,
    jobId: r.jobId,
    type: r.type,
    description: r.description,
    status: r.status,
    amount: r.amount,
    totalAmount: r.totalAmount,
    receivedAmount: r.receivedAmount,
    invoicedAmount: r.invoicedAmount,
    remainingAmount: r.remainingAmount,
    issuedDate: r.issuedDate,
    expectedDate: r.expectedDate,
  }));
  applyFilters();
}

function applyFilters(): void {
  filteredRows = allRows.filter((row) => {
    const vendorMatch =
      !vendorFilter ||
      row.vendorName.toLowerCase().includes(vendorFilter.toLowerCase()) ||
      row.vendorId.toLowerCase().includes(vendorFilter.toLowerCase());
    const jobMatch =
      !jobFilter ||
      row.jobId.toLowerCase().includes(jobFilter.toLowerCase());
    return vendorMatch && jobMatch;
  });
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportCSV(rows: OpenPORow[]): void {
  const headers = [
    'PO #', 'Vendor', 'Job', 'Type', 'Description', 'Amount',
    'Total', 'Received', 'Invoiced', 'Remaining', 'Status',
    'Issued', 'Expected',
  ];

  const csvRows = [headers.join(',')];

  for (const row of rows) {
    const line = [
      `"${row.poNumber}"`,
      `"${row.vendorName}"`,
      `"${row.jobId}"`,
      `"${row.type}"`,
      `"${(row.description || '').replace(/"/g, '""')}"`,
      row.amount.toFixed(2),
      row.totalAmount.toFixed(2),
      row.receivedAmount.toFixed(2),
      row.invoicedAmount.toFixed(2),
      row.remainingAmount.toFixed(2),
      `"${row.status}"`,
      `"${row.issuedDate}"`,
      `"${row.expectedDate}"`,
    ];
    csvRows.push(line.join(','));
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'open-purchase-orders.csv';
  link.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: OpenPORow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const totalOpen = rows.length;
  const totalCommitted = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalReceived = rows.reduce((sum, r) => sum + r.receivedAmount, 0);
  const totalRemaining = rows.reduce((sum, r) => sum + r.remainingAmount, 0);

  const cardData = [
    { label: 'Open POs', value: String(totalOpen), cls: 'text-[var(--text)]' },
    { label: 'Total Committed', value: fmtCurrency(totalCommitted), cls: 'text-blue-400' },
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
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  const vendorInput = el('input', inputCls) as HTMLInputElement;
  vendorInput.type = 'text';
  vendorInput.placeholder = 'Filter by vendor...';
  vendorInput.value = vendorFilter;
  bar.appendChild(vendorInput);

  const jobInput = el('input', inputCls) as HTMLInputElement;
  jobInput.type = 'text';
  jobInput.placeholder = 'Filter by job...';
  jobInput.value = jobFilter;
  bar.appendChild(jobInput);

  const exportBtn = el(
    'button',
    'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]',
    'Export CSV',
  );
  exportBtn.type = 'button';
  exportBtn.addEventListener('click', () => {
    exportCSV(filteredRows);
    showMsg(wrapper, 'CSV exported successfully.', false);
  });
  bar.appendChild(exportBtn);

  const handleFilter = () => {
    vendorFilter = vendorInput.value;
    jobFilter = jobInput.value;
    applyFilters();
    rebuildView();
  };

  vendorInput.addEventListener('input', handleFilter);
  jobInput.addEventListener('input', handleFilter);

  return bar;
}

// ---------------------------------------------------------------------------
// Open PO Table
// ---------------------------------------------------------------------------

function buildOpenPOTable(rows: OpenPORow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of [
    'PO #', 'Vendor', 'Job', 'Type', 'Description',
    'Amount', 'Total', 'Received', 'Invoiced', 'Remaining',
    'Status', 'Issued', 'Expected',
  ]) {
    const align = ['Amount', 'Total', 'Received', 'Invoiced', 'Remaining'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el(
      'td',
      'py-8 px-3 text-center text-[var(--text-muted)]',
      'No open purchase orders found.',
    );
    td.setAttribute('colspan', '13');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const po of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    // PO Number as link
    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', po.poNumber) as HTMLAnchorElement;
    link.href = `#/po/${po.poId}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', po.vendorName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono', po.jobId));

    // Type badge
    const tdType = el('td', 'py-2 px-3');
    const typeBadge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[po.type] ?? TYPE_BADGE.standard}`,
      po.type.charAt(0).toUpperCase() + po.type.slice(1),
    );
    tdType.appendChild(typeBadge);
    tr.appendChild(tdType);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[150px]', po.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(po.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(po.totalAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(po.receivedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(po.invoicedAmount)));

    // Remaining amount color: > 50% of total = red, else green
    const remainPct = po.totalAmount > 0 ? po.remainingAmount / po.totalAmount : 0;
    const remainCls = remainPct > 0.5 ? 'text-red-400' : 'text-emerald-400';
    tr.appendChild(
      el('td', `py-2 px-3 text-right font-mono font-medium ${remainCls}`, fmtCurrency(po.remainingAmount)),
    );

    // Status badge
    const tdStatus = el('td', 'py-2 px-3');
    const statusLabel = po.status.replace(/_/g, ' ');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[po.status] ?? STATUS_BADGE.draft}`,
      statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', po.issuedDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', po.expectedDate));

    tbody.appendChild(tr);
  }

  // Totals row
  if (rows.length > 0) {
    const totalRow = el('tr', 'bg-[var(--surface)] font-medium');
    const tdLabel = el('td', 'py-2 px-3', 'Totals');
    tdLabel.setAttribute('colspan', '5');
    totalRow.appendChild(tdLabel);

    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
    const totalTotal = rows.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalReceived = rows.reduce((sum, r) => sum + r.receivedAmount, 0);
    const totalInvoiced = rows.reduce((sum, r) => sum + r.invoicedAmount, 0);
    const totalRemaining = rows.reduce((sum, r) => sum + r.remainingAmount, 0);

    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalAmount)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalTotal)));
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
// Rebuild
// ---------------------------------------------------------------------------

function rebuildView(): void {
  // Preserve data-msg elements
  const msgs = Array.from(wrapper.querySelectorAll('[data-msg]'));
  wrapper.innerHTML = '';
  for (const m of msgs) wrapper.appendChild(m);

  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Open Purchase Orders'));
  wrapper.appendChild(headerRow);

  wrapper.appendChild(buildSummaryCards(filteredRows));
  wrapper.appendChild(buildFilterBar());
  wrapper.appendChild(buildOpenPOTable(filteredRows));
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

void (async () => {
  try {
    await loadData();
    rebuildView();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    showMsg(wrapper, message, true);
  }
})();

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};
