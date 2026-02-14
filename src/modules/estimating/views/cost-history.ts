/**
 * Cost History view.
 * Displays historical cost data from completed (won) estimates,
 * grouped by cost code and cost type. Shows average, min, max unit
 * costs for estimating reference.
 */

import { getEstimatingService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 5000);
}

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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

const COST_TYPE_BADGE: Record<string, string> = {
  labor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  material: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  equipment: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  subcontract: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  other: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

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
// State
// ---------------------------------------------------------------------------

let costTypeFilter = '';
let searchFilter = '';

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
  searchInput.placeholder = 'Search by cost code or description...';
  searchInput.value = searchFilter;
  bar.appendChild(searchInput);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of COST_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    if (opt.value === costTypeFilter) o.selected = true;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fire = () => {
    costTypeFilter = typeSelect.value;
    searchFilter = searchInput.value;
    onFilter(typeSelect.value, searchInput.value);
  };
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

    // Cost type badge
    const tdType = el('td', 'py-2 px-3');
    const badgeCls = COST_TYPE_BADGE[row.costType] ?? COST_TYPE_BADGE.other;
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`, row.costType.charAt(0).toUpperCase() + row.costType.slice(1));
    tdType.appendChild(badge);
    tr.appendChild(tdType);

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
// CSV Export
// ---------------------------------------------------------------------------

function exportCsv(rows: HistoryCostRow[]): void {
  const headers = ['Cost Code', 'Description', 'Cost Type', 'Avg Unit Cost', 'Min Unit Cost', 'Max Unit Cost', 'Total Qty', 'Job Count'];
  const csvLines = [headers.join(',')];

  for (const row of rows) {
    csvLines.push([
      `"${(row.costCodeId || '').replace(/"/g, '""')}"`,
      `"${(row.costCodeDescription || '').replace(/"/g, '""')}"`,
      `"${row.costType}"`,
      row.averageUnitCost.toFixed(2),
      row.minUnitCost.toFixed(2),
      row.maxUnitCost.toFixed(2),
      String(row.totalQuantity),
      String(row.jobCount),
    ].join(','));
  }

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `historical-costs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

function applyClientFilters(rows: HistoryCostRow[], costType: string, search: string): HistoryCostRow[] {
  let filtered = rows;

  if (costType) {
    filtered = filtered.filter((r) => r.costType === costType);
  }

  if (search.trim()) {
    const term = search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.costCodeId || '').toLowerCase().includes(term) ||
        (r.costCodeDescription || '').toLowerCase().includes(term),
    );
  }

  // Sort by cost code by default
  filtered.sort((a, b) => a.costCodeId.localeCompare(b.costCodeId));

  return filtered;
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
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(
      el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Average unit costs derived from won estimates. Use this data to benchmark new estimates against historical actuals.'),
    );

    // Table container
    const tableContainer = el('div');
    tableContainer.setAttribute('data-table-container', '1');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // All fetched rows (before client-side filtering)
    let allRows: HistoryCostRow[] = [];
    // Currently displayed (filtered) rows
    let displayedRows: HistoryCostRow[] = [];

    // Renders the filter bar + table into the table container
    function renderTable(): void {
      tableContainer.innerHTML = '';

      const filterBar = buildFilterBar((newCostType, newSearch) => {
        displayedRows = applyClientFilters(allRows, newCostType, newSearch);
        // Re-render just the table part below the filter bar
        const existingTable = tableContainer.querySelector('[data-history-table]');
        if (existingTable) existingTable.remove();
        const tableWrap = el('div');
        tableWrap.setAttribute('data-history-table', '1');
        tableWrap.appendChild(buildHistoryTable(displayedRows));
        tableContainer.appendChild(tableWrap);
      });
      tableContainer.appendChild(filterBar);

      displayedRows = applyClientFilters(allRows, costTypeFilter, searchFilter);
      const tableWrap = el('div');
      tableWrap.setAttribute('data-history-table', '1');
      tableWrap.appendChild(buildHistoryTable(displayedRows));
      tableContainer.appendChild(tableWrap);
    }

    // Wire export button
    exportBtn.addEventListener('click', () => {
      if (displayedRows.length === 0) {
        showMsg(wrapper, 'No data to export.', true);
        return;
      }
      exportCsv(displayedRows);
      showMsg(wrapper, `Exported ${displayedRows.length} rows to CSV.`, false);
    });

    // Load data from service
    const svc = getEstimatingService();
    svc.getHistoricalCosts().then((rows) => {
      allRows = rows;
      renderTable();
    }).catch((err) => {
      showMsg(wrapper, `Error loading historical costs: ${(err as Error).message}`, true);
      renderTable(); // Render empty table
    });
  },
};
