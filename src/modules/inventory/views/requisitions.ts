/**
 * Material Requisitions view.
 * Displays requisitions with workflow actions (submit, approve, fill, cancel),
 * filtering, summary stats, and new requisition creation.
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
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'partially_filled', label: 'Partially Filled' },
  { value: 'filled', label: 'Filled' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partially_filled: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  filled: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');
let itemMap: Map<string, string> = new Map();
let tableContainer: HTMLElement | null = null;
let summaryContainer: HTMLElement | null = null;
let filterStatus = '';
let filterSearch = '';
let filterJobId = '';

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

interface ReqRow {
  id: string;
  number: string;
  itemName: string;
  jobId: string;
  requestedBy: string;
  requestDate: string;
  neededDate: string;
  quantity: number;
  filledQuantity: number;
  status: string;
}

function buildSummaryCards(rows: ReqRow[]): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const totalRequisitions = rows.length;
  const pending = rows.filter((r) => r.status === 'submitted').length;
  const approved = rows.filter((r) => r.status === 'approved').length;
  const open = rows.filter((r) =>
    ['draft', 'submitted', 'approved', 'partially_filled'].includes(r.status),
  ).length;

  const cards = [
    { label: 'Total Requisitions', value: String(totalRequisitions) },
    { label: 'Pending', value: String(pending) },
    { label: 'Approved', value: String(approved) },
    { label: 'Open', value: String(open) },
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

function buildTable(rows: ReqRow[], onAction: () => void): HTMLElement {
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
    'Number',
    'Item',
    'Job',
    'Requested By',
    'Request Date',
    'Needed Date',
    'Qty',
    'Filled Qty',
    'Status',
    'Actions',
  ]) {
    const align = ['Qty', 'Filled Qty'].includes(col)
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
      'No requisitions found.',
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

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--accent)]', row.number));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.itemName));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', row.jobId || '\u2014'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.requestedBy));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.requestDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.neededDate));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(row.quantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(row.filledQuantity)));

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

    // Submit (only for draft)
    if (row.status === 'draft') {
      const submitBtn = el(
        'button',
        'text-blue-400 hover:underline text-sm',
        'Submit',
      );
      submitBtn.type = 'button';
      submitBtn.addEventListener('click', async () => {
        try {
          const svc = getInventoryService();
          await svc.submitRequisition(row.id);
          showMsg(wrapper, `Requisition ${row.number} submitted.`, false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Submit failed';
          showMsg(wrapper, message, true);
        }
      });
      actionWrap.appendChild(submitBtn);
    }

    // Approve (only for submitted)
    if (row.status === 'submitted') {
      const approveBtn = el(
        'button',
        'text-emerald-400 hover:underline text-sm',
        'Approve',
      );
      approveBtn.type = 'button';
      approveBtn.addEventListener('click', async () => {
        const approverId = prompt('Approver ID:');
        if (!approverId) return;
        try {
          const svc = getInventoryService();
          await svc.approveRequisition(row.id, approverId);
          showMsg(wrapper, `Requisition ${row.number} approved.`, false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Approval failed';
          showMsg(wrapper, message, true);
        }
      });
      actionWrap.appendChild(approveBtn);
    }

    // Fill (only for approved or partially_filled)
    if (row.status === 'approved' || row.status === 'partially_filled') {
      const fillBtn = el(
        'button',
        'text-amber-400 hover:underline text-sm',
        'Fill',
      );
      fillBtn.type = 'button';
      fillBtn.addEventListener('click', async () => {
        const qtyStr = prompt('Fill quantity:');
        if (!qtyStr) return;
        const qty = parseFloat(qtyStr);
        if (isNaN(qty) || qty <= 0) {
          showMsg(wrapper, 'Invalid quantity.', true);
          return;
        }
        try {
          const svc = getInventoryService();
          await svc.fillRequisition(row.id, qty);
          showMsg(wrapper, `Requisition ${row.number} filled with ${qty}.`, false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Fill failed';
          showMsg(wrapper, message, true);
        }
      });
      actionWrap.appendChild(fillBtn);
    }

    // Cancel (for draft, submitted, approved, partially_filled)
    if (['draft', 'submitted', 'approved', 'partially_filled'].includes(row.status)) {
      const cancelBtn = el(
        'button',
        'text-red-400 hover:underline text-sm',
        'Cancel',
      );
      cancelBtn.type = 'button';
      cancelBtn.addEventListener('click', async () => {
        try {
          const svc = getInventoryService();
          await svc.cancelRequisition(row.id);
          showMsg(wrapper, `Requisition ${row.number} cancelled.`, false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Cancel failed';
          showMsg(wrapper, message, true);
        }
      });
      actionWrap.appendChild(cancelBtn);
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
  const items = await svc.listItems();
  itemMap = new Map(items.map((i) => [(i as any).id as string, `${i.number} - ${i.description}`]));
}

async function loadAndRender(): Promise<void> {
  const svc = getInventoryService();

  const filters: {
    status?: any;
    jobId?: string;
    search?: string;
  } = {};
  if (filterStatus) filters.status = filterStatus;
  if (filterJobId) filters.jobId = filterJobId;
  if (filterSearch) filters.search = filterSearch;

  const requisitions = await svc.listRequisitions(filters);

  const rows: ReqRow[] = requisitions.map((r) => ({
    id: (r as any).id as string,
    number: r.number,
    itemName: itemMap.get(r.itemId) ?? (r.itemDescription || r.itemId),
    jobId: r.jobId,
    requestedBy: r.requestedBy,
    requestDate: r.requestDate,
    neededDate: r.neededDate,
    quantity: r.quantity,
    filledQuantity: r.filledQuantity,
    status: r.status,
  }));

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
    const message = err instanceof Error ? err.message : 'Failed to load requisitions';
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
      el('h1', 'text-2xl font-bold text-[var(--text)]', 'Material Requisitions'),
    );
    const newBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
      'New Requisition',
    );
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => {
      void handleNewRequisition();
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
    searchInput.placeholder = 'Search requisitions...';
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

    const jobInput = el('input', INPUT_CLS) as HTMLInputElement;
    jobInput.type = 'text';
    jobInput.placeholder = 'Job ID...';
    jobInput.addEventListener('input', () => {
      filterJobId = jobInput.value.trim();
      void refresh();
    });
    bar.appendChild(jobInput);

    wrapper.appendChild(bar);

    // Table container
    tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Initial render
    await loadAndRender();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load material requisitions';
    showMsg(wrapper, message, true);
  }
})();

// ---------------------------------------------------------------------------
// New Requisition handler
// ---------------------------------------------------------------------------

async function handleNewRequisition(): Promise<void> {
  try {
    const svc = getInventoryService();

    const number = prompt('Requisition Number:');
    if (!number) return;

    const jobId = prompt('Job ID:');
    if (!jobId) return;

    const requestedBy = prompt('Requested By:');
    if (!requestedBy) return;

    const neededDate = prompt('Needed Date (YYYY-MM-DD):');
    if (!neededDate) return;

    const itemId = prompt('Item ID:');
    if (!itemId) return;

    const qtyStr = prompt('Quantity:');
    if (!qtyStr) return;
    const quantity = parseFloat(qtyStr);
    if (isNaN(quantity) || quantity <= 0) {
      showMsg(wrapper, 'Invalid quantity.', true);
      return;
    }

    const notes = prompt('Notes (optional):') ?? '';

    await svc.createRequisition({
      number,
      jobId,
      requestedBy,
      neededDate,
      itemId,
      quantity,
      notes: notes || undefined,
    });

    showMsg(wrapper, `Requisition ${number} created successfully.`, false);
    await loadLookups();
    await refresh();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create requisition';
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
