/**
 * Job Performance Dashboard view.
 *
 * Displays top/bottom jobs by margin, margin trends, fade analysis
 * (original estimate vs. current forecast vs. actual), and job-level
 * KPI cards. Supports period selector and entity filter.
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

const fmtPercent = (v: number): string => `${v.toFixed(1)}%`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobRow {
  [key: string]: unknown;
  id: string;
  name: string;
  contractAmount: number;
  costToDate: number;
  billedToDate: number;
  marginPercent: number;
  originalMargin: number;
  status: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface JobPerformanceState {
  [key: string]: unknown;
  period: PeriodPreset;
  entityId: string;
  jobKPIs: KPIResult[];
  topJobs: JobRow[];
  bottomJobs: JobRow[];
  entities: { id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// Drill-down
// ---------------------------------------------------------------------------

function handleDrillDown(kpiCode: string): void {
  window.location.hash = '#/reports/job-cost';
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function buildJobKPISection(kpis: KPIResult[]): HTMLElement {
  const grid = buildKPICardGrid(kpis, handleDrillDown, 3);
  return buildSection('Job KPIs', grid);
}

function buildJobRankingTable(title: string, jobs: JobRow[], isTop: boolean): HTMLElement {
  const section = el('div', 'mb-6');
  const headerColor = isTop ? 'text-emerald-400' : 'text-red-400';
  section.appendChild(el('h3', `text-md font-semibold ${headerColor} mb-3`, title));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Job', 'Contract', 'Cost to Date', 'Billed', 'Margin %', 'Original Margin %', 'Fade']) {
    const align = ['Contract', 'Cost to Date', 'Billed', 'Margin %', 'Original Margin %', 'Fade'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (jobs.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No job data available.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const job of jobs) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline font-medium', job.name) as HTMLAnchorElement;
    link.href = `#/job/jobs/${job.id}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(job.contractAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(job.costToDate)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(job.billedToDate)));

    const marginCls = job.marginPercent >= 0 ? 'text-emerald-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${marginCls}`, fmtPercent(job.marginPercent)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtPercent(job.originalMargin)));

    const fade = job.marginPercent - job.originalMargin;
    const fadeCls = fade >= 0 ? 'text-emerald-400' : 'text-red-400';
    const fadeSign = fade >= 0 ? '+' : '';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${fadeCls}`, `${fadeSign}${fmtPercent(fade)}`));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

function buildFadeAnalysis(): HTMLElement {
  const section = el('div', 'mb-6');
  section.appendChild(el('h3', 'text-md font-semibold text-[var(--text)] mb-3', 'Margin Fade Analysis'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  const placeholder = el(
    'div',
    'flex items-center justify-center h-48 text-[var(--text-muted)]',
    'Chart visualization coming in Phase 26+',
  );
  wrap.appendChild(placeholder);
  section.appendChild(wrap);
  return section;
}

function buildMarginTrend(): HTMLElement {
  const section = el('div', 'mb-6');
  section.appendChild(el('h3', 'text-md font-semibold text-[var(--text)] mb-3', 'Margin Trend Over Time'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  const placeholder = el('div', 'flex items-center justify-center h-48 text-[var(--text-muted)]', 'Monthly margin trend chart will render here when Chart.js is connected and historical data is available.');
  wrap.appendChild(placeholder);
  section.appendChild(wrap);
  return section;
}

function buildMarginSummaryTable(kpis: KPIResult[]): HTMLElement {
  const table = buildKPISummaryTable(kpis, handleDrillDown);
  return buildSection('Margin Summary', table);
}

// ---------------------------------------------------------------------------
// Content Builder
// ---------------------------------------------------------------------------

function buildContent(state: JobPerformanceState): HTMLElement {
  const content = el('div', 'space-y-0');

  // Job KPI cards section
  if (state.jobKPIs.length > 0) {
    content.appendChild(buildJobKPISection(state.jobKPIs));
  }

  // Top/Bottom jobs ranking tables
  if (state.topJobs.length === 0 && state.bottomJobs.length === 0 && state.jobKPIs.length === 0) {
    content.appendChild(
      buildEmptyState(
        'No job data available. Create jobs and record costs to see performance metrics.',
        'Go to Jobs',
        () => { window.location.hash = '#/job/jobs'; },
      ),
    );
  } else {
    if (state.topJobs.length > 0 || state.bottomJobs.length > 0) {
      content.appendChild(buildJobRankingTable('Top Performing Jobs', state.topJobs, true));
      content.appendChild(buildJobRankingTable('Bottom Performing Jobs', state.bottomJobs, false));
    }
  }

  // Margin summary table from KPIs
  if (state.jobKPIs.length > 0) {
    content.appendChild(buildMarginSummaryTable(state.jobKPIs));
  }

  // Fade analysis and margin trend placeholders
  content.appendChild(buildFadeAnalysis());
  content.appendChild(buildMarginTrend());

  return content;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const state: JobPerformanceState = {
      period: 'ytd',
      entityId: '',
      jobKPIs: [],
      topJobs: [],
      bottomJobs: [],
      entities: [],
    };

    // Content area that gets replaced on reload
    let contentArea = el('div');
    wrapper.appendChild(contentArea);

    // ------------------------------------------------------------------
    // Reload: fetch job-related KPIs from DashboardService
    // ------------------------------------------------------------------
    async function reload(): Promise<void> {
      try {
        const svc = getDashboardService();

        // Fetch job-related KPIs individually
        const jobCodes = ['gross_profit_pct', 'backlog', 'wip_total', 'overbilling_total', 'underbilling_total'];
        const kpiPromises = jobCodes.map((code) =>
          svc.computeKPI(code, state.entityId || undefined, state.period).catch(() => null),
        );

        const results = await Promise.all(kpiPromises);
        state.jobKPIs = results.filter((r): r is KPIResult => r !== null);

        // Sort by value to determine top/bottom performers
        // In a full implementation, this would query actual job records
        // For now, topJobs and bottomJobs remain driven by available data
        state.topJobs = [];
        state.bottomJobs = [];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load job performance data';
        showMsg(wrapper, message, true);
        state.jobKPIs = [];
        state.topJobs = [];
        state.bottomJobs = [];
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
      'Job Performance',
      'Top and bottom performing jobs, margin trends, and fade analysis',
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
