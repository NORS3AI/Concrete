/**
 * Executive Dashboard view.
 *
 * Displays the main executive dashboard with KPI cards for revenue, backlog,
 * GP%, WIP, cash position, AR/AP aging totals. Provides period selector
 * and entity filter controls. Supports drill-down from any KPI card.
 */

import type { KPIResult } from '../dashboard-service';
import {
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

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface ExecutiveState {
  [key: string]: unknown;
  period: string;
  entityId: string;
  executiveKPIs: KPIResult[];
  operationalKPIs: KPIResult[];
  entities: { id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function buildRevenueSection(kpis: KPIResult[], onDrillDown: (code: string) => void): HTMLElement {
  const financialKPIs = kpis.filter(
    (k) => ['revenue_ytd', 'gross_profit_pct', 'backlog', 'wip_total', 'cash_position'].includes(k.code),
  );
  const grid = buildKPICardGrid(financialKPIs, onDrillDown, 3);
  return buildSection('Financial Overview', grid);
}

function buildAgingSection(kpis: KPIResult[], onDrillDown: (code: string) => void): HTMLElement {
  const agingKPIs = kpis.filter(
    (k) => ['ar_aging_total', 'ap_aging_total'].includes(k.code),
  );
  const grid = buildKPICardGrid(agingKPIs, onDrillDown, 2);
  return buildSection('Accounts Aging', grid);
}

function buildOperationalSection(kpis: KPIResult[], onDrillDown: (code: string) => void): HTMLElement {
  const table = buildKPISummaryTable(kpis, onDrillDown);
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
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    // State
    const state: ExecutiveState = {
      period: 'ytd',
      entityId: '',
      executiveKPIs: [],
      operationalKPIs: [],
      entities: [],
    };

    // Header with controls
    const periodSelector = buildPeriodSelector(state.period, (period: string) => {
      state.period = period;
    });
    const entityFilter = buildEntityFilter(state.entities, state.entityId, (entityId: string) => {
      state.entityId = entityId;
    });
    const header = buildDashboardHeader(
      'Executive Dashboard',
      'Key financial and operational metrics at a glance',
      periodSelector,
      entityFilter,
    );
    wrapper.appendChild(header);

    // Drill-down handler
    const handleDrillDown = (kpiCode: string) => {
      const routes: Record<string, string> = {
        revenue_ytd: '#/gl/journal',
        gross_profit_pct: '#/dashboard/jobs',
        backlog: '#/dashboard/backlog',
        wip_total: '#/dashboard/jobs',
        cash_position: '#/gl/journal',
        ar_aging_total: '#/ar/aging',
        ap_aging_total: '#/ap/aging',
        equipment_utilization: '#/dashboard/equipment',
        payroll_burden_rate: '#/dashboard/payroll',
        safety_emr: '#/dashboard/safety',
        bonding_utilized_pct: '#/dashboard/backlog',
        overbilling_total: '#/dashboard/jobs',
        underbilling_total: '#/dashboard/jobs',
      };
      const route = routes[kpiCode];
      if (route) {
        window.location.hash = route;
      }
    };

    // KPI sections (initially empty - will show empty state)
    if (state.executiveKPIs.length === 0 && state.operationalKPIs.length === 0) {
      wrapper.appendChild(
        buildEmptyState(
          'No KPI data available yet. Record benchmark data or connect live data sources to populate the executive dashboard.',
          'Configure Dashboard',
          () => { window.location.hash = '#/dashboard/configure'; },
        ),
      );
    } else {
      wrapper.appendChild(buildRevenueSection(state.executiveKPIs, handleDrillDown));
      wrapper.appendChild(buildAgingSection(state.executiveKPIs, handleDrillDown));
      wrapper.appendChild(buildOperationalSection(state.operationalKPIs, handleDrillDown));
    }

    // Quick links
    wrapper.appendChild(buildQuickLinks());

    container.appendChild(wrapper);
  },
};
