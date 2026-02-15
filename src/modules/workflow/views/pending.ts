/**
 * Pending Approvals view.
 * Shows only pending approval requests with approve/reject action buttons.
 * Displays record description, amount, requested by, and request date.
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
// Types
// ---------------------------------------------------------------------------

interface PendingRow {
  id: string;
  templateName: string;
  recordType: string;
  recordId: string;
  recordDescription: string;
  requestedBy: string;
  requestedDate: string;
  currentStep: number;
  totalSteps: number;
  amount: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'p-6');
let allRows: PendingRow[] = [];
let tableContainer: HTMLElement | null = null;
let summaryContainer: HTMLElement | null = null;

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: PendingRow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-3 gap-4 mb-6');

  const total = rows.length;
  const totalAmount = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const uniqueRequesters = new Set(rows.map((r) => r.requestedBy)).size;

  const cardData = [
    { label: 'Pending Approvals', value: String(total), cls: 'text-amber-400' },
    { label: 'Total Amount', value: fmtCurrency(totalAmount), cls: 'text-[var(--text)]' },
    { label: 'Unique Requesters', value: String(uniqueRequesters), cls: 'text-blue-400' },
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

function buildTable(rows: PendingRow[], onAction: () => void): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Template', 'Record', 'Description', 'Requested By', 'Date', 'Progress', 'Amount', 'Actions']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No pending approvals. All caught up!');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.templateName));

    const tdRecord = el('td', 'py-2 px-3');
    tdRecord.appendChild(el('span', 'text-xs text-[var(--text-muted)]', row.recordType.replace(/_/g, ' ')));
    tdRecord.appendChild(el('div', 'font-mono text-[var(--text)]', row.recordId));
    tr.appendChild(tdRecord);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[200px]', row.recordDescription || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.requestedBy));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtDate(row.requestedDate)));

    // Progress
    const tdProgress = el('td', 'py-2 px-3');
    const progressText = `${row.currentStep}/${row.totalSteps}`;
    tdProgress.appendChild(el('span', 'text-xs font-mono text-[var(--text-muted)]', progressText));
    tr.appendChild(tdProgress);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.amount ? fmtCurrency(row.amount) : '--'));

    // Actions
    const tdActions = el('td', 'py-2 px-3');
    const btnWrap = el('div', 'flex items-center gap-2');

    const approveBtn = el('button', 'px-3 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors', 'Approve');
    approveBtn.type = 'button';
    approveBtn.addEventListener('click', async () => {
      try {
        approveBtn.disabled = true;
        approveBtn.textContent = '...';
        await svc().approveRequest(row.id, 'current-user');
        showMsg(wrapper, `Request ${row.recordId} approved successfully.`, true);
        onAction();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Approval failed';
        showMsg(wrapper, message, false);
        approveBtn.disabled = false;
        approveBtn.textContent = 'Approve';
      }
    });
    btnWrap.appendChild(approveBtn);

    const rejectBtn = el('button', 'px-3 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors', 'Reject');
    rejectBtn.type = 'button';
    rejectBtn.addEventListener('click', async () => {
      try {
        rejectBtn.disabled = true;
        rejectBtn.textContent = '...';
        await svc().rejectRequest(row.id, 'current-user');
        showMsg(wrapper, `Request ${row.recordId} rejected.`, true);
        onAction();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Rejection failed';
        showMsg(wrapper, message, false);
        rejectBtn.disabled = false;
        rejectBtn.textContent = 'Reject';
      }
    });
    btnWrap.appendChild(rejectBtn);

    tdActions.appendChild(btnWrap);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function loadData(): Promise<void> {
  const requests = await svc().listRequests({ status: 'pending' as any });
  allRows = requests.map((r) => ({
    id: (r as any).id ?? '',
    templateName: r.templateName ?? r.templateId,
    recordType: r.recordType,
    recordId: r.recordId,
    recordDescription: r.recordDescription ?? '',
    requestedBy: r.requestedBy,
    requestedDate: r.requestedDate,
    currentStep: r.currentStep,
    totalSteps: r.totalSteps,
    amount: r.amount ?? 0,
    notes: r.notes ?? '',
  }));
}

function renderContent(): void {
  if (summaryContainer) {
    summaryContainer.replaceChildren(buildSummaryCards(allRows));
  }
  if (tableContainer) {
    tableContainer.replaceChildren(buildTable(allRows, refresh));
  }
  // Update count badge
  const badge = wrapper.querySelector('[data-count-badge]');
  if (badge) badge.textContent = String(allRows.length);
}

async function refresh(): Promise<void> {
  try {
    await loadData();
    renderContent();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to refresh pending approvals';
    showMsg(wrapper, message, false);
  }
}

// ---------------------------------------------------------------------------
// Async initialisation
// ---------------------------------------------------------------------------

void (async () => {
  wrapper.appendChild(el('div', 'text-sm text-[var(--text-muted)] py-8 text-center', 'Loading pending approvals...'));

  try {
    await loadData();
    wrapper.innerHTML = '';

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Pending Approvals'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20', String(allRows.length));
    countBadge.setAttribute('data-count-badge', '1');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Summary
    summaryContainer = el('div');
    wrapper.appendChild(summaryContainer);

    // Table
    tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    renderContent();
  } catch (err: unknown) {
    wrapper.innerHTML = '';
    const message = err instanceof Error ? err.message : 'Failed to load pending approvals';
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
