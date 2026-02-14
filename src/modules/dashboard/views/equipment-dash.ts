/**
 * Equipment Utilization Dashboard view.
 *
 * Displays equipment utilization rates, assigned vs. available equipment,
 * equipment cost per hour, maintenance schedules, and idle equipment alerts.
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

interface EquipmentState {
  [key: string]: unknown;
  period: PeriodPreset;
  entityId: string;
  entities: { id: string; name: string }[];
  utilizationKPI: KPIResult | null;
  operationalKPIs: KPIResult[];
  summaryKPIs: KPIResult[];
}

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

async function loadEquipmentData(state: EquipmentState): Promise<void> {
  const svc = getDashboardService();

  // Load the primary equipment utilization KPI
  state.utilizationKPI = await svc.computeKPI(
    'equipment_utilization',
    state.entityId || undefined,
    state.period,
  ).catch(() => null);

  // Load all operational KPIs and filter for equipment-related codes
  const operationalKPIs = await svc.computeOperationalKPIs(
    state.entityId || undefined,
    state.period,
  );
  state.operationalKPIs = operationalKPIs.filter(
    (k) => ['equipment_utilization'].includes(k.code),
  );

  // Build summary KPIs from the equipment-related data
  state.summaryKPIs = operationalKPIs.filter(
    (k) => ['equipment_utilization', 'overbilling_total', 'underbilling_total'].includes(k.code),
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

function buildUtilizationSummaryCards(state: EquipmentState): HTMLElement {
  const kpis: KPIResult[] = [];
  if (state.utilizationKPI) kpis.push(state.utilizationKPI);

  // Add any additional operational KPIs that weren't the main utilization one
  for (const kpi of state.operationalKPIs) {
    if (!kpis.find((k) => k.code === kpi.code)) {
      kpis.push(kpi);
    }
  }

  if (kpis.length === 0) {
    return buildEmptyState('No equipment KPI data available. Record benchmark data to see utilization metrics.');
  }

  return buildKPICardGrid(kpis, (code) => {
    window.location.hash = '#/reports/equipment';
  }, 4);
}

function buildUtilizationHighlight(state: EquipmentState): HTMLElement {
  if (!state.utilizationKPI) {
    return buildEmptyState('Equipment utilization data not available.');
  }

  const kpi = state.utilizationKPI;
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');

  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h3', 'text-base font-semibold text-[var(--text)]', 'Overall Utilization'));

  // Color-code utilization: >=75% emerald, 50-74% amber, <50% red
  let colorCls: string;
  let statusLabel: string;
  if (kpi.value >= 75) {
    colorCls = 'text-emerald-400';
    statusLabel = 'Healthy';
  } else if (kpi.value >= 50) {
    colorCls = 'text-amber-400';
    statusLabel = 'Moderate';
  } else {
    colorCls = 'text-red-400';
    statusLabel = 'Low';
  }

  const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${
    kpi.value >= 75 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
    kpi.value >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
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

function renderContent(container: HTMLElement, wrapper: HTMLElement, state: EquipmentState): void {
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
    'Equipment Utilization',
    'Equipment assignment, utilization rates, and cost analysis',
    periodSelector,
    entityFilter,
  );
  wrapper.appendChild(header);

  // Summary KPI cards: Total Equipment, Avg Utilization %, Total Hours, Total Cost
  wrapper.appendChild(buildSection('Utilization Summary', buildUtilizationSummaryCards(state)));

  // Utilization highlight with color-coding
  wrapper.appendChild(buildSection('Utilization Overview', buildUtilizationHighlight(state)));

  // Utilization trend chart placeholder
  wrapper.appendChild(
    buildSection('Utilization Trend', buildEmptyState('Utilization trend chart coming in Phase 26+')),
  );

  // Equipment operational KPI detail table
  wrapper.appendChild(
    buildSection(
      'Equipment Detail',
      state.summaryKPIs.length > 0
        ? buildKPISummaryTable(state.summaryKPIs, (code) => {
            window.location.hash = '#/reports/equipment';
          })
        : buildEmptyState('No equipment detail data available. Record benchmark data to see the breakdown.'),
    ),
  );

  // Drill-down link
  const linkRow = el('div', 'mb-8');
  const link = el('a', 'text-sm text-[var(--accent)] hover:underline font-medium', 'View detailed equipment report \u2192') as HTMLAnchorElement;
  link.href = '#/reports/equipment';
  linkRow.appendChild(link);
  wrapper.appendChild(linkRow);
}

async function reload(container: HTMLElement, state: EquipmentState): Promise<void> {
  const wrapper = container.querySelector('[data-equipment-wrapper]') as HTMLElement;
  if (!wrapper) return;

  try {
    await loadEquipmentData(state);
    renderContent(container, wrapper, state);
  } catch (err) {
    showMsg(wrapper, `Failed to load equipment data: ${err instanceof Error ? err.message : String(err)}`, true);
  }
}

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');
    wrapper.setAttribute('data-equipment-wrapper', '1');
    container.appendChild(wrapper);

    // Initial loading state
    const loadingMsg = el('div', 'flex items-center justify-center py-12 text-[var(--text-muted)]', 'Loading equipment data...');
    wrapper.appendChild(loadingMsg);

    // Initialize state
    const state: EquipmentState = {
      period: 'ytd',
      entityId: '',
      entities: [],
      utilizationKPI: null,
      operationalKPIs: [],
      summaryKPIs: [],
    };

    // Load data and render
    loadEquipmentData(state)
      .then(() => {
        renderContent(container, wrapper, state);
      })
      .catch((err) => {
        wrapper.innerHTML = '';
        showMsg(wrapper, `Failed to load equipment data: ${err instanceof Error ? err.message : String(err)}`, true);
        wrapper.appendChild(
          buildEmptyState(
            'No equipment data available. Add equipment records to see utilization metrics.',
            'Go to Equipment',
            () => { window.location.hash = '#/equip/equipment'; },
          ),
        );
      });
  },
};
