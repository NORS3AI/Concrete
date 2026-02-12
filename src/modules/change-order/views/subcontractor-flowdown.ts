/**
 * Subcontractor Flow-Down view.
 * Link owner COs to subcontractor COs, track amount distribution.
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
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  executed: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  voided: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OwnerCORow {
  id: string;
  number: string;
  title: string;
  amount: number;
  status: string;
  distributedAmount: number;
  remainingAmount: number;
}

interface SubCORow {
  id: string;
  number: string;
  subcontractId: string;
  subcontractName: string;
  amount: number;
  status: string;
  parentCONumber: string;
}

// ---------------------------------------------------------------------------
// Owner COs Table
// ---------------------------------------------------------------------------

function buildOwnerCOsTable(rows: OwnerCORow[]): HTMLElement {
  const section = el('div', 'space-y-3 mb-6');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Owner Change Orders'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Number', 'Title', 'Status', 'Amount', 'Distributed', 'Remaining', 'Actions']) {
    const align = ['Amount', 'Distributed', 'Remaining'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No owner change orders found. Create an owner CO to start flowing down changes to subcontractors.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.number) as HTMLAnchorElement;
    link.href = `#/change-orders/${row.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.title));

    const tdStatus = el('td', 'py-2 px-3');
    const statusLabel = row.status.replace('_', ' ');
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
      statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)));
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(row.distributedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', fmtCurrency(row.remainingAmount)));

    const tdActions = el('td', 'py-2 px-3');
    const flowDownBtn = el('button', 'px-3 py-1 rounded text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Flow Down');
    flowDownBtn.type = 'button';
    flowDownBtn.addEventListener('click', () => { /* flow-down placeholder */ });
    tdActions.appendChild(flowDownBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ---------------------------------------------------------------------------
// Sub COs Table
// ---------------------------------------------------------------------------

function buildSubCOsTable(rows: SubCORow[]): HTMLElement {
  const section = el('div', 'space-y-3');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Subcontractor Change Orders'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Number', 'Subcontractor', 'Parent CO', 'Status', 'Amount']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No subcontractor change orders. Use the "Flow Down" action on an owner CO to create sub COs.');
    td.setAttribute('colspan', '5');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.number) as HTMLAnchorElement;
    link.href = `#/change-orders/${row.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.subcontractName));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', row.parentCONumber));

    const tdStatus = el('td', 'py-2 px-3');
    const statusLabel = row.status.replace('_', ' ');
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
      statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)));
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.amount)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ---------------------------------------------------------------------------
// Distribution Summary
// ---------------------------------------------------------------------------

function buildDistributionSummary(): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-6');
  const grid = el('div', 'grid grid-cols-4 gap-4 text-center');

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-lg font-bold font-mono ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  grid.appendChild(buildCard('Owner COs', '0', 'text-blue-400'));
  grid.appendChild(buildCard('Total Amount', fmtCurrency(0), 'text-[var(--text)]'));
  grid.appendChild(buildCard('Distributed', fmtCurrency(0), 'text-emerald-400'));
  grid.appendChild(buildCard('Undistributed', fmtCurrency(0), 'text-amber-400'));

  section.appendChild(grid);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Subcontractor Flow-Down'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildDistributionSummary());

    const ownerRows: OwnerCORow[] = [];
    wrapper.appendChild(buildOwnerCOsTable(ownerRows));

    const subRows: SubCORow[] = [];
    wrapper.appendChild(buildSubCOsTable(subRows));

    container.appendChild(wrapper);
  },
};
