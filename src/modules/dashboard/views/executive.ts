/**
 * Executive Dashboard view.
 *
 * Displays the main executive dashboard with KPI cards for revenue, backlog,
 * GP%, WIP, cash position, AR/AP aging totals. Provides period selector
 * and entity filter controls. Supports drill-down from any KPI card.
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
// State
// ---------------------------------------------------------------------------

interface ExecutiveState {
  [key: string]: unknown;
  period: PeriodPreset;
  entityId: string;
  executiveKPIs: KPIResult[];
  operationalKPIs: KPIResult[];
  entities: { id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// Drill-down routing
// ---------------------------------------------------------------------------

const DRILL_DOWN_ROUTES: Record<string, string> = {
  revenue_ytd: '#/reports/revenue',
  gross_profit_pct: '#/reports/job-cost',
  backlog: '#/dashboard/backlog',
  wip_total: '#/reports/job-cost',
  cash_position: '#/reports/cash-flow',
  ar_aging_total: '#/ar/aging',
  ap_aging_total: '#/ap/aging',
  equipment_utilization: '#/dashboard/equipment',
  payroll_burden_rate: '#/dashboard/payroll',
  safety_emr: '#/dashboard/safety',
  bonding_utilized_pct: '#/dashboard/backlog',
  overbilling_total: '#/reports/job-cost',
  underbilling_total: '#/reports/job-cost',
};

function handleDrillDown(kpiCode: string): void {
  const route = DRILL_DOWN_ROUTES[kpiCode];
  if (route) {
    window.location.hash = route;
  }
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function buildRevenueSection(kpis: KPIResult[]): HTMLElement {
  const financialKPIs = kpis.filter(
    (k) => ['revenue_ytd', 'gross_profit_pct', 'backlog', 'wip_total', 'cash_position'].includes(k.code),
  );
  const grid = buildKPICardGrid(financialKPIs, handleDrillDown, 3);
  return buildSection('Financial Overview', grid);
}

function buildAgingSection(kpis: KPIResult[]): HTMLElement {
  const agingKPIs = kpis.filter(
    (k) => ['ar_aging_total', 'ap_aging_total'].includes(k.code),
  );
  const grid = buildKPICardGrid(agingKPIs, handleDrillDown, 2);
  return buildSection('Accounts Aging', grid);
}

function buildOperationalSection(kpis: KPIResult[]): HTMLElement {
  const table = buildKPISummaryTable(kpis, handleDrillDown);
  return buildSection('Operational Metrics', table);
}

function buildQuickLinks(): HTMLElement {
  const section = el('div', 'mb-8');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Quick Links'));

  const linksGrid = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-3');

  const links = [
    { label: 'Job Performance', href: '#/dashboard/jobs', icon: 'briefcase' },
    { label: 'Cash Flow', href: '#/dashboard/cash-flow', icon: 'trending-up' },
    { label: 'Backlog Analysis', href: '#/dashboard/backlog', icon: 'layers' },
    { label: 'Equipment', href: '#/dashboard/equipment', icon: 'truck' },
    { label: 'Payroll Burden', href: '#/dashboard/payroll', icon: 'users' },
    { label: 'Safety Metrics', href: '#/dashboard/safety', icon: 'shield' },
    { label: 'Configure', href: '#/dashboard/configure', icon: 'settings' },
    { label: 'Reports', href: '#/reports', icon: 'file-text' },
  ];

  for (const link of links) {
    const a = el('a', 'block p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface)] transition-colors text-center') as HTMLAnchorElement;
    a.href = link.href;
    a.appendChild(el('div', 'text-sm font-medium text-[var(--text)]', link.label));
    linksGrid.appendChild(a);
  }

  section.appendChild(linksGrid);
  return section;
}

// ---------------------------------------------------------------------------
// Content Builder
// ---------------------------------------------------------------------------

function buildContent(state: ExecutiveState): HTMLElement {
  const content = el('div', 'space-y-0');

  if (state.executiveKPIs.length === 0 && state.operationalKPIs.length === 0) {
    content.appendChild(
      buildEmptyState(
        'No KPI data available yet. Record benchmark data or connect live data sources to populate the executive dashboard.',
        'Configure Dashboard',
        () => { window.location.hash = '#/dashboard/configure'; },
      ),
    );
  } else {
    if (state.executiveKPIs.length > 0) {
      content.appendChild(buildRevenueSection(state.executiveKPIs));
      content.appendChild(buildAgingSection(state.executiveKPIs));
    }
    if (state.operationalKPIs.length > 0) {
      content.appendChild(buildOperationalSection(state.operationalKPIs));
    }
  }

  content.appendChild(buildQuickLinks());
  return content;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const state: ExecutiveState = {
      period: 'ytd',
      entityId: '',
      executiveKPIs: [],
      operationalKPIs: [],
      entities: [],
    };

    // Content area that gets replaced on reload
    let contentArea = el('div');
    wrapper.appendChild(contentArea);

    // ------------------------------------------------------------------
    // Reload: fetch KPIs from DashboardService and rebuild content
    // ------------------------------------------------------------------
    async function reload(): Promise<void> {
      try {
        const svc = getDashboardService();

        const [execKPIs, opsKPIs] = await Promise.all([
          svc.computeExecutiveKPIs(state.entityId || undefined, state.period),
          svc.computeOperationalKPIs(state.entityId || undefined, state.period),
        ]);

        state.executiveKPIs = execKPIs;
        state.operationalKPIs = opsKPIs;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load KPI data';
        showMsg(wrapper, message, true);
        state.executiveKPIs = [];
        state.operationalKPIs = [];
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
      'Executive Dashboard',
      'Key financial and operational metrics at a glance',
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
