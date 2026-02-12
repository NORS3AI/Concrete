/**
 * KPI Cards - Reusable KPI card components for dashboard views.
 *
 * Provides DOM-building helpers for rendering KPI result cards with
 * status indicators, trend arrows, period labels, and drill-down hooks.
 */

import type { KPIResult, KPIFormat, KPIStatus, TrendDirection } from '../dashboard-service';

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
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format a KPI value based on its format type.
 */
export function formatKPIValue(value: number, format: KPIFormat): string {
  switch (format) {
    case 'currency': {
      if (Math.abs(value) >= 1_000_000_000) {
        return `$${(value / 1_000_000_000).toFixed(1)}B`;
      }
      if (Math.abs(value) >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(1)}M`;
      }
      if (Math.abs(value) >= 1_000) {
        return `$${(value / 1_000).toFixed(1)}K`;
      }
      return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'days':
      return `${value.toFixed(0)} days`;
    case 'number':
    default:
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
}

/**
 * Format change percent with sign.
 */
export function formatChangePercent(changePercent: number | undefined): string {
  if (changePercent === undefined) return '';
  const sign = changePercent >= 0 ? '+' : '';
  return `${sign}${changePercent.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Status Styling
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<KPIStatus, string> = {
  good: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  neutral: 'text-[var(--text-muted)]',
};

const STATUS_BG: Record<KPIStatus, string> = {
  good: 'bg-emerald-500/10 border-emerald-500/20',
  warning: 'bg-amber-500/10 border-amber-500/20',
  critical: 'bg-red-500/10 border-red-500/20',
  neutral: 'bg-zinc-500/10 border-zinc-500/20',
};

const STATUS_BADGE_COLORS: Record<KPIStatus, string> = {
  good: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
  neutral: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const TREND_ICONS: Record<TrendDirection, string> = {
  up: '\u2191',
  down: '\u2193',
  flat: '\u2192',
};

const TREND_COLORS: Record<TrendDirection, string> = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  flat: 'text-zinc-400',
};

// ---------------------------------------------------------------------------
// Single KPI Card
// ---------------------------------------------------------------------------

/**
 * Build a single KPI card DOM element.
 *
 * @param kpi - The KPI result to render.
 * @param onDrillDown - Optional callback invoked when the user clicks to drill down.
 * @returns HTMLElement representing the KPI card.
 */
export function buildKPICard(
  kpi: KPIResult,
  onDrillDown?: (kpiCode: string) => void,
): HTMLElement {
  const card = el(
    'div',
    `p-4 rounded-lg border ${STATUS_BG[kpi.status]} cursor-pointer hover:opacity-90 transition-opacity`,
  );

  if (onDrillDown) {
    card.addEventListener('click', () => onDrillDown(kpi.code));
    card.style.cursor = 'pointer';
  }

  // Header row: name + status badge
  const headerRow = el('div', 'flex items-center justify-between mb-2');
  headerRow.appendChild(el('span', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide', kpi.name));

  const statusBadge = el(
    'span',
    `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_COLORS[kpi.status]}`,
    kpi.status.charAt(0).toUpperCase() + kpi.status.slice(1),
  );
  headerRow.appendChild(statusBadge);
  card.appendChild(headerRow);

  // Value
  const valueEl = el('div', `text-2xl font-bold ${STATUS_COLORS[kpi.status]}`, formatKPIValue(kpi.value, kpi.format));
  card.appendChild(valueEl);

  // Target line (if available)
  if (kpi.target !== undefined) {
    const targetRow = el('div', 'text-xs text-[var(--text-muted)] mt-1');
    targetRow.textContent = `Target: ${formatKPIValue(kpi.target, kpi.format)}`;
    card.appendChild(targetRow);
  }

  // Trend + change percent row
  const trendRow = el('div', 'flex items-center gap-2 mt-2');

  const trendIcon = el('span', `text-sm font-bold ${TREND_COLORS[kpi.trend]}`, TREND_ICONS[kpi.trend]);
  trendRow.appendChild(trendIcon);

  if (kpi.changePercent !== undefined) {
    const changeCls = kpi.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400';
    const changeEl = el('span', `text-xs font-medium ${changeCls}`, formatChangePercent(kpi.changePercent));
    trendRow.appendChild(changeEl);
  }

  const periodEl = el('span', 'text-xs text-[var(--text-muted)]', kpi.periodLabel);
  trendRow.appendChild(periodEl);

  card.appendChild(trendRow);

  return card;
}

// ---------------------------------------------------------------------------
// KPI Card Grid
// ---------------------------------------------------------------------------

/**
 * Build a grid of KPI cards.
 *
 * @param kpis - Array of KPI results to render.
 * @param onDrillDown - Optional callback invoked when a card is clicked.
 * @param columns - Number of grid columns (default: 4).
 * @returns HTMLElement containing the grid of KPI cards.
 */
export function buildKPICardGrid(
  kpis: KPIResult[],
  onDrillDown?: (kpiCode: string) => void,
  columns: number = 4,
): HTMLElement {
  const grid = el('div', `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4`);

  for (const kpi of kpis) {
    grid.appendChild(buildKPICard(kpi, onDrillDown));
  }

  return grid;
}

// ---------------------------------------------------------------------------
// KPI Summary Table
// ---------------------------------------------------------------------------

/**
 * Build a table view of KPI results.
 *
 * @param kpis - Array of KPI results to render.
 * @param onDrillDown - Optional callback invoked when a row is clicked.
 * @returns HTMLElement containing the KPI summary table.
 */
export function buildKPISummaryTable(
  kpis: KPIResult[],
  onDrillDown?: (kpiCode: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  // Header
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['KPI', 'Value', 'Target', 'Status', 'Trend', 'Change', 'Period']) {
    const align = ['Value', 'Target', 'Change'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body
  const tbody = el('tbody');

  if (kpis.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No KPI data available. Configure benchmarks to see results.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const kpi of kpis) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    if (onDrillDown) {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => onDrillDown(kpi.code));
    }

    // KPI name
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', kpi.name));

    // Value
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${STATUS_COLORS[kpi.status]}`, formatKPIValue(kpi.value, kpi.format)));

    // Target
    const targetText = kpi.target !== undefined ? formatKPIValue(kpi.target, kpi.format) : '--';
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', targetText));

    // Status badge
    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_COLORS[kpi.status]}`,
      kpi.status.charAt(0).toUpperCase() + kpi.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    // Trend
    const tdTrend = el('td', 'py-2 px-3');
    const trendSpan = el('span', `font-bold ${TREND_COLORS[kpi.trend]}`, TREND_ICONS[kpi.trend]);
    tdTrend.appendChild(trendSpan);
    tr.appendChild(tdTrend);

    // Change percent
    const changeText = formatChangePercent(kpi.changePercent);
    const changeCls = (kpi.changePercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${changeCls}`, changeText || '--'));

    // Period
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', kpi.periodLabel));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Period Selector
// ---------------------------------------------------------------------------

/**
 * Build a period selector dropdown.
 *
 * @param currentPeriod - The currently selected period.
 * @param onChange - Callback when period changes.
 * @returns HTMLElement containing the period selector.
 */
export function buildPeriodSelector(
  currentPeriod: string,
  onChange: (period: string) => void,
): HTMLElement {
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const select = el('select', inputCls) as HTMLSelectElement;

  const periods = [
    { value: 'mtd', label: 'Month to Date' },
    { value: 'qtd', label: 'Quarter to Date' },
    { value: 'ytd', label: 'Year to Date' },
    { value: 'last12', label: 'Last 12 Months' },
    { value: 'custom', label: 'Custom Range' },
  ];

  for (const p of periods) {
    const opt = el('option', '', p.label) as HTMLOptionElement;
    opt.value = p.value;
    if (p.value === currentPeriod) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener('change', () => onChange(select.value));
  return select;
}

// ---------------------------------------------------------------------------
// Entity Filter
// ---------------------------------------------------------------------------

/**
 * Build an entity filter dropdown.
 *
 * @param entities - Array of { id, name } for entities.
 * @param currentEntityId - The currently selected entity ID (empty for all).
 * @param onChange - Callback when entity filter changes.
 * @returns HTMLElement containing the entity filter.
 */
export function buildEntityFilter(
  entities: { id: string; name: string }[],
  currentEntityId: string,
  onChange: (entityId: string) => void,
): HTMLElement {
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const select = el('select', inputCls) as HTMLSelectElement;

  const allOpt = el('option', '', 'All Entities') as HTMLOptionElement;
  allOpt.value = '';
  if (!currentEntityId) allOpt.selected = true;
  select.appendChild(allOpt);

  for (const entity of entities) {
    const opt = el('option', '', entity.name) as HTMLOptionElement;
    opt.value = entity.id;
    if (entity.id === currentEntityId) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener('change', () => onChange(select.value));
  return select;
}

// ---------------------------------------------------------------------------
// Dashboard Header
// ---------------------------------------------------------------------------

/**
 * Build a dashboard page header with title, period selector, and entity filter.
 */
export function buildDashboardHeader(
  title: string,
  subtitle: string,
  periodSelector: HTMLElement,
  entityFilter: HTMLElement,
): HTMLElement {
  const header = el('div', 'flex flex-wrap items-center justify-between gap-4 mb-6');

  const titleSection = el('div');
  titleSection.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', title));
  titleSection.appendChild(el('p', 'text-sm text-[var(--text-muted)] mt-1', subtitle));
  header.appendChild(titleSection);

  const controls = el('div', 'flex items-center gap-3');
  controls.appendChild(periodSelector);
  controls.appendChild(entityFilter);
  header.appendChild(controls);

  return header;
}

// ---------------------------------------------------------------------------
// Section Wrapper
// ---------------------------------------------------------------------------

/**
 * Build a section wrapper with title.
 */
export function buildSection(title: string, content: HTMLElement): HTMLElement {
  const section = el('div', 'mb-8');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', title));
  section.appendChild(content);
  return section;
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

/**
 * Build an empty state placeholder.
 */
export function buildEmptyState(message: string, actionLabel?: string, onAction?: () => void): HTMLElement {
  const wrapper = el('div', 'flex flex-col items-center justify-center py-12 text-center');
  wrapper.appendChild(el('p', 'text-[var(--text-muted)] mb-4', message));

  if (actionLabel && onAction) {
    const btn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', actionLabel);
    btn.addEventListener('click', onAction);
    wrapper.appendChild(btn);
  }

  return wrapper;
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  buildKPICard,
  buildKPICardGrid,
  buildKPISummaryTable,
  buildPeriodSelector,
  buildEntityFilter,
  buildDashboardHeader,
  buildSection,
  buildEmptyState,
  formatKPIValue,
  formatChangePercent,
};
