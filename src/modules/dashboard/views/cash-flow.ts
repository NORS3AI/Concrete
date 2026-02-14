/**
 * Cash Flow Forecasting Dashboard view.
 *
 * Displays project-based cash flow projections, inflows vs. outflows,
 * net cash position trend, and upcoming payment/collection schedules.
 * Supports period selector and entity filter.
 *
 * Wired to DashboardService for live KPI computation.
 */

import { getDashboardService } from '../service-accessor';
import type { KPIResult, PeriodPreset } from '../dashboard-service';
import {
  buildKPICard,
  buildKPICardGrid,
  buildKPISummaryTable,
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
// State
// ---------------------------------------------------------------------------

interface CashFlowState {
  [key: string]: unknown;
  period: PeriodPreset;
  entityId: string;
  cashKPIs: KPIResult[];
  cashFlowRows: CashFlowRow[];
  upcomingItems: UpcomingItem[];
  entities: { id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// Drill-down
// ---------------------------------------------------------------------------

function handleDrillDown(kpiCode: string): void {
  window.location.hash = '#/reports/cash-flow';
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function buildCashKPISection(kpis: KPIResult[]): HTMLElement {
  const grid = buildKPICardGrid(kpis, handleDrillDown, 3);
  return buildSection('Cash Position Summary', grid);
}

function buildCashFlowChart(): HTMLElement {
  return buildEmptyState('Cash flow chart coming in Phase 26+');
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
// Content Builder
// ---------------------------------------------------------------------------

function buildContent(state: CashFlowState): HTMLElement {
  const content = el('div', 'space-y-0');

  // Cash KPI summary cards
  if (state.cashKPIs.length > 0) {
    content.appendChild(buildCashKPISection(state.cashKPIs));
  }

  // Cash flow chart placeholder
  content.appendChild(buildSection('Cash Flow Projection', buildCashFlowChart()));

  // Monthly breakdown table
  content.appendChild(buildSection('Monthly Breakdown', buildCashFlowTable(state.cashFlowRows)));

  // Upcoming payments & collections schedule
  content.appendChild(buildSection('Upcoming Payments & Collections', buildUpcomingSchedule(state.upcomingItems)));

  // Empty state if no data at all
  if (state.cashKPIs.length === 0 && state.cashFlowRows.length === 0) {
    content.appendChild(
      buildEmptyState(
        'No cash flow data available. Create invoices and record payments to generate projections.',
      ),
    );
  }

  return content;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const state: CashFlowState = {
      period: 'ytd',
      entityId: '',
      cashKPIs: [],
      cashFlowRows: [],
      upcomingItems: [],
      entities: [],
    };

    // Content area that gets replaced on reload
    let contentArea = el('div');
    wrapper.appendChild(contentArea);

    // ------------------------------------------------------------------
    // Reload: fetch cash-related KPIs from DashboardService
    // ------------------------------------------------------------------
    async function reload(): Promise<void> {
      try {
        const svc = getDashboardService();

        // Fetch executive KPIs and filter for cash-related ones
        const execKPIs = await svc.computeExecutiveKPIs(
          state.entityId || undefined,
          state.period,
        );

        const cashCodes = ['cash_position', 'ar_aging_total', 'ap_aging_total'];
        state.cashKPIs = execKPIs.filter((k) => cashCodes.includes(k.code));

        // Cash flow rows and upcoming items would come from transaction data
        // in a full implementation. For now they remain empty until wired.
        state.cashFlowRows = [];
        state.upcomingItems = [];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load cash flow data';
        showMsg(wrapper, message, true);
        state.cashKPIs = [];
        state.cashFlowRows = [];
        state.upcomingItems = [];
      }

      // Replace content area
      const newContent = buildContent(state);
      contentArea.replaceWith(newContent);
      contentArea = newContent;
    }

    // ------------------------------------------------------------------
    // Header controls with live callbacks
    // ------------------------------------------------------------------
    const periodSelector = buildPeriodSelector(state.period, (period: string) => {
      state.period = period as PeriodPreset;
      reload();
    });

    const entityFilter = buildEntityFilter(state.entities, state.entityId, (entityId: string) => {
      state.entityId = entityId;
      reload();
    });

    const header = buildDashboardHeader(
      'Cash Flow Forecasting',
      'Project-based cash flow projections and upcoming payment schedules',
      periodSelector,
      entityFilter,
    );

    // Insert header before content area
    wrapper.insertBefore(header, contentArea);

    container.appendChild(wrapper);

    // Initial load
    reload();
  },
};
