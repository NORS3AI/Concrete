/**
 * Change Orders view.
 * Filterable table of change orders with approval workflow actions.
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
  { value: 'rejected', label: 'Rejected' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'addition', label: 'Addition' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'time_extension', label: 'Time Extension' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  addition: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  deduction: 'bg-red-500/10 text-red-400 border border-red-500/20',
  time_extension: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

const INPUT_CLS = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChangeOrderRow {
  id: string;
  subcontractId: string;
  subcontractNumber: string;
  number: number;
  description: string;
  amount: number;
  type: string;
  status: string;
  date: string;
  approvedBy: string;
  approvedAt: string;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');
let subMap: Map<string, string> = new Map();
let allRows: ChangeOrderRow[] = [];
let filterStatus = '';
let filterType = '';
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
  searchInput.placeholder = 'Search change orders...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const typeSelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fire = () => {
    filterStatus = statusSelect.value;
    filterType = typeSelect.value;
    filterSearch = searchInput.value;
    renderTable();
  };
  statusSelect.addEventListener('change', fire);
  typeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Inline Form
// ---------------------------------------------------------------------------

function buildForm(subOptions: { id: string; number: string }[], onCreated: () => void): HTMLElement {
  const form = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  form.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'New Change Order'));

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

  const numberInput = el('input', INPUT_CLS) as HTMLInputElement;
  numberInput.type = 'number';
  numberInput.placeholder = 'CO Number';
  grid.appendChild(numberInput);

  const typeSelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of TYPE_OPTIONS.slice(1)) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  grid.appendChild(typeSelect);

  const amountInput = el('input', INPUT_CLS) as HTMLInputElement;
  amountInput.type = 'number';
  amountInput.placeholder = 'Amount';
  amountInput.step = '0.01';
  grid.appendChild(amountInput);

  const dateInput = el('input', INPUT_CLS) as HTMLInputElement;
  dateInput.type = 'date';
  dateInput.valueAsDate = new Date();
  grid.appendChild(dateInput);

  const descInput = el('input', INPUT_CLS) as HTMLInputElement;
  descInput.type = 'text';
  descInput.placeholder = 'Description';
  grid.appendChild(descInput);

  form.appendChild(grid);

  const btnRow = el('div', 'flex gap-2');
  const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create');
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', async () => {
    try {
      const svc = getSubService();
      await svc.createChangeOrder({
        subcontractId: subSelect.value,
        number: parseInt(numberInput.value, 10),
        description: descInput.value,
        amount: parseFloat(amountInput.value),
        type: typeSelect.value as 'addition' | 'deduction' | 'time_extension',
        date: dateInput.value,
      });
      showMsg(wrapper, 'Change order created successfully.', false);
      onCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create change order';
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

function getFilteredRows(): ChangeOrderRow[] {
  return allRows.filter((co) => {
    if (filterStatus && co.status !== filterStatus) return false;
    if (filterType && co.type !== filterType) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const haystack = `${co.number} ${co.subcontractNumber} ${co.description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function buildTable(orders: ChangeOrderRow[], onAction: () => void): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['CO #', 'Subcontract #', 'Description', 'Type', 'Amount', 'Date', 'Status', 'Approved By', 'Actions']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (orders.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No change orders found.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const co of orders) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--text)]', `CO-${co.number}`));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', co.subcontractNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', co.description));

    const tdType = el('td', 'py-2 px-3');
    const typeLabel = co.type.replace('_', ' ');
    const typeBadge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[co.type] ?? TYPE_BADGE.addition}`,
      typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1),
    );
    tdType.appendChild(typeBadge);
    tr.appendChild(tdType);

    const amountCls = co.type === 'deduction' ? 'py-2 px-3 text-right font-mono text-red-400' : 'py-2 px-3 text-right font-mono';
    const displayAmount = co.type === 'deduction' ? -Math.abs(co.amount) : co.amount;
    tr.appendChild(el('td', amountCls, fmtCurrency(displayAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', co.date));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[co.status] ?? STATUS_BADGE.pending}`,
      co.status.charAt(0).toUpperCase() + co.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', co.approvedBy || '-'));

    const tdActions = el('td', 'py-2 px-3');
    if (co.status === 'pending') {
      const approveBtn = el('button', 'text-emerald-400 hover:underline text-sm mr-2', 'Approve');
      approveBtn.type = 'button';
      approveBtn.addEventListener('click', async () => {
        const name = prompt('Approved by (name):');
        if (!name) return;
        try {
          const svc = getSubService();
          await svc.approveChangeOrder(co.id, name);
          showMsg(wrapper, `Change order CO-${co.number} approved.`, false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Approval failed';
          showMsg(wrapper, message, true);
        }
      });
      tdActions.appendChild(approveBtn);

      const rejectBtn = el('button', 'text-red-400 hover:underline text-sm', 'Reject');
      rejectBtn.type = 'button';
      rejectBtn.addEventListener('click', async () => {
        try {
          const svc = getSubService();
          await svc.rejectChangeOrder(co.id);
          showMsg(wrapper, `Change order CO-${co.number} rejected.`, false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Rejection failed';
          showMsg(wrapper, message, true);
        }
      });
      tdActions.appendChild(rejectBtn);
    } else {
      tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', '-'));
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
  const [changeOrders, subcontracts] = await Promise.all([
    svc.getChangeOrders(),
    svc.getSubcontracts(),
  ]);

  subMap = new Map(subcontracts.map((s) => [s.id, s.number]));

  allRows = changeOrders.map((co) => ({
    id: co.id,
    subcontractId: co.subcontractId,
    subcontractNumber: subMap.get(co.subcontractId) ?? co.subcontractId,
    number: co.number,
    description: co.description,
    amount: co.amount,
    type: co.type,
    status: co.status,
    date: co.date,
    approvedBy: co.approvedBy ?? '',
    approvedAt: co.approvedAt ?? '',
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
    const message = err instanceof Error ? err.message : 'Failed to load change orders';
    showMsg(wrapper, message, true);
  }
}

// ---------------------------------------------------------------------------
// Async initialisation
// ---------------------------------------------------------------------------

void (async () => {
  try {
    const svc = getSubService();
    const [changeOrders, subcontracts] = await Promise.all([
      svc.getChangeOrders(),
      svc.getSubcontracts(),
    ]);

    subMap = new Map(subcontracts.map((s) => [s.id, s.number]));

    allRows = changeOrders.map((co) => ({
      id: co.id,
      subcontractId: co.subcontractId,
      subcontractNumber: subMap.get(co.subcontractId) ?? co.subcontractId,
      number: co.number,
      description: co.description,
      amount: co.amount,
      type: co.type,
      status: co.status,
      date: co.date,
      approvedBy: co.approvedBy ?? '',
      approvedAt: co.approvedAt ?? '',
    }));

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Change Orders'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Change Order');
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
      // Insert form after the header
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
    const message = err instanceof Error ? err.message : 'Failed to load change orders';
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
