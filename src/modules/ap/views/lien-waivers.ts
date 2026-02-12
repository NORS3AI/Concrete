/**
 * Lien Waiver Tracking view.
 * List and manage lien waivers by vendor, job, and status.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'received', label: 'Received' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'conditional_progress', label: 'Conditional Progress' },
  { value: 'unconditional_progress', label: 'Unconditional Progress' },
  { value: 'conditional_final', label: 'Conditional Final' },
  { value: 'unconditional_final', label: 'Unconditional Final' },
];

const STATUS_BADGE: Record<string, string> = {
  requested: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  received: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  expired: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const TYPE_LABELS: Record<string, string> = {
  conditional_progress: 'Cond. Progress',
  unconditional_progress: 'Uncond. Progress',
  conditional_final: 'Cond. Final',
  unconditional_final: 'Uncond. Final',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LienWaiverRow {
  id: string;
  vendorName: string;
  vendorCode: string;
  jobNumber: string;
  jobName: string;
  waiverType: string;
  throughDate: string;
  amount: number;
  status: string;
  requestedDate: string;
  receivedDate: string;
  paymentId: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, type: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search vendors or jobs...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fire = () => onFilter(statusSelect.value, typeSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  typeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-5 gap-3 mb-4');

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-3 text-center');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-lg font-bold ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Requested', '0', 'text-amber-400'));
  row.appendChild(buildCard('Received', '0', 'text-blue-400'));
  row.appendChild(buildCard('Approved', '0', 'text-emerald-400'));
  row.appendChild(buildCard('Rejected', '0', 'text-red-400'));
  row.appendChild(buildCard('Expired', '0', 'text-zinc-400'));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(waivers: LienWaiverRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Vendor', 'Job', 'Type', 'Through Date', 'Amount', 'Requested', 'Received', 'Status', 'Actions']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (waivers.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No lien waivers found. Request lien waivers from vendors to track them here.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const waiver of waivers) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdVendor = el('td', 'py-2 px-3');
    tdVendor.appendChild(el('div', 'text-[var(--text)]', waiver.vendorName));
    tdVendor.appendChild(el('div', 'text-xs text-[var(--text-muted)] font-mono', waiver.vendorCode));
    tr.appendChild(tdVendor);

    const tdJob = el('td', 'py-2 px-3');
    tdJob.appendChild(el('div', 'font-mono text-[var(--text)]', waiver.jobNumber));
    tdJob.appendChild(el('div', 'text-xs text-[var(--text-muted)]', waiver.jobName));
    tr.appendChild(tdJob);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', TYPE_LABELS[waiver.waiverType] ?? waiver.waiverType));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', waiver.throughDate));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(waiver.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', waiver.requestedDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', waiver.receivedDate || '--'));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[waiver.status] ?? STATUS_BADGE.requested}`,
      waiver.status.charAt(0).toUpperCase() + waiver.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    const markReceivedBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Received');
    markReceivedBtn.type = 'button';
    tdActions.appendChild(markReceivedBtn);
    const approveBtn = el('button', 'text-emerald-400 hover:underline text-sm mr-2', 'Approve');
    approveBtn.type = 'button';
    tdActions.appendChild(approveBtn);
    const rejectBtn = el('button', 'text-red-400 hover:underline text-sm', 'Reject');
    rejectBtn.type = 'button';
    tdActions.appendChild(rejectBtn);
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

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Lien Waivers'));
    const btnGroup = el('div', 'flex items-center gap-2');
    const requestBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Request Waiver');
    requestBtn.type = 'button';
    requestBtn.addEventListener('click', () => { /* request placeholder */ });
    btnGroup.appendChild(requestBtn);
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    btnGroup.appendChild(exportBtn);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());
    wrapper.appendChild(buildFilterBar((_status, _type, _search) => { /* filter placeholder */ }));

    const waivers: LienWaiverRow[] = [];
    wrapper.appendChild(buildTable(waivers));

    container.appendChild(wrapper);
  },
};
