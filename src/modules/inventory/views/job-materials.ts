/**
 * Job-Site Material Tracking view.
 * Allows loading a specific job's material summary, showing issued quantities,
 * waste, waste percentages, and costs. Includes CSV export.
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

interface MaterialRow {
  itemNumber: string;
  itemDescription: string;
  quantityIssued: number;
  quantityWasted: number;
  wastePct: number;
  cost: number;
}

interface SummaryData {
  totalIssued: number;
  totalWaste: number;
  totalCost: number;
  wasteCost: number;
  items: MaterialRow[];
}

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------

function buildKpiCards(data: SummaryData): HTMLElement {
  const grid = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6');

  const items: { label: string; value: string; colorCls?: string }[] = [
    { label: 'Total Items Issued', value: data.totalIssued.toLocaleString('en-US', { maximumFractionDigits: 2 }) },
    { label: 'Total Waste', value: data.totalWaste.toLocaleString('en-US', { maximumFractionDigits: 2 }), colorCls: data.totalWaste > 0 ? 'text-amber-400' : 'text-emerald-400' },
    { label: 'Material Cost', value: fmtCurrency(data.totalCost) },
    { label: 'Waste Cost', value: fmtCurrency(data.wasteCost), colorCls: data.wasteCost > 0 ? 'text-red-400' : 'text-emerald-400' },
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

function buildTable(rows: MaterialRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'border-b border-[var(--border)]');
  const cols = ['Item Number', 'Description', 'Qty Issued', 'Qty Wasted', 'Waste %', 'Cost'];
  for (const col of cols) {
    const isNumeric = ['Qty Issued', 'Qty Wasted', 'Waste %', 'Cost'].includes(col);
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
    const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No material usage data for this job.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', trCls);

    tr.appendChild(el('td', tdCls + ' font-mono', row.itemNumber));
    tr.appendChild(el('td', tdCls, row.itemDescription));
    tr.appendChild(el('td', tdCls + ' text-right font-mono', row.quantityIssued.toLocaleString('en-US', { maximumFractionDigits: 2 })));
    tr.appendChild(el('td', tdCls + ' text-right font-mono', row.quantityWasted.toLocaleString('en-US', { maximumFractionDigits: 2 })));

    // Waste % — red if > 10%
    const wastePctCls = row.wastePct > 10
      ? tdCls + ' text-right font-mono font-semibold text-red-400'
      : tdCls + ' text-right font-mono';
    tr.appendChild(el('td', wastePctCls, `${row.wastePct.toFixed(1)}%`));

    tr.appendChild(el('td', tdCls + ' text-right font-mono', fmtCurrency(row.cost)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportJobMaterialsCSV(jobId: string, rows: MaterialRow[]): void {
  const headers = ['Item Number', 'Description', 'Qty Issued', 'Qty Wasted', 'Waste %', 'Cost'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      `"${r.itemNumber}"`,
      `"${r.itemDescription}"`,
      r.quantityIssued.toFixed(2),
      r.quantityWasted.toFixed(2),
      r.wastePct.toFixed(1),
      r.cost.toFixed(2),
    ].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `job-materials-${jobId}-${date}.csv`;
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
    let currentJobId = '';
    let currentData: SummaryData | null = null;

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Job-Site Material Tracking'));

    const exportBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Export',
    );
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    // ---- Job ID Input Bar ----
    const inputBar = el('div', 'flex items-center gap-3 mb-6');
    inputBar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Job ID:'));

    const jobInput = el('input', inputCls) as HTMLInputElement;
    jobInput.type = 'text';
    jobInput.placeholder = 'Enter Job ID...';
    inputBar.appendChild(jobInput);

    const loadBtn = el('button', btnCls, 'Load');
    inputBar.appendChild(loadBtn);
    wrapper.appendChild(inputBar);

    // ---- Containers ----
    const kpiContainer = el('div', '');
    const tableContainer = el('div', '');
    wrapper.appendChild(kpiContainer);
    wrapper.appendChild(tableContainer);

    // Show initial empty state
    const emptyState = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-4 py-12 text-center',
    );
    emptyState.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Enter a Job ID to view material usage.'));
    tableContainer.appendChild(emptyState);

    container.appendChild(wrapper);

    // ---- Export Handler ----
    exportBtn.addEventListener('click', () => {
      if (!currentData || currentData.items.length === 0) {
        showMsg(wrapper, 'No data to export. Load a job first.', true);
        return;
      }
      exportJobMaterialsCSV(currentJobId, currentData.items);
    });

    // ---- Load Handler ----
    loadBtn.addEventListener('click', () => {
      const jobId = jobInput.value.trim();
      if (!jobId) {
        showMsg(wrapper, 'Please enter a Job ID.', true);
        return;
      }
      currentJobId = jobId;
      void loadData(jobId);
    });

    // Also allow Enter key in the input
    jobInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        loadBtn.click();
      }
    });

    // ---- Load Data ----
    async function loadData(jobId: string): Promise<void> {
      // Loading state
      kpiContainer.innerHTML = '';
      tableContainer.innerHTML = '';
      const loading = el('div', 'flex items-center justify-center py-12');
      loading.appendChild(el('span', 'text-sm text-[var(--text-muted)]', `Loading materials for job ${jobId}...`));
      tableContainer.appendChild(loading);

      try {
        const svc = getInventoryService();
        const summary = await svc.getJobMaterialSummary(jobId);

        const items: MaterialRow[] = summary.items.map((item) => {
          const totalHandled = item.quantityIssued + item.quantityWasted;
          const wastePct = totalHandled > 0
            ? (item.quantityWasted / totalHandled) * 100
            : 0;
          return {
            itemNumber: item.itemNumber,
            itemDescription: item.itemDescription,
            quantityIssued: item.quantityIssued,
            quantityWasted: item.quantityWasted,
            wastePct,
            cost: item.cost,
          };
        });

        currentData = {
          totalIssued: summary.totalIssued,
          totalWaste: summary.totalWaste,
          totalCost: summary.totalCost,
          wasteCost: summary.wasteCost,
          items,
        };

        // Rebuild KPI cards
        kpiContainer.innerHTML = '';
        kpiContainer.appendChild(buildKpiCards(currentData));

        // Rebuild table
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(items));

        showMsg(wrapper, `Loaded ${items.length} material line(s) for job ${jobId}.`, false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load job material data';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }
  },
};
