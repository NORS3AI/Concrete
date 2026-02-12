/**
 * Payroll Report view.
 * Renders payroll summary and detail reports by employee, department,
 * and period showing gross pay, taxes, deductions, and net pay.
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

const REPORT_TYPE_OPTIONS = [
  { value: 'summary', label: 'Payroll Summary' },
  { value: 'detail', label: 'Payroll Detail' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PayrollDisplayRow {
  employeeName: string;
  department: string;
  totalGross: number;
  totalFederalTax: number;
  totalStateTax: number;
  totalFicaSS: number;
  totalFicaMed: number;
  totalDeductions: number;
  totalNet: number;
  totalHours: number;
  totalOvertimeHours: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onApply: (reportType: string, periodStart: string, periodEnd: string, department: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of REPORT_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fromLabel = el('label', 'text-sm text-[var(--text-muted)]', 'From:');
  bar.appendChild(fromLabel);
  const periodStartInput = el('input', inputCls) as HTMLInputElement;
  periodStartInput.type = 'date';
  bar.appendChild(periodStartInput);

  const toLabel = el('label', 'text-sm text-[var(--text-muted)]', 'To:');
  bar.appendChild(toLabel);
  const periodEndInput = el('input', inputCls) as HTMLInputElement;
  periodEndInput.type = 'date';
  periodEndInput.value = new Date().toISOString().split('T')[0];
  bar.appendChild(periodEndInput);

  const deptInput = el('input', inputCls) as HTMLInputElement;
  deptInput.type = 'text';
  deptInput.placeholder = 'Department filter...';
  bar.appendChild(deptInput);

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  applyBtn.addEventListener('click', () => {
    onApply(typeSelect.value, periodStartInput.value, periodEndInput.value, deptInput.value);
  });
  bar.appendChild(applyBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: PayrollDisplayRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm whitespace-nowrap');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const columns = [
    { name: 'Employee', numeric: false },
    { name: 'Dept', numeric: false },
    { name: 'Gross Pay', numeric: true },
    { name: 'Fed Tax', numeric: true },
    { name: 'State Tax', numeric: true },
    { name: 'FICA SS', numeric: true },
    { name: 'FICA Med', numeric: true },
    { name: 'Deductions', numeric: true },
    { name: 'Net Pay', numeric: true },
    { name: 'Hours', numeric: true },
    { name: 'OT Hours', numeric: true },
  ];

  for (const col of columns) {
    const align = col.numeric ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col.name));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No payroll data available. Select a period and generate the report.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totalGross = 0;
  let totalNet = 0;
  let totalHours = 0;
  let totalOT = 0;

  for (const row of rows) {
    totalGross += row.totalGross;
    totalNet += row.totalNet;
    totalHours += row.totalHours;
    totalOT += row.totalOvertimeHours;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium', row.employeeName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.department || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalGross)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalFederalTax)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalStateTax)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalFicaSS)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalFicaMed)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalDeductions)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalNet)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.totalHours.toFixed(1)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.totalOvertimeHours.toFixed(1)));

    tbody.appendChild(tr);
  }

  if (rows.length > 0) {
    const totalRow = el('tr', 'bg-[var(--surface)] font-bold border-t-2 border-[var(--border)]');
    totalRow.appendChild(el('td', 'py-2 px-3', `Totals (${rows.length} employees)`));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalGross)));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalNet)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', totalHours.toFixed(1)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', totalOT.toFixed(1)));
    tbody.appendChild(totalRow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Export Bar
// ---------------------------------------------------------------------------

function buildExportBar(): HTMLElement {
  const bar = el('div', 'flex items-center gap-3 mt-4');
  bar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Export:'));

  for (const format of ['PDF', 'CSV', 'Excel']) {
    const btn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', format);
    bar.appendChild(btn);
  }

  return bar;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Payroll Reports'));

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_reportType, _periodStart, _periodEnd, _department) => {
      /* filter action placeholder */
    }));

    const rows: PayrollDisplayRow[] = [];
    wrapper.appendChild(buildTable(rows));
    wrapper.appendChild(buildExportBar());

    container.appendChild(wrapper);
  },
};
