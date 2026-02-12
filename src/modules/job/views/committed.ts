/**
 * Committed Costs view for a single job.
 * Table of purchase orders and subcontracts with status badges.
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
  open: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  partial: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  closed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommittedRow {
  id: string;
  referenceNumber: string;
  vendorName: string;
  costCode: string;
  costType: string;
  amount: number;
  invoicedAmount: number;
  remainingAmount: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: CommittedRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const cols = ['Ref #', 'Vendor', 'Cost Code', 'Type', 'Amount', 'Invoiced', 'Remaining', 'Status'];
  for (const col of cols) {
    const align = ['Amount', 'Invoiced', 'Remaining'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No committed costs found.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totalAmount = 0;
  let totalInvoiced = 0;
  let totalRemaining = 0;

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono', row.referenceNumber || '--'));
    tr.appendChild(el('td', 'py-2 px-3', row.vendorName || '--'));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', row.costCode));
    tr.appendChild(el('td', 'py-2 px-3', row.costType));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.invoicedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.remainingAmount)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.open}`,
      row.status.charAt(0).toUpperCase() + row.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);

    totalAmount += row.amount;
    totalInvoiced += row.invoicedAmount;
    totalRemaining += row.remainingAmount;
  }

  table.appendChild(tbody);

  if (rows.length > 0) {
    const tfoot = el('tfoot');
    const footRow = el('tr', 'border-t-2 border-[var(--border)] font-semibold');
    footRow.appendChild(el('td', 'py-2 px-3', 'Totals'));
    footRow.appendChild(el('td', 'py-2 px-3', ''));
    footRow.appendChild(el('td', 'py-2 px-3', ''));
    footRow.appendChild(el('td', 'py-2 px-3', ''));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalAmount)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalInvoiced)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalRemaining)));
    footRow.appendChild(el('td', 'py-2 px-3', ''));
    tfoot.appendChild(footRow);
    table.appendChild(tfoot);
  }

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Committed Costs'));

    const btnGroup = el('div', 'flex items-center gap-3');
    const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Commitment');
    addBtn.type = 'button';
    addBtn.addEventListener('click', () => { /* add commitment placeholder */ });
    btnGroup.appendChild(addBtn);
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Job') as HTMLAnchorElement;
    backLink.href = '#/jobs';
    btnGroup.appendChild(backLink);
    headerRow.appendChild(btnGroup);

    wrapper.appendChild(headerRow);

    const rows: CommittedRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
