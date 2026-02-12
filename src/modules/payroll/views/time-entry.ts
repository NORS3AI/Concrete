/**
 * Time Entry view.
 * Table of time entries with filters for employee, date range, and approval status.
 * Supports creating new entries and approving pending ones.
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

const PAY_TYPE_OPTIONS = [
  { value: '', label: 'All Pay Types' },
  { value: 'regular', label: 'Regular' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'doubletime', label: 'Double Time' },
  { value: 'premium', label: 'Premium' },
  { value: 'perdiem', label: 'Per Diem' },
];

const APPROVAL_OPTIONS = [
  { value: '', label: 'All Entries' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending Approval' },
];

const APPROVAL_BADGE: Record<string, string> = {
  true: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  false: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimeEntryRow {
  id: string;
  employeeId: string;
  employeeName: string;
  jobId: string;
  costCodeId: string;
  date: string;
  hours: number;
  payType: string;
  workClassification: string;
  description: string;
  approved: boolean;
  approvedBy: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (payType: string, approval: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search time entries...';
  bar.appendChild(searchInput);

  const payTypeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of PAY_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    payTypeSelect.appendChild(o);
  }
  bar.appendChild(payTypeSelect);

  const approvalSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of APPROVAL_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    approvalSelect.appendChild(o);
  }
  bar.appendChild(approvalSelect);

  const startDate = el('input', inputCls) as HTMLInputElement;
  startDate.type = 'date';
  startDate.title = 'Start date';
  bar.appendChild(startDate);

  const endDate = el('input', inputCls) as HTMLInputElement;
  endDate.type = 'date';
  endDate.title = 'End date';
  bar.appendChild(endDate);

  const fire = () => onFilter(payTypeSelect.value, approvalSelect.value, searchInput.value);
  payTypeSelect.addEventListener('change', fire);
  approvalSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);
  startDate.addEventListener('change', fire);
  endDate.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(entries: TimeEntryRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Employee', 'Date', 'Hours', 'Pay Type', 'Job', 'Cost Code', 'Classification', 'Approved', 'Actions']) {
    const align = col === 'Hours' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (entries.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No time entries found.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const entry of entries) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', entry.employeeName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', entry.date));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', entry.hours.toFixed(2)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', entry.payType.charAt(0).toUpperCase() + entry.payType.slice(1)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', entry.jobId || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', entry.costCodeId || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', entry.workClassification || '-'));

    const tdApproved = el('td', 'py-2 px-3');
    const approvedLabel = entry.approved ? 'Approved' : 'Pending';
    const badgeCls = APPROVAL_BADGE[String(entry.approved)];
    tdApproved.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`, approvedLabel));
    tr.appendChild(tdApproved);

    const tdActions = el('td', 'py-2 px-3');
    if (!entry.approved) {
      const approveBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Approve');
      approveBtn.addEventListener('click', () => { /* approve placeholder */ });
      tdActions.appendChild(approveBtn);
    }
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// New Time Entry Form
// ---------------------------------------------------------------------------

function buildNewEntryForm(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'New Time Entry'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const grid = el('div', 'grid grid-cols-4 gap-3');

  const empInput = el('input', inputCls) as HTMLInputElement;
  empInput.placeholder = 'Employee ID';
  empInput.name = 'employeeId';
  grid.appendChild(empInput);

  const dateInput = el('input', inputCls) as HTMLInputElement;
  dateInput.type = 'date';
  dateInput.name = 'date';
  grid.appendChild(dateInput);

  const hoursInput = el('input', inputCls) as HTMLInputElement;
  hoursInput.type = 'number';
  hoursInput.step = '0.25';
  hoursInput.placeholder = 'Hours';
  hoursInput.name = 'hours';
  grid.appendChild(hoursInput);

  const payTypeSelect = el('select', inputCls) as HTMLSelectElement;
  payTypeSelect.name = 'payType';
  for (const opt of PAY_TYPE_OPTIONS.slice(1)) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    payTypeSelect.appendChild(o);
  }
  grid.appendChild(payTypeSelect);

  const jobInput = el('input', inputCls) as HTMLInputElement;
  jobInput.placeholder = 'Job ID (optional)';
  jobInput.name = 'jobId';
  grid.appendChild(jobInput);

  const costCodeInput = el('input', inputCls) as HTMLInputElement;
  costCodeInput.placeholder = 'Cost Code (optional)';
  costCodeInput.name = 'costCodeId';
  grid.appendChild(costCodeInput);

  const classInput = el('input', inputCls) as HTMLInputElement;
  classInput.placeholder = 'Classification (optional)';
  classInput.name = 'workClassification';
  grid.appendChild(classInput);

  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Entry');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => { /* add entry placeholder */ });
  grid.appendChild(addBtn);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Time Entry'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildNewEntryForm());
    wrapper.appendChild(buildFilterBar((_payType, _approval, _search) => { /* filter placeholder */ }));

    const entries: TimeEntryRow[] = [];
    wrapper.appendChild(buildTable(entries));

    container.appendChild(wrapper);
  },
};
