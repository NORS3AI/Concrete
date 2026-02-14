/**
 * Low Stock Alerts view.
 * Displays items that have fallen below their reorder point, sorted by
 * deficit descending. Color-coded severity and summary statistics.
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

// ---------------------------------------------------------------------------
// Types (local view-layer mirrors)
// ---------------------------------------------------------------------------

interface AlertRow {
  itemNumber: string;
  itemDescription: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  deficit: number;
}

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------

function buildKpiCards(rows: AlertRow[]): HTMLElement {
  const totalAlerts = rows.length;
  const critical = rows.filter((r) => r.deficit > r.reorderQuantity).length;
  const belowReorder = rows.length; // all rows are below reorder point by definition

  const grid = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6');

  const items: { label: string; value: string; colorCls?: string }[] = [
    {
      label: 'Total Alerts',
      value: String(totalAlerts),
      colorCls: totalAlerts > 0 ? 'text-amber-400' : 'text-emerald-400',
    },
    {
      label: 'Critical',
      value: String(critical),
      colorCls: critical > 0 ? 'text-red-400' : 'text-emerald-400',
    },
    {
      label: 'Items Below Reorder Point',
      value: String(belowReorder),
      colorCls: belowReorder > 0 ? 'text-amber-400' : 'text-emerald-400',
    },
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

function buildTable(rows: AlertRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'border-b border-[var(--border)]');
  const cols = ['Item Number', 'Description', 'Current Stock', 'Reorder Point', 'Reorder Qty', 'Deficit'];
  for (const col of cols) {
    const isNumeric = ['Current Stock', 'Reorder Point', 'Reorder Qty', 'Deficit'].includes(col);
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
    const td = el(
      'td',
      'px-4 py-8 text-center text-sm text-emerald-400',
      'All items are above reorder points.',
    );
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', trCls);

    tr.appendChild(el('td', tdCls + ' font-mono', row.itemNumber));
    tr.appendChild(el('td', tdCls, row.itemDescription));
    tr.appendChild(el('td', tdCls + ' text-right font-mono', row.currentStock.toLocaleString('en-US', { maximumFractionDigits: 2 })));
    tr.appendChild(el('td', tdCls + ' text-right font-mono', row.reorderPoint.toLocaleString('en-US', { maximumFractionDigits: 2 })));
    tr.appendChild(el('td', tdCls + ' text-right font-mono', row.reorderQuantity.toLocaleString('en-US', { maximumFractionDigits: 2 })));

    // Color-code deficit: red if > reorderQuantity, amber if > 0
    let deficitCls: string;
    if (row.deficit > row.reorderQuantity) {
      deficitCls = tdCls + ' text-right font-mono font-semibold text-red-400';
    } else if (row.deficit > 0) {
      deficitCls = tdCls + ' text-right font-mono font-semibold text-amber-400';
    } else {
      deficitCls = tdCls + ' text-right font-mono';
    }
    tr.appendChild(el('td', deficitCls, row.deficit.toLocaleString('en-US', { maximumFractionDigits: 2 })));

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
    const wrapper = el('div', 'max-w-7xl mx-auto');

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Low Stock Alerts'));

    const refreshBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
      'Refresh',
    );
    headerRow.appendChild(refreshBtn);
    wrapper.appendChild(headerRow);

    // ---- Containers ----
    const kpiContainer = el('div', '');
    const tableContainer = el('div', '');
    wrapper.appendChild(kpiContainer);
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Refresh Handler ----
    refreshBtn.addEventListener('click', () => {
      void loadData();
    });

    // ---- Load Data ----
    async function loadData(): Promise<void> {
      // Loading state
      kpiContainer.innerHTML = '';
      tableContainer.innerHTML = '';
      const loading = el('div', 'flex items-center justify-center py-12');
      loading.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading low stock alerts...'));
      tableContainer.appendChild(loading);

      try {
        const svc = getInventoryService();
        const alerts = await svc.getLowStockItems();

        const rows: AlertRow[] = alerts.map((a) => ({
          itemNumber: a.itemNumber,
          itemDescription: a.itemDescription,
          currentStock: a.currentStock,
          reorderPoint: a.reorderPoint,
          reorderQuantity: a.reorderQuantity,
          deficit: a.deficit,
        }));

        // Rebuild KPI cards
        kpiContainer.innerHTML = '';
        kpiContainer.appendChild(buildKpiCards(rows));

        // Rebuild table
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(rows));

        if (rows.length > 0) {
          showMsg(wrapper, `Found ${rows.length} low stock alert(s).`, false);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load low stock alerts';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load low stock alerts';
        showMsg(wrapper, message, true);
      }
    })();
  },
};
