/**
 * Change Orders view for a single job.
 * Table of change orders with approve/reject actions and approved total summary.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtDate = (iso: string): string => {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

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
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChangeOrderRow {
  id: string;
  number: string;
  description: string;
  amount: number;
  status: string;
  date: string;
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function buildSummaryCard(approvedTotal: number, pendingTotal: number, coCount: number): HTMLElement {
  const row = el('div', 'grid grid-cols-3 gap-4 mb-4');

  const cards = [
    { label: 'Total COs', value: String(coCount) },
    { label: 'Approved COs', value: fmtCurrency(approvedTotal), cls: approvedTotal >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]' },
    { label: 'Pending COs', value: fmtCurrency(pendingTotal), cls: 'text-amber-400' },
  ];

  for (const c of cards) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', c.label));
    card.appendChild(el('div', `text-lg font-bold ${c.cls ?? ''}`.trim(), c.value));
    row.appendChild(card);
  }

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: ChangeOrderRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['CO #', 'Description', 'Amount', 'Status', 'Date', 'Actions']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No change orders found.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-semibold', row.number));
    tr.appendChild(el('td', 'py-2 px-3', row.description));

    const amtCls = row.amount >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${amtCls}`, fmtCurrency(row.amount)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.pending}`,
      row.status.charAt(0).toUpperCase() + row.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtDate(row.date)));

    const tdActions = el('td', 'py-2 px-3');
    if (row.status === 'pending') {
      const approveBtn = el('button', 'text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:opacity-90 mr-1', 'Approve');
      approveBtn.type = 'button';
      approveBtn.addEventListener('click', () => { /* approve placeholder */ });
      tdActions.appendChild(approveBtn);

      const rejectBtn = el('button', 'text-xs px-2 py-1 rounded bg-red-600 text-white hover:opacity-90', 'Reject');
      rejectBtn.type = 'button';
      rejectBtn.addEventListener('click', () => { /* reject placeholder */ });
      tdActions.appendChild(rejectBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Change Orders'));

    const btnGroup = el('div', 'flex items-center gap-3');
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New CO');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* new CO placeholder */ });
    btnGroup.appendChild(newBtn);
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Job') as HTMLAnchorElement;
    backLink.href = '#/jobs';
    btnGroup.appendChild(backLink);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCard(0, 0, 0));

    const rows: ChangeOrderRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
