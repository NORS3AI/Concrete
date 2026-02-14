/**
 * Inventory Valuation view.
 * Displays inventory valuation using FIFO, LIFO, or Average Cost methods.
 * Summary cards, valuation table with export-to-CSV functionality.
 * Wired to InventoryService for live data.
 */

import { getInventoryService } from '../service-accessor';

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

// ---------------------------------------------------------------------------
// Types (local view-layer mirrors)
// ---------------------------------------------------------------------------

interface ValRow {
  itemNumber: string;
  itemDescription: string;
  unit: string;
  totalQuantity: number;
  unitCost: number;
  totalValue: number;
}

type Method = 'fifo' | 'lifo' | 'average';

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------

function buildKpiCards(
  totalValue: number,
  rowCount: number,
  method: string,
): HTMLElement {
  const grid = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6');

  const labels: { label: string; value: string }[] = [
    { label: 'Total Inventory Value', value: fmtCurrency(totalValue) },
    { label: 'Total Items', value: String(rowCount) },
    { label: 'Valuation Method', value: method.toUpperCase() },
  ];

  for (const item of labels) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', item.label));
    card.appendChild(el('div', 'text-2xl font-bold mt-1 text-[var(--text)]', item.value));
    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: ValRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'border-b border-[var(--border)]');
  const cols = ['Item Number', 'Description', 'Unit', 'Total Quantity', 'Unit Cost', 'Total Value'];
  for (const col of cols) {
    const isNumeric = ['Total Quantity', 'Unit Cost', 'Total Value'].includes(col);
    const thCls = isNumeric
      ? 'text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3'
      : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    headRow.appendChild(el('th', thCls, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  const tdCls = 'px-4 py-3 text-sm text-[var(--text)]';
  const trCls = 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]';

  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No inventory items with positive stock found.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let grandTotal = 0;

  for (const row of rows) {
    const tr = el('tr', trCls);

    tr.appendChild(el('td', tdCls + ' font-mono', row.itemNumber));
    tr.appendChild(el('td', tdCls, row.itemDescription));
    tr.appendChild(el('td', tdCls, row.unit));
    tr.appendChild(el('td', tdCls + ' text-right font-mono', row.totalQuantity.toLocaleString('en-US', { maximumFractionDigits: 2 })));
    tr.appendChild(el('td', tdCls + ' text-right font-mono', fmtCurrency(row.unitCost)));
    tr.appendChild(el('td', tdCls + ' text-right font-mono font-medium', fmtCurrency(row.totalValue)));

    tbody.appendChild(tr);
    grandTotal += row.totalValue;
  }

  // Totals row
  if (rows.length > 0) {
    const totTr = el('tr', 'border-t-2 border-[var(--border)] bg-[var(--surface)]');
    totTr.appendChild(el('td', tdCls + ' font-semibold', 'Total'));
    totTr.appendChild(el('td', tdCls)); // Description
    totTr.appendChild(el('td', tdCls)); // Unit
    totTr.appendChild(el('td', tdCls)); // Quantity
    totTr.appendChild(el('td', tdCls)); // Unit Cost
    totTr.appendChild(el('td', tdCls + ' text-right font-mono font-semibold', fmtCurrency(grandTotal)));
    tbody.appendChild(totTr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportValuationCSV(rows: ValRow[]): void {
  const headers = ['Item Number', 'Description', 'Unit', 'Quantity', 'Unit Cost', 'Total Value'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      `"${r.itemNumber}"`,
      `"${r.itemDescription}"`,
      `"${r.unit}"`,
      r.totalQuantity.toFixed(2),
      r.unitCost.toFixed(2),
      r.totalValue.toFixed(2),
    ].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `inventory-valuation-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    // State
    let currentMethod: Method = 'average';
    let currentRows: ValRow[] = [];

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Inventory Valuation'));

    const exportBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Export Valuation',
    );
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    // ---- Method Selector ----
    const methodBar = el('div', 'flex items-center gap-3 mb-6');
    methodBar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Valuation Method:'));

    const methodSelect = el('select', inputCls) as HTMLSelectElement;
    const methods: { value: Method; label: string }[] = [
      { value: 'average', label: 'Average Cost' },
      { value: 'fifo', label: 'FIFO' },
      { value: 'lifo', label: 'LIFO' },
    ];
    for (const m of methods) {
      const opt = el('option', '', m.label) as HTMLOptionElement;
      opt.value = m.value;
      if (m.value === currentMethod) opt.selected = true;
      methodSelect.appendChild(opt);
    }
    methodBar.appendChild(methodSelect);
    wrapper.appendChild(methodBar);

    // ---- Containers ----
    const kpiContainer = el('div', '');
    const tableContainer = el('div', '');
    wrapper.appendChild(kpiContainer);
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Export Handler ----
    exportBtn.addEventListener('click', () => {
      if (currentRows.length === 0) {
        showMsg(wrapper, 'No data to export.', true);
        return;
      }
      exportValuationCSV(currentRows);
    });

    // ---- Method Change Handler ----
    methodSelect.addEventListener('change', () => {
      currentMethod = methodSelect.value as Method;
      void loadData();
    });

    // ---- Load Data ----
    async function loadData(): Promise<void> {
      // Loading state
      kpiContainer.innerHTML = '';
      tableContainer.innerHTML = '';
      const loading = el('div', 'flex items-center justify-center py-12');
      loading.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading valuation data...'));
      tableContainer.appendChild(loading);

      try {
        const svc = getInventoryService();
        const { rows, totalValue } = await svc.getValuation(currentMethod);

        currentRows = rows.map((r) => ({
          itemNumber: r.itemNumber,
          itemDescription: r.itemDescription,
          unit: r.unit,
          totalQuantity: r.totalQuantity,
          unitCost: r.unitCost,
          totalValue: r.totalValue,
        }));

        // Rebuild KPI cards
        kpiContainer.innerHTML = '';
        kpiContainer.appendChild(buildKpiCards(totalValue, currentRows.length, currentMethod));

        // Rebuild table
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(currentRows));

        showMsg(wrapper, `Loaded ${currentRows.length} items using ${currentMethod.toUpperCase()} valuation.`, false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load valuation data';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load valuation data';
        showMsg(wrapper, message, true);
      }
    })();
  },
};
