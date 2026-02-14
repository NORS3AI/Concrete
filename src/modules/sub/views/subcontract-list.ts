/**
 * Subcontract List view.
 * Filterable table of subcontracts with status, vendor, and job filters.
 * Wired to SubService for live data, filtering, and deletion.
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
  { value: 'active', label: 'Active' },
  { value: 'complete', label: 'Complete' },
  { value: 'closed', label: 'Closed' },
  { value: 'terminated', label: 'Terminated' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  complete: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  closed: 'bg-red-500/10 text-red-400 border border-red-500/20',
  terminated: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubcontractRow {
  id: string;
  number: string;
  vendorId: string;
  jobId: string;
  description: string;
  contractAmount: number;
  approvedChangeOrders: number;
  revisedAmount: number;
  billedToDate: number;
  retainageHeld: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search subcontracts...';
  bar.appendChild(searchInput);

  const fire = () => onFilter(statusSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(contracts: SubcontractRow[]): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const totalContracts = contracts.length;
  const totalOriginal = contracts.reduce((s, c) => s + c.contractAmount, 0);
  const totalRevised = contracts.reduce((s, c) => s + c.revisedAmount, 0);
  const totalRetainage = contracts.reduce((s, c) => s + c.retainageHeld, 0);

  const cards = [
    { label: 'Total Contracts', value: totalContracts.toString() },
    { label: 'Original Amount', value: fmtCurrency(totalOriginal) },
    { label: 'Revised Amount', value: fmtCurrency(totalRevised) },
    { label: 'Retainage Held', value: fmtCurrency(totalRetainage) },
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
// Table
// ---------------------------------------------------------------------------

function buildTable(
  contracts: SubcontractRow[],
  wrapper: HTMLElement,
  onDelete: (id: string) => Promise<void>,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['SC #', 'Vendor ID', 'Job ID', 'Description', 'Contract Amount', 'Change Orders', 'Revised Amount', 'Billed', 'Retainage', 'Status', 'Actions']) {
    const align = ['Contract Amount', 'Change Orders', 'Revised Amount', 'Billed', 'Retainage'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (contracts.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No subcontracts found. Create your first subcontract to get started.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const sub of contracts) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', sub.number) as HTMLAnchorElement;
    link.href = `#/sub/contracts/${sub.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', sub.vendorId));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sub.jobId));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sub.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(sub.contractAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(sub.approvedChangeOrders)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(sub.revisedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(sub.billedToDate)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(sub.retainageHeld)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[sub.status] ?? STATUS_BADGE.draft}`,
      sub.status.charAt(0).toUpperCase() + sub.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/sub/contracts/${sub.id}`;
    tdActions.appendChild(editLink);

    const sovLink = el('a', 'text-[var(--accent)] hover:underline text-sm mr-2', 'SOV') as HTMLAnchorElement;
    sovLink.href = `#/sub/contracts/${sub.id}/sov`;
    tdActions.appendChild(sovLink);

    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.type = 'button';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`Delete subcontract ${sub.number}? This action cannot be undone.`)) return;
      try {
        await onDelete(sub.id);
        showMsg(wrapper, `Subcontract ${sub.number} deleted.`, false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete subcontract';
        showMsg(wrapper, message, true);
      }
    });
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

void (async () => {
  try {
    const svc = getSubService();

    // State
    let allContracts: SubcontractRow[] = [];
    let filteredContracts: SubcontractRow[] = [];
    let currentStatus = '';
    let currentSearch = '';

    // DOM anchors
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Subcontracts'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/sub/contracts/new';
    newBtn.textContent = 'New Subcontract';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    let summaryEl: HTMLElement;
    let tableEl: HTMLElement;

    // Load data
    async function loadData(): Promise<void> {
      const statusFilter = currentStatus
        ? (currentStatus as 'draft' | 'active' | 'complete' | 'closed' | 'terminated')
        : undefined;
      const subs = await svc.getSubcontracts(statusFilter ? { status: statusFilter } : undefined);

      allContracts = subs.map((s) => ({
        id: s.id,
        number: s.number,
        vendorId: s.vendorId,
        jobId: s.jobId,
        description: s.description ?? '',
        contractAmount: s.contractAmount,
        approvedChangeOrders: s.approvedChangeOrders,
        revisedAmount: s.revisedAmount,
        billedToDate: s.billedToDate,
        retainageHeld: s.retainageHeld,
        status: s.status,
      }));

      applySearch();
    }

    function applySearch(): void {
      const q = currentSearch.toLowerCase();
      filteredContracts = q
        ? allContracts.filter(
            (c) =>
              c.number.toLowerCase().includes(q) ||
              c.vendorId.toLowerCase().includes(q) ||
              c.jobId.toLowerCase().includes(q) ||
              c.description.toLowerCase().includes(q),
          )
        : [...allContracts];

      renderList();
    }

    function renderList(): void {
      // Remove old summary + table
      if (summaryEl) summaryEl.remove();
      if (tableEl) tableEl.remove();

      summaryEl = buildSummaryCards(filteredContracts);
      wrapper.appendChild(summaryEl);

      tableEl = buildTable(filteredContracts, wrapper, async (id) => {
        await svc.deleteSubcontract(id);
        await loadData();
      });
      wrapper.appendChild(tableEl);
    }

    // Filter bar
    const filterBar = buildFilterBar((status, search) => {
      currentStatus = status;
      currentSearch = search;
      void loadData();
    });
    wrapper.appendChild(filterBar);

    // Initial load
    await loadData();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load subcontracts';
    showMsg(wrapper, message, true);
  }
})();

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};
