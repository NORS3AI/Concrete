/**
 * Escalation Records view.
 * Shows escalation records with request ID, step, escalated from/to,
 * timestamp, reason, and auto-escalated flag.
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

interface EscalationRow {
  id: string;
  requestId: string;
  stepOrder: number;
  escalatedFrom: string;
  escalatedTo: string;
  escalatedAt: string;
  reason: string;
  autoEscalated: boolean;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'p-6');
let allRows: EscalationRow[] = [];

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: EscalationRow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-3 gap-4 mb-6');

  const total = rows.length;
  const autoEscalated = rows.filter((r) => r.autoEscalated).length;
  const manual = rows.filter((r) => !r.autoEscalated).length;

  const cardData = [
    { label: 'Total Escalations', value: String(total), cls: 'text-[var(--text)]' },
    { label: 'Auto-Escalated', value: String(autoEscalated), cls: 'text-amber-400' },
    { label: 'Manual', value: String(manual), cls: 'text-blue-400' },
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

function buildTable(rows: EscalationRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Request ID', 'Step', 'Escalated From', 'Escalated To', 'Timestamp', 'Reason', 'Auto-Escalated']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No escalation records found.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', row.requestId));
    tr.appendChild(el('td', 'py-2 px-3 text-center font-mono text-[var(--text)]', String(row.stepOrder)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.escalatedFrom));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.escalatedTo));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtTimestamp(row.escalatedAt)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[250px]', row.reason || '--'));

    const tdAuto = el('td', 'py-2 px-3');
    if (row.autoEscalated) {
      tdAuto.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20', 'Auto'));
    } else {
      tdAuto.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20', 'Manual'));
    }
    tr.appendChild(tdAuto);

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
  wrapper.appendChild(el('div', 'text-sm text-[var(--text-muted)] py-8 text-center', 'Loading escalation records...'));

  try {
    const escalations = await svc().listEscalations();
    allRows = escalations.map((e) => ({
      id: (e as any).id ?? '',
      requestId: e.requestId,
      stepOrder: e.stepOrder,
      escalatedFrom: e.escalatedFrom,
      escalatedTo: e.escalatedTo,
      escalatedAt: e.escalatedAt,
      reason: e.reason,
      autoEscalated: e.autoEscalated,
    }));

    wrapper.innerHTML = '';

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Escalations'));
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
    const message = err instanceof Error ? err.message : 'Failed to load escalation records';
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
