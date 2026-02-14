/**
 * Payroll Burden Analysis Dashboard view.
 *
 * Displays payroll burden rates, burden breakdown by category (taxes,
 * insurance, benefits, union), burden trends over time, and per-employee
 * burden analysis. Supports period selector and entity filter.
 *
 * Wired to DashboardService for live KPI data.
 */

import { getDashboardService } from '../service-accessor';
import type { KPIResult, PeriodPreset } from '../dashboard-service';
import {
  buildKPICard,
  buildKPICardGrid,
  buildPeriodSelector,
  buildEntityFilter,
  buildDashboardHeader,
  buildSection,
  buildEmptyState,
  buildKPISummaryTable,
  formatKPIValue,
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
// State
// ---------------------------------------------------------------------------

interface PayrollState {
  [key: string]: unknown;
  period: PeriodPreset;
  entityId: string;
  entities: { id: string; name: string }[];
  burdenRateKPI: KPIResult | null;
  operationalKPIs: KPIResult[];
  detailKPIs: KPIResult[];
}

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

async function loadPayrollData(state: PayrollState): Promise<void> {
  const svc = getDashboardService();

  // Load the primary payroll burden rate KPI
  state.burdenRateKPI = await svc.computeKPI(
    'payroll_burden_rate',
    state.entityId || undefined,
    state.period,
  ).catch(() => null);

  // Load all operational KPIs and filter for payroll-related codes
  const operationalKPIs = await svc.computeOperationalKPIs(
    state.entityId || undefined,
    state.period,
  );
  state.operationalKPIs = operationalKPIs.filter(
    (k) => ['payroll_burden_rate', 'safety_emr'].includes(k.code),
  );

  // Build detail KPIs from all operational metrics for the summary table
  state.detailKPIs = operationalKPIs.filter(
    (k) => ['payroll_burden_rate', 'safety_emr', 'equipment_utilization'].includes(k.code),
  );

  // Load entities for the filter from benchmarks
  const benchmarks = await svc.getBenchmarks();
  const entityMap = new Map<string, string>();
  for (const b of benchmarks) {
    if (b.entityId && !entityMap.has(b.entityId)) {
      entityMap.set(b.entityId, b.entityId);
    }
  }
  state.entities = Array.from(entityMap.entries()).map(([id, name]) => ({ id, name }));
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function buildPayrollSummaryCards(state: PayrollState): HTMLElement {
  const kpis: KPIResult[] = [];
  if (state.burdenRateKPI) kpis.push(state.burdenRateKPI);

  // Add additional operational KPIs not already included
  for (const kpi of state.operationalKPIs) {
    if (!kpis.find((k) => k.code === kpi.code)) {
      kpis.push(kpi);
    }
  }

  if (kpis.length === 0) {
    return buildEmptyState('No payroll KPI data available. Record benchmark data to see burden metrics.');
  }

  return buildKPICardGrid(kpis, (code) => {
    window.location.hash = '#/reports/payroll';
  }, 4);
}

function buildBurdenHighlight(state: PayrollState): HTMLElement {
  if (!state.burdenRateKPI) {
    return buildEmptyState('Payroll burden rate data not available.');
  }

  const kpi = state.burdenRateKPI;
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');

  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h3', 'text-base font-semibold text-[var(--text)]', 'Burden Rate Overview'));

  // Color-code burden rate: <=35% emerald, 35-50% amber, >50% red
  let colorCls: string;
  let statusLabel: string;
  if (kpi.value <= 35) {
    colorCls = 'text-emerald-400';
    statusLabel = 'Low';
  } else if (kpi.value <= 50) {
    colorCls = 'text-amber-400';
    statusLabel = 'Moderate';
  } else {
    colorCls = 'text-red-400';
    statusLabel = 'High';
  }

  const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${
    kpi.value <= 35 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
    kpi.value <= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
    'bg-red-500/10 text-red-400 border border-red-500/20'
  }`, statusLabel);
  headerRow.appendChild(badge);
  wrap.appendChild(headerRow);

  const valueEl = el('div', `text-4xl font-bold ${colorCls}`, formatKPIValue(kpi.value, kpi.format));
  wrap.appendChild(valueEl);

  if (kpi.target !== undefined) {
    wrap.appendChild(el('div', 'text-sm text-[var(--text-muted)] mt-2', `Target: ${formatKPIValue(kpi.target, kpi.format)}`));
  }

  wrap.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', kpi.periodLabel));

  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderContent(container: HTMLElement, wrapper: HTMLElement, state: PayrollState): void {
  wrapper.innerHTML = '';

  // Header with controls
  const periodSelector = buildPeriodSelector(state.period, (period: string) => {
    state.period = period as PeriodPreset;
    reload(container, state);
  });
  const entityFilter = buildEntityFilter(state.entities, state.entityId, (entityId: string) => {
    state.entityId = entityId;
    reload(container, state);
  });
  const header = buildDashboardHeader(
    'Payroll Burden Analysis',
    'Burden rates, breakdown by category, and per-employee analysis',
    periodSelector,
    entityFilter,
  );
  wrapper.appendChild(header);

  // Summary KPI cards: Total Payroll, Burden Rate %, Total Hours, Avg Hourly Cost
  wrapper.appendChild(buildSection('Payroll Summary', buildPayrollSummaryCards(state)));

  // Burden rate highlight with color-coding
  wrapper.appendChild(buildSection('Burden Rate Overview', buildBurdenHighlight(state)));

  // Burden breakdown section using buildKPISummaryTable for detailed breakdown
  wrapper.appendChild(
    buildSection(
      'Burden Breakdown',
      state.detailKPIs.length > 0
        ? buildKPISummaryTable(state.detailKPIs, (code) => {
            window.location.hash = '#/reports/payroll';
          })
        : buildEmptyState('No burden breakdown data available. Record benchmark data to see the detailed breakdown.'),
    ),
  );

  // Trend chart placeholder
  wrapper.appendChild(
    buildSection('Burden Trend', buildEmptyState('Payroll burden trend coming in Phase 26+')),
  );

  // Employee burden table showing operational KPIs
  wrapper.appendChild(
    buildSection(
      'Employee Burden Detail',
      state.operationalKPIs.length > 0
        ? buildKPISummaryTable(state.operationalKPIs, (code) => {
            window.location.hash = '#/reports/payroll';
          })
        : buildEmptyState('No employee burden data available. Process payroll runs to see per-employee analysis.'),
    ),
  );

  // Drill-down link
  const linkRow = el('div', 'mb-8');
  const link = el('a', 'text-sm text-[var(--accent)] hover:underline font-medium', 'View detailed payroll report \u2192') as HTMLAnchorElement;
  link.href = '#/reports/payroll';
  linkRow.appendChild(link);
  wrapper.appendChild(linkRow);
}

async function reload(container: HTMLElement, state: PayrollState): Promise<void> {
  const wrapper = container.querySelector('[data-payroll-wrapper]') as HTMLElement;
  if (!wrapper) return;

  try {
    await loadPayrollData(state);
    renderContent(container, wrapper, state);
  } catch (err) {
    showMsg(wrapper, `Failed to load payroll data: ${err instanceof Error ? err.message : String(err)}`, true);
  }
}

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');
    wrapper.setAttribute('data-payroll-wrapper', '1');
    container.appendChild(wrapper);

    // Initial loading state
    const loadingMsg = el('div', 'flex items-center justify-center py-12 text-[var(--text-muted)]', 'Loading payroll data...');
    wrapper.appendChild(loadingMsg);

    // Initialize state
    const state: PayrollState = {
      period: 'ytd',
      entityId: '',
      entities: [],
      burdenRateKPI: null,
      operationalKPIs: [],
      detailKPIs: [],
    };

    // Load data and render
    loadPayrollData(state)
      .then(() => {
        renderContent(container, wrapper, state);
      })
      .catch((err) => {
        wrapper.innerHTML = '';
        showMsg(wrapper, `Failed to load payroll data: ${err instanceof Error ? err.message : String(err)}`, true);
        wrapper.appendChild(
          buildEmptyState(
            'No payroll data available. Process payroll runs to see burden analysis.',
            'Go to Payroll',
            () => { window.location.hash = '#/payroll/runs'; },
          ),
        );
      });
  },
};
