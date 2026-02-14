/**
 * Physical Inventory Count view.
 * Displays inventory counts with workflow actions (update count, complete, post),
 * filtering, summary stats, and new count creation.
 * Wired to InventoryService for data persistence.
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
// Constants
// ---------------------------------------------------------------------------

const INPUT_CLS =
  'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'posted', label: 'Posted' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  completed: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  posted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');
let itemMap: Map<string, string> = new Map();
let warehouseMap: Map<string, string> = new Map();
let tableContainer: HTMLElement | null = null;
let summaryContainer: HTMLElement | null = null;
let filterStatus = '';
let filterSearch = '';

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

interface CountRow {
  id: string;
  countDate: string;
  warehouseName: string;
  warehouseId: string;
  itemName: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  status: string;
}

function buildSummaryCards(rows: CountRow[]): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const totalCounts = rows.length;
  const draftCount = rows.filter((r) => r.status === 'draft').length;
  const completedCount = rows.filter((r) => r.status === 'completed').length;
  const postedCount = rows.filter((r) => r.status === 'posted').length;

  const cards = [
    { label: 'Total Counts', value: String(totalCounts) },
    { label: 'Draft', value: String(draftCount) },
    { label: 'Completed', value: String(completedCount) },
    { label: 'Posted', value: String(postedCount) },
  ];

  for (const card of cards) {
    const div = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4',
    );
    div.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', card.label));
    div.appendChild(el('div', 'text-xl font-bold text-[var(--text)]', card.value));
    row.appendChild(div);
  }

  return row;
}

// ---------------------------------------------------------------------------
// Variance formatting
// ---------------------------------------------------------------------------

function fmtVariance(v: number): { text: string; cls: string } {
  if (v > 0) {
    return { text: `+${v}`, cls: 'text-emerald-400' };
  } else if (v < 0) {
    return { text: String(v), cls: 'text-red-400' };
  }
  return { text: '0', cls: 'text-zinc-400' };
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: CountRow[], onAction: () => void): HTMLElement {
  const wrap = el(
    'div',
    'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
  );
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el(
    'tr',
    'text-left text-[var(--text-muted)] border-b border-[var(--border)]',
  );
  for (const col of [
    'Count Date',
    'Warehouse',
    'Item',
    'System Qty',
    'Counted Qty',
    'Variance',
    'Status',
    'Actions',
  ]) {
    const align = ['System Qty', 'Counted Qty', 'Variance'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el(
      'td',
      'py-8 px-3 text-center text-[var(--text-muted)]',
      'No inventory counts found.',
    );
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el(
      'tr',
      'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
    );

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.countDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.warehouseName));
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.itemName));
    tr.appendChild(
      el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', String(row.systemQuantity)),
    );
    tr.appendChild(
      el('td', 'py-2 px-3 text-right font-mono', String(row.countedQuantity)),
    );

    // Variance with color coding
    const varianceInfo = fmtVariance(row.variance);
    const tdVariance = el('td', 'py-2 px-3 text-right font-mono');
    tdVariance.appendChild(el('span', varianceInfo.cls, varianceInfo.text));
    tr.appendChild(tdVariance);

    // Status badge
    const tdStatus = el('td', 'py-2 px-3');
    const statusLabel = row.status.replace(/_/g, ' ');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
      statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    // Actions
    const tdActions = el('td', 'py-2 px-3');
    const actionWrap = el('div', 'flex flex-wrap gap-1');

    // Update Count (draft/in_progress)
    if (row.status === 'draft' || row.status === 'in_progress') {
      const updateBtn = el(
        'button',
        'text-blue-400 hover:underline text-sm',
        'Update Count',
      );
      updateBtn.type = 'button';
      updateBtn.addEventListener('click', async () => {
        const qtyStr = prompt('Counted quantity:');
        if (!qtyStr) return;
        const qty = parseFloat(qtyStr);
        if (isNaN(qty) || qty < 0) {
          showMsg(wrapper, 'Invalid quantity.', true);
          return;
        }
        try {
          const svc = getInventoryService();
          await svc.updateCountLine(row.id, qty);
          showMsg(wrapper, 'Count updated successfully.', false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Update failed';
          showMsg(wrapper, message, true);
        }
      });
      actionWrap.appendChild(updateBtn);
    }

    // Complete (draft/in_progress)
    if (row.status === 'draft' || row.status === 'in_progress') {
      const completeBtn = el(
        'button',
        'text-amber-400 hover:underline text-sm',
        'Complete',
      );
      completeBtn.type = 'button';
      completeBtn.addEventListener('click', async () => {
        try {
          const svc = getInventoryService();
          await svc.completeCount(row.id);
          showMsg(wrapper, 'Count completed.', false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Complete failed';
          showMsg(wrapper, message, true);
        }
      });
      actionWrap.appendChild(completeBtn);
    }

    // Post Adjustment (completed only)
    if (row.status === 'completed') {
      const postBtn = el(
        'button',
        'text-emerald-400 hover:underline text-sm',
        'Post Adjustment',
      );
      postBtn.type = 'button';
      postBtn.addEventListener('click', async () => {
        try {
          const svc = getInventoryService();
          await svc.postCount(row.id);
          showMsg(wrapper, 'Adjustment posted successfully.', false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Post failed';
          showMsg(wrapper, message, true);
        }
      });
      actionWrap.appendChild(postBtn);
    }

    tdActions.appendChild(actionWrap);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Data loading & rendering
// ---------------------------------------------------------------------------

async function loadLookups(): Promise<void> {
  const svc = getInventoryService();
  const [items, warehouses] = await Promise.all([
    svc.listItems(),
    svc.listWarehouses(),
  ]);
  itemMap = new Map(items.map((i) => [(i as any).id as string, `${i.number} - ${i.description}`]));
  warehouseMap = new Map(warehouses.map((w) => [(w as any).id as string, w.name]));
}

async function loadAndRender(): Promise<void> {
  const svc = getInventoryService();

  const filters: {
    warehouseId?: string;
    status?: any;
  } = {};
  if (filterStatus) filters.status = filterStatus;

  const counts = await svc.listCounts(filters);

  let rows: CountRow[] = counts.map((c) => ({
    id: (c as any).id as string,
    countDate: c.countDate,
    warehouseName: warehouseMap.get(c.warehouseId) ?? c.warehouseId,
    warehouseId: c.warehouseId,
    itemName: itemMap.get(c.itemId) ?? c.itemId,
    systemQuantity: c.systemQuantity,
    countedQuantity: c.countedQuantity,
    variance: c.variance,
    status: c.status,
  }));

  // Apply search filter (search by warehouse name)
  if (filterSearch) {
    const q = filterSearch.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.warehouseName.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q),
    );
  }

  // Render summary
  if (summaryContainer) {
    summaryContainer.replaceChildren(buildSummaryCards(rows));
  }

  // Render table
  if (tableContainer) {
    tableContainer.replaceChildren(buildTable(rows, () => void refresh()));
  }
}

async function refresh(): Promise<void> {
  try {
    await loadAndRender();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load inventory counts';
    showMsg(wrapper, message, true);
  }
}

// ---------------------------------------------------------------------------
// Async initialisation
// ---------------------------------------------------------------------------

void (async () => {
  try {
    await loadLookups();

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(
      el('h1', 'text-2xl font-bold text-[var(--text)]', 'Physical Inventory Count'),
    );
    const newBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
      'New Count',
    );
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => {
      void handleNewCount();
    });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Summary container
    summaryContainer = el('div');
    wrapper.appendChild(summaryContainer);

    // Filter bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const searchInput = el('input', INPUT_CLS) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by warehouse...';
    searchInput.addEventListener('input', () => {
      filterSearch = searchInput.value.trim();
      void refresh();
    });
    bar.appendChild(searchInput);

    const statusSelect = el('select', INPUT_CLS) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusSelect.appendChild(o);
    }
    statusSelect.addEventListener('change', () => {
      filterStatus = statusSelect.value;
      void refresh();
    });
    bar.appendChild(statusSelect);

    wrapper.appendChild(bar);

    // Table container
    tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Initial render
    await loadAndRender();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load physical inventory counts';
    showMsg(wrapper, message, true);
  }
})();

// ---------------------------------------------------------------------------
// New Count handler
// ---------------------------------------------------------------------------

async function handleNewCount(): Promise<void> {
  try {
    const svc = getInventoryService();

    const warehouseId = prompt('Warehouse ID:');
    if (!warehouseId) return;

    const itemId = prompt('Item ID:');
    if (!itemId) return;

    const countedBy = prompt('Counted By:');
    if (!countedBy) return;

    const sysQtyStr = prompt('System Quantity:');
    if (!sysQtyStr) return;
    const systemQuantity = parseFloat(sysQtyStr);
    if (isNaN(systemQuantity) || systemQuantity < 0) {
      showMsg(wrapper, 'Invalid system quantity.', true);
      return;
    }

    const countedQtyStr = prompt('Counted Quantity:');
    if (!countedQtyStr) return;
    const countedQuantity = parseFloat(countedQtyStr);
    if (isNaN(countedQuantity) || countedQuantity < 0) {
      showMsg(wrapper, 'Invalid counted quantity.', true);
      return;
    }

    await svc.createCount({
      warehouseId,
      itemId,
      countedBy,
      systemQuantity,
      countedQuantity,
    });

    showMsg(wrapper, 'Inventory count created successfully.', false);
    await loadLookups();
    await refresh();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create inventory count';
    showMsg(wrapper, message, true);
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};
