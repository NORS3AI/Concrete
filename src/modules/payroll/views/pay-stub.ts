/**
 * Pay Stub view.
 * Displays a printable pay stub for a selected pay check, showing
 * employee info, earnings breakdown, tax withholdings, deductions,
 * and net pay.
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
  onSelect: (payRunId: string, employeeId: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-6');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  bar.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Pay Run:'));
  const payRunSelect = el('select', inputCls) as HTMLSelectElement;
  const defaultRunOpt = el('option', '', 'Select pay run') as HTMLOptionElement;
  defaultRunOpt.value = '';
  payRunSelect.appendChild(defaultRunOpt);
  bar.appendChild(payRunSelect);

  bar.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Employee:'));
  const empSelect = el('select', inputCls) as HTMLSelectElement;
  const defaultEmpOpt = el('option', '', 'Select employee') as HTMLOptionElement;
  defaultEmpOpt.value = '';
  empSelect.appendChild(defaultEmpOpt);
  bar.appendChild(empSelect);

  const viewBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'View Stub');
  viewBtn.type = 'button';
  viewBtn.addEventListener('click', () => onSelect(payRunSelect.value, empSelect.value));
  bar.appendChild(viewBtn);

  const printBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Print');
  printBtn.type = 'button';
  printBtn.addEventListener('click', () => window.print());
  bar.appendChild(printBtn);

  return bar;
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

    wrapper.appendChild(buildSelector((_payRunId, _employeeId) => { /* load stub placeholder */ }));
    wrapper.appendChild(buildStub(null));

    container.appendChild(wrapper);
  },
};
