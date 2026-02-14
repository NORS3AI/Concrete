/**
 * Time Entry view.
 * Table of time entries with filters for employee, date range, and approval status.
 * Supports creating new entries and approving pending ones.
 * Wired to PayrollService for live data.
 */

import { getPayrollService } from '../service-accessor';
import type { TimeEntryPayType } from '../payroll-service';

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
  onFilter: (payType: string, approval: string, search: string, startDate: string, endDate: string) => void,
): { bar: HTMLElement; getStartDate: () => string; getEndDate: () => string } {
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

  const fire = () => onFilter(payTypeSelect.value, approvalSelect.value, searchInput.value, startDate.value, endDate.value);
  payTypeSelect.addEventListener('change', fire);
  approvalSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);
  startDate.addEventListener('change', fire);
  endDate.addEventListener('change', fire);

  return { bar, getStartDate: () => startDate.value, getEndDate: () => endDate.value };
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(entries: TimeEntryRow[], onApprove: (id: string) => void): HTMLElement {
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
      approveBtn.addEventListener('click', () => onApprove(entry.id));
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

function buildNewEntryForm(
  onAdd: (data: {
    employeeId: string;
    date: string;
    hours: number;
    payType: TimeEntryPayType;
    jobId?: string;
    costCodeId?: string;
    workClassification?: string;
  }) => void,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'New Time Entry'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const grid = el('div', 'grid grid-cols-4 gap-3');

  const empInput = el('input', inputCls) as HTMLInputElement;
  empInput.placeholder = 'Employee ID';
  empInput.name = 'employeeId';
  grid.appendChild(empInput);

  const dateInputEl = el('input', inputCls) as HTMLInputElement;
  dateInputEl.type = 'date';
  dateInputEl.name = 'date';
  grid.appendChild(dateInputEl);

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
  addBtn.addEventListener('click', () => {
    const employeeId = empInput.value.trim();
    const date = dateInputEl.value;
    const hours = parseFloat(hoursInput.value) || 0;
    const payType = payTypeSelect.value as TimeEntryPayType;

    if (!employeeId || !date || hours <= 0) return;

    onAdd({
      employeeId,
      date,
      hours,
      payType,
      jobId: jobInput.value.trim() || undefined,
      costCodeId: costCodeInput.value.trim() || undefined,
      workClassification: classInput.value.trim() || undefined,
    });

    // Clear form
    empInput.value = '';
    dateInputEl.value = '';
    hoursInput.value = '';
    jobInput.value = '';
    costCodeInput.value = '';
    classInput.value = '';
  });
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

    const tableContainer = el('div', '');

    // Employee name cache
    const empNameCache = new Map<string, string>();

    // Current filter state
    let currentPayType = '';
    let currentApproval = '';
    let currentSearch = '';
    let currentStartDate = '';
    let currentEndDate = '';

    async function resolveEmployeeName(empId: string): Promise<string> {
      if (empNameCache.has(empId)) return empNameCache.get(empId)!;
      try {
        const svc = getPayrollService();
        const emp = await svc.getEmployee(empId);
        const name = emp ? `${emp.lastName}, ${emp.firstName}` : empId;
        empNameCache.set(empId, name);
        return name;
      } catch {
        return empId;
      }
    }

    async function loadEntries(): Promise<void> {
      try {
        const svc = getPayrollService();

        let entries;
        if (currentStartDate && currentEndDate) {
          entries = await svc.getTimeEntriesByDateRange(currentStartDate, currentEndDate);
        } else {
          // Load all time entries (fetch all employees and their entries)
          const employees = await svc.getEmployees();
          const allEntries = [];
          for (const emp of employees) {
            const empEntries = await svc.getTimeEntriesByEmployee(emp.id);
            allEntries.push(...empEntries);
          }
          entries = allEntries;
        }

        // Apply filters
        if (currentPayType) {
          entries = entries.filter((e) => e.payType === currentPayType);
        }
        if (currentApproval === 'approved') {
          entries = entries.filter((e) => e.approved);
        } else if (currentApproval === 'pending') {
          entries = entries.filter((e) => !e.approved);
        }
        if (currentSearch) {
          const term = currentSearch.toLowerCase();
          entries = entries.filter((e) => {
            const empName = empNameCache.get(e.employeeId)?.toLowerCase() ?? '';
            return empName.includes(term) || e.employeeId.toLowerCase().includes(term)
              || (e.description ?? '').toLowerCase().includes(term)
              || (e.jobId ?? '').toLowerCase().includes(term);
          });
        }

        // Sort by date descending
        entries.sort((a, b) => b.date.localeCompare(a.date));

        // Resolve employee names
        const rows: TimeEntryRow[] = [];
        for (const entry of entries) {
          const empName = await resolveEmployeeName(entry.employeeId);
          rows.push({
            id: entry.id,
            employeeId: entry.employeeId,
            employeeName: empName,
            jobId: entry.jobId ?? '',
            costCodeId: entry.costCodeId ?? '',
            date: entry.date,
            hours: entry.hours,
            payType: entry.payType,
            workClassification: entry.workClassification ?? '',
            description: entry.description ?? '',
            approved: entry.approved,
            approvedBy: entry.approvedBy ?? '',
          });
        }

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(rows, (id) => {
          void (async () => {
            try {
              const svcInner = getPayrollService();
              await svcInner.approveTimeEntry(id, 'admin');
              showMsg(wrapper, 'Time entry approved.', false);
              void loadEntries();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to approve entry';
              showMsg(wrapper, message, true);
            }
          })();
        }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load time entries';
        showMsg(wrapper, message, true);
      }
    }

    wrapper.appendChild(buildNewEntryForm((data) => {
      void (async () => {
        try {
          const svc = getPayrollService();
          await svc.createTimeEntry(data);
          showMsg(wrapper, 'Time entry created.', false);
          void loadEntries();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create time entry';
          showMsg(wrapper, message, true);
        }
      })();
    }));

    const { bar } = buildFilterBar((payType, approval, search, startDate, endDate) => {
      currentPayType = payType;
      currentApproval = approval;
      currentSearch = search;
      currentStartDate = startDate;
      currentEndDate = endDate;
      void loadEntries();
    });
    wrapper.appendChild(bar);

    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // Initial load
    void loadEntries();
  },
};
