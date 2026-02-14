/**
 * Employee List view.
 * Filterable, actionable table of HR employees with headcount summary,
 * status-based lifecycle actions, and client-side search / filter.
 * Wired to HRService for live data.
 */

import { getHRService } from '../service-accessor';
import type { EmployeeStatus, EmployeeType } from '../hr-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function el(
  tag: string,
  attrs?: Record<string, string>,
  ...children: (string | HTMLElement)[]
): HTMLElement {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') {
        node.className = v;
      } else {
        node.setAttribute(k, v);
      }
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

function showMsg(
  container: HTMLElement,
  msg: string,
  type: 'success' | 'error' = 'success',
): void {
  const existing = container.querySelector('[data-toast]');
  if (existing) existing.remove();
  const cls =
    type === 'error'
      ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
      : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const toast = el('div', { className: cls, 'data-toast': '1' }, msg);
  container.prepend(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'applicant', label: 'Applicant' },
  { value: 'recruited', label: 'Recruited' },
  { value: 'hired', label: 'Hired' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'rehired', label: 'Rehired' },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'temp', label: 'Temp' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  on_leave: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  terminated: 'bg-red-500/10 text-red-400 border border-red-500/20',
  onboarding: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  hired: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  rehired: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  applicant: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  recruited: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const COLUMNS = [
  'Employee ID',
  'Name',
  'Email',
  'Phone',
  'Type',
  'Department',
  'Hire Date',
  'Status',
  'Actions',
];

// ---------------------------------------------------------------------------
// Summary Stats Bar
// ---------------------------------------------------------------------------

function buildSummaryStats(stats: {
  total: number;
  active: number;
  onLeave: number;
  terminated: number;
  openPositions: number;
}): HTMLElement {
  const items: { label: string; value: number; color: string }[] = [
    { label: 'Total', value: stats.total, color: 'text-[var(--text)]' },
    { label: 'Active', value: stats.active, color: 'text-emerald-400' },
    { label: 'On Leave', value: stats.onLeave, color: 'text-amber-400' },
    { label: 'Terminated', value: stats.terminated, color: 'text-red-400' },
    { label: 'Open Positions', value: stats.openPositions, color: 'text-blue-400' },
  ];

  const bar = el('div', {
    className:
      'grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6',
  });

  for (const item of items) {
    const card = el(
      'div',
      {
        className:
          'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 text-center',
      },
      el('div', { className: `text-2xl font-bold ${item.color}` }, String(item.value)),
      el('div', { className: 'text-xs text-[var(--text-muted)] mt-1' }, item.label),
    );
    bar.appendChild(card);
  }

  return bar;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (search: string, status: string, type: string) => void,
): HTMLElement {
  const bar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });
  const inputCls =
    'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', {
    className: inputCls,
    type: 'text',
    placeholder: 'Search employees...',
  }) as HTMLInputElement;
  bar.appendChild(searchInput);

  const statusSelect = el('select', { className: inputCls }) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const typeSelect = el('select', { className: inputCls }) as HTMLSelectElement;
  for (const opt of TYPE_OPTIONS) {
    const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fire = () =>
    onFilter(searchInput.value, statusSelect.value, typeSelect.value);
  searchInput.addEventListener('input', fire);
  statusSelect.addEventListener('change', fire);
  typeSelect.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildTable(
  employees: Array<{
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    type: EmployeeType;
    departmentId: string;
    hireDate: string;
    status: EmployeeStatus;
  }>,
  onAction: (
    empId: string,
    action: 'onboard' | 'activate' | 'terminate' | 'rehire',
  ) => void,
): HTMLElement {
  const wrap = el('div', {
    className:
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto',
  });
  const table = el('table', { className: 'w-full text-sm' });

  // Header
  const thead = el('thead');
  const headRow = el('tr', {
    className: 'text-left text-[var(--text-muted)] border-b border-[var(--border)]',
  });
  for (const col of COLUMNS) {
    headRow.appendChild(
      el('th', { className: 'py-2 px-3 font-medium whitespace-nowrap' }, col),
    );
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body
  const tbody = el('tbody');

  if (employees.length === 0) {
    const tr = el('tr');
    const td = el(
      'td',
      {
        className: 'py-8 px-3 text-center text-[var(--text-muted)]',
        colspan: String(COLUMNS.length),
      },
      'No employees found.',
    );
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const emp of employees) {
    const tr = el('tr', {
      className:
        'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
    });

    // Employee ID
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)] font-mono text-xs' }, emp.employeeId),
    );

    // Name (link)
    const tdName = el('td', { className: 'py-2 px-3 font-medium text-[var(--text)]' });
    const link = el(
      'a',
      { className: 'text-[var(--accent)] hover:underline', href: `#/hr/employees/${emp.id}` },
      `${emp.firstName} ${emp.lastName}`,
    );
    tdName.appendChild(link);
    tr.appendChild(tdName);

    // Email
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, emp.email || '--'),
    );

    // Phone
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, emp.phone || '--'),
    );

    // Type
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, formatType(emp.type)),
    );

    // Department
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, emp.departmentId || '--'),
    );

    // Hire Date
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, emp.hireDate || '--'),
    );

    // Status badge
    const tdStatus = el('td', { className: 'py-2 px-3' });
    const badgeCls =
      STATUS_BADGE[emp.status] ?? STATUS_BADGE.active;
    tdStatus.appendChild(
      el(
        'span',
        { className: `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}` },
        formatStatus(emp.status),
      ),
    );
    tr.appendChild(tdStatus);

    // Actions
    const tdActions = el('td', { className: 'py-2 px-3' });
    const actionBtnCls =
      'px-2 py-1 rounded text-xs font-medium mr-1 cursor-pointer';

    if (emp.status === 'hired' || emp.status === 'rehired') {
      const btn = el(
        'button',
        {
          className: `${actionBtnCls} bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20`,
        },
        'Onboard',
      );
      btn.addEventListener('click', () => onAction(emp.id, 'onboard'));
      tdActions.appendChild(btn);
    }

    if (emp.status === 'onboarding') {
      const btn = el(
        'button',
        {
          className: `${actionBtnCls} bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20`,
        },
        'Activate',
      );
      btn.addEventListener('click', () => onAction(emp.id, 'activate'));
      tdActions.appendChild(btn);
    }

    if (emp.status === 'active') {
      const btn = el(
        'button',
        {
          className: `${actionBtnCls} bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20`,
        },
        'Terminate',
      );
      btn.addEventListener('click', () => onAction(emp.id, 'terminate'));
      tdActions.appendChild(btn);
    }

    if (emp.status === 'terminated') {
      const btn = el(
        'button',
        {
          className: `${actionBtnCls} bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20`,
        },
        'Rehire',
      );
      btn.addEventListener('click', () => onAction(emp.id, 'rehire'));
      tdActions.appendChild(btn);
    }

    // Edit link for all statuses
    const editLink = el(
      'a',
      {
        className: `${actionBtnCls} text-[var(--accent)] hover:underline`,
        href: `#/hr/employees/${emp.id}`,
      },
      'Edit',
    );
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
    const wrapper = el('div', { className: 'space-y-0' });

    // Header row
    const headerRow = el('div', { className: 'flex items-center justify-between mb-4' });
    headerRow.appendChild(
      el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Employees'),
    );
    const newBtn = el(
      'a',
      {
        className:
          'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
        href: '#/hr/employees/new',
      },
      'New Employee',
    );
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Summary stats placeholder
    const summaryContainer = el('div', { className: '' });
    wrapper.appendChild(summaryContainer);

    // Table container
    const tableContainer = el('div', { className: '' });

    // Filter state
    let currentSearch = '';
    let currentStatus = '';
    let currentType = '';

    // Load data
    async function loadData(): Promise<void> {
      try {
        const svc = getHRService();

        // Show loading state
        tableContainer.innerHTML = '';
        tableContainer.appendChild(
          el(
            'div',
            { className: 'py-12 text-center text-[var(--text-muted)]' },
            'Loading employees...',
          ),
        );

        // Load employees and summary in parallel
        const filters: { status?: EmployeeStatus; type?: EmployeeType; search?: string } = {};
        if (currentStatus) filters.status = currentStatus as EmployeeStatus;
        if (currentType) filters.type = currentType as EmployeeType;
        if (currentSearch) filters.search = currentSearch;

        const [employees, summary] = await Promise.all([
          svc.listEmployees(filters),
          svc.getHeadcountSummary(),
        ]);

        // Render summary stats
        summaryContainer.innerHTML = '';
        summaryContainer.appendChild(
          buildSummaryStats({
            total: summary.total,
            active: summary.active,
            onLeave: summary.onLeave,
            terminated: summary.terminated,
            openPositions: summary.openPositions,
          }),
        );

        // Map employees for table
        const rows = employees.map((emp) => ({
          id: (emp as any).id as string,
          employeeId: emp.employeeId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email ?? '',
          phone: emp.phone ?? '',
          type: emp.type,
          departmentId: emp.departmentId ?? '',
          hireDate: emp.hireDate ?? '',
          status: emp.status,
        }));

        // Render table
        tableContainer.innerHTML = '';
        tableContainer.appendChild(
          buildTable(rows, (empId, action) => {
            void handleAction(empId, action);
          }),
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load employees';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, 'error');
      }
    }

    // Handle lifecycle actions
    async function handleAction(
      empId: string,
      action: 'onboard' | 'activate' | 'terminate' | 'rehire',
    ): Promise<void> {
      try {
        const svc = getHRService();

        switch (action) {
          case 'onboard':
            await svc.onboardEmployee(empId);
            showMsg(wrapper, 'Employee moved to onboarding.', 'success');
            break;
          case 'activate':
            await svc.activateEmployee(empId);
            showMsg(wrapper, 'Employee activated.', 'success');
            break;
          case 'terminate':
            if (!confirm('Are you sure you want to terminate this employee?')) return;
            await svc.terminateEmployee(empId);
            showMsg(wrapper, 'Employee terminated.', 'success');
            break;
          case 'rehire':
            await svc.rehireEmployee(empId);
            showMsg(wrapper, 'Employee rehired.', 'success');
            break;
        }

        // Reload data after action
        await loadData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : `Failed to ${action} employee`;
        showMsg(wrapper, message, 'error');
      }
    }

    // Filter bar
    wrapper.appendChild(
      buildFilterBar((search, status, type) => {
        currentSearch = search;
        currentStatus = status;
        currentType = type;
        void loadData();
      }),
    );

    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // Initial load
    void loadData();
  },
};
