/**
 * Job List view.
 * Filterable table of jobs with status and type dropdowns.
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
  { value: 'bidding', label: 'Bidding' },
  { value: 'awarded', label: 'Awarded' },
  { value: 'active', label: 'Active' },
  { value: 'complete', label: 'Complete' },
  { value: 'closed', label: 'Closed' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'lump_sum', label: 'Lump Sum' },
  { value: 'time_material', label: 'Time & Material' },
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'unit_price', label: 'Unit Price' },
  { value: 'design_build', label: 'Design-Build' },
  { value: 'gmp', label: 'GMP' },
];

const STATUS_BADGE: Record<string, string> = {
  bidding: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  awarded: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  complete: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  closed: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobRow {
  id: string;
  number: string;
  name: string;
  type: string;
  status: string;
  contractAmount: number;
  totalBudget: number;
  totalActualCost: number;
  percentComplete: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, type: string) => void,
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

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fire = () => onFilter(statusSelect.value, typeSelect.value);
  statusSelect.addEventListener('change', fire);
  typeSelect.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(jobs: JobRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Number', 'Name', 'Type', 'Status', 'Contract Amount', 'Budget', 'Actual Cost', '% Complete', 'Actions']) {
    const align = ['Contract Amount', 'Budget', 'Actual Cost', '% Complete'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (jobs.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No jobs found. Create your first job to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const job of jobs) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', job.number) as HTMLAnchorElement;
    link.href = `#/jobs/${job.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3', job.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', job.type));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[job.status] ?? STATUS_BADGE.active}`,
      job.status.charAt(0).toUpperCase() + job.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(job.contractAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(job.totalBudget)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(job.totalActualCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', `${job.percentComplete.toFixed(1)}%`));

    const tdActions = el('td', 'py-2 px-3');
    const costsLink = el('a', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Costs') as HTMLAnchorElement;
    costsLink.href = `#/jobs/${job.id}/costs`;
    tdActions.appendChild(costsLink);
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/jobs/${job.id}`;
    tdActions.appendChild(editLink);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Jobs'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/jobs/new';
    newBtn.textContent = 'New Job';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _type) => { /* filter placeholder */ }));

    const jobs: JobRow[] = [];
    wrapper.appendChild(buildTable(jobs));

    container.appendChild(wrapper);
  },
};
