/**
 * Cost History view.
 * Displays historical cost data from completed (won) estimates,
 * grouped by cost code and cost type. Shows average, min, max unit
 * costs for estimating reference.
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

const COST_TYPE_OPTIONS = [
  { value: '', label: 'All Cost Types' },
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'subcontract', label: 'Subcontract' },
  { value: 'other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryCostRow {
  costCodeId: string;
  costCodeDescription: string;
  costType: string;
  averageUnitCost: number;
  minUnitCost: number;
  maxUnitCost: number;
  totalQuantity: number;
  jobCount: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (costType: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search by cost code...';
  bar.appendChild(searchInput);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of COST_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fire = () => onFilter(typeSelect.value, searchInput.value);
  typeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// History Table
// ---------------------------------------------------------------------------

function buildHistoryTable(rows: HistoryCostRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Cost Code', 'Description', 'Cost Type', 'Avg Unit Cost', 'Min Unit Cost', 'Max Unit Cost', 'Total Qty', 'Job Count']) {
    const align = ['Avg Unit Cost', 'Min Unit Cost', 'Max Unit Cost', 'Total Qty', 'Job Count'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No historical cost data available. Data is populated from won estimates.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.costCodeId || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.costCodeDescription || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.costType));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-semibold text-[var(--accent)]', fmtCurrency(row.averageUnitCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(row.minUnitCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', fmtCurrency(row.maxUnitCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(row.totalQuantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(row.jobCount)));

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Historical Cost Database'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Export CSV');
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(
      el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Average unit costs derived from won estimates. Use this data to benchmark new estimates against historical actuals.'),
    );

    wrapper.appendChild(buildFilterBar((_costType, _search) => { /* filter placeholder */ }));

    const rows: HistoryCostRow[] = [];
    wrapper.appendChild(buildHistoryTable(rows));

    container.appendChild(wrapper);
  },
};
