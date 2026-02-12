/**
 * Backlog Analysis Dashboard view.
 *
 * Displays awarded vs. completed vs. remaining backlog, backlog aging,
 * backlog by entity/division, and bonding capacity utilization.
 * Supports period selector and entity filter.
 */

import {
  buildPeriodSelector,
  buildEntityFilter,
  buildDashboardHeader,
  buildSection,
  buildEmptyState,
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

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BacklogRow {
  [key: string]: unknown;
  jobId: string;
  jobName: string;
  contractAmount: number;
  completedAmount: number;
  remainingAmount: number;
  percentComplete: number;
  status: string;
}

interface BacklogSummary {
  [key: string]: unknown;
  totalAwarded: number;
  totalCompleted: number;
  totalRemaining: number;
  jobCount: number;
  averageCompletion: number;
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function buildBacklogSummaryCards(summary: BacklogSummary): HTMLElement {
  const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4');

  const cards = [
    { label: 'Total Awarded', value: formatKPIValue(summary.totalAwarded, 'currency'), cls: 'text-blue-400' },
    { label: 'Completed', value: formatKPIValue(summary.totalCompleted, 'currency'), cls: 'text-emerald-400' },
    { label: 'Remaining', value: formatKPIValue(summary.totalRemaining, 'currency'), cls: 'text-amber-400' },
    { label: 'Active Jobs', value: summary.jobCount.toString(), cls: 'text-[var(--text)]' },
    { label: 'Avg. Completion', value: `${summary.averageCompletion.toFixed(1)}%`, cls: 'text-[var(--text)]' },
  ];

  for (const card of cards) {
    const cardEl = el('div', 'p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]');
    cardEl.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', card.label));
    cardEl.appendChild(el('div', `text-2xl font-bold ${card.cls}`, card.value));
    grid.appendChild(cardEl);
  }

  return grid;
}

function buildBacklogChart(): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  const placeholder = el('div', 'flex items-center justify-center h-64 text-[var(--text-muted)]', 'Backlog waterfall chart (awarded vs. completed vs. remaining) will render here when Chart.js is connected and job data is available.');
  wrap.appendChild(placeholder);
  return wrap;
}

function buildBacklogTable(rows: BacklogRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Job', 'Contract', 'Completed', 'Remaining', '% Complete', 'Status']) {
    const align = ['Contract', 'Completed', 'Remaining', '% Complete'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No backlog data available.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline font-medium', row.jobName) as HTMLAnchorElement;
    link.href = `#/job/jobs/${row.jobId}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.contractAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(row.completedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', fmtCurrency(row.remainingAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', `${row.percentComplete.toFixed(1)}%`));

    const statusBadge = row.status === 'active'
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    const tdStatus = el('td', 'py-2 px-3');
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge}`, row.status));
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function buildBondingCapacity(): HTMLElement {
  const section = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4');

  const bondCards = [
    { label: 'Bonding Capacity', value: '--', sublabel: 'Total available bonding limit' },
    { label: 'Currently Bonded', value: '--', sublabel: 'Active bonded project value' },
    { label: 'Utilization', value: '--', sublabel: 'Percentage of capacity used' },
  ];

  for (const card of bondCards) {
    const cardEl = el('div', 'p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]');
    cardEl.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', card.label));
    cardEl.appendChild(el('div', 'text-2xl font-bold text-[var(--text)]', card.value));
    cardEl.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', card.sublabel));
    section.appendChild(cardEl);
  }

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
      'Backlog Analysis',
      'Awarded vs. completed vs. remaining contract values and bonding capacity',
      periodSelector,
      entityFilter,
    );
    wrapper.appendChild(header);

    // Summary cards
    const summary: BacklogSummary = {
      totalAwarded: 0,
      totalCompleted: 0,
      totalRemaining: 0,
      jobCount: 0,
      averageCompletion: 0,
    };
    wrapper.appendChild(buildSection('Backlog Summary', buildBacklogSummaryCards(summary)));

    // Chart
    wrapper.appendChild(buildSection('Backlog Waterfall', buildBacklogChart()));

    // Table
    const backlogRows: BacklogRow[] = [];
    wrapper.appendChild(buildSection('Backlog Detail', buildBacklogTable(backlogRows)));

    // Bonding capacity
    wrapper.appendChild(buildSection('Bonding Capacity', buildBondingCapacity()));

    if (backlogRows.length === 0) {
      wrapper.appendChild(
        buildEmptyState(
          'No backlog data available. Create jobs with contract amounts to see backlog analysis.',
          'Go to Jobs',
          () => { window.location.hash = '#/job/jobs'; },
        ),
      );
    }

    container.appendChild(wrapper);
  },
};
