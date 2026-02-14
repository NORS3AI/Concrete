/**
 * Pay Stub view.
 * Displays a printable pay stub for a selected pay check, showing
 * employee info, earnings breakdown, tax withholdings, deductions,
 * and net pay.
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PayStubData {
  employeeName: string;
  employeeId: string;
  ssn: string;
  address: string;
  department: string;
  payPeriod: string;
  payDate: string;
  grossPay: number;
  federalTax: number;
  stateTax: number;
  localTax: number;
  ficaSS: number;
  ficaMed: number;
  totalDeductions: number;
  netPay: number;
  hours: number;
  overtimeHours: number;
  payRate: number;
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

function buildSelector(
  payRuns: { id: string; label: string }[],
  onPayRunChange: (payRunId: string) => void,
  onSelect: (payRunId: string, employeeId: string) => void,
): { selectorEl: HTMLElement; setEmployees: (employees: { id: string; name: string }[]) => void } {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-6');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  bar.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Pay Run:'));
  const payRunSelect = el('select', inputCls) as HTMLSelectElement;
  const defaultRunOpt = el('option', '', 'Select pay run') as HTMLOptionElement;
  defaultRunOpt.value = '';
  payRunSelect.appendChild(defaultRunOpt);

  for (const run of payRuns) {
    const opt = el('option', '', run.label) as HTMLOptionElement;
    opt.value = run.id;
    payRunSelect.appendChild(opt);
  }

  bar.appendChild(payRunSelect);

  bar.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Employee:'));
  const empSelect = el('select', inputCls) as HTMLSelectElement;
  const defaultEmpOpt = el('option', '', 'Select employee') as HTMLOptionElement;
  defaultEmpOpt.value = '';
  empSelect.appendChild(defaultEmpOpt);
  bar.appendChild(empSelect);

  payRunSelect.addEventListener('change', () => {
    onPayRunChange(payRunSelect.value);
  });

  const viewBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'View Stub');
  viewBtn.type = 'button';
  viewBtn.addEventListener('click', () => onSelect(payRunSelect.value, empSelect.value));
  bar.appendChild(viewBtn);

  const printBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Print');
  printBtn.type = 'button';
  printBtn.addEventListener('click', () => window.print());
  bar.appendChild(printBtn);

  function setEmployees(employees: { id: string; name: string }[]): void {
    // Clear existing options except the default
    while (empSelect.options.length > 1) {
      empSelect.remove(1);
    }
    for (const emp of employees) {
      const opt = el('option', '', emp.name) as HTMLOptionElement;
      opt.value = emp.id;
      empSelect.appendChild(opt);
    }
  }

  return { selectorEl: bar, setEmployees };
}

// ---------------------------------------------------------------------------
// Pay Stub Render
// ---------------------------------------------------------------------------

function buildStub(data: PayStubData | null): HTMLElement {
  if (!data) {
    return el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center text-[var(--text-muted)]', 'Select a pay run and employee to view the pay stub.');
  }

  const stub = el('div', 'bg-white text-black rounded-lg p-8 border border-gray-300 print:border-none print:shadow-none');

  // Header
  const header = el('div', 'flex justify-between items-start border-b border-gray-300 pb-4 mb-4');
  const companyInfo = el('div', '');
  companyInfo.appendChild(el('h2', 'text-xl font-bold', 'Concrete Financial'));
  companyInfo.appendChild(el('div', 'text-sm text-gray-500', 'Pay Stub'));
  header.appendChild(companyInfo);

  const periodInfo = el('div', 'text-right');
  periodInfo.appendChild(el('div', 'text-sm text-gray-500', `Pay Period: ${data.payPeriod}`));
  periodInfo.appendChild(el('div', 'text-sm text-gray-500', `Pay Date: ${data.payDate}`));
  header.appendChild(periodInfo);
  stub.appendChild(header);

  // Employee Info
  const empInfo = el('div', 'grid grid-cols-2 gap-4 mb-6');
  const empLeft = el('div', '');
  empLeft.appendChild(el('div', 'text-sm font-medium text-gray-700', 'Employee'));
  empLeft.appendChild(el('div', 'text-sm', data.employeeName));
  empLeft.appendChild(el('div', 'text-sm text-gray-500', `ID: ${data.employeeId}`));
  empLeft.appendChild(el('div', 'text-sm text-gray-500', `SSN: ***-**-${data.ssn.slice(-4)}`));
  empInfo.appendChild(empLeft);

  const empRight = el('div', '');
  empRight.appendChild(el('div', 'text-sm font-medium text-gray-700', 'Details'));
  empRight.appendChild(el('div', 'text-sm text-gray-500', `Department: ${data.department}`));
  empRight.appendChild(el('div', 'text-sm text-gray-500', `Address: ${data.address}`));
  empInfo.appendChild(empRight);
  stub.appendChild(empInfo);

  // Earnings
  const earningsSection = el('div', 'mb-6');
  earningsSection.appendChild(el('h3', 'text-sm font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1', 'Earnings'));
  const earningsTable = el('table', 'w-full text-sm');

  const earningsHead = el('tr', 'text-gray-500');
  earningsHead.appendChild(el('th', 'text-left py-1', 'Description'));
  earningsHead.appendChild(el('th', 'text-right py-1', 'Hours'));
  earningsHead.appendChild(el('th', 'text-right py-1', 'Rate'));
  earningsHead.appendChild(el('th', 'text-right py-1', 'Amount'));
  earningsTable.appendChild(earningsHead);

  if (data.hours > 0) {
    const regRow = el('tr');
    regRow.appendChild(el('td', 'py-1', 'Regular'));
    regRow.appendChild(el('td', 'py-1 text-right', data.hours.toFixed(2)));
    regRow.appendChild(el('td', 'py-1 text-right', fmtCurrency(data.payRate)));
    regRow.appendChild(el('td', 'py-1 text-right', fmtCurrency(data.hours * data.payRate)));
    earningsTable.appendChild(regRow);
  }

  if (data.overtimeHours > 0) {
    const otRow = el('tr');
    otRow.appendChild(el('td', 'py-1', 'Overtime'));
    otRow.appendChild(el('td', 'py-1 text-right', data.overtimeHours.toFixed(2)));
    otRow.appendChild(el('td', 'py-1 text-right', fmtCurrency(data.payRate * 1.5)));
    otRow.appendChild(el('td', 'py-1 text-right', fmtCurrency(data.overtimeHours * data.payRate * 1.5)));
    earningsTable.appendChild(otRow);
  }

  const grossRow = el('tr', 'font-bold border-t border-gray-200');
  grossRow.appendChild(el('td', 'py-1', 'Gross Pay'));
  grossRow.appendChild(el('td', 'py-1', ''));
  grossRow.appendChild(el('td', 'py-1', ''));
  grossRow.appendChild(el('td', 'py-1 text-right', fmtCurrency(data.grossPay)));
  earningsTable.appendChild(grossRow);

  earningsSection.appendChild(earningsTable);
  stub.appendChild(earningsSection);

  // Taxes
  const taxSection = el('div', 'mb-6');
  taxSection.appendChild(el('h3', 'text-sm font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1', 'Tax Withholdings'));
  const taxTable = el('table', 'w-full text-sm');

  const taxItems = [
    { label: 'Federal Income Tax', amount: data.federalTax },
    { label: 'State Income Tax', amount: data.stateTax },
    { label: 'Local Tax', amount: data.localTax },
    { label: 'Social Security (FICA)', amount: data.ficaSS },
    { label: 'Medicare (FICA)', amount: data.ficaMed },
  ];

  let totalTax = 0;
  for (const item of taxItems) {
    if (item.amount > 0) {
      const row = el('tr');
      row.appendChild(el('td', 'py-1', item.label));
      row.appendChild(el('td', 'py-1 text-right', fmtCurrency(item.amount)));
      taxTable.appendChild(row);
      totalTax += item.amount;
    }
  }

  const totalTaxRow = el('tr', 'font-bold border-t border-gray-200');
  totalTaxRow.appendChild(el('td', 'py-1', 'Total Taxes'));
  totalTaxRow.appendChild(el('td', 'py-1 text-right', fmtCurrency(totalTax)));
  taxTable.appendChild(totalTaxRow);

  taxSection.appendChild(taxTable);
  stub.appendChild(taxSection);

  // Deductions
  if (data.totalDeductions > 0) {
    const dedSection = el('div', 'mb-6');
    dedSection.appendChild(el('h3', 'text-sm font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1', 'Deductions'));
    const dedTable = el('table', 'w-full text-sm');
    const dedRow = el('tr', 'font-bold');
    dedRow.appendChild(el('td', 'py-1', 'Total Deductions'));
    dedRow.appendChild(el('td', 'py-1 text-right', fmtCurrency(data.totalDeductions)));
    dedTable.appendChild(dedRow);
    dedSection.appendChild(dedTable);
    stub.appendChild(dedSection);
  }

  // Net Pay
  const netSection = el('div', 'border-t-2 border-gray-800 pt-3');
  const netTable = el('table', 'w-full text-lg font-bold');
  const netRow = el('tr');
  netRow.appendChild(el('td', 'py-1', 'NET PAY'));
  netRow.appendChild(el('td', 'py-1 text-right', fmtCurrency(data.netPay)));
  netTable.appendChild(netRow);
  netSection.appendChild(netTable);
  stub.appendChild(netSection);

  return stub;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Pay Stub'));
    wrapper.appendChild(headerRow);

    const stubContainer = el('div', '');
    stubContainer.appendChild(buildStub(null));

    // Load pay runs for the dropdown, then build the selector
    void (async () => {
      try {
        const svc = getPayrollService();
        const payRuns = await svc.getPayRuns();

        const payRunOptions = payRuns.map((r) => ({
          id: r.id,
          label: `${r.periodStart} - ${r.periodEnd} (${r.status})`,
        }));

        const { selectorEl, setEmployees } = buildSelector(
          payRunOptions,
          (payRunId) => {
            // When pay run changes, load employees that have checks in this run
            if (!payRunId) {
              setEmployees([]);
              return;
            }
            void (async () => {
              try {
                const svcInner = getPayrollService();
                const checks = await svcInner.getPayChecksByRun(payRunId);
                const empMap = new Map<string, string>();
                for (const check of checks) {
                  if (!empMap.has(check.employeeId)) {
                    const emp = await svcInner.getEmployee(check.employeeId);
                    empMap.set(
                      check.employeeId,
                      emp ? `${emp.lastName}, ${emp.firstName}` : check.employeeId,
                    );
                  }
                }
                const employees = Array.from(empMap.entries()).map(([id, name]) => ({ id, name }));
                employees.sort((a, b) => a.name.localeCompare(b.name));
                setEmployees(employees);
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to load employees for pay run';
                showMsg(wrapper, message, true);
              }
            })();
          },
          (payRunId, employeeId) => {
            if (!payRunId || !employeeId) {
              showMsg(wrapper, 'Please select both a pay run and an employee.', true);
              return;
            }

            void (async () => {
              try {
                const svcInner = getPayrollService();
                const payRun = await svcInner.getPayRun(payRunId);
                if (!payRun) {
                  showMsg(wrapper, 'Pay run not found.', true);
                  return;
                }

                const checks = await svcInner.getPayChecksByRun(payRunId);
                const check = checks.find((c) => c.employeeId === employeeId);
                if (!check) {
                  showMsg(wrapper, 'No pay check found for this employee in this pay run.', true);
                  return;
                }

                const emp = await svcInner.getEmployee(employeeId);
                if (!emp) {
                  showMsg(wrapper, 'Employee not found.', true);
                  return;
                }

                const stubData: PayStubData = {
                  employeeName: `${emp.firstName} ${emp.lastName}`,
                  employeeId: emp.id,
                  ssn: emp.ssn,
                  address: [emp.address, emp.city, emp.state, emp.zip].filter(Boolean).join(', '),
                  department: emp.department ?? '',
                  payPeriod: `${payRun.periodStart} - ${payRun.periodEnd}`,
                  payDate: payRun.payDate,
                  grossPay: check.grossPay,
                  federalTax: check.federalTax,
                  stateTax: check.stateTax,
                  localTax: check.localTax,
                  ficaSS: check.ficaSS,
                  ficaMed: check.ficaMed,
                  totalDeductions: check.totalDeductions,
                  netPay: check.netPay,
                  hours: check.hours,
                  overtimeHours: check.overtimeHours,
                  payRate: emp.payRate,
                };

                stubContainer.innerHTML = '';
                stubContainer.appendChild(buildStub(stubData));
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to load pay stub';
                showMsg(wrapper, message, true);
              }
            })();
          },
        );

        // Insert selector before stub container
        wrapper.insertBefore(selectorEl, stubContainer);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load pay runs';
        showMsg(wrapper, message, true);
      }
    })();

    wrapper.appendChild(stubContainer);
    container.appendChild(wrapper);
  },
};
