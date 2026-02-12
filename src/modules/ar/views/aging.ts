/**
 * Customer Aging Report view.
 * Customer aging report with aging buckets (Current, 1-30, 31-60, 61-90, 91-120, 120+).
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

const AGING_COLUMNS = ['Current', '1-30', '31-60', '61-90', '91-120', '120+', 'Total'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgingRow {
  customerId: string;
  customerName: string;
  customerCode: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days91to120: number;
  days120plus: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (asOfDate: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search customers...';
  bar.appendChild(searchInput);

  const dateLabel = el('span', 'text-sm text-[var(--text-muted)]', 'As of:');
  bar.appendChild(dateLabel);
  const asOfDate = el('input', inputCls) as HTMLInputElement;
  asOfDate.type = 'date';
  asOfDate.name = 'asOfDate';
  asOfDate.valueAsDate = new Date();
  bar.appendChild(asOfDate);

  const refreshBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Refresh');
  refreshBtn.type = 'button';
  bar.appendChild(refreshBtn);

  const fire = () => onFilter(asOfDate.value, searchInput.value);
  searchInput.addEventListener('input', fire);
  asOfDate.addEventListener('change', fire);
  refreshBtn.addEventListener('click', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-7 gap-3 mb-4');

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-3 text-center');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-lg font-bold font-mono ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Current', fmtCurrency(0), 'text-emerald-400'));
  row.appendChild(buildCard('1-30 Days', fmtCurrency(0), 'text-blue-400'));
  row.appendChild(buildCard('31-60 Days', fmtCurrency(0), 'text-amber-400'));
  row.appendChild(buildCard('61-90 Days', fmtCurrency(0), 'text-orange-400'));
  row.appendChild(buildCard('91-120 Days', fmtCurrency(0), 'text-red-400'));
  row.appendChild(buildCard('120+ Days', fmtCurrency(0), 'text-red-500'));
  row.appendChild(buildCard('Total', fmtCurrency(0), 'text-[var(--accent)]'));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: AgingRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  headRow.appendChild(el('th', 'py-2 px-3 font-medium', 'Code'));
  headRow.appendChild(el('th', 'py-2 px-3 font-medium', 'Customer'));
  for (const col of AGING_COLUMNS) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium text-right', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No aging data available. Enter AR invoices to generate the aging report.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', row.customerCode));

    const tdName = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.customerName) as HTMLAnchorElement;
    link.href = `#/ar/customers/${row.customerId}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    const amountCls = (v: number, danger?: boolean): string => {
      if (v === 0) return 'py-2 px-3 text-right font-mono text-[var(--text-muted)]';
      if (danger) return 'py-2 px-3 text-right font-mono text-red-400';
      return 'py-2 px-3 text-right font-mono text-[var(--text)]';
    };

    tr.appendChild(el('td', amountCls(row.current), fmtCurrency(row.current)));
    tr.appendChild(el('td', amountCls(row.days1to30), fmtCurrency(row.days1to30)));
    tr.appendChild(el('td', amountCls(row.days31to60), fmtCurrency(row.days31to60)));
    tr.appendChild(el('td', amountCls(row.days61to90, true), fmtCurrency(row.days61to90)));
    tr.appendChild(el('td', amountCls(row.days91to120, true), fmtCurrency(row.days91to120)));
    tr.appendChild(el('td', amountCls(row.days120plus, true), fmtCurrency(row.days120plus)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium text-[var(--text)]', fmtCurrency(row.total)));

    tbody.appendChild(tr);
  }

  // Totals row
  if (rows.length > 0) {
    const totalsRow = el('tr', 'border-t-2 border-[var(--border)] bg-[var(--surface)] font-medium');
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', 'Totals'));
    for (let i = 0; i < AGING_COLUMNS.length; i++) {
      totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text)]', fmtCurrency(0)));
    }
    tbody.appendChild(totalsRow);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Customer Aging Report'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());
    wrapper.appendChild(buildFilterBar((_asOfDate, _search) => { /* filter placeholder */ }));

    const rows: AgingRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
