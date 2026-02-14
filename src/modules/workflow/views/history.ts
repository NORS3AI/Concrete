/**
 * Approval History view.
 * Shows completed approval records with record type/ID, requested by,
 * final action, completed date, duration, and steps completed.
 * Filterable by record type and final action.
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

const fmtDate = (v: string): string => v || '--';

const fmtDuration = (days: number): string => {
  if (!days) return '--';
  if (days < 1) return '< 1 day';
  if (days === 1) return '1 day';
  return `${days} days`;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECORD_TYPE_OPTIONS = [
  { value: '', label: 'All Record Types' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'journal_entry', label: 'Journal Entry' },
  { value: 'expense', label: 'Expense' },
  { value: 'payment', label: 'Payment' },
  { value: 'contract', label: 'Contract' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const ACTION_BADGE: Record<string, string> = {
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const INPUT_CLS = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryRow {
  id: string;
  requestId: string;
  recordType: string;
  recordId: string;
  recordDescription: string;
  requestedBy: string;
  finalAction: string;
  completedDate: string;
  totalDuration: number;
  stepsCompleted: number;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'p-6');
let allRows: HistoryRow[] = [];
let summaryContainer: HTMLElement | null = null;
let tableContainer: HTMLElement | null = null;

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: HistoryRow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const total = rows.length;
  const approved = rows.filter((r) => r.finalAction === 'approved').length;
  const rejected = rows.filter((r) => r.finalAction === 'rejected').length;
  const avgDuration = total > 0 ? Math.round(rows.reduce((s, r) => s + r.totalDuration, 0) / total) : 0;

  const cardData = [
    { label: 'Total Completed', value: String(total), cls: 'text-[var(--text)]' },
    { label: 'Approved', value: String(approved), cls: 'text-emerald-400' },
    { label: 'Rejected', value: String(rejected), cls: 'text-red-400' },
    { label: 'Avg Duration', value: fmtDuration(avgDuration), cls: 'text-blue-400' },
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
  onFilter: (recordType: string, finalAction: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  const recordTypeSelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of RECORD_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    recordTypeSelect.appendChild(o);
  }
  bar.appendChild(recordTypeSelect);

  const actionSelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of ACTION_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    actionSelect.appendChild(o);
  }
  bar.appendChild(actionSelect);

  const fire = () => onFilter(recordTypeSelect.value, actionSelect.value);
  recordTypeSelect.addEventListener('change', fire);
  actionSelect.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: HistoryRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Record Type', 'Record ID', 'Description', 'Requested By', 'Final Action', 'Completed', 'Duration', 'Steps']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No approval history found.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.recordType.replace(/_/g, ' ')));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.recordId));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[200px]', row.recordDescription || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.requestedBy));

    const tdAction = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_BADGE[row.finalAction] ?? ACTION_BADGE.approved}`,
      row.finalAction.charAt(0).toUpperCase() + row.finalAction.slice(1),
    );
    tdAction.appendChild(badge);
    tr.appendChild(tdAction);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtDate(row.completedDate)));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', fmtDuration(row.totalDuration)));
    tr.appendChild(el('td', 'py-2 px-3 text-center font-mono text-[var(--text)]', String(row.stepsCompleted)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function getFiltered(recordType: string, finalAction: string): HistoryRow[] {
  let filtered = allRows;
  if (recordType) filtered = filtered.filter((r) => r.recordType === recordType);
  if (finalAction) filtered = filtered.filter((r) => r.finalAction === finalAction);
  return filtered;
}

function renderContent(rows: HistoryRow[]): void {
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
  wrapper.appendChild(el('div', 'text-sm text-[var(--text-muted)] py-8 text-center', 'Loading approval history...'));

  try {
    const history = await svc().listHistory();
    allRows = history.map((h) => ({
      id: (h as any).id ?? '',
      requestId: h.requestId,
      recordType: h.recordType,
      recordId: h.recordId,
      recordDescription: h.recordDescription ?? '',
      requestedBy: h.requestedBy,
      finalAction: h.finalAction,
      completedDate: h.completedDate,
      totalDuration: h.totalDuration,
      stepsCompleted: h.stepsCompleted,
    }));

    wrapper.innerHTML = '';

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Approval History'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', String(allRows.length));
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Summary
    summaryContainer = el('div');
    wrapper.appendChild(summaryContainer);

    // Filter bar
    wrapper.appendChild(buildFilterBar((recordType, finalAction) => {
      renderContent(getFiltered(recordType, finalAction));
    }));

    // Table
    tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    renderContent(allRows);
  } catch (err: unknown) {
    wrapper.innerHTML = '';
    const message = err instanceof Error ? err.message : 'Failed to load approval history';
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
