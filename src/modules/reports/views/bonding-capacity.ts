/**
 * Bonding Capacity view.
 * Renders the surety bonding capacity analysis report showing financial
 * ratios, backlog, aggregate/single-job bonding limits, available capacity,
 * and WIP adjustment for surety underwriting purposes.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtRatio = (v: number): string => v.toFixed(2);

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
// KPI Card
// ---------------------------------------------------------------------------

function buildKpiCard(label: string, value: string, subtitle?: string, variant?: 'positive' | 'negative' | 'warning' | 'neutral'): HTMLElement {
  const card = el('div', 'p-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg');

  card.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', label));

  let valueCls = 'text-xl font-bold font-mono';
  if (variant === 'positive') valueCls += ' text-emerald-400';
  else if (variant === 'negative') valueCls += ' text-red-400';
  else if (variant === 'warning') valueCls += ' text-amber-400';
  else valueCls += ' text-[var(--text)]';

  card.appendChild(el('div', valueCls, value));

  if (subtitle) {
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', subtitle));
  }

  return card;
}

// ---------------------------------------------------------------------------
// Detail Table
// ---------------------------------------------------------------------------

function buildDetailTable(data: BondingCapacityData): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const tbody = el('tbody');
  const rows: Array<{ label: string; value: string; section?: boolean }> = [
    { label: 'Financial Position', value: '', section: true },
    { label: 'Total Assets', value: fmtCurrency(data.totalAssets) },
    { label: 'Total Liabilities', value: fmtCurrency(data.totalLiabilities) },
    { label: 'Net Worth (Equity)', value: fmtCurrency(data.netWorth) },
    { label: 'Working Capital', value: fmtCurrency(data.workingCapital) },
    { label: 'Financial Ratios', value: '', section: true },
    { label: 'Current Ratio', value: fmtRatio(data.currentRatio) },
    { label: 'Debt-to-Equity Ratio', value: fmtRatio(data.debtToEquity) },
    { label: 'Bonding Capacity', value: '', section: true },
    { label: 'Aggregate Bonding Limit (10x WC)', value: fmtCurrency(data.aggregateBondingLimit) },
    { label: 'Single Job Limit (Aggregate / 3)', value: fmtCurrency(data.singleJobLimit) },
    { label: 'Current Bonded Work', value: fmtCurrency(data.currentBondedWork) },
    { label: 'Available Capacity', value: fmtCurrency(data.availableCapacity) },
    { label: 'Work-in-Progress', value: '', section: true },
    { label: 'Backlog (Remaining Contract Value)', value: fmtCurrency(data.backlog) },
    { label: 'WIP Adjustment (Over/Under Billing)', value: fmtCurrency(data.wipAdjustment) },
  ];

  for (const row of rows) {
    if (row.section) {
      const tr = el('tr', 'bg-[var(--surface)]');
      const td = el('td', 'py-2 px-4 font-semibold text-[var(--accent)]', row.label);
      td.setAttribute('colspan', '2');
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      const tr = el('tr', 'border-b border-[var(--border)]');
      tr.appendChild(el('td', 'py-2 px-4 text-[var(--text-muted)]', row.label));
      tr.appendChild(el('td', 'py-2 px-4 text-right font-mono text-[var(--text)]', row.value));
      tbody.appendChild(tr);
    }
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Export Bar
// ---------------------------------------------------------------------------

function buildExportBar(): HTMLElement {
  const bar = el('div', 'flex items-center gap-3 mt-4');
  bar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Export:'));

  for (const format of ['PDF', 'CSV', 'Excel']) {
    const btn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', format);
    bar.appendChild(btn);
  }

  return bar;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Bonding Capacity Analysis'));

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const generateBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 mb-4', 'Generate Report');
    wrapper.appendChild(generateBtn);

    // KPI cards
    const kpiGrid = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6');
    kpiGrid.appendChild(buildKpiCard('Net Worth', '$0', 'Total Assets - Liabilities', 'neutral'));
    kpiGrid.appendChild(buildKpiCard('Working Capital', '$0', 'Current Assets - Current Liabilities', 'neutral'));
    kpiGrid.appendChild(buildKpiCard('Available Capacity', '$0', 'Aggregate Limit - Bonded Work', 'neutral'));
    kpiGrid.appendChild(buildKpiCard('Current Ratio', '0.00', 'Current Assets / Current Liabilities', 'neutral'));
    wrapper.appendChild(kpiGrid);

    // Default empty data
    const defaultData: BondingCapacityData = {
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0,
      workingCapital: 0,
      currentRatio: 0,
      debtToEquity: 0,
      backlog: 0,
      aggregateBondingLimit: 0,
      singleJobLimit: 0,
      availableCapacity: 0,
      currentBondedWork: 0,
      wipAdjustment: 0,
    };

    wrapper.appendChild(buildDetailTable(defaultData));
    wrapper.appendChild(buildExportBar());

    container.appendChild(wrapper);
  },
};
