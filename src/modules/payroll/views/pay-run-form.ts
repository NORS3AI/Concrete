/**
 * Pay Run create/edit form view.
 * Allows setting pay period and date, adding employee checks, and
 * advancing the pay run through its workflow (draft -> processing -> completed).
 * Wired to PayrollService for live data.
 */

import { getPayrollService } from '../service-accessor';

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

function getIdFromHash(pattern: RegExp): string | null {
  const match = window.location.hash.match(pattern);
  if (match && match[1] !== 'new') return match[1];
  return null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  processing: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  voided: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Form Builder
// ---------------------------------------------------------------------------

function buildField(label: string, inputEl: HTMLElement): HTMLElement {
  const group = el('div', '');
  group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', label));
  group.appendChild(inputEl);
  return group;
}

function dateInput(name: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'date';
  input.name = name;
  return input;
}

function textInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'text';
  input.name = name;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(data: {
  totalGross: number;
  totalTaxes: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
}): HTMLElement {
  const grid = el('div', 'grid grid-cols-5 gap-4 mb-6');

  const items = [
    { label: 'Total Gross', value: fmtCurrency(data.totalGross) },
    { label: 'Total Taxes', value: fmtCurrency(data.totalTaxes) },
    { label: 'Total Deductions', value: fmtCurrency(data.totalDeductions) },
    { label: 'Total Net', value: fmtCurrency(data.totalNet) },
    { label: 'Employees', value: String(data.employeeCount) },
  ];

  for (const item of items) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', item.label));
    card.appendChild(el('div', 'text-lg font-bold text-[var(--text)] font-mono', item.value));
    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Checks Table
// ---------------------------------------------------------------------------

interface CheckRow {
  employeeName: string;
  hours: number;
  overtimeHours: number;
  grossPay: number;
  federalTax: number;
  stateTax: number;
  ficaSS: number;
  ficaMed: number;
  totalDeductions: number;
  netPay: number;
}

function buildChecksTable(checks: CheckRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Employee', 'Hours', 'OT Hours', 'Gross', 'Fed Tax', 'State Tax', 'FICA SS', 'FICA Med', 'Deductions', 'Net']) {
    const align = col === 'Employee' ? 'py-2 px-3 font-medium' : 'py-2 px-3 font-medium text-right';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (checks.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No checks added yet. Use the form above to add employee checks.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const check of checks) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', check.employeeName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', check.hours.toFixed(2)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', check.overtimeHours.toFixed(2)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(check.grossPay)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(check.federalTax)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(check.stateTax)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(check.ficaSS)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(check.ficaMed)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(check.totalDeductions)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-bold', fmtCurrency(check.netPay)));
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

    const payRunId = getIdFromHash(/\/payroll\/pay-runs\/([^/?]+)/);
    const isEdit = payRunId !== null;

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isEdit ? 'Pay Run' : 'New Pay Run'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Pay Runs') as HTMLAnchorElement;
    backLink.href = '#/payroll/pay-runs';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Pay Run details form
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-6');

    const formGrid = el('div', 'grid grid-cols-3 gap-4 mb-4');
    const periodStartInput = dateInput('periodStart');
    const periodEndInput = dateInput('periodEnd');
    const payDateInput = dateInput('payDate');
    formGrid.appendChild(buildField('Period Start', periodStartInput));
    formGrid.appendChild(buildField('Period End', periodEndInput));
    formGrid.appendChild(buildField('Pay Date', payDateInput));
    card.appendChild(formGrid);

    // Status and workflow buttons
    const actionRow = el('div', 'flex items-center gap-3');

    const statusBadge = el('span', `px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE.draft}`, 'Draft');
    actionRow.appendChild(statusBadge);

    let currentPayRunId = payRunId;
    let currentStatus = 'draft';

    function updateStatusBadge(status: string): void {
      currentStatus = status;
      statusBadge.className = `px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[status] ?? STATUS_BADGE.draft}`;
      statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);

      // Enable/disable workflow buttons based on status
      saveBtn.style.display = (status === 'draft') ? '' : 'none';
      processBtn.style.display = (status === 'draft') ? '' : 'none';
      completeBtn.style.display = (status === 'processing') ? '' : 'none';
      voidBtn.style.display = (status === 'completed' || status === 'processing' || status === 'draft') ? '' : 'none';
      addCheckCard.style.display = (status === 'draft' || status === 'processing') ? '' : 'none';
    }

    const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getPayrollService();
          if (!currentPayRunId) {
            // Create new pay run
            if (!periodStartInput.value || !periodEndInput.value || !payDateInput.value) {
              showMsg(wrapper, 'All date fields are required.', true);
              return;
            }
            const created = await svc.createPayRun({
              periodStart: periodStartInput.value,
              periodEnd: periodEndInput.value,
              payDate: payDateInput.value,
            });
            currentPayRunId = created.id;
            showMsg(wrapper, 'Pay run created.', false);
            window.location.hash = `#/payroll/pay-runs/${created.id}`;
          } else {
            showMsg(wrapper, 'Pay run saved.', false);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to save pay run';
          showMsg(wrapper, message, true);
        }
      })();
    });
    actionRow.appendChild(saveBtn);

    const processBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-amber-600 text-white hover:opacity-90', 'Process');
    processBtn.type = 'button';
    processBtn.addEventListener('click', () => {
      if (!currentPayRunId) return;
      void (async () => {
        try {
          const svc = getPayrollService();
          const updated = await svc.processPayRun(currentPayRunId!);
          updateStatusBadge(updated.status);
          showMsg(wrapper, 'Pay run is now processing.', false);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to process pay run';
          showMsg(wrapper, message, true);
        }
      })();
    });
    actionRow.appendChild(processBtn);

    const completeBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Complete');
    completeBtn.type = 'button';
    completeBtn.style.display = 'none';
    completeBtn.addEventListener('click', () => {
      if (!currentPayRunId) return;
      void (async () => {
        try {
          const svc = getPayrollService();
          const updated = await svc.completePayRun(currentPayRunId!);
          updateStatusBadge(updated.status);
          showMsg(wrapper, 'Pay run completed.', false);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to complete pay run';
          showMsg(wrapper, message, true);
        }
      })();
    });
    actionRow.appendChild(completeBtn);

    const voidBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Void');
    voidBtn.type = 'button';
    voidBtn.addEventListener('click', () => {
      if (!currentPayRunId) return;
      if (!confirm('Are you sure you want to void this pay run?')) return;
      void (async () => {
        try {
          const svc = getPayrollService();
          const updated = await svc.voidPayRun(currentPayRunId!);
          updateStatusBadge(updated.status);
          showMsg(wrapper, 'Pay run voided.', false);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to void pay run';
          showMsg(wrapper, message, true);
        }
      })();
    });
    actionRow.appendChild(voidBtn);

    card.appendChild(actionRow);
    wrapper.appendChild(card);

    // Add check form
    const addCheckCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-6');
    addCheckCard.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Employee Check'));
    const addGrid = el('div', 'grid grid-cols-3 gap-3');
    const addEmployeeIdInput = textInput('addEmployeeId', 'Employee ID');
    addGrid.appendChild(buildField('Employee ID', addEmployeeIdInput));
    const addBtnWrap = el('div', 'flex items-end');
    const addCheckBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Calculate & Add');
    addCheckBtn.type = 'button';
    addCheckBtn.addEventListener('click', () => {
      if (!currentPayRunId) {
        showMsg(wrapper, 'Save the pay run first before adding checks.', true);
        return;
      }
      const employeeId = addEmployeeIdInput.value.trim();
      if (!employeeId) return;
      void (async () => {
        try {
          const svc = getPayrollService();
          await svc.addPayCheck(currentPayRunId!, employeeId);
          addEmployeeIdInput.value = '';
          showMsg(wrapper, 'Pay check added.', false);
          void loadPayRunData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add pay check';
          showMsg(wrapper, message, true);
        }
      })();
    });
    addBtnWrap.appendChild(addCheckBtn);
    addGrid.appendChild(addBtnWrap);
    addCheckCard.appendChild(addGrid);
    wrapper.appendChild(addCheckCard);

    // Summary cards container
    const summaryContainer = el('div', '');
    wrapper.appendChild(summaryContainer);

    // Checks table container
    wrapper.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Pay Checks'));
    const checksContainer = el('div', '');
    wrapper.appendChild(checksContainer);

    container.appendChild(wrapper);

    // Employee name cache
    const empNameCache = new Map<string, string>();

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

    async function loadPayRunData(): Promise<void> {
      if (!currentPayRunId) {
        summaryContainer.innerHTML = '';
        summaryContainer.appendChild(buildSummaryCards({
          totalGross: 0, totalTaxes: 0, totalDeductions: 0, totalNet: 0, employeeCount: 0,
        }));
        checksContainer.innerHTML = '';
        checksContainer.appendChild(buildChecksTable([]));
        return;
      }

      try {
        const svc = getPayrollService();
        const payRun = await svc.getPayRun(currentPayRunId);
        if (!payRun) {
          showMsg(wrapper, 'Pay run not found.', true);
          return;
        }

        // Update form fields
        periodStartInput.value = payRun.periodStart;
        periodEndInput.value = payRun.periodEnd;
        payDateInput.value = payRun.payDate;
        updateStatusBadge(payRun.status);

        // Summary cards
        summaryContainer.innerHTML = '';
        summaryContainer.appendChild(buildSummaryCards({
          totalGross: payRun.totalGross,
          totalTaxes: payRun.totalTaxes,
          totalDeductions: payRun.totalDeductions,
          totalNet: payRun.totalNet,
          employeeCount: payRun.employeeCount,
        }));

        // Load pay checks
        const payChecks = await svc.getPayChecksByRun(currentPayRunId);
        const checkRows: CheckRow[] = [];
        for (const pc of payChecks) {
          const empName = await resolveEmployeeName(pc.employeeId);
          checkRows.push({
            employeeName: empName,
            hours: pc.hours,
            overtimeHours: pc.overtimeHours,
            grossPay: pc.grossPay,
            federalTax: pc.federalTax,
            stateTax: pc.stateTax,
            ficaSS: pc.ficaSS,
            ficaMed: pc.ficaMed,
            totalDeductions: pc.totalDeductions,
            netPay: pc.netPay,
          });
        }

        checksContainer.innerHTML = '';
        checksContainer.appendChild(buildChecksTable(checkRows));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load pay run data';
        showMsg(wrapper, message, true);
      }
    }

    // Initial load
    void loadPayRunData();
  },
};
