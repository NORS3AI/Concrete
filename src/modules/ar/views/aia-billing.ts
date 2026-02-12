/**
 * AIA G702/G703 Progress Billing view.
 * Application and Certificate for Payment form following AIA standard format.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  paid: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIARow {
  id: string;
  jobNumber: string;
  jobName: string;
  applicationNumber: number;
  periodTo: string;
  contractSum: number;
  changeOrderTotal: number;
  revisedContractSum: number;
  completedPreviousPeriod: number;
  completedThisPeriod: number;
  materialStored: number;
  totalCompleted: number;
  percentComplete: number;
  retainagePct: number;
  retainageAmount: number;
  currentPaymentDue: number;
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

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search by job...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => onFilter(statusSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// G702 Summary Card
// ---------------------------------------------------------------------------

function buildG702Summary(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'AIA G702 - Application and Certificate for Payment'));

  const grid = el('div', 'grid grid-cols-3 gap-4 text-sm');

  const buildItem = (label: string, value: string): HTMLElement => {
    const group = el('div');
    group.appendChild(el('div', 'text-[var(--text-muted)]', label));
    group.appendChild(el('div', 'font-mono font-medium text-[var(--text)]', value));
    return group;
  };

  grid.appendChild(buildItem('1. Original Contract Sum', fmtCurrency(0)));
  grid.appendChild(buildItem('2. Net Change by Change Orders', fmtCurrency(0)));
  grid.appendChild(buildItem('3. Contract Sum To Date', fmtCurrency(0)));
  grid.appendChild(buildItem('4. Total Completed & Stored', fmtCurrency(0)));
  grid.appendChild(buildItem('5. Retainage', fmtCurrency(0)));
  grid.appendChild(buildItem('6. Total Earned Less Retainage', fmtCurrency(0)));
  grid.appendChild(buildItem('7. Less Previous Certificates', fmtCurrency(0)));
  grid.appendChild(buildItem('8. Current Payment Due', fmtCurrency(0)));
  grid.appendChild(buildItem('9. Balance To Finish', fmtCurrency(0)));

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Applications Table
// ---------------------------------------------------------------------------

function buildTable(rows: AIARow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['App #', 'Job', 'Period To', 'Contract Sum', 'Change Orders', 'Prev. Complete', 'This Period', 'Materials', 'Total Complete', '% Complete', 'Retainage', 'Status', 'Actions']) {
    const align = ['Contract Sum', 'Change Orders', 'Prev. Complete', 'This Period', 'Materials', 'Total Complete', '% Complete', 'Retainage'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No AIA applications found. Create a new progress billing application to get started.');
    td.setAttribute('colspan', '13');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--accent)]', `#${row.applicationNumber}`));

    const tdJob = el('td', 'py-2 px-3');
    tdJob.appendChild(el('div', 'font-mono text-[var(--text)]', row.jobNumber));
    tdJob.appendChild(el('div', 'text-xs text-[var(--text-muted)]', row.jobName));
    tr.appendChild(tdJob);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.periodTo));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.contractSum)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.changeOrderTotal)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.completedPreviousPeriod)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.completedThisPeriod)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.materialStored)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(row.totalCompleted)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtPct(row.percentComplete)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', fmtCurrency(row.retainageAmount)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
      row.status.charAt(0).toUpperCase() + row.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    const submitBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Submit');
    submitBtn.type = 'button';
    tdActions.appendChild(submitBtn);
    const approveBtn = el('button', 'text-emerald-400 hover:underline text-sm mr-2', 'Approve');
    approveBtn.type = 'button';
    tdActions.appendChild(approveBtn);
    const pdfBtn = el('button', 'text-[var(--text-muted)] hover:underline text-sm', 'PDF');
    pdfBtn.type = 'button';
    tdActions.appendChild(pdfBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'AIA G702/G703 Progress Billing'));
    const btnGroup = el('div', 'flex items-center gap-2');
    const newAppBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Application');
    newAppBtn.type = 'button';
    newAppBtn.addEventListener('click', () => { /* new application placeholder */ });
    btnGroup.appendChild(newAppBtn);
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export PDF');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    btnGroup.appendChild(exportBtn);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildG702Summary());
    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const rows: AIARow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
