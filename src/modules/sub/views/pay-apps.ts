/**
 * Payment Applications (AIA G702) view.
 * Filterable table of pay apps with submission and approval workflow actions.
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
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const INPUT_CLS = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PayAppRow {
  id: string;
  subcontractId: string;
  subcontractNumber: string;
  applicationNumber: number;
  periodTo: string;
  previouslyBilled: number;
  currentBilled: number;
  materialStored: number;
  totalBilled: number;
  retainageAmount: number;
  netPayable: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');
let subMap: Map<string, string> = new Map();
let allRows: PayAppRow[] = [];
let filterStatus = '';
let filterSearch = '';
let tableContainer: HTMLElement | null = null;
let summaryContainer: HTMLElement | null = null;
let formVisible = false;

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  const searchInput = el('input', INPUT_CLS) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search pay applications...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => {
    filterStatus = statusSelect.value;
    filterSearch = searchInput.value;
    renderTableAndSummary();
  };
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(payApps: PayAppRow[]): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const totalBilled = payApps.reduce((s, p) => s + p.currentBilled, 0);
  const totalRetainage = payApps.reduce((s, p) => s + p.retainageAmount, 0);
  const totalNetPayable = payApps.reduce((s, p) => s + p.netPayable, 0);
  const pendingApproval = payApps.filter((p) => p.status === 'submitted').length;

  const cards = [
    { label: 'Total Current Billed', value: fmtCurrency(totalBilled) },
    { label: 'Total Retainage', value: fmtCurrency(totalRetainage) },
    { label: 'Total Net Payable', value: fmtCurrency(totalNetPayable) },
    { label: 'Pending Approval', value: pendingApproval.toString() },
  ];

  for (const card of cards) {
    const div = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    div.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', card.label));
    div.appendChild(el('div', 'text-xl font-bold text-[var(--text)]', card.value));
    row.appendChild(div);
  }

  return row;
}

// ---------------------------------------------------------------------------
// Inline Form
// ---------------------------------------------------------------------------

function buildForm(subOptions: { id: string; number: string }[], onCreated: () => void): HTMLElement {
  const form = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  form.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'New Pay App'));

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

  const appNumInput = el('input', INPUT_CLS) as HTMLInputElement;
  appNumInput.type = 'number';
  appNumInput.placeholder = 'Application #';
  grid.appendChild(appNumInput);

  const periodToInput = el('input', INPUT_CLS) as HTMLInputElement;
  periodToInput.type = 'date';
  periodToInput.valueAsDate = new Date();
  grid.appendChild(periodToInput);

  const prevBilledInput = el('input', INPUT_CLS) as HTMLInputElement;
  prevBilledInput.type = 'number';
  prevBilledInput.placeholder = 'Previously Billed';
  prevBilledInput.step = '0.01';
  grid.appendChild(prevBilledInput);

  const currentBilledInput = el('input', INPUT_CLS) as HTMLInputElement;
  currentBilledInput.type = 'number';
  currentBilledInput.placeholder = 'Current Billed';
  currentBilledInput.step = '0.01';
  grid.appendChild(currentBilledInput);

  const materialInput = el('input', INPUT_CLS) as HTMLInputElement;
  materialInput.type = 'number';
  materialInput.placeholder = 'Material Stored';
  materialInput.step = '0.01';
  grid.appendChild(materialInput);

  form.appendChild(grid);

  const btnRow = el('div', 'flex gap-2');
  const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create');
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', async () => {
    try {
      const svc = getSubService();
      await svc.createPayApp({
        subcontractId: subSelect.value,
        applicationNumber: parseInt(appNumInput.value, 10),
        periodTo: periodToInput.value,
        currentBilled: parseFloat(currentBilledInput.value),
        materialStored: parseFloat(materialInput.value) || 0,
      });
      showMsg(wrapper, 'Pay application created successfully.', false);
      onCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create pay application';
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

function getFilteredRows(): PayAppRow[] {
  return allRows.filter((pa) => {
    if (filterStatus && pa.status !== filterStatus) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const haystack = `${pa.applicationNumber} ${pa.subcontractNumber} ${pa.periodTo}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function buildTable(payApps: PayAppRow[], onAction: () => void): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['App #', 'Subcontract #', 'Period To', 'Prev Billed', 'Current', 'Material', 'Total', 'Retainage', 'Net Payable', 'Status', 'Actions']) {
    const align = ['Prev Billed', 'Current', 'Material', 'Total', 'Retainage', 'Net Payable'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (payApps.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No payment applications found.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const pa of payApps) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--text)]', `#${pa.applicationNumber}`));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', pa.subcontractNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pa.periodTo));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(pa.previouslyBilled)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(pa.currentBilled)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(pa.materialStored)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(pa.totalBilled)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(pa.retainageAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-bold text-[var(--accent)]', fmtCurrency(pa.netPayable)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[pa.status] ?? STATUS_BADGE.draft}`,
      pa.status.charAt(0).toUpperCase() + pa.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (pa.status === 'draft') {
      const submitBtn = el('button', 'text-amber-400 hover:underline text-sm mr-2', 'Submit');
      submitBtn.type = 'button';
      submitBtn.addEventListener('click', async () => {
        try {
          const svc = getSubService();
          await svc.submitPayApp(pa.id);
          showMsg(wrapper, `Pay app #${pa.applicationNumber} submitted.`, false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Submit failed';
          showMsg(wrapper, message, true);
        }
      });
      tdActions.appendChild(submitBtn);
    }
    if (pa.status === 'submitted') {
      const approveBtn = el('button', 'text-emerald-400 hover:underline text-sm mr-2', 'Approve');
      approveBtn.type = 'button';
      approveBtn.addEventListener('click', async () => {
        try {
          const svc = getSubService();
          await svc.approvePayApp(pa.id);
          showMsg(wrapper, `Pay app #${pa.applicationNumber} approved.`, false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Approval failed';
          showMsg(wrapper, message, true);
        }
      });
      tdActions.appendChild(approveBtn);
    }
    if (pa.status === 'approved') {
      const payBtn = el('button', 'text-blue-400 hover:underline text-sm', 'Mark Paid');
      payBtn.type = 'button';
      payBtn.addEventListener('click', async () => {
        try {
          const svc = getSubService();
          await svc.markPayAppPaid(pa.id);
          showMsg(wrapper, `Pay app #${pa.applicationNumber} marked as paid.`, false);
          onAction();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      });
      tdActions.appendChild(payBtn);
    }
    if (pa.status === 'paid') {
      tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'Complete'));
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
  const [payApps, subcontracts] = await Promise.all([
    svc.getPayApps(),
    svc.getSubcontracts(),
  ]);

  subMap = new Map(subcontracts.map((s) => [s.id, s.number]));

  allRows = payApps.map((pa) => ({
    id: pa.id,
    subcontractId: pa.subcontractId,
    subcontractNumber: subMap.get(pa.subcontractId) ?? pa.subcontractId,
    applicationNumber: pa.applicationNumber,
    periodTo: pa.periodTo,
    previouslyBilled: pa.previouslyBilled,
    currentBilled: pa.currentBilled,
    materialStored: pa.materialStored,
    totalBilled: pa.totalBilled,
    retainageAmount: pa.retainageAmount,
    netPayable: pa.netPayable,
    status: pa.status,
  }));
}

function renderTableAndSummary(): void {
  const filtered = getFilteredRows();
  if (summaryContainer) {
    summaryContainer.replaceChildren(buildSummaryCards(filtered));
  }
  if (tableContainer) {
    tableContainer.replaceChildren(buildTable(filtered, refresh));
  }
}

async function refresh(): Promise<void> {
  try {
    await loadData();
    renderTableAndSummary();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load pay applications';
    showMsg(wrapper, message, true);
  }
}

// ---------------------------------------------------------------------------
// Async initialisation
// ---------------------------------------------------------------------------

void (async () => {
  try {
    const svc = getSubService();
    const [payApps, subcontracts] = await Promise.all([
      svc.getPayApps(),
      svc.getSubcontracts(),
    ]);

    subMap = new Map(subcontracts.map((s) => [s.id, s.number]));

    allRows = payApps.map((pa) => ({
      id: pa.id,
      subcontractId: pa.subcontractId,
      subcontractNumber: subMap.get(pa.subcontractId) ?? pa.subcontractId,
      applicationNumber: pa.applicationNumber,
      periodTo: pa.periodTo,
      previouslyBilled: pa.previouslyBilled,
      currentBilled: pa.currentBilled,
      materialStored: pa.materialStored,
      totalBilled: pa.totalBilled,
      retainageAmount: pa.retainageAmount,
      netPayable: pa.netPayable,
      status: pa.status,
    }));

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Payment Applications'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Pay App');
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

    // Summary cards
    summaryContainer = el('div');
    wrapper.appendChild(summaryContainer);

    // Filter bar
    wrapper.appendChild(buildFilterBar());

    // Table container
    tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    renderTableAndSummary();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load pay applications';
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
