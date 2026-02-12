/**
 * GL Detail report view.
 * Account picker, date range filter, transaction detail table with running balance.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtDate = (iso: string): string => {
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
// Types
// ---------------------------------------------------------------------------

interface DetailRow {
  date: string;
  jeNumber: string;
  jeId: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (accountId: string, startDate: string, endDate: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  // Account picker
  const accountSelect = el('select', inputCls) as HTMLSelectElement;
  accountSelect.name = 'accountId';
  accountSelect.setAttribute('data-role', 'account-picker');
  const defaultOpt = el('option', '', 'Select account...') as HTMLOptionElement;
  defaultOpt.value = '';
  accountSelect.appendChild(defaultOpt);
  bar.appendChild(accountSelect);

  // Date range
  const startLabel = el('label', 'text-sm text-[var(--text-muted)]', 'From');
  bar.appendChild(startLabel);
  const startInput = el('input', inputCls) as HTMLInputElement;
  startInput.type = 'date';
  startInput.name = 'startDate';
  bar.appendChild(startInput);

  const endLabel = el('label', 'text-sm text-[var(--text-muted)]', 'To');
  bar.appendChild(endLabel);
  const endInput = el('input', inputCls) as HTMLInputElement;
  endInput.type = 'date';
  endInput.name = 'endDate';
  bar.appendChild(endInput);

  // Refresh
  const refreshBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Refresh');
  refreshBtn.type = 'button';
  refreshBtn.addEventListener('click', () => {
    onFilter(accountSelect.value, startInput.value, endInput.value);
  });
  bar.appendChild(refreshBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Detail table
// ---------------------------------------------------------------------------

function buildDetailTable(rows: DetailRow[]): HTMLElement {
  const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  // thead
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Date', 'Entry #', 'Description', 'Debit', 'Credit', 'Running Balance']) {
    const align = ['Debit', 'Credit', 'Running Balance'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = el('tbody');
  tbody.setAttribute('data-role', 'detail-rows');

  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'Select an account and click Refresh to view detail.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const row of rows) {
    totalDebit += row.debit;
    totalCredit += row.credit;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3', fmtDate(row.date)));

    // Entry # as link
    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.jeNumber) as HTMLAnchorElement;
    link.href = `#/gl/journal/${row.jeId}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 truncate max-w-[200px]', row.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.debit > 0 ? fmtCurrency(row.debit) : ''));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.credit > 0 ? fmtCurrency(row.credit) : ''));

    const balColor = row.balance >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono font-semibold ${balColor}`, fmtCurrency(row.balance)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);

  // Summary footer
  if (rows.length > 0) {
    const tfoot = el('tfoot');
    const footRow = el('tr', 'border-t-2 border-[var(--border)] font-semibold');
    footRow.appendChild(el('td', 'py-2 px-3'));
    footRow.appendChild(el('td', 'py-2 px-3'));
    footRow.appendChild(el('td', 'py-2 px-3 text-right text-[var(--text-muted)]', 'Totals'));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalDebit)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalCredit)));

    const netBalance = rows.length > 0 ? rows[rows.length - 1].balance : 0;
    const netColor = netBalance >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';
    footRow.appendChild(el('td', `py-2 px-3 text-right font-mono ${netColor}`, fmtCurrency(netBalance)));

    tfoot.appendChild(footRow);
    table.appendChild(tfoot);
  }

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

    // Title
    wrapper.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)] mb-4', 'GL Detail'));

    // Filter bar (placeholder callback — service wires later)
    wrapper.appendChild(
      buildFilterBar((_accountId, _start, _end) => {
        // Service wiring refreshes data
      }),
    );

    // Detail table (empty shell)
    const rows: DetailRow[] = [];
    wrapper.appendChild(buildDetailTable(rows));

    container.appendChild(wrapper);
  },
};
