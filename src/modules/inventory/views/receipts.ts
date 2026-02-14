/**
 * Inventory Receipts view.
 * Lists receipt transactions with item/warehouse name resolution,
 * summary stats, date range filtering, and inline creation via prompt().
 * Wired to InventoryService for data and operations.
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
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    // Header row
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Inventory Receipts'));

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Receipt');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Summary stats container
    const statsContainer = el('div', 'grid grid-cols-3 gap-4 mb-4');
    wrapper.appendChild(statsContainer);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search receipts...';
    filterBar.appendChild(searchInput);

    const fromLabel = el('span', 'text-sm text-[var(--text-muted)]', 'From:');
    filterBar.appendChild(fromLabel);
    const fromDate = el('input', inputCls) as HTMLInputElement;
    fromDate.type = 'date';
    filterBar.appendChild(fromDate);

    const toLabel = el('span', 'text-sm text-[var(--text-muted)]', 'To:');
    filterBar.appendChild(toLabel);
    const toDate = el('input', inputCls) as HTMLInputElement;
    toDate.type = 'date';
    filterBar.appendChild(toDate);

    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Summary card builder
    // -----------------------------------------------------------------------

    function buildStatCard(label: string, value: string, accent?: boolean): HTMLElement {
      const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
      card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
      card.appendChild(el('div', `text-xl font-bold font-mono ${accent ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`, value));
      return card;
    }

    // -----------------------------------------------------------------------
    // Name resolution caches
    // -----------------------------------------------------------------------

    const itemNameCache = new Map<string, string>();
    const warehouseNameCache = new Map<string, string>();

    async function resolveItemName(svc: ReturnType<typeof getInventoryService>, itemId: string): Promise<string> {
      if (itemNameCache.has(itemId)) return itemNameCache.get(itemId)!;
      const item = await svc.getItem(itemId);
      const name = item ? `${item.number} - ${item.description}` : itemId;
      itemNameCache.set(itemId, name);
      return name;
    }

    async function resolveWarehouseName(svc: ReturnType<typeof getInventoryService>, warehouseId: string): Promise<string> {
      if (warehouseNameCache.has(warehouseId)) return warehouseNameCache.get(warehouseId)!;
      const wh = await svc.getWarehouse(warehouseId);
      const name = wh?.name ?? warehouseId;
      warehouseNameCache.set(warehouseId, name);
      return name;
    }

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    let svc: ReturnType<typeof getInventoryService>;

    async function loadAndRender(): Promise<void> {
      try {
        svc = getInventoryService();

        // Load all receipt transactions
        const allReceipts = await svc.listTransactions({ type: 'receipt' });

        // Compute summary stats
        const todayStr = new Date().toISOString().split('T')[0];
        const todaysReceipts = allReceipts.filter((r) => r.date === todayStr);
        const totalValue = allReceipts.reduce((sum, r) => sum + r.totalCost, 0);

        statsContainer.innerHTML = '';
        statsContainer.appendChild(buildStatCard('Total Receipts', String(allReceipts.length)));
        statsContainer.appendChild(buildStatCard("Today's Receipts", String(todaysReceipts.length), true));
        statsContainer.appendChild(buildStatCard('Total Value', fmtCurrency(totalValue)));

        // Apply client-side filters
        let filtered = allReceipts;

        const dateFrom = fromDate.value;
        if (dateFrom) {
          filtered = filtered.filter((r) => r.date >= dateFrom);
        }

        const dateTo = toDate.value;
        if (dateTo) {
          filtered = filtered.filter((r) => r.date <= dateTo);
        }

        // Resolve names for display
        const displayRows: {
          txn: typeof filtered[number];
          itemName: string;
          warehouseName: string;
        }[] = [];

        for (const txn of filtered) {
          const itemName = await resolveItemName(svc, txn.itemId);
          const warehouseName = await resolveWarehouseName(svc, txn.warehouseId);
          displayRows.push({ txn, itemName, warehouseName });
        }

        // Apply search filter on resolved names
        const query = searchInput.value.trim().toLowerCase();
        let searchFiltered = displayRows;
        if (query) {
          searchFiltered = displayRows.filter((row) => {
            const searchable = [
              row.itemName,
              row.warehouseName,
              row.txn.poNumber ?? '',
              row.txn.reference ?? '',
              row.txn.notes ?? '',
            ].join(' ').toLowerCase();
            return searchable.includes(query);
          });
        }

        // Build table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Table header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Date', 'Item', 'Warehouse', 'Quantity', 'Unit Cost', 'Total Cost', 'PO #', 'Reference', 'Notes']) {
          const align = (col === 'Unit Cost' || col === 'Total Cost')
            ? 'text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3'
            : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Table body
        const tbody = el('tbody');
        if (searchFiltered.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No receipts found. Record your first inventory receipt to get started.');
          td.setAttribute('colspan', '9');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const row of searchFiltered) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]');

          // Date
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', row.txn.date));

          // Item
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', row.itemName));

          // Warehouse
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', row.warehouseName));

          // Quantity
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(row.txn.quantity)));

          // Unit Cost
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono text-right', fmtCurrency(row.txn.unitCost)));

          // Total Cost
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono font-medium text-right', fmtCurrency(row.txn.totalCost)));

          // PO #
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', row.txn.poNumber ?? ''));

          // Reference
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', row.txn.reference ?? ''));

          // Notes
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)] truncate max-w-[200px]', row.txn.notes ?? ''));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load receipts';
        showMsg(wrapper, message, true);
      }
    }

    // -----------------------------------------------------------------------
    // New Receipt handler (prompt-based)
    // -----------------------------------------------------------------------

    newBtn.addEventListener('click', () => {
      const itemId = prompt('Item ID:');
      if (!itemId || !itemId.trim()) return;

      const warehouseId = prompt('Warehouse ID:');
      if (!warehouseId || !warehouseId.trim()) return;

      const quantityStr = prompt('Quantity:');
      if (!quantityStr) return;
      const quantity = parseFloat(quantityStr);
      if (isNaN(quantity) || quantity <= 0) {
        showMsg(wrapper, 'Quantity must be a positive number.', true);
        return;
      }

      const unitCostStr = prompt('Unit Cost:');
      if (!unitCostStr) return;
      const unitCost = parseFloat(unitCostStr);
      if (isNaN(unitCost) || unitCost < 0) {
        showMsg(wrapper, 'Unit cost must be a non-negative number.', true);
        return;
      }

      const poNumber = prompt('PO Number (optional):') ?? '';
      const reference = prompt('Reference (optional):') ?? '';
      const notes = prompt('Notes (optional):') ?? '';

      void (async () => {
        try {
          svc = getInventoryService();
          await svc.receiveInventory({
            itemId: itemId.trim(),
            warehouseId: warehouseId.trim(),
            quantity,
            unitCost,
            poNumber: poNumber.trim() || undefined,
            reference: reference.trim() || undefined,
            notes: notes.trim() || undefined,
          });
          showMsg(wrapper, 'Receipt recorded successfully.', false);
          // Clear name caches since new receipt may affect display
          itemNameCache.clear();
          warehouseNameCache.clear();
          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to record receipt';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // Wire up filter events
    searchInput.addEventListener('input', () => void loadAndRender());
    fromDate.addEventListener('change', () => void loadAndRender());
    toDate.addEventListener('change', () => void loadAndRender());

    // Initial load
    void loadAndRender();
  },
};
