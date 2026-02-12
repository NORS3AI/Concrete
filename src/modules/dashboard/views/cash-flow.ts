/**
 * Cash Flow Forecasting Dashboard view.
 *
 * Displays project-based cash flow projections, inflows vs. outflows,
 * net cash position trend, and upcoming payment/collection schedules.
 * Supports period selector and entity filter.
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CashFlowRow {
  [key: string]: unknown;
  period: string;
  inflows: number;
  outflows: number;
  netCash: number;
  cumulativeCash: number;
}

interface UpcomingItem {
  [key: string]: unknown;
  date: string;
  description: string;
  type: 'inflow' | 'outflow';
  amount: number;
  source: string;
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function buildCashFlowChart(): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  const placeholder = el('div', 'flex items-center justify-center h-64 text-[var(--text-muted)]', 'Cash flow projection chart will render here when Chart.js is connected and transaction data is available.');
  wrap.appendChild(placeholder);
  return wrap;
}

function buildCashFlowTable(rows: CashFlowRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Period', 'Inflows', 'Outflows', 'Net Cash', 'Cumulative']) {
    const align = col !== 'Period' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No cash flow projections available.');
    td.setAttribute('colspan', '5');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.period));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(row.inflows)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', fmtCurrency(row.outflows)));

    const netCls = row.netCash >= 0 ? 'text-emerald-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${netCls}`, fmtCurrency(row.netCash)));

    const cumCls = row.cumulativeCash >= 0 ? 'text-emerald-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono font-bold ${cumCls}`, fmtCurrency(row.cumulativeCash)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function buildUpcomingSchedule(items: UpcomingItem[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Date', 'Description', 'Type', 'Amount', 'Source']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (items.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No upcoming items scheduled.');
    td.setAttribute('colspan', '5');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const item of items) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', item.date));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', item.description));

    const typeBadge = item.type === 'inflow'
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : 'bg-red-500/10 text-red-400 border border-red-500/20';
    const tdType = el('td', 'py-2 px-3');
    tdType.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge}`, item.type === 'inflow' ? 'Inflow' : 'Outflow'));
    tr.appendChild(tdType);

    const amountCls = item.type === 'inflow' ? 'text-emerald-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${amountCls}`, fmtCurrency(item.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', item.source));

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
      'Cash Flow Forecasting',
      'Project-based cash flow projections and upcoming payment schedules',
      periodSelector,
      entityFilter,
    );
    wrapper.appendChild(header);

    // Chart section
    wrapper.appendChild(buildSection('Cash Flow Projection', buildCashFlowChart()));

    // Cash flow table
    const cashFlowRows: CashFlowRow[] = [];
    wrapper.appendChild(buildSection('Monthly Breakdown', buildCashFlowTable(cashFlowRows)));

    // Upcoming schedule
    const upcomingItems: UpcomingItem[] = [];
    wrapper.appendChild(buildSection('Upcoming Payments & Collections', buildUpcomingSchedule(upcomingItems)));

    if (cashFlowRows.length === 0) {
      wrapper.appendChild(
        buildEmptyState(
          'No cash flow data available. Create invoices and record payments to generate projections.',
        ),
      );
    }

    container.appendChild(wrapper);
  },
};
