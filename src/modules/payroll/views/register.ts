/**
 * Payroll Register view.
 * Report showing all pay checks for a selected pay run, with totals.
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

interface RegisterRow {
  employeeName: string;
  hours: number;
  overtimeHours: number;
  grossPay: number;
  federalTax: number;
  stateTax: number;
  localTax: number;
  ficaSS: number;
  ficaMed: number;
  totalDeductions: number;
  netPay: number;
}

// ---------------------------------------------------------------------------
// Pay Run Selector
// ---------------------------------------------------------------------------

function buildPayRunSelector(
  onChange: (payRunId: string) => void,
): HTMLElement {
  const bar = el('div', 'flex items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  bar.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Pay Run:'));

  const select = el('select', inputCls) as HTMLSelectElement;
  const defaultOpt = el('option', '', 'Select a pay run') as HTMLOptionElement;
  defaultOpt.value = '';
  select.appendChild(defaultOpt);
  bar.appendChild(select);

  select.addEventListener('change', () => onChange(select.value));

  const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export CSV');
  exportBtn.type = 'button';
  exportBtn.addEventListener('click', () => { /* export placeholder */ });
  bar.appendChild(exportBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Register Table
// ---------------------------------------------------------------------------

function buildRegisterTable(rows: RegisterRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Employee', 'Hours', 'OT Hrs', 'Gross', 'Fed Tax', 'State Tax', 'Local Tax', 'SS', 'Medicare', 'Deductions', 'Net Pay']) {
    const align = col === 'Employee' ? 'py-2 px-3 font-medium' : 'py-2 px-3 font-medium text-right';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'Select a pay run to view the register.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totalGross = 0;
  let totalFedTax = 0;
  let totalStateTax = 0;
  let totalLocalTax = 0;
  let totalSS = 0;
  let totalMed = 0;
  let totalDed = 0;
  let totalNet = 0;
  let totalHours = 0;
  let totalOTHours = 0;

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.employeeName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.hours.toFixed(2)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.overtimeHours.toFixed(2)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.grossPay)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.federalTax)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.stateTax)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.localTax)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.ficaSS)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.ficaMed)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalDeductions)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-bold', fmtCurrency(row.netPay)));

    totalHours += row.hours;
    totalOTHours += row.overtimeHours;
    totalGross += row.grossPay;
    totalFedTax += row.federalTax;
    totalStateTax += row.stateTax;
    totalLocalTax += row.localTax;
    totalSS += row.ficaSS;
    totalMed += row.ficaMed;
    totalDed += row.totalDeductions;
    totalNet += row.netPay;

    tbody.appendChild(tr);
  }

  // Totals row
  if (rows.length > 0) {
    const totals = el('tr', 'bg-[var(--surface)] font-bold border-t-2 border-[var(--border)]');
    totals.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', 'TOTALS'));
    totals.appendChild(el('td', 'py-2 px-3 text-right font-mono', totalHours.toFixed(2)));
    totals.appendChild(el('td', 'py-2 px-3 text-right font-mono', totalOTHours.toFixed(2)));
    totals.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalGross)));
    totals.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalFedTax)));
    totals.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalStateTax)));
    totals.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalLocalTax)));
    totals.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalSS)));
    totals.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalMed)));
    totals.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalDed)));
    totals.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalNet)));
    tbody.appendChild(totals);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Payroll Register'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildPayRunSelector((_payRunId) => { /* load register placeholder */ }));

    const rows: RegisterRow[] = [];
    wrapper.appendChild(buildRegisterTable(rows));

    container.appendChild(wrapper);
  },
};
