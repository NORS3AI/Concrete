/**
 * Payroll Burden Analysis Dashboard view.
 *
 * Displays payroll burden rates, burden breakdown by category (taxes,
 * insurance, benefits, union), burden trends over time, and per-employee
 * burden analysis. Supports period selector and entity filter.
 */

import {
  buildPeriodSelector,
  buildEntityFilter,
  buildDashboardHeader,
  buildSection,
  buildEmptyState,
} from './kpi-cards';

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

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPercent = (v: number): string => `${v.toFixed(1)}%`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BurdenCategory {
  [key: string]: unknown;
  category: string;
  amount: number;
  percentage: number;
}

interface PayrollSummary {
  [key: string]: unknown;
  totalBaseWages: number;
  totalBurden: number;
  burdenRate: number;
  employeeCount: number;
  averageBurdenPerEmployee: number;
}

interface EmployeeBurdenRow {
  [key: string]: unknown;
  employeeId: string;
  employeeName: string;
  baseWages: number;
  burdenAmount: number;
  burdenRate: number;
  classification: string;
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function buildPayrollSummaryCards(summary: PayrollSummary): HTMLElement {
  const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4');

  const cards = [
    { label: 'Total Base Wages', value: fmtCurrency(summary.totalBaseWages), cls: 'text-[var(--text)]' },
    { label: 'Total Burden', value: fmtCurrency(summary.totalBurden), cls: 'text-amber-400' },
    { label: 'Burden Rate', value: fmtPercent(summary.burdenRate), cls: summary.burdenRate <= 45 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Employees', value: summary.employeeCount.toString(), cls: 'text-[var(--text)]' },
    { label: 'Avg. Burden/Employee', value: fmtCurrency(summary.averageBurdenPerEmployee), cls: 'text-[var(--text)]' },
  ];

  for (const card of cards) {
    const cardEl = el('div', 'p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]');
    cardEl.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', card.label));
    cardEl.appendChild(el('div', `text-2xl font-bold ${card.cls}`, card.value));
    grid.appendChild(cardEl);
  }

  return grid;
}

function buildBurdenBreakdown(categories: BurdenCategory[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Category', 'Amount', 'Percentage']) {
    const align = col !== 'Category' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (categories.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No burden data available.');
    td.setAttribute('colspan', '3');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const cat of categories) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', cat.category));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(cat.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtPercent(cat.percentage)));
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function buildBurdenTrendChart(): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  const placeholder = el('div', 'flex items-center justify-center h-48 text-[var(--text-muted)]', 'Payroll burden trend chart will render here when Chart.js is connected and payroll data is available.');
  wrap.appendChild(placeholder);
  return wrap;
}

function buildEmployeeBurdenTable(rows: EmployeeBurdenRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Employee', 'Classification', 'Base Wages', 'Burden', 'Burden Rate']) {
    const align = ['Base Wages', 'Burden', 'Burden Rate'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No employee burden data available.');
    td.setAttribute('colspan', '5');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.employeeName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.classification));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.baseWages)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', fmtCurrency(row.burdenAmount)));

    const rateCls = row.burdenRate <= 45 ? 'text-emerald-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${rateCls}`, fmtPercent(row.burdenRate)));

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

    // Header
    const periodSelector = buildPeriodSelector('ytd', () => {});
    const entityFilter = buildEntityFilter([], '', () => {});
    const header = buildDashboardHeader(
      'Payroll Burden Analysis',
      'Burden rates, breakdown by category, and per-employee analysis',
      periodSelector,
      entityFilter,
    );
    wrapper.appendChild(header);

    // Summary
    const summary: PayrollSummary = {
      totalBaseWages: 0,
      totalBurden: 0,
      burdenRate: 0,
      employeeCount: 0,
      averageBurdenPerEmployee: 0,
    };
    wrapper.appendChild(buildSection('Payroll Summary', buildPayrollSummaryCards(summary)));

    // Burden breakdown
    const categories: BurdenCategory[] = [];
    wrapper.appendChild(buildSection('Burden Breakdown', buildBurdenBreakdown(categories)));

    // Trend chart
    wrapper.appendChild(buildSection('Burden Trend', buildBurdenTrendChart()));

    // Employee table
    const employeeRows: EmployeeBurdenRow[] = [];
    wrapper.appendChild(buildSection('Employee Burden Detail', buildEmployeeBurdenTable(employeeRows)));

    if (employeeRows.length === 0) {
      wrapper.appendChild(
        buildEmptyState(
          'No payroll data available. Process payroll runs to see burden analysis.',
          'Go to Payroll',
          () => { window.location.hash = '#/payroll/runs'; },
        ),
      );
    }

    container.appendChild(wrapper);
  },
};
