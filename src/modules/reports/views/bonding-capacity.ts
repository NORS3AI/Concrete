/**
 * Bonding Capacity view.
 * Renders the surety bonding capacity analysis report showing financial
 * ratios, backlog, aggregate/single-job bonding limits, available capacity,
 * and WIP adjustment for surety underwriting purposes. Wired to ReportsService.
 */

import { getReportsService } from '../service-accessor';

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

const fmtRatio = (v: number): string => v.toFixed(2);

function exportCSV(filename: string, headers: string[], rows: string[][]): void {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = el('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BondingCapacityData {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  workingCapital: number;
  currentRatio: number;
  debtToEquity: number;
  backlog: number;
  aggregateBondingLimit: number;
  singleJobLimit: number;
  availableCapacity: number;
  currentBondedWork: number;
  wipAdjustment: number;
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

let currentData: BondingCapacityData | null = null;

function buildKpiCards(data: BondingCapacityData): HTMLElement {
  const grid = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6');
  const cardCls = 'p-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg';

  // Net Worth
  const c1 = el('div', cardCls);
  c1.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', 'Net Worth'));
  const nwCls = data.netWorth >= 0 ? 'text-xl font-bold font-mono text-emerald-400' : 'text-xl font-bold font-mono text-red-400';
  c1.appendChild(el('div', nwCls, fmtCurrency(data.netWorth)));
  c1.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', 'Total Assets - Liabilities'));
  grid.appendChild(c1);

  // Working Capital
  const c2 = el('div', cardCls);
  c2.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', 'Working Capital'));
  const wcCls = data.workingCapital >= 0 ? 'text-xl font-bold font-mono text-emerald-400' : 'text-xl font-bold font-mono text-red-400';
  c2.appendChild(el('div', wcCls, fmtCurrency(data.workingCapital)));
  c2.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', 'Current Assets - Current Liabilities'));
  grid.appendChild(c2);

  // Available Capacity (color-coded)
  const c3 = el('div', cardCls);
  c3.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', 'Available Capacity'));
  const capPct = data.aggregateBondingLimit !== 0
    ? (data.availableCapacity / data.aggregateBondingLimit) * 100
    : 0;
  const capCls = capPct > 50
    ? 'text-xl font-bold font-mono text-emerald-400'
    : capPct >= 25
    ? 'text-xl font-bold font-mono text-amber-400'
    : 'text-xl font-bold font-mono text-red-400';
  c3.appendChild(el('div', capCls, fmtCurrency(data.availableCapacity)));
  c3.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', 'Aggregate Limit - Bonded Work'));
  grid.appendChild(c3);

  // Current Ratio
  const c4 = el('div', cardCls);
  c4.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', 'Current Ratio'));
  const crCls = data.currentRatio >= 1.5 ? 'text-xl font-bold font-mono text-emerald-400'
    : data.currentRatio >= 1.0 ? 'text-xl font-bold font-mono text-amber-400'
    : 'text-xl font-bold font-mono text-red-400';
  c4.appendChild(el('div', crCls, fmtRatio(data.currentRatio)));
  c4.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', 'Current Assets / Current Liabilities'));
  grid.appendChild(c4);

  return grid;
}

function buildDetailSections(data: BondingCapacityData): HTMLElement {
  const container = el('div', 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4');

  // Financial Position
  const fpCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const fpTitle = el('div', 'py-2 px-4 font-semibold text-[var(--accent)] bg-[var(--surface)]', 'Financial Position');
  fpCard.appendChild(fpTitle);
  const fpItems: Array<{ label: string; value: string }> = [
    { label: 'Total Assets', value: fmtCurrency(data.totalAssets) },
    { label: 'Total Liabilities', value: fmtCurrency(data.totalLiabilities) },
    { label: 'Net Worth', value: fmtCurrency(data.netWorth) },
    { label: 'Working Capital', value: fmtCurrency(data.workingCapital) },
  ];
  for (const item of fpItems) {
    const row = el('div', 'flex justify-between py-2 px-4 border-b border-[var(--border)]');
    row.appendChild(el('span', 'text-sm text-[var(--text-muted)]', item.label));
    row.appendChild(el('span', 'text-sm font-mono text-[var(--text)]', item.value));
    fpCard.appendChild(row);
  }
  container.appendChild(fpCard);

  // Financial Ratios
  const frCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const frTitle = el('div', 'py-2 px-4 font-semibold text-[var(--accent)] bg-[var(--surface)]', 'Financial Ratios');
  frCard.appendChild(frTitle);
  const frItems: Array<{ label: string; value: string }> = [
    { label: 'Current Ratio', value: fmtRatio(data.currentRatio) },
    { label: 'Debt-to-Equity', value: fmtRatio(data.debtToEquity) },
  ];
  for (const item of frItems) {
    const row = el('div', 'flex justify-between py-2 px-4 border-b border-[var(--border)]');
    row.appendChild(el('span', 'text-sm text-[var(--text-muted)]', item.label));
    row.appendChild(el('span', 'text-sm font-mono text-[var(--text)]', item.value));
    frCard.appendChild(row);
  }
  container.appendChild(frCard);

  // Bonding Capacity
  const bcCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const bcTitle = el('div', 'py-2 px-4 font-semibold text-[var(--accent)] bg-[var(--surface)]', 'Bonding Capacity');
  bcCard.appendChild(bcTitle);

  const capPct = data.aggregateBondingLimit !== 0
    ? (data.availableCapacity / data.aggregateBondingLimit) * 100
    : 0;

  const bcItems: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: 'Aggregate Limit', value: fmtCurrency(data.aggregateBondingLimit) },
    { label: 'Single Job Limit', value: fmtCurrency(data.singleJobLimit) },
    { label: 'Current Bonded Work', value: fmtCurrency(data.currentBondedWork) },
    { label: 'Available Capacity', value: fmtCurrency(data.availableCapacity), highlight: true },
  ];
  for (const item of bcItems) {
    const row = el('div', 'flex justify-between py-2 px-4 border-b border-[var(--border)]');
    row.appendChild(el('span', 'text-sm text-[var(--text-muted)]', item.label));
    if (item.highlight) {
      const valCls = capPct > 50 ? 'text-sm font-mono text-emerald-400'
        : capPct >= 25 ? 'text-sm font-mono text-amber-400'
        : 'text-sm font-mono text-red-400';
      row.appendChild(el('span', valCls, item.value));
    } else {
      row.appendChild(el('span', 'text-sm font-mono text-[var(--text)]', item.value));
    }
    bcCard.appendChild(row);
  }
  container.appendChild(bcCard);

  // Work-in-Progress
  const wipCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const wipTitle = el('div', 'py-2 px-4 font-semibold text-[var(--accent)] bg-[var(--surface)]', 'Work-in-Progress');
  wipCard.appendChild(wipTitle);
  const wipItems: Array<{ label: string; value: string }> = [
    { label: 'Backlog', value: fmtCurrency(data.backlog) },
    { label: 'WIP Adjustment', value: fmtCurrency(data.wipAdjustment) },
  ];
  for (const item of wipItems) {
    const row = el('div', 'flex justify-between py-2 px-4 border-b border-[var(--border)]');
    row.appendChild(el('span', 'text-sm text-[var(--text-muted)]', item.label));
    row.appendChild(el('span', 'text-sm font-mono text-[var(--text)]', item.value));
    wipCard.appendChild(row);
  }
  container.appendChild(wipCard);

  return container;
}

function renderContent(): void {
  wrapper.innerHTML = '';

  // Header
  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Bonding Capacity Analysis'));
  const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
  backLink.href = '#/reports';
  headerRow.appendChild(backLink);
  wrapper.appendChild(headerRow);

  // Generate button
  const generateBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 mb-4', 'Generate Report');
  wrapper.appendChild(generateBtn);

  // Content area (KPI cards + detail sections)
  const contentArea = el('div');
  wrapper.appendChild(contentArea);

  // Export bar
  const exportBar = el('div', 'flex items-center gap-3 mt-4');
  exportBar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Export:'));
  const csvBtn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'CSV');
  csvBtn.addEventListener('click', () => {
    if (!currentData) {
      showMsg(wrapper, 'No data to export. Generate a report first.', true);
      return;
    }
    const d = currentData;
    const headers = ['Metric', 'Value'];
    const csvRows = [
      ['Total Assets', d.totalAssets.toFixed(2)],
      ['Total Liabilities', d.totalLiabilities.toFixed(2)],
      ['Net Worth', d.netWorth.toFixed(2)],
      ['Working Capital', d.workingCapital.toFixed(2)],
      ['Current Ratio', d.currentRatio.toFixed(2)],
      ['Debt-to-Equity', d.debtToEquity.toFixed(2)],
      ['Aggregate Bonding Limit', d.aggregateBondingLimit.toFixed(2)],
      ['Single Job Limit', d.singleJobLimit.toFixed(2)],
      ['Current Bonded Work', d.currentBondedWork.toFixed(2)],
      ['Available Capacity', d.availableCapacity.toFixed(2)],
      ['Backlog', d.backlog.toFixed(2)],
      ['WIP Adjustment', d.wipAdjustment.toFixed(2)],
    ];
    exportCSV('bonding-capacity.csv', headers, csvRows);
    showMsg(wrapper, 'CSV exported successfully.', false);
  });
  exportBar.appendChild(csvBtn);
  wrapper.appendChild(exportBar);

  // Generate handler
  generateBtn.addEventListener('click', () => {
    void (async () => {
      try {
        const svc = getReportsService();
        const data = await svc.generateBondingCapacity();
        currentData = data;

        contentArea.innerHTML = '';
        contentArea.appendChild(buildKpiCards(data));
        contentArea.appendChild(buildDetailSections(data));

        showMsg(wrapper, 'Bonding capacity report generated successfully.', false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Operation failed';
        showMsg(wrapper, message, true);
      }
    })();
  });
}

void (async () => {
  try {
    const svc = getReportsService();
    void svc;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    showMsg(wrapper, message, true);
  }
})();

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    currentData = null;
    renderContent();
    container.appendChild(wrapper);
  },
};
