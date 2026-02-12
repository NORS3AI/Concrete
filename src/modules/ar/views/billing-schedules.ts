/**
 * Billing Schedules view.
 * Manage billing schedules and their associated milestones per job.
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

const FREQUENCY_OPTIONS = [
  { value: '', label: 'All Frequencies' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'progress', label: 'Progress' },
];

const BILLING_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'progress', label: 'Progress' },
  { value: 'tm', label: 'T&M' },
  { value: 'unit_price', label: 'Unit Price' },
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'lump_sum', label: 'Lump Sum' },
];

const FREQUENCY_BADGE: Record<string, string> = {
  monthly: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  milestone: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  progress: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduleRow {
  id: string;
  jobNumber: string;
  jobName: string;
  customerName: string;
  name: string;
  frequency: string;
  billingType: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  billedAmount: number;
  remainingAmount: number;
  milestoneCount: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (frequency: string, billingType: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search schedules...';
  bar.appendChild(searchInput);

  const freqSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of FREQUENCY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    freqSelect.appendChild(o);
  }
  bar.appendChild(freqSelect);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of BILLING_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fire = () => onFilter(freqSelect.value, typeSelect.value, searchInput.value);
  freqSelect.addEventListener('change', fire);
  typeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(schedules: ScheduleRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Schedule Name', 'Job', 'Customer', 'Frequency', 'Type', 'Start', 'End', 'Total', 'Billed', 'Remaining', 'Milestones', 'Actions']) {
    const align = ['Total', 'Billed', 'Remaining'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : col === 'Milestones' ? 'py-2 px-3 font-medium text-center'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (schedules.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No billing schedules found. Create a billing schedule to organize your invoicing.');
    td.setAttribute('colspan', '12');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const sched of schedules) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', sched.name));

    const tdJob = el('td', 'py-2 px-3');
    tdJob.appendChild(el('div', 'font-mono text-[var(--text)]', sched.jobNumber));
    tdJob.appendChild(el('div', 'text-xs text-[var(--text-muted)]', sched.jobName));
    tr.appendChild(tdJob);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', sched.customerName));

    const tdFreq = el('td', 'py-2 px-3');
    const freqBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${FREQUENCY_BADGE[sched.frequency] ?? FREQUENCY_BADGE.monthly}`,
      sched.frequency.charAt(0).toUpperCase() + sched.frequency.slice(1));
    tdFreq.appendChild(freqBadge);
    tr.appendChild(tdFreq);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sched.billingType));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sched.startDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sched.endDate));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(sched.totalAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(sched.billedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(sched.remainingAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-center', String(sched.milestoneCount)));

    const tdActions = el('td', 'py-2 px-3');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit');
    editBtn.type = 'button';
    tdActions.appendChild(editBtn);
    const milestonesBtn = el('button', 'text-[var(--text-muted)] hover:underline text-sm', 'Milestones');
    milestonesBtn.type = 'button';
    tdActions.appendChild(milestonesBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Billing Schedules'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Schedule');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* new schedule placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_freq, _type, _search) => { /* filter placeholder */ }));

    const schedules: ScheduleRow[] = [];
    wrapper.appendChild(buildTable(schedules));

    container.appendChild(wrapper);
  },
};
