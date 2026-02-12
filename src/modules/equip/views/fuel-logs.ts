/**
 * Equipment Fuel Logs view.
 * Displays fuel consumption records with filtering by equipment and date range.
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

interface FuelLogRow {
  id: string;
  equipmentNumber: string;
  date: string;
  gallons: number;
  costPerGallon: number;
  totalCost: number;
  meterReading: number;
  location: string;
  vendorName: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (search: string, fromDate: string, toDate: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search fuel logs...';
  bar.appendChild(searchInput);

  const fromLabel = el('span', 'text-sm text-[var(--text-muted)]', 'From:');
  bar.appendChild(fromLabel);
  const fromDate = el('input', inputCls) as HTMLInputElement;
  fromDate.type = 'date';
  bar.appendChild(fromDate);

  const toLabel = el('span', 'text-sm text-[var(--text-muted)]', 'To:');
  bar.appendChild(toLabel);
  const toDate = el('input', inputCls) as HTMLInputElement;
  toDate.type = 'date';
  bar.appendChild(toDate);

  const fire = () => onFilter(searchInput.value, fromDate.value, toDate.value);
  searchInput.addEventListener('input', fire);
  fromDate.addEventListener('change', fire);
  toDate.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: FuelLogRow[]): HTMLElement {
  const totalGallons = rows.reduce((sum, r) => sum + r.gallons, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.totalCost, 0);
  const avgCostPerGallon = totalGallons > 0 ? totalCost / totalGallons : 0;

  const grid = el('div', 'grid grid-cols-3 gap-4 mb-4');

  const card1 = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  card1.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Gallons'));
  card1.appendChild(el('div', 'text-xl font-bold text-[var(--text)] mt-1', totalGallons.toLocaleString('en-US', { maximumFractionDigits: 1 })));
  grid.appendChild(card1);

  const card2 = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  card2.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Fuel Cost'));
  card2.appendChild(el('div', 'text-xl font-bold text-[var(--text)] mt-1', fmtCurrency(totalCost)));
  grid.appendChild(card2);

  const card3 = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  card3.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Avg Cost/Gallon'));
  card3.appendChild(el('div', 'text-xl font-bold text-[var(--text)] mt-1', fmtCurrency(avgCostPerGallon)));
  grid.appendChild(card3);

  return grid;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: FuelLogRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Equipment', 'Date', 'Gallons', 'Cost/Gal', 'Total Cost', 'Meter', 'Location', 'Vendor']) {
    const align = ['Gallons', 'Cost/Gal', 'Total Cost'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No fuel logs found. Log a fuel entry to get started.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.equipmentNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.date));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.gallons.toFixed(1)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.costPerGallon ? fmtCurrency(row.costPerGallon) : ''));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(row.totalCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono', row.meterReading ? String(row.meterReading) : ''));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.location));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.vendorName));

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Fuel Logs'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Fuel Entry');
    newBtn.addEventListener('click', () => { /* new fuel entry placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_search, _from, _to) => { /* filter placeholder */ }));

    const rows: FuelLogRow[] = [];
    wrapper.appendChild(buildSummaryCards(rows));
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
