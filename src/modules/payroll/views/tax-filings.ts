/**
 * Tax Filings view.
 * Management of quarterly tax filings (941, 940, state quarterly) with
 * summary cards and filing status tracking.
 * Wired to PayrollService for live data.
 */

import { getPayrollService } from '../service-accessor';
import type { TaxFilingType, TaxFilingStatus } from '../payroll-service';

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
// Constants
// ---------------------------------------------------------------------------

const FILING_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: '941', label: 'Form 941' },
  { value: '940', label: 'Form 940' },
  { value: 'w2', label: 'W-2' },
  { value: 'state_quarterly', label: 'State Quarterly' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'filed', label: 'Filed' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  filed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaxFilingRow {
  id: string;
  type: string;
  period: string;
  year: number;
  quarter: number;
  status: string;
  totalWages: number;
  totalTax: number;
  dueDate: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (type: string, status: string, year: string) => void,
): { bar: HTMLElement; getYear: () => string } {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of FILING_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const yearInput = el('input', inputCls) as HTMLInputElement;
  yearInput.type = 'number';
  yearInput.placeholder = 'Year';
  yearInput.min = '2020';
  yearInput.max = '2030';
  yearInput.value = String(new Date().getFullYear());
  bar.appendChild(yearInput);

  const fire = () => onFilter(typeSelect.value, statusSelect.value, yearInput.value);
  typeSelect.addEventListener('change', fire);
  statusSelect.addEventListener('change', fire);
  yearInput.addEventListener('change', fire);

  return { bar, getYear: () => yearInput.value };
}

// ---------------------------------------------------------------------------
// Quarterly Summary
// ---------------------------------------------------------------------------

function buildQuarterlySummary(summaries: { quarter: number; wages: string; tax: string }[]): HTMLElement {
  const grid = el('div', 'grid grid-cols-4 gap-4 mb-6');

  for (const summary of summaries) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', `Q${summary.quarter}`));
    card.appendChild(el('div', 'text-sm font-medium text-[var(--text)]', `Wages: ${summary.wages}`));
    card.appendChild(el('div', 'text-sm font-medium text-[var(--text)]', `Tax: ${summary.tax}`));
    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(filings: TaxFilingRow[], onMarkFiled: (id: string) => void): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Type', 'Period', 'Year', 'Quarter', 'Status', 'Total Wages', 'Total Tax', 'Due Date', 'Actions']) {
    const align = ['Total Wages', 'Total Tax'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (filings.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No tax filings found.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const filing of filings) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const typeLabel = filing.type === '941' ? 'Form 941' : filing.type === '940' ? 'Form 940' : filing.type === 'w2' ? 'W-2' : 'State Quarterly';
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', typeLabel));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', filing.period));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', String(filing.year)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', filing.quarter ? `Q${filing.quarter}` : '-'));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[filing.status] ?? STATUS_BADGE.draft}`,
      filing.status.charAt(0).toUpperCase() + filing.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(filing.totalWages)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(filing.totalTax)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', filing.dueDate || '-'));

    const tdActions = el('td', 'py-2 px-3');
    if (filing.status === 'draft') {
      const fileBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Mark Filed');
      fileBtn.addEventListener('click', () => onMarkFiled(filing.id));
      tdActions.appendChild(fileBtn);
    }
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Tax Filings'));

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Filing');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getPayrollService();
          const year = parseInt(currentYear, 10) || new Date().getFullYear();
          const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
          await svc.createTaxFiling({
            type: '941',
            period: `Q${quarter} ${year}`,
            year,
            quarter,
            status: 'draft',
            totalWages: 0,
            totalTax: 0,
          });
          showMsg(wrapper, 'Tax filing created.', false);
          void loadFilings();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create filing';
          showMsg(wrapper, message, true);
        }
      })();
    });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    const summaryContainer = el('div', '');
    const tableContainer = el('div', '');
    let currentType = '';
    let currentStatus = '';
    let currentYear = String(new Date().getFullYear());

    async function loadQuarterlySummary(): Promise<void> {
      try {
        const svc = getPayrollService();
        const year = parseInt(currentYear, 10) || new Date().getFullYear();
        const summaries = [];
        for (let q = 1; q <= 4; q++) {
          const summary = await svc.getQuarterlyTaxSummary(year, q);
          summaries.push({
            quarter: q,
            wages: fmtCurrency(summary.totalWages),
            tax: fmtCurrency(
              summary.totalFederalTax + summary.totalStateTax + summary.totalLocalTax
              + summary.totalFicaSS + summary.totalFicaMed,
            ),
          });
        }
        summaryContainer.innerHTML = '';
        summaryContainer.appendChild(buildQuarterlySummary(summaries));
      } catch {
        // If summary fails, show zeroes
        summaryContainer.innerHTML = '';
        summaryContainer.appendChild(buildQuarterlySummary(
          [1, 2, 3, 4].map((q) => ({ quarter: q, wages: '$0.00', tax: '$0.00' })),
        ));
      }
    }

    async function loadFilings(): Promise<void> {
      try {
        const svc = getPayrollService();
        const filters: { type?: TaxFilingType; status?: TaxFilingStatus; year?: number } = {};
        if (currentType) filters.type = currentType as TaxFilingType;
        if (currentStatus) filters.status = currentStatus as TaxFilingStatus;
        const year = parseInt(currentYear, 10);
        if (year) filters.year = year;

        const filings = await svc.getTaxFilings(filters);

        const rows: TaxFilingRow[] = filings.map((f) => ({
          id: f.id,
          type: f.type,
          period: f.period,
          year: f.year,
          quarter: f.quarter ?? 0,
          status: f.status,
          totalWages: f.totalWages,
          totalTax: f.totalTax,
          dueDate: f.dueDate ?? '',
        }));

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(rows, (id) => {
          void (async () => {
            try {
              const svcInner = getPayrollService();
              await svcInner.updateTaxFiling(id, { status: 'filed' });
              showMsg(wrapper, 'Filing marked as filed.', false);
              void loadFilings();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to update filing';
              showMsg(wrapper, message, true);
            }
          })();
        }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load filings';
        showMsg(wrapper, message, true);
      }
    }

    wrapper.appendChild(summaryContainer);

    const { bar } = buildFilterBar((type, status, year) => {
      currentType = type;
      currentStatus = status;
      currentYear = year;
      void loadFilings();
      void loadQuarterlySummary();
    });
    wrapper.appendChild(bar);

    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // Initial load
    void loadQuarterlySummary();
    void loadFilings();
  },
};
