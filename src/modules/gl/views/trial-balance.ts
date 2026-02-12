/**
 * Trial Balance report view.
 * As-of-date picker, accounts table with debit/credit columns, totals row, export button.
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
// Types
// ---------------------------------------------------------------------------

interface TBRow {
  number: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: TBRow[], totalDebit: number, totalCredit: number): HTMLElement {
  const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  // thead
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Account Number', 'Account Name', 'Type', 'Debit', 'Credit']) {
    const align = (col === 'Debit' || col === 'Credit') ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = el('tbody');
  tbody.setAttribute('data-role', 'tb-rows');

  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No posted transactions found for the selected period.');
    td.setAttribute('colspan', '5');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-mono', row.number));
    tr.appendChild(el('td', 'py-2 px-3', row.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.type));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.debit > 0 ? fmtCurrency(row.debit) : ''));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.credit > 0 ? fmtCurrency(row.credit) : ''));
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);

  // tfoot — totals
  const tfoot = el('tfoot');
  const footRow = el('tr', 'border-t-2 border-[var(--border)] font-semibold');
  footRow.appendChild(el('td', 'py-2 px-3'));
  footRow.appendChild(el('td', 'py-2 px-3'));
  footRow.appendChild(el('td', 'py-2 px-3 text-right text-[var(--text-muted)]', 'Totals'));
  footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalDebit)));
  footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalCredit)));
  tfoot.appendChild(footRow);

  // Balance check row
  const diff = Math.abs(totalDebit - totalCredit);
  const balanceRow = el('tr');
  balanceRow.appendChild(el('td', 'py-1 px-3'));
  balanceRow.appendChild(el('td', 'py-1 px-3'));
  balanceRow.appendChild(el('td', 'py-1 px-3'));
  const balanceTd = el('td', 'py-1 px-3 text-right text-xs');
  balanceTd.setAttribute('colspan', '2');
  if (diff < 0.005) {
    balanceTd.className = 'py-1 px-3 text-right text-xs text-[var(--positive)]';
    balanceTd.textContent = 'Balanced';
  } else {
    balanceTd.className = 'py-1 px-3 text-right text-xs text-[var(--negative)]';
    balanceTd.textContent = `Out of balance by ${fmtCurrency(diff)}`;
  }
  balanceRow.appendChild(balanceTd);
  tfoot.appendChild(balanceRow);

  table.appendChild(tfoot);
  tableWrap.appendChild(table);
  return tableWrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', 'space-y-0');

    // Header row
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Trial Balance'));

    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] border border-[var(--border)]', 'Export');
    exportBtn.type = 'button';
    exportBtn.setAttribute('data-role', 'export-tb');
    exportBtn.addEventListener('click', () => {
      // Export wiring happens later
    });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    // As-of-date picker
    const filterRow = el('div', 'flex items-center gap-3 mb-4');
    const dateLabel = el('label', 'text-sm font-medium text-[var(--text-muted)]', 'As of Date');
    filterRow.appendChild(dateLabel);

    const dateInput = el('input', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
    dateInput.type = 'date';
    dateInput.name = 'asOfDate';
    dateInput.value = new Date().toISOString().split('T')[0];
    dateInput.addEventListener('change', () => {
      // Service wiring refreshes data
    });
    filterRow.appendChild(dateInput);

    const refreshBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Refresh');
    refreshBtn.type = 'button';
    refreshBtn.addEventListener('click', () => {
      // Service wiring refreshes data
    });
    filterRow.appendChild(refreshBtn);

    wrapper.appendChild(filterRow);

    // Table (empty shell)
    const rows: TBRow[] = [];
    wrapper.appendChild(buildTable(rows, 0, 0));

    container.appendChild(wrapper);
  },
};
