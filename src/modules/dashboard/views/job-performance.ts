/**
 * Job Performance Dashboard view.
 *
 * Displays top/bottom jobs by margin, margin trends, fade analysis
 * (original estimate vs. current forecast vs. actual), and job-level
 * KPI cards. Supports period selector and entity filter.
 */

import {
  buildPeriodSelector,
  buildEntityFilter,
  buildDashboardHeader,
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
// Sub-views
// ---------------------------------------------------------------------------

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
  const placeholder = el('div', 'flex items-center justify-center h-48 text-[var(--text-muted)]', 'Margin fade chart will render here when Chart.js is connected and job data is available.');
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
      'Job Performance',
      'Top and bottom performing jobs, margin trends, and fade analysis',
      periodSelector,
      entityFilter,
    );
    wrapper.appendChild(header);

    // Placeholder jobs data
    const topJobs: JobRow[] = [];
    const bottomJobs: JobRow[] = [];

    if (topJobs.length === 0 && bottomJobs.length === 0) {
      wrapper.appendChild(
        buildEmptyState(
          'No job data available. Create jobs and record costs to see performance metrics.',
          'Go to Jobs',
          () => { window.location.hash = '#/job/jobs'; },
        ),
      );
    } else {
      wrapper.appendChild(buildJobRankingTable('Top Performing Jobs', topJobs, true));
      wrapper.appendChild(buildJobRankingTable('Bottom Performing Jobs', bottomJobs, false));
    }

    wrapper.appendChild(buildFadeAnalysis());
    wrapper.appendChild(buildMarginTrend());

    container.appendChild(wrapper);
  },
};
