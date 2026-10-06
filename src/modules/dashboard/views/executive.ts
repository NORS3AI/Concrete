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

function buildSimulationBanner(): HTMLElement {
  const isSimActive = localStorage.getItem('concrete_sim_active') === '1';
  if (isSimActive) return el('div');

  const banner = el('div', 'relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/40 via-emerald-800/20 to-slate-900/60 p-8 mb-8');

  const glow = el('div', 'absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none');
  banner.appendChild(glow);
  const glow2 = el('div', 'absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none');
  banner.appendChild(glow2);

  const inner = el('div', 'relative z-10 flex flex-col md:flex-row items-center gap-6');

  const icon = el('div', 'flex-shrink-0 w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center');
  icon.innerHTML = '<svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"/></svg>';
  inner.appendChild(icon);

  const textCol = el('div', 'flex-1 text-center md:text-left');
  textCol.appendChild(el('h3', 'text-xl font-bold text-white mb-1', 'Try Simulation Mode'));
  textCol.appendChild(el('p', 'text-sm text-emerald-200/70 max-w-lg', 'Load 2,000+ realistic construction finance records across all modules. Explore dashboards, reports, AP/AR, payroll, jobs, and more with demo data you can remove anytime.'));
  inner.appendChild(textCol);

  const btnWrap = el('div', 'flex-shrink-0');
  const btn = el('button', 'sim-btn flex items-center gap-3 px-6 py-3 rounded-full text-base font-bold text-white cursor-pointer border-0 outline-none');
  btn.innerHTML = '<span class="sim-dot"></span><span>Start Simulation</span>';
  btn.addEventListener('click', () => {
    const navBtn = document.getElementById('sim-mode-btn');
    if (navBtn) navBtn.click();
  });
  btnWrap.appendChild(btn);
  inner.appendChild(btnWrap);

  banner.appendChild(inner);
  return banner;
}

function buildContent(state: ExecutiveState): HTMLElement {
  const content = el('div', 'space-y-0');

  content.appendChild(buildSimulationBanner());

  const allZero = state.executiveKPIs.every(k => k.value === 0) && state.operationalKPIs.every(k => k.value === 0);

  if (state.executiveKPIs.length === 0 && state.operationalKPIs.length === 0) {
    content.appendChild(
      buildEmptyState(
        'No KPI data available yet. Start Simulation Mode above to explore with demo data, or connect live data sources.',
        'Configure Dashboard',
        () => { window.location.hash = '#/dashboard/configure'; },
      ),
    );
  } else if (allZero) {
    content.appendChild(
      buildEmptyState(
        'All metrics are at $0. Click "Start Simulation" above to load demo data and explore the platform.',
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
