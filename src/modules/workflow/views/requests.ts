/**
 * Approval Requests view.
 * Filterable table of all approval requests showing template name, record type/ID,
 * requested by, date, current step progress, status, and amount.
 */

import { getWorkflowService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const svc = () => getWorkflowService();

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

function showMsg(container: HTMLElement, msg: string, ok = true): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = ok
    ? 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20';
  const d = el('div', cls, msg);
  d.setAttribute('data-msg', '1');
  container.prepend(d);
  setTimeout(() => d.remove(), 3000);
}

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtDate = (v: string): string => v || '--';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'delegated', label: 'Delegated' },
];

const RECORD_TYPE_OPTIONS = [
  { value: '', label: 'All Record Types' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'journal_entry', label: 'Journal Entry' },
  { value: 'expense', label: 'Expense' },
  { value: 'payment', label: 'Payment' },
  { value: 'contract', label: 'Contract' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  escalated: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  delegated: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  skipped: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const INPUT_CLS = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestRow {
  id: string;
  templateId: string;
  templateName: string;
  recordType: string;
  recordId: string;
  recordDescription: string;
  requestedBy: string;
  requestedDate: string;
  currentStep: number;
  totalSteps: number;
  status: string;
  amount: number;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: RequestRow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const total = rows.length;
  const pending = rows.filter((r) => r.status === 'pending').length;
  const approved = rows.filter((r) => r.status === 'approved').length;
  const totalAmount = rows.reduce((s, r) => s + (r.amount || 0), 0);

  const cardData = [
    { label: 'Total Requests', value: String(total), cls: 'text-[var(--text)]' },
    { label: 'Pending', value: String(pending), cls: 'text-amber-400' },
    { label: 'Approved', value: String(approved), cls: 'text-emerald-400' },
    { label: 'Total Amount', value: fmtCurrency(totalAmount), cls: 'text-blue-400' },
  ];

  for (const card of cardData) {
    const cardEl = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    cardEl.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', card.label));
    cardEl.appendChild(el('div', `text-2xl font-bold ${card.cls}`, card.value));
    section.appendChild(cardEl);
  }

  return section;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, recordType: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  const searchInput = el('input', INPUT_CLS) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search requests...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const recordTypeSelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of RECORD_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    recordTypeSelect.appendChild(o);
  }
  bar.appendChild(recordTypeSelect);

  const fire = () => onFilter(statusSelect.value, recordTypeSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  recordTypeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: RequestRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Template', 'Record Type', 'Record ID', 'Requested By', 'Date', 'Progress', 'Status', 'Amount']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No approval requests found.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.templateName || row.templateId));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.recordType.replace(/_/g, ' ')));

    const tdRecord = el('td', 'py-2 px-3');
    tdRecord.appendChild(el('span', 'font-mono text-[var(--text)]', row.recordId));
    if (row.recordDescription) {
      tdRecord.appendChild(el('div', 'text-xs text-[var(--text-muted)] truncate max-w-[150px]', row.recordDescription));
    }
    tr.appendChild(tdRecord);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.requestedBy));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtDate(row.requestedDate)));

    // Progress
    const tdProgress = el('td', 'py-2 px-3');
    const progressText = `${row.currentStep}/${row.totalSteps}`;
    const progressBar = el('div', 'flex items-center gap-2');
    const barOuter = el('div', 'w-16 h-1.5 rounded-full bg-[var(--border)]');
    const pct = row.totalSteps > 0 ? Math.round((row.currentStep / row.totalSteps) * 100) : 0;
    const barInner = el('div', 'h-full rounded-full bg-[var(--accent)]');
    barInner.style.width = `${pct}%`;
    barOuter.appendChild(barInner);
    progressBar.appendChild(barOuter);
    progressBar.appendChild(el('span', 'text-xs font-mono text-[var(--text-muted)]', progressText));
    tdProgress.appendChild(progressBar);
    tr.appendChild(tdProgress);

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.pending}`,
      row.status.charAt(0).toUpperCase() + row.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.amount ? fmtCurrency(row.amount) : '--'));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'p-6');
let allRows: RequestRow[] = [];
let summaryContainer: HTMLElement | null = null;
let tableContainer: HTMLElement | null = null;

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function getFiltered(status: string, recordType: string, search: string): RequestRow[] {
  let filtered = allRows;
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (recordType) filtered = filtered.filter((r) => r.recordType === recordType);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((r) =>
      r.templateName.toLowerCase().includes(q) ||
      r.recordId.toLowerCase().includes(q) ||
      r.recordDescription.toLowerCase().includes(q) ||
      r.requestedBy.toLowerCase().includes(q),
    );
  }
  return filtered;
}

function renderContent(rows: RequestRow[]): void {
  if (summaryContainer) {
    summaryContainer.replaceChildren(buildSummaryCards(rows));
  }
  if (tableContainer) {
    tableContainer.replaceChildren(buildTable(rows));
  }
}

// ---------------------------------------------------------------------------
// Async initialisation
// ---------------------------------------------------------------------------

void (async () => {
  wrapper.appendChild(el('div', 'text-sm text-[var(--text-muted)] py-8 text-center', 'Loading approval requests...'));

  try {
    const requests = await svc().listRequests();
    allRows = requests.map((r) => ({
      id: (r as any).id ?? '',
      templateId: r.templateId,
      templateName: r.templateName ?? r.templateId,
      recordType: r.recordType,
      recordId: r.recordId,
      recordDescription: r.recordDescription ?? '',
      requestedBy: r.requestedBy,
      requestedDate: r.requestedDate,
      currentStep: r.currentStep,
      totalSteps: r.totalSteps,
      status: r.status,
      amount: r.amount ?? 0,
    }));

    wrapper.innerHTML = '';

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Approval Requests'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', String(allRows.length));
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Summary
    summaryContainer = el('div');
    wrapper.appendChild(summaryContainer);

    // Filter bar
    wrapper.appendChild(buildFilterBar((status, recordType, search) => {
      renderContent(getFiltered(status, recordType, search));
    }));

    // Table
    tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    renderContent(allRows);
  } catch (err: unknown) {
    wrapper.innerHTML = '';
    const message = err instanceof Error ? err.message : 'Failed to load approval requests';
    showMsg(wrapper, message, false);
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
