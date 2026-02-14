/**
 * Bulk Approval Batches view.
 * Shows recent bulk approval batches with batch ID, approved by, date,
 * count of requests, and notes.
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

const fmtTimestamp = (v: string): string => {
  if (!v) return '--';
  try {
    const d = new Date(v);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return v;
  }
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BulkBatchRow {
  id: string;
  batchId: string;
  approvedBy: string;
  approvedDate: string;
  requestIds: string;
  count: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'p-6');
let allRows: BulkBatchRow[] = [];

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: BulkBatchRow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-3 gap-4 mb-6');

  const totalBatches = rows.length;
  const totalRequests = rows.reduce((s, r) => s + r.count, 0);
  const uniqueApprovers = new Set(rows.map((r) => r.approvedBy)).size;

  const cardData = [
    { label: 'Total Batches', value: String(totalBatches), cls: 'text-[var(--text)]' },
    { label: 'Total Requests Processed', value: String(totalRequests), cls: 'text-emerald-400' },
    { label: 'Unique Approvers', value: String(uniqueApprovers), cls: 'text-blue-400' },
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
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: BulkBatchRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Batch ID', 'Approved By', 'Date', 'Request Count', 'Request IDs', 'Notes']) {
    const align = col === 'Request Count' ? 'py-2 px-3 font-medium text-center' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No bulk approval batches found. Use bulk approval to process multiple requests at once.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--accent)]', row.batchId));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.approvedBy));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtTimestamp(row.approvedDate)));

    // Count with badge
    const tdCount = el('td', 'py-2 px-3 text-center');
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', String(row.count));
    tdCount.appendChild(countBadge);
    tr.appendChild(tdCount);

    // Request IDs (truncated)
    const tdIds = el('td', 'py-2 px-3');
    const ids = row.requestIds.split(',').filter(Boolean);
    if (ids.length > 0) {
      const preview = ids.slice(0, 3).join(', ');
      const suffix = ids.length > 3 ? ` +${ids.length - 3} more` : '';
      const idsEl = el('span', 'text-xs font-mono text-[var(--text-muted)]', preview + suffix);
      idsEl.title = row.requestIds;
      tdIds.appendChild(idsEl);
    } else {
      tdIds.appendChild(el('span', 'text-[var(--text-muted)]', '--'));
    }
    tr.appendChild(tdIds);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[200px]', row.notes || '--'));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Async initialisation
// ---------------------------------------------------------------------------

void (async () => {
  wrapper.appendChild(el('div', 'text-sm text-[var(--text-muted)] py-8 text-center', 'Loading bulk approval batches...'));

  try {
    const batches = await svc().listBulkBatches();
    allRows = batches.map((b) => ({
      id: (b as any).id ?? '',
      batchId: b.batchId,
      approvedBy: b.approvedBy,
      approvedDate: b.approvedDate,
      requestIds: b.requestIds,
      count: b.count,
      notes: b.notes ?? '',
    }));

    wrapper.innerHTML = '';

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Bulk Approval Batches'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', String(allRows.length));
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Summary
    wrapper.appendChild(buildSummaryCards(allRows));

    // Table
    wrapper.appendChild(buildTable(allRows));
  } catch (err: unknown) {
    wrapper.innerHTML = '';
    const message = err instanceof Error ? err.message : 'Failed to load bulk approval batches';
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
