/**
 * Backlog Analysis Dashboard view.
 *
 * Displays awarded vs. completed vs. remaining backlog, backlog aging,
 * backlog by entity/division, and bonding capacity utilization.
 * Supports period selector and entity filter.
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

interface BacklogState {
  [key: string]: unknown;
  period: PeriodPreset;
  entityId: string;
  entities: { id: string; name: string }[];
  backlogKPI: KPIResult | null;
  revenueKPI: KPIResult | null;
  wipKPI: KPIResult | null;
  bondingKPI: KPIResult | null;
  detailKPIs: KPIResult[];
  bondingKPIs: KPIResult[];
}

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

async function loadBacklogData(state: BacklogState): Promise<void> {
  const svc = getDashboardService();

  const [backlogKPI, revenueKPI, wipKPI, bondingKPI] = await Promise.all([
    svc.computeKPI('backlog', state.entityId || undefined, state.period).catch(() => null),
    svc.computeKPI('revenue_ytd', state.entityId || undefined, state.period).catch(() => null),
    svc.computeKPI('wip_total', state.entityId || undefined, state.period).catch(() => null),
    svc.computeKPI('bonding_utilized_pct', state.entityId || undefined, state.period).catch(() => null),
  ]);

  state.backlogKPI = backlogKPI;
  state.revenueKPI = revenueKPI;
  state.wipKPI = wipKPI;
  state.bondingKPI = bondingKPI;

  // Load executive KPIs for the detail table (backlog-related subset)
  const executiveKPIs = await svc.computeExecutiveKPIs(
    state.entityId || undefined,
    state.period,
  );
  state.detailKPIs = executiveKPIs.filter(
    (k) => ['backlog', 'wip_total', 'revenue_ytd', 'overbilling_total', 'underbilling_total'].includes(k.code),
  );

  // Load bonding-related KPIs
  const operationalKPIs = await svc.computeOperationalKPIs(
    state.entityId || undefined,
    state.period,
  );
  state.bondingKPIs = operationalKPIs.filter(
    (k) => ['bonding_utilized_pct'].includes(k.code),
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

function buildBacklogSummaryCards(state: BacklogState): HTMLElement {
  const kpis: KPIResult[] = [];
  if (state.backlogKPI) kpis.push(state.backlogKPI);
  if (state.revenueKPI) kpis.push(state.revenueKPI);
  if (state.wipKPI) kpis.push(state.wipKPI);
  if (state.bondingKPI) kpis.push(state.bondingKPI);

  if (kpis.length === 0) {
    return buildEmptyState('No backlog KPI data available. Record benchmark data to see backlog metrics.');
  }

  return buildKPICardGrid(kpis, (code) => {
    const routes: Record<string, string> = {
      backlog: '#/reports/bonding',
      revenue_ytd: '#/gl/journal',
      wip_total: '#/dashboard/jobs',
      bonding_utilized_pct: '#/reports/bonding',
    };
    const route = routes[code];
    if (route) window.location.hash = route;
  }, 4);
}

function buildBondingCapacityCards(state: BacklogState): HTMLElement {
  if (state.bondingKPIs.length === 0) {
    return buildEmptyState('No bonding data available. Record bonding benchmarks to see capacity metrics.');
  }

  const grid = el('div', 'space-y-4');

  // Show bonding KPIs as cards
  const cardGrid = buildKPICardGrid(state.bondingKPIs, (code) => {
    window.location.hash = '#/reports/bonding';
  }, 3);
  grid.appendChild(cardGrid);

  // Drill-down link
  const linkRow = el('div', 'mt-4');
  const link = el('a', 'text-sm text-[var(--accent)] hover:underline font-medium', 'View detailed bonding report \u2192') as HTMLAnchorElement;
  link.href = '#/reports/bonding';
  linkRow.appendChild(link);
  grid.appendChild(linkRow);

  return grid;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderContent(container: HTMLElement, wrapper: HTMLElement, state: BacklogState): void {
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
    'Backlog Analysis',
    'Awarded vs. completed vs. remaining contract values and bonding capacity',
    periodSelector,
    entityFilter,
  );
  wrapper.appendChild(header);

  // Summary KPI cards: Backlog, Awarded (Revenue YTD), WIP, Bonding
  wrapper.appendChild(buildSection('Backlog Summary', buildBacklogSummaryCards(state)));

  // Waterfall chart placeholder
  wrapper.appendChild(
    buildSection('Backlog Waterfall', buildEmptyState('Backlog waterfall chart coming in Phase 26+')),
  );

  // Backlog detail table using buildKPISummaryTable
  wrapper.appendChild(
    buildSection(
      'Backlog Breakdown',
      state.detailKPIs.length > 0
        ? buildKPISummaryTable(state.detailKPIs, (code) => {
            window.location.hash = '#/reports/bonding';
          })
        : buildEmptyState('No backlog detail data available. Record benchmark data to see the breakdown.'),
    ),
  );

  // Bonding capacity section
  wrapper.appendChild(buildSection('Bonding Capacity', buildBondingCapacityCards(state)));
}

async function reload(container: HTMLElement, state: BacklogState): Promise<void> {
  const wrapper = container.querySelector('[data-backlog-wrapper]') as HTMLElement;
  if (!wrapper) return;

  try {
    await loadBacklogData(state);
    renderContent(container, wrapper, state);
  } catch (err) {
    showMsg(wrapper, `Failed to load backlog data: ${err instanceof Error ? err.message : String(err)}`, true);
  }
}

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');
    wrapper.setAttribute('data-backlog-wrapper', '1');
    container.appendChild(wrapper);

    // Initial loading state
    const loadingMsg = el('div', 'flex items-center justify-center py-12 text-[var(--text-muted)]', 'Loading backlog data...');
    wrapper.appendChild(loadingMsg);

    // Initialize state
    const state: BacklogState = {
      period: 'ytd',
      entityId: '',
      entities: [],
      backlogKPI: null,
      revenueKPI: null,
      wipKPI: null,
      bondingKPI: null,
      detailKPIs: [],
      bondingKPIs: [],
    };

    // Load data and render
    loadBacklogData(state)
      .then(() => {
        renderContent(container, wrapper, state);
      })
      .catch((err) => {
        wrapper.innerHTML = '';
        showMsg(wrapper, `Failed to load backlog data: ${err instanceof Error ? err.message : String(err)}`, true);
        wrapper.appendChild(
          buildEmptyState(
            'No backlog data available. Create jobs with contract amounts to see backlog analysis.',
            'Go to Jobs',
            () => { window.location.hash = '#/job/jobs'; },
          ),
        );
      });
  },
};
