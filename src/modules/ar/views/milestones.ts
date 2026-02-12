/**
 * Billing Milestones view.
 * Track and manage billing milestones for a billing schedule.
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
  { value: 'pending', label: 'Pending' },
  { value: 'reached', label: 'Reached' },
  { value: 'billed', label: 'Billed' },
  { value: 'paid', label: 'Paid' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  reached: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  billed: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MilestoneRow {
  id: string;
  scheduleId: string;
  scheduleName: string;
  jobNumber: string;
  description: string;
  amount: number;
  dueDate: string;
  percentOfContract: number;
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
  searchInput.placeholder = 'Search milestones...';
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
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold font-mono ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Total Milestones', '0'));
  row.appendChild(buildCard('Pending', fmtCurrency(0), 'text-zinc-400'));
  row.appendChild(buildCard('Reached (Unbilled)', fmtCurrency(0), 'text-blue-400'));
  row.appendChild(buildCard('Billed', fmtCurrency(0), 'text-emerald-400'));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(milestones: MilestoneRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Schedule', 'Job', 'Description', 'Due Date', '% of Contract', 'Amount', 'Status', 'Actions']) {
    const align = ['% of Contract', 'Amount'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (milestones.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No milestones found. Add milestones to a billing schedule to track billing progress.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const ms of milestones) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', ms.scheduleName));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', ms.jobNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', ms.description));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', ms.dueDate));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtPct(ms.percentOfContract)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(ms.amount)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[ms.status] ?? STATUS_BADGE.pending}`,
      ms.status.charAt(0).toUpperCase() + ms.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (ms.status === 'pending') {
      const reachBtn = el('button', 'text-blue-400 hover:underline text-sm mr-2', 'Mark Reached');
      reachBtn.type = 'button';
      reachBtn.addEventListener('click', () => { /* mark reached placeholder */ });
      tdActions.appendChild(reachBtn);
    }
    if (ms.status === 'reached') {
      const billBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Create Invoice');
      billBtn.type = 'button';
      billBtn.addEventListener('click', () => { /* create invoice placeholder */ });
      tdActions.appendChild(billBtn);
    }
    const editBtn = el('button', 'text-[var(--text-muted)] hover:underline text-sm', 'Edit');
    editBtn.type = 'button';
    tdActions.appendChild(editBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  // Totals row
  if (milestones.length > 0) {
    const totalsRow = el('tr', 'border-t-2 border-[var(--border)] bg-[var(--surface)] font-medium');
    totalsRow.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', 'Totals'));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtPct(100)));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono font-bold', fmtCurrency(0)));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    tbody.appendChild(totalsRow);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Billing Milestones'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Milestone');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* add milestone placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());
    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const milestones: MilestoneRow[] = [];
    wrapper.appendChild(buildTable(milestones));

    container.appendChild(wrapper);
  },
};
