/**
 * Delegation Rules view.
 * Lists delegation rules with user, delegate to, start/end dates, reason,
 * and active status. Supports toggling active/inactive state.
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVE_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DelegationRow {
  id: string;
  userId: string;
  userName: string;
  delegateTo: string;
  delegateToName: string;
  startDate: string;
  endDate: string;
  reason: string;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'p-6');
let allRows: DelegationRow[] = [];
let tableContainer: HTMLElement | null = null;
let summaryContainer: HTMLElement | null = null;

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: DelegationRow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-3 gap-4 mb-6');

  const total = rows.length;
  const active = rows.filter((r) => r.active).length;
  const inactive = rows.filter((r) => !r.active).length;

  const cardData = [
    { label: 'Total Delegations', value: String(total), cls: 'text-[var(--text)]' },
    { label: 'Active', value: String(active), cls: 'text-emerald-400' },
    { label: 'Inactive', value: String(inactive), cls: 'text-zinc-400' },
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

function buildTable(rows: DelegationRow[], onToggle: (row: DelegationRow) => void): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['User', 'Delegate To', 'Start Date', 'End Date', 'Reason', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No delegation rules found. Create a delegation to assign approvals to another user.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdUser = el('td', 'py-2 px-3');
    tdUser.appendChild(el('div', 'font-medium text-[var(--text)]', row.userName || row.userId));
    if (row.userName && row.userId !== row.userName) {
      tdUser.appendChild(el('div', 'text-xs text-[var(--text-muted)]', row.userId));
    }
    tr.appendChild(tdUser);

    const tdDelegate = el('td', 'py-2 px-3');
    tdDelegate.appendChild(el('div', 'font-medium text-[var(--text)]', row.delegateToName || row.delegateTo));
    if (row.delegateToName && row.delegateTo !== row.delegateToName) {
      tdDelegate.appendChild(el('div', 'text-xs text-[var(--text-muted)]', row.delegateTo));
    }
    tr.appendChild(tdDelegate);

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', fmtDate(row.startDate)));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', fmtDate(row.endDate)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[200px]', row.reason || '--'));

    const tdStatus = el('td', 'py-2 px-3');
    const statusKey = row.active ? 'active' : 'inactive';
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${ACTIVE_BADGE[statusKey]}`,
      row.active ? 'Active' : 'Inactive',
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    // Toggle action
    const tdActions = el('td', 'py-2 px-3');
    if (row.active) {
      const deactivateBtn = el('button', 'px-3 py-1 rounded-md text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 hover:bg-zinc-500/20 transition-colors', 'Deactivate');
      deactivateBtn.type = 'button';
      deactivateBtn.addEventListener('click', () => onToggle(row));
      tdActions.appendChild(deactivateBtn);
    } else {
      tdActions.appendChild(el('span', 'text-xs text-[var(--text-muted)]', 'Deactivated'));
    }
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
  const delegations = await svc().listDelegations();
  allRows = delegations.map((d) => ({
    id: (d as any).id ?? '',
    userId: d.userId,
    userName: d.userName ?? '',
    delegateTo: d.delegateTo,
    delegateToName: d.delegateToName ?? '',
    startDate: d.startDate,
    endDate: d.endDate,
    reason: d.reason ?? '',
    active: d.active,
  }));
}

function renderContent(): void {
  if (summaryContainer) {
    summaryContainer.replaceChildren(buildSummaryCards(allRows));
  }
  if (tableContainer) {
    tableContainer.replaceChildren(buildTable(allRows, handleToggle));
  }
  const badge = wrapper.querySelector('[data-count-badge]');
  if (badge) badge.textContent = String(allRows.length);
}

async function handleToggle(row: DelegationRow): Promise<void> {
  try {
    await svc().deactivateDelegation(row.id);
    showMsg(wrapper, `Delegation for ${row.userName || row.userId} deactivated.`, true);
    await loadData();
    renderContent();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update delegation';
    showMsg(wrapper, message, false);
  }
}

// ---------------------------------------------------------------------------
// Async initialisation
// ---------------------------------------------------------------------------

void (async () => {
  wrapper.appendChild(el('div', 'text-sm text-[var(--text-muted)] py-8 text-center', 'Loading delegation rules...'));

  try {
    await loadData();
    wrapper.innerHTML = '';

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Delegation Rules'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', String(allRows.length));
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
    const message = err instanceof Error ? err.message : 'Failed to load delegation rules';
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
