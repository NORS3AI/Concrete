/**
 * Waste Tracking view.
 * Displays waste transaction report with date/job filters, summary cards,
 * record-waste functionality, and CSV export.
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

interface WasteRow {
  date: string;
  itemNumber: string;
  itemDescription: string;
  warehouseName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  jobId: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------

function buildKpiCards(rows: WasteRow[], totalWasteCost: number): HTMLElement {
  const totalEntries = rows.length;
  const withJob = rows.filter((r) => r.jobId && r.jobId.length > 0).length;
  const withoutJob = totalEntries - withJob;

  const grid = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6');

  const items: { label: string; value: string; colorCls?: string }[] = [
    { label: 'Total Waste Entries', value: String(totalEntries) },
    { label: 'Total Waste Cost', value: fmtCurrency(totalWasteCost), colorCls: totalWasteCost > 0 ? 'text-red-400' : 'text-emerald-400' },
    { label: 'With Job', value: String(withJob) },
    { label: 'Without Job', value: String(withoutJob) },
  ];

  for (const item of items) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', item.label));
    card.appendChild(el('div', `text-2xl font-bold mt-1 ${item.colorCls ?? 'text-[var(--text)]'}`, item.value));
    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: WasteRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'border-b border-[var(--border)]');
  const cols = ['Date', 'Item', 'Warehouse', 'Quantity', 'Unit Cost', 'Total Cost', 'Job', 'Notes'];
  for (const col of cols) {
    const isNumeric = ['Quantity', 'Unit Cost', 'Total Cost'].includes(col);
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
    const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No waste entries found.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', trCls);

    tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.date));
    tr.appendChild(el('td', tdCls, `${row.itemNumber} - ${row.itemDescription}`));
    tr.appendChild(el('td', tdCls, row.warehouseName));
    tr.appendChild(el('td', tdCls + ' text-right font-mono', row.quantity.toLocaleString('en-US', { maximumFractionDigits: 2 })));
    tr.appendChild(el('td', tdCls + ' text-right font-mono', fmtCurrency(row.unitCost)));
    tr.appendChild(el('td', tdCls + ' text-right font-mono font-medium text-red-400', fmtCurrency(row.totalCost)));
    tr.appendChild(el('td', tdCls + ' font-mono text-[var(--text-muted)]', row.jobId || '--'));
    tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)] truncate max-w-[200px]', row.notes || ''));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportWasteCSV(rows: WasteRow[]): void {
  const headers = ['Date', 'Item Number', 'Item Description', 'Warehouse', 'Quantity', 'Unit Cost', 'Total Cost', 'Job', 'Notes'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      `"${r.date}"`,
      `"${r.itemNumber}"`,
      `"${r.itemDescription}"`,
      `"${r.warehouseName}"`,
      r.quantity.toFixed(2),
      r.unitCost.toFixed(2),
      r.totalCost.toFixed(2),
      `"${r.jobId}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `waste-report-${date}.csv`;
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
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // State
    let currentRows: WasteRow[] = [];
    let currentTotalCost = 0;

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Waste Tracking'));

    const btnGroup = el('div', 'flex items-center gap-3');

    const recordBtn = el('button', btnCls, 'Record Waste');
    btnGroup.appendChild(recordBtn);

    const exportBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Export Waste Report',
    );
    btnGroup.appendChild(exportBtn);

    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    // ---- Filter Bar ----
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-6');

    filterBar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'From:'));
    const dateFromInput = el('input', inputCls) as HTMLInputElement;
    dateFromInput.type = 'date';
    filterBar.appendChild(dateFromInput);

    filterBar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'To:'));
    const dateToInput = el('input', inputCls) as HTMLInputElement;
    dateToInput.type = 'date';
    filterBar.appendChild(dateToInput);

    filterBar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Job:'));
    const jobIdInput = el('input', inputCls) as HTMLInputElement;
    jobIdInput.type = 'text';
    jobIdInput.placeholder = 'Job ID (optional)';
    filterBar.appendChild(jobIdInput);

    const applyBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
      'Apply Filters',
    );
    filterBar.appendChild(applyBtn);

    wrapper.appendChild(filterBar);

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
      exportWasteCSV(currentRows);
    });

    // ---- Filter Handlers ----
    applyBtn.addEventListener('click', () => {
      void loadData();
    });

    dateFromInput.addEventListener('change', () => {
      void loadData();
    });

    dateToInput.addEventListener('change', () => {
      void loadData();
    });

    jobIdInput.addEventListener('change', () => {
      void loadData();
    });

    // ---- Record Waste ----
    recordBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const itemId = prompt('Item ID:');
          if (!itemId) return;

          const warehouseId = prompt('Warehouse ID:');
          if (!warehouseId) return;

          const quantityStr = prompt('Quantity:');
          if (!quantityStr) return;
          const quantity = parseFloat(quantityStr);
          if (isNaN(quantity) || quantity <= 0) {
            showMsg(wrapper, 'Please enter a valid positive quantity.', true);
            return;
          }

          const jobId = prompt('Job ID (optional):') || undefined;
          const notes = prompt('Notes (optional):') || undefined;

          const svc = getInventoryService();
          await svc.recordWaste({
            itemId,
            warehouseId,
            quantity,
            jobId,
            notes,
          });

          showMsg(wrapper, 'Waste entry recorded successfully.', false);

          // Reload data
          await loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to record waste entry';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Load Data ----
    async function loadData(): Promise<void> {
      // Loading state
      kpiContainer.innerHTML = '';
      tableContainer.innerHTML = '';
      const loading = el('div', 'flex items-center justify-center py-12');
      loading.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading waste report...'));
      tableContainer.appendChild(loading);

      try {
        const svc = getInventoryService();

        const filters: { dateFrom?: string; dateTo?: string; jobId?: string } = {};
        if (dateFromInput.value) filters.dateFrom = dateFromInput.value;
        if (dateToInput.value) filters.dateTo = dateToInput.value;
        const jobFilter = jobIdInput.value.trim();
        if (jobFilter) filters.jobId = jobFilter;

        const { entries, totalWasteCost } = await svc.getWasteReport(filters);

        currentRows = entries.map((e) => ({
          date: e.date,
          itemNumber: e.itemNumber,
          itemDescription: e.itemDescription,
          warehouseName: e.warehouseName,
          quantity: e.quantity,
          unitCost: e.unitCost,
          totalCost: e.totalCost,
          jobId: e.jobId ?? '',
          notes: e.notes ?? '',
        }));
        currentTotalCost = totalWasteCost;

        // Rebuild KPI cards
        kpiContainer.innerHTML = '';
        kpiContainer.appendChild(buildKpiCards(currentRows, currentTotalCost));

        // Rebuild table
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(currentRows));

        showMsg(wrapper, `Loaded ${currentRows.length} waste entr${currentRows.length === 1 ? 'y' : 'ies'}.`, false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load waste report';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load waste report';
        showMsg(wrapper, message, true);
      }
    })();
  },
};
