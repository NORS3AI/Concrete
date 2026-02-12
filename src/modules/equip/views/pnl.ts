/**
 * Equipment P&L view.
 * Displays profit and loss by equipment unit, owning vs operating cost
 * breakdown, and FHWA rate comparison.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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

interface PnlRow {
  equipmentNumber: string;
  description: string;
  revenue: number;
  fuelCost: number;
  maintenanceCost: number;
  depreciationCost: number;
  otherCosts: number;
  totalCosts: number;
  netIncome: number;
}

interface OwningVsOperatingRow {
  equipmentNumber: string;
  description: string;
  owningCosts: number;
  operatingCosts: number;
  totalCosts: number;
  owningPct: number;
  operatingPct: number;
}

interface FhwaRow {
  equipmentNumber: string;
  description: string;
  internalHourlyRate: number;
  fhwaRate: number;
  variance: number;
  variancePct: number;
}

// ---------------------------------------------------------------------------
// P&L Table
// ---------------------------------------------------------------------------

function buildPnlTable(rows: PnlRow[]): HTMLElement {
  const section = el('div', 'mb-8');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Equipment P&L by Unit'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Equipment', 'Description', 'Revenue', 'Fuel', 'Maintenance', 'Depreciation', 'Other', 'Total Costs', 'Net Income']) {
    const align = ['Revenue', 'Fuel', 'Maintenance', 'Depreciation', 'Other', 'Total Costs', 'Net Income'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'Select a date range and run the report to view equipment P&L data.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.equipmentNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(row.revenue)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', fmtCurrency(row.fuelCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', fmtCurrency(row.maintenanceCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', fmtCurrency(row.depreciationCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', fmtCurrency(row.otherCosts)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium text-[var(--text-muted)]', fmtCurrency(row.totalCosts)));

    const netClass = row.netIncome >= 0 ? 'py-2 px-3 text-right font-mono font-bold text-emerald-400' : 'py-2 px-3 text-right font-mono font-bold text-red-400';
    tr.appendChild(el('td', netClass, fmtCurrency(row.netIncome)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ---------------------------------------------------------------------------
// Owning vs Operating Table
// ---------------------------------------------------------------------------

function buildOwningVsOperatingTable(rows: OwningVsOperatingRow[]): HTMLElement {
  const section = el('div', 'mb-8');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Owning vs Operating Costs'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Equipment', 'Description', 'Owning Costs', 'Operating Costs', 'Total Costs', 'Owning %', 'Operating %']) {
    const align = ['Owning Costs', 'Operating Costs', 'Total Costs', 'Owning %', 'Operating %'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No data available.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.equipmentNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.owningCosts)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.operatingCosts)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(row.totalCosts)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtPct(row.owningPct)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtPct(row.operatingPct)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ---------------------------------------------------------------------------
// FHWA Comparison Table
// ---------------------------------------------------------------------------

function buildFhwaTable(rows: FhwaRow[]): HTMLElement {
  const section = el('div', 'mb-8');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'FHWA Rate Comparison'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Equipment', 'Description', 'Internal Rate', 'FHWA Rate', 'Variance', 'Variance %']) {
    const align = ['Internal Rate', 'FHWA Rate', 'Variance', 'Variance %'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No FHWA comparison data available. Set FHWA rates in rate tables.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.equipmentNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.internalHourlyRate)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.fhwaRate)));

    const varClass = row.variance >= 0 ? 'py-2 px-3 text-right font-mono text-emerald-400' : 'py-2 px-3 text-right font-mono text-red-400';
    tr.appendChild(el('td', varClass, fmtCurrency(row.variance)));
    tr.appendChild(el('td', varClass, fmtPct(row.variancePct)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (fromDate: string, toDate: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

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

  const runBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Run Report');
  runBtn.addEventListener('click', () => onFilter(fromDate.value, toDate.value));
  bar.appendChild(runBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment P&L & Analysis'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Export CSV');
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_from, _to) => { /* filter placeholder */ }));

    const pnlRows: PnlRow[] = [];
    wrapper.appendChild(buildPnlTable(pnlRows));

    const ovoRows: OwningVsOperatingRow[] = [];
    wrapper.appendChild(buildOwningVsOperatingTable(ovoRows));

    const fhwaRows: FhwaRow[] = [];
    wrapper.appendChild(buildFhwaTable(fhwaRows));

    container.appendChild(wrapper);
  },
};
