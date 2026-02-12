/**
 * Preventive Maintenance Schedules view.
 * Table of PM schedules with equipment, frequency, next due, assigned tech,
 * and generate WO button.
 */

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

const FREQUENCY_OPTIONS = [
  { value: '', label: 'All Frequencies' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  paused: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PMRow {
  id: string;
  name: string;
  equipmentName: string;
  frequency: string;
  lastPerformed: string;
  nextDue: string;
  assignedTo: string;
  status: string;
  estimatedDuration: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, frequency: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search PM schedules...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const freqSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of FREQUENCY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    freqSelect.appendChild(o);
  }
  bar.appendChild(freqSelect);

  const fire = () => onFilter(statusSelect.value, freqSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  freqSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(schedules: PMRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Equipment', 'Frequency', 'Last Performed', 'Next Due', 'Duration', 'Assigned', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (schedules.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No PM schedules found. Create a preventive maintenance schedule to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const pm of schedules) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', pm.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', pm.equipmentName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pm.frequency));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pm.lastPerformed));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pm.nextDue));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pm.estimatedDuration ? `${pm.estimatedDuration}h` : '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pm.assignedTo));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[pm.status] ?? STATUS_BADGE.active}`,
      pm.status.charAt(0).toUpperCase() + pm.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    const genBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Generate WO');
    genBtn.type = 'button';
    genBtn.addEventListener('click', () => { /* generate WO placeholder */ });
    tdActions.appendChild(genBtn);
    const completeBtn = el('button', 'text-emerald-400 hover:underline text-sm', 'Complete');
    completeBtn.type = 'button';
    completeBtn.addEventListener('click', () => { /* mark completed placeholder */ });
    tdActions.appendChild(completeBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Preventive Maintenance Schedules'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New PM Schedule');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* new PM placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _freq, _search) => { /* filter placeholder */ }));

    const schedules: PMRow[] = [];
    wrapper.appendChild(buildTable(schedules));

    container.appendChild(wrapper);
  },
};
