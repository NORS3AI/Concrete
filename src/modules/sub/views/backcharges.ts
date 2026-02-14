/**
 * Backcharges view.
 * Filterable table of backcharges with approval and deduction workflow actions.
 * Wired to SubService for data and mutations.
 */

import { getSubService } from '../service-accessor';

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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'deducted', label: 'Deducted' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'damage', label: 'Damage Repair' },
  { value: 'defective', label: 'Defective Work' },
  { value: 'cleanup', label: 'Cleanup' },
  { value: 'safety', label: 'Safety Violation' },
  { value: 'schedule', label: 'Schedule Delay' },
  { value: 'other', label: 'Other' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  deducted: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
};

const INPUT_CLS = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackchargeRow {
  id: string;
  subcontractId: string;
  subcontractNumber: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');
let subMap: Map<string, string> = new Map();
let allRows: BackchargeRow[] = [];
let filterStatus = '';
let filterCategory = '';
let filterSearch = '';
let tableContainer: HTMLElement | null = null;
let formVisible = false;

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  const searchInput = el('input', INPUT_CLS) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search backcharges...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const categorySelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of CATEGORY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    categorySelect.appendChild(o);
  }
  bar.appendChild(categorySelect);

  const fire = () => {
    filterStatus = statusSelect.value;
    filterCategory = categorySelect.value;
    filterSearch = searchInput.value;
    renderTable();
  };
  statusSelect.addEventListener('change', fire);
  categorySelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Inline Form
// ---------------------------------------------------------------------------

function buildForm(subOptions: { id: string; number: string }[], onCreated: () => void): HTMLElement {
  const form = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  form.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'New Backcharge'));

  const grid = el('div', 'grid grid-cols-3 gap-3 mb-3');

  const subSelect = el('select', INPUT_CLS) as HTMLSelectElement;
  const defaultOpt = el('option', '', 'Select Subcontract') as HTMLOptionElement;
  defaultOpt.value = '';
  subSelect.appendChild(defaultOpt);
  for (const s of subOptions) {
    const o = el('option', '', s.number) as HTMLOptionElement;
    o.value = s.id;
    subSelect.appendChild(o);
  }
  grid.appendChild(subSelect);

  const descInput = el('input', INPUT_CLS) as HTMLInputElement;
  descInput.type = 'text';
  descInput.placeholder = 'Description';
  grid.appendChild(descInput);

  const amountInput = el('input', INPUT_CLS) as HTMLInputElement;
  amountInput.type = 'number';
  amountInput.placeholder = 'Amount';
  amountInput.step = '0.01';
  grid.appendChild(amountInput);

  const dateInput = el('input', INPUT_CLS) as HTMLInputElement;
  dateInput.type = 'date';
  dateInput.valueAsDate = new Date();
  grid.appendChild(dateInput);

  const categorySelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of CATEGORY_OPTIONS.slice(1)) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    categorySelect.appendChild(o);
  }
  grid.appendChild(categorySelect);

  form.appendChild(grid);

  const btnRow = el('div', 'flex gap-2');
  const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create');
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', async () => {
    try {
      const svc = getSubService();
      await svc.createBackcharge({
        subcontractId: subSelect.value,
        description: descInput.value,
        amount: parseFloat(amountInput.value),
        date: dateInput.value,
        category: categorySelect.value || undefined,
      });
      showMsg(wrapper, 'Backcharge created successfully.', false);
      onCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create backcharge';
      showMsg(wrapper, message, true);
    }
  });
  btnRow.appendChild(saveBtn);

  const cancelBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Cancel');
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => {
    formVisible = false;
    form.remove();
  });
  btnRow.appendChild(cancelBtn);

  form.appendChild(btnRow);
  return form;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function getFilteredRows(): BackchargeRow[] {
  return allRows.filter((bc) => {
    if (filterStatus && bc.status !== filterStatus) return false;
    if (filterCategory && bc.category !== filterCategory) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const haystack = `${bc.subcontractNumber} ${bc.description} ${bc.category}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function buildTable(backcharges: BackchargeRow[], onAction: () => void): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Subcontract #', 'Description', 'Category', 'Amount', 'Date', 'Status', 'Actions']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (backcharges.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No backcharges found.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const bc of backcharges) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', bc.subcontractNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', bc.description));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', bc.category || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', fmtCurrency(bc.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', bc.date));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[bc.status] ?? STATUS_BADGE.pending}`,
      bc.status.charAt(0).toUpperCase() + bc.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (bc.status === 'pending') {
      const approveBtn = el('button', 'text-blue-400 hover:underline text-sm mr-2', 'Approve');
      approveBtn.type = 'button';
      approveBtn.addEventListener('click', async () => {
        try {
          const svc = getSubService();
          await svc.approveBackcharge(bc.id);
          showMsg(wrapper, 'Backcharge approved.', false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Approval failed';
          showMsg(wrapper, message, true);
        }
      });
      tdActions.appendChild(approveBtn);
    }
    if (bc.status === 'approved') {
      const deductBtn = el('button', 'text-violet-400 hover:underline text-sm', 'Deduct');
      deductBtn.type = 'button';
      deductBtn.addEventListener('click', async () => {
        try {
          const svc = getSubService();
          await svc.deductBackcharge(bc.id);
          showMsg(wrapper, 'Backcharge deducted.', false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Deduction failed';
          showMsg(wrapper, message, true);
        }
      });
      tdActions.appendChild(deductBtn);
    }
    if (bc.status === 'deducted') {
      tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'Deducted'));
    }
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Data loading and re-rendering
// ---------------------------------------------------------------------------

async function loadData(): Promise<void> {
  const svc = getSubService();
  const [backcharges, subcontracts] = await Promise.all([
    svc.getBackcharges(),
    svc.getSubcontracts(),
  ]);

  subMap = new Map(subcontracts.map((s) => [s.id, s.number]));

  allRows = backcharges.map((bc) => ({
    id: bc.id,
    subcontractId: bc.subcontractId,
    subcontractNumber: subMap.get(bc.subcontractId) ?? bc.subcontractId,
    description: bc.description,
    amount: bc.amount,
    date: bc.date,
    category: bc.category ?? '',
    status: bc.status,
  }));
}

function renderTable(): void {
  if (!tableContainer) return;
  const filtered = getFilteredRows();
  const newTable = buildTable(filtered, refresh);
  tableContainer.replaceChildren(newTable);
}

async function refresh(): Promise<void> {
  try {
    await loadData();
    renderTable();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load backcharges';
    showMsg(wrapper, message, true);
  }
}

// ---------------------------------------------------------------------------
// Async initialisation
// ---------------------------------------------------------------------------

void (async () => {
  try {
    const svc = getSubService();
    const [backcharges, subcontracts] = await Promise.all([
      svc.getBackcharges(),
      svc.getSubcontracts(),
    ]);

    subMap = new Map(subcontracts.map((s) => [s.id, s.number]));

    allRows = backcharges.map((bc) => ({
      id: bc.id,
      subcontractId: bc.subcontractId,
      subcontractNumber: subMap.get(bc.subcontractId) ?? bc.subcontractId,
      description: bc.description,
      amount: bc.amount,
      date: bc.date,
      category: bc.category ?? '',
      status: bc.status,
    }));

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Backcharges'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Backcharge');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => {
      if (formVisible) return;
      formVisible = true;
      const subOptions = Array.from(subMap.entries()).map(([id, num]) => ({ id, number: num }));
      const form = buildForm(subOptions, async () => {
        formVisible = false;
        form.remove();
        await refresh();
      });
      headerRow.after(form);
    });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Filter bar
    wrapper.appendChild(buildFilterBar());

    // Table container
    tableContainer = el('div');
    wrapper.appendChild(tableContainer);
    renderTable();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load backcharges';
    showMsg(wrapper, message, true);
  }
})();

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};
