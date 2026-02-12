/**
 * Employee List view.
 * Filterable table of employees with status and department dropdowns.
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
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
];

const PAY_TYPE_OPTIONS = [
  { value: '', label: 'All Pay Types' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'salary', label: 'Salary' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  terminated: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmployeeRow {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  department: string;
  jobTitle: string;
  payType: string;
  payRate: number;
  payFrequency: string;
  hireDate: string;
  phone: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, payType: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search employees...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const payTypeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of PAY_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    payTypeSelect.appendChild(o);
  }
  bar.appendChild(payTypeSelect);

  const fire = () => onFilter(statusSelect.value, payTypeSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  payTypeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(employees: EmployeeRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Status', 'Department', 'Job Title', 'Pay Type', 'Pay Rate', 'Frequency', 'Hire Date', 'Phone', 'Actions']) {
    const align = col === 'Pay Rate' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (employees.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No employees found. Create your first employee to get started.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const emp of employees) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3 font-medium text-[var(--text)]');
    const link = el('a', 'text-[var(--accent)] hover:underline', `${emp.lastName}, ${emp.firstName}`) as HTMLAnchorElement;
    link.href = `#/payroll/employees/${emp.id}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[emp.status] ?? STATUS_BADGE.active}`,
      emp.status.charAt(0).toUpperCase() + emp.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', emp.department));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', emp.jobTitle));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', emp.payType.charAt(0).toUpperCase() + emp.payType.slice(1)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(emp.payRate)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', emp.payFrequency.charAt(0).toUpperCase() + emp.payFrequency.slice(1)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', emp.hireDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', emp.phone));

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/payroll/employees/${emp.id}`;
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Employees'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/payroll/employees/new';
    newBtn.textContent = 'New Employee';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _payType, _search) => { /* filter placeholder */ }));

    const employees: EmployeeRow[] = [];
    wrapper.appendChild(buildTable(employees));

    container.appendChild(wrapper);
  },
};
