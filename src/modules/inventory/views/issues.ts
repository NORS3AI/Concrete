/**
 * Inventory Issues view.
 * Displays issue transactions with filtering, summary stats, and new issue creation.
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

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');
let itemMap: Map<string, string> = new Map();
let warehouseMap: Map<string, string> = new Map();
let tableContainer: HTMLElement | null = null;
let summaryContainer: HTMLElement | null = null;

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(
  rows: { totalCost: number; date: string }[],
): HTMLElement {
  const row = el('div', 'grid grid-cols-3 gap-4 mb-6');

  const today = new Date().toISOString().split('T')[0];
  const totalIssues = rows.length;
  const todaysIssues = rows.filter((r) => r.date === today).length;
  const totalValue = rows.reduce((s, r) => s + r.totalCost, 0);

  const cards = [
    { label: 'Total Issues', value: String(totalIssues) },
    { label: "Today's Issues", value: String(todaysIssues) },
    { label: 'Total Value', value: fmtCurrency(totalValue) },
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
// Table
// ---------------------------------------------------------------------------

interface IssueRow {
  id: string;
  date: string;
  itemName: string;
  warehouseName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  jobId: string;
  costCode: string;
  reference: string;
  notes: string;
}

function buildTable(rows: IssueRow[]): HTMLElement {
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
    'Date',
    'Item',
    'Warehouse',
    'Quantity',
    'Unit Cost',
    'Total Cost',
    'Job ID',
    'Cost Code',
    'Reference',
    'Notes',
  ]) {
    const align = ['Unit Cost', 'Total Cost', 'Quantity'].includes(col)
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
      'No issue transactions found.',
    );
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el(
      'tr',
      'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
    );

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.date));
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.itemName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.warehouseName));
    tr.appendChild(
      el('td', 'py-2 px-3 text-right font-mono', String(row.quantity)),
    );
    tr.appendChild(
      el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.unitCost)),
    );
    tr.appendChild(
      el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(row.totalCost)),
    );
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', row.jobId || '\u2014'));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', row.costCode || '\u2014'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.reference || '\u2014'));
    tr.appendChild(
      el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[200px]', row.notes || '\u2014'),
    );

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Data loading & rendering
// ---------------------------------------------------------------------------

let filterSearch = '';
let filterDateFrom = '';
let filterDateTo = '';

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

  const filters: { type: 'issue'; dateFrom?: string; dateTo?: string } = {
    type: 'issue',
  };
  if (filterDateFrom) filters.dateFrom = filterDateFrom;
  if (filterDateTo) filters.dateTo = filterDateTo;

  const transactions = await svc.listTransactions(filters);

  let rows: IssueRow[] = transactions.map((t) => ({
    id: (t as any).id as string,
    date: t.date,
    itemName: itemMap.get(t.itemId) ?? t.itemId,
    warehouseName: warehouseMap.get(t.warehouseId) ?? t.warehouseId,
    quantity: t.quantity,
    unitCost: t.unitCost,
    totalCost: t.totalCost,
    jobId: t.jobId ?? '',
    costCode: t.costCode ?? '',
    reference: t.reference ?? '',
    notes: t.notes ?? '',
  }));

  // Apply search filter
  if (filterSearch) {
    const q = filterSearch.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.itemName.toLowerCase().includes(q) ||
        r.warehouseName.toLowerCase().includes(q) ||
        r.jobId.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q),
    );
  }

  // Render summary
  if (summaryContainer) {
    summaryContainer.replaceChildren(
      buildSummaryCards(rows.map((r) => ({ totalCost: r.totalCost, date: r.date }))),
    );
  }

  // Render table
  if (tableContainer) {
    tableContainer.replaceChildren(buildTable(rows));
  }
}

async function refresh(): Promise<void> {
  try {
    await loadAndRender();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load issue transactions';
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
      el('h1', 'text-2xl font-bold text-[var(--text)]', 'Inventory Issues'),
    );
    const newBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
      'New Issue',
    );
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => {
      void handleNewIssue();
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
    searchInput.placeholder = 'Search issues...';
    searchInput.addEventListener('input', () => {
      filterSearch = searchInput.value.trim();
      void refresh();
    });
    bar.appendChild(searchInput);

    const dateFromInput = el('input', INPUT_CLS) as HTMLInputElement;
    dateFromInput.type = 'date';
    dateFromInput.title = 'Date from';
    dateFromInput.addEventListener('change', () => {
      filterDateFrom = dateFromInput.value;
      void refresh();
    });
    bar.appendChild(dateFromInput);

    const dateToInput = el('input', INPUT_CLS) as HTMLInputElement;
    dateToInput.type = 'date';
    dateToInput.title = 'Date to';
    dateToInput.addEventListener('change', () => {
      filterDateTo = dateToInput.value;
      void refresh();
    });
    bar.appendChild(dateToInput);

    wrapper.appendChild(bar);

    // Table container
    tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Initial render
    await loadAndRender();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load inventory issues';
    showMsg(wrapper, message, true);
  }
})();

// ---------------------------------------------------------------------------
// New Issue handler
// ---------------------------------------------------------------------------

async function handleNewIssue(): Promise<void> {
  try {
    const svc = getInventoryService();

    const itemId = prompt('Item ID:');
    if (!itemId) return;

    const warehouseId = prompt('Warehouse ID:');
    if (!warehouseId) return;

    const qtyStr = prompt('Quantity:');
    if (!qtyStr) return;
    const quantity = parseFloat(qtyStr);
    if (isNaN(quantity) || quantity <= 0) {
      showMsg(wrapper, 'Invalid quantity.', true);
      return;
    }

    const jobId = prompt('Job ID (optional):') ?? '';
    const costCode = prompt('Cost Code (optional):') ?? '';
    const reference = prompt('Reference (optional):') ?? '';
    const notes = prompt('Notes (optional):') ?? '';

    await svc.issueInventory({
      itemId,
      warehouseId,
      quantity,
      jobId: jobId || undefined,
      costCode: costCode || undefined,
      reference: reference || undefined,
      notes: notes || undefined,
    });

    showMsg(wrapper, 'Issue recorded successfully.', false);
    await loadLookups();
    await refresh();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record issue';
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
