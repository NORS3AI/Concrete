/**
 * Payroll Register view.
 * Report showing all pay checks for a selected pay run, with totals.
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
  payRuns: { id: string; label: string }[],
  onChange: (payRunId: string) => void,
  onExport: () => void,
): HTMLElement {
  const bar = el('div', 'flex items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  bar.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Pay Run:'));

  const select = el('select', inputCls) as HTMLSelectElement;
  const defaultOpt = el('option', '', 'Select a pay run') as HTMLOptionElement;
  defaultOpt.value = '';
  select.appendChild(defaultOpt);

  for (const run of payRuns) {
    const opt = el('option', '', run.label) as HTMLOptionElement;
    opt.value = run.id;
    select.appendChild(opt);
  }

  bar.appendChild(select);

  select.addEventListener('change', () => onChange(select.value));

  const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export CSV');
  exportBtn.type = 'button';
  exportBtn.addEventListener('click', onExport);
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

    const selectorContainer = el('div', '');
    const tableContainer = el('div', '');
    let currentRows: RegisterRow[] = [];
    let selectedPayRunId = '';

    function exportCSV(): void {
      if (currentRows.length === 0) {
        showMsg(wrapper, 'No data to export.', true);
        return;
      }
      const headers = ['Employee', 'Hours', 'OT Hours', 'Gross', 'Fed Tax', 'State Tax', 'Local Tax', 'SS', 'Medicare', 'Deductions', 'Net Pay'];
      const lines = [headers.join(',')];
      for (const row of currentRows) {
        lines.push([
          `"${row.employeeName}"`,
          row.hours.toFixed(2),
          row.overtimeHours.toFixed(2),
          row.grossPay.toFixed(2),
          row.federalTax.toFixed(2),
          row.stateTax.toFixed(2),
          row.localTax.toFixed(2),
          row.ficaSS.toFixed(2),
          row.ficaMed.toFixed(2),
          row.totalDeductions.toFixed(2),
          row.netPay.toFixed(2),
        ].join(','));
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-register-${selectedPayRunId || 'export'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    async function loadRegister(payRunId: string): Promise<void> {
      selectedPayRunId = payRunId;
      if (!payRunId) {
        currentRows = [];
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildRegisterTable([]));
        return;
      }

      try {
        const svc = getPayrollService();
        const registerRows = await svc.getPayrollRegister(payRunId);

        currentRows = registerRows.map((r) => ({
          employeeName: r.employeeName,
          hours: r.hours,
          overtimeHours: r.overtimeHours,
          grossPay: r.grossPay,
          federalTax: r.federalTax,
          stateTax: r.stateTax,
          localTax: r.localTax,
          ficaSS: r.ficaSS,
          ficaMed: r.ficaMed,
          totalDeductions: r.totalDeductions,
          netPay: r.netPay,
        }));

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildRegisterTable(currentRows));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load register';
        showMsg(wrapper, message, true);
      }
    }

    // Load pay runs for the dropdown, then build the selector
    void (async () => {
      try {
        const svc = getPayrollService();
        const payRuns = await svc.getPayRuns();

        const payRunOptions = payRuns.map((r) => ({
          id: r.id,
          label: `${r.periodStart} - ${r.periodEnd} (${r.status})`,
        }));

        selectorContainer.innerHTML = '';
        selectorContainer.appendChild(buildPayRunSelector(
          payRunOptions,
          (payRunId) => void loadRegister(payRunId),
          () => exportCSV(),
        ));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load pay runs';
        showMsg(wrapper, message, true);
      }
    })();

    wrapper.appendChild(selectorContainer);

    tableContainer.appendChild(buildRegisterTable([]));
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);
  },
};
