/**
 * Earned Value Management (EVM) Dashboard view.
 * Displays CPI, SPI, EAC, ETC, VAC metrics with KPI cards and chart placeholders.
 * Wired to ProjectService for data operations.
 */

import { getProjectService } from '../service-accessor';

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

function parseProjectId(): string {
  const hash = window.location.hash;
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts.length >= 2 && parts[0] === 'project') return parts[1];
  return '';
}

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EVMData {
  bcws: number;
  bcwp: number;
  acwp: number;
  cpi: number;
  spi: number;
  eac: number;
  etc: number;
  vac: number;
  budgetedCost: number;
}

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------

function buildKPICards(data: EVMData): HTMLElement {
  const grid = el('div', 'grid grid-cols-4 gap-3 mb-6');

  const buildCard = (label: string, value: string, subtitle: string, colorCls: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-2xl font-bold font-mono ${colorCls}`, value));
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', subtitle));
    return card;
  };

  const cpiColor = data.cpi >= 1 ? 'text-emerald-400' : data.cpi >= 0.9 ? 'text-amber-400' : 'text-red-400';
  const spiColor = data.spi >= 1 ? 'text-emerald-400' : data.spi >= 0.9 ? 'text-amber-400' : 'text-red-400';
  const vacColor = data.vac >= 0 ? 'text-emerald-400' : 'text-red-400';

  grid.appendChild(buildCard('CPI (Cost Performance)', data.cpi.toFixed(2), data.cpi >= 1 ? 'Under budget' : 'Over budget', cpiColor));
  grid.appendChild(buildCard('SPI (Schedule Performance)', data.spi.toFixed(2), data.spi >= 1 ? 'Ahead of schedule' : 'Behind schedule', spiColor));
  grid.appendChild(buildCard('EAC (Estimate at Completion)', fmtCurrency(data.eac), `Budget: ${fmtCurrency(data.budgetedCost)}`, 'text-[var(--text)]'));
  grid.appendChild(buildCard('VAC (Variance at Completion)', fmtCurrency(data.vac), data.vac >= 0 ? 'Favorable' : 'Unfavorable', vacColor));

  return grid;
}

// ---------------------------------------------------------------------------
// Cost Summary Table
// ---------------------------------------------------------------------------

function buildCostSummary(data: EVMData): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-6');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Cost Summary'));

  const table = el('table', 'w-full text-sm');
  const tbody = el('tbody');

  const rows = [
    { label: 'BCWS (Budgeted Cost of Work Scheduled)', value: fmtCurrency(data.bcws) },
    { label: 'BCWP (Budgeted Cost of Work Performed)', value: fmtCurrency(data.bcwp) },
    { label: 'ACWP (Actual Cost of Work Performed)', value: fmtCurrency(data.acwp) },
    { label: 'ETC (Estimate to Complete)', value: fmtCurrency(data.etc) },
    { label: 'EAC (Estimate at Completion)', value: fmtCurrency(data.eac) },
    { label: 'Original Budget', value: fmtCurrency(data.budgetedCost) },
    { label: 'VAC (Variance at Completion)', value: fmtCurrency(data.vac) },
  ];

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)]');
    tr.appendChild(el('td', 'py-2 px-2 text-[var(--text-muted)]', row.label));
    tr.appendChild(el('td', 'py-2 px-2 text-right font-mono text-[var(--text)]', row.value));
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  card.appendChild(table);
  return card;
}

// ---------------------------------------------------------------------------
// Chart Placeholder
// ---------------------------------------------------------------------------

function buildChartPlaceholder(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'EVM Trend'));

  const chartArea = el('div', 'h-64 flex items-center justify-center bg-[var(--surface)] rounded-md');
  chartArea.appendChild(el('span', 'text-[var(--text-muted)] text-sm', 'S-Curve chart will render here with BCWS, BCWP, and ACWP trends'));
  card.appendChild(chartArea);

  return card;
}

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------

function buildLoadingState(): HTMLElement {
  const loading = el('div', 'flex items-center justify-center py-12');
  loading.appendChild(el('span', 'text-[var(--text-muted)] text-sm', 'Loading EVM data...'));
  return loading;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const projectId = parseProjectId();

    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleArea = el('div', 'flex items-center gap-3');
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', '\u2190 Back') as HTMLAnchorElement;
    backLink.href = `#/project/${projectId}`;
    titleArea.appendChild(backLink);
    titleArea.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Earned Value Management'));
    headerRow.appendChild(titleArea);
    wrapper.appendChild(headerRow);

    // Content slot
    const contentSlot = el('div');
    contentSlot.appendChild(buildLoadingState());
    wrapper.appendChild(contentSlot);

    container.appendChild(wrapper);

    // Load data
    const loadData = async () => {
      try {
        const svc = getProjectService();
        const [evmResult, project] = await Promise.all([
          svc.calculateEVM(projectId),
          svc.getProject(projectId),
        ]);

        const data: EVMData = {
          bcws: evmResult.bcws ?? 0,
          bcwp: evmResult.bcwp ?? 0,
          acwp: evmResult.acwp ?? 0,
          cpi: evmResult.cpi ?? 0,
          spi: evmResult.spi ?? 0,
          eac: evmResult.eac ?? 0,
          etc: evmResult.etc ?? 0,
          vac: evmResult.vac ?? 0,
          budgetedCost: project.budgetedCost ?? 0,
        };

        contentSlot.innerHTML = '';
        contentSlot.appendChild(buildKPICards(data));
        contentSlot.appendChild(buildCostSummary(data));
        contentSlot.appendChild(buildChartPlaceholder());
      } catch (err: unknown) {
        contentSlot.innerHTML = '';
        const message = err instanceof Error ? err.message : 'Failed to load EVM data';
        showMsg(wrapper, message, true);

        // Show empty state with zeros
        const emptyData: EVMData = {
          bcws: 0, bcwp: 0, acwp: 0,
          cpi: 0, spi: 0, eac: 0,
          etc: 0, vac: 0, budgetedCost: 0,
        };
        contentSlot.appendChild(buildKPICards(emptyData));
        contentSlot.appendChild(buildCostSummary(emptyData));
        contentSlot.appendChild(buildChartPlaceholder());
      }
    };

    // Initial load
    loadData();
  },
};
