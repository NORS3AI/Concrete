/**
 * Equipment P&L view.
 * Displays profit and loss by equipment unit, and owning vs operating cost
 * breakdown. Wired to EquipService for live data.
 */

import { getEquipService } from '../service-accessor';

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

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PnlRow {
  equipmentId: string;
  equipmentNumber: string;
  description: string;
  revenue: number;
  fuelCost: number;
  maintenanceCost: number;
  depreciationCost: number;
  otherCosts: number;
  totalCosts: number;
  netIncome: number;
}

interface OvoRow {
  equipmentId: string;
  equipmentNumber: string;
  description: string;
  owningCosts: number;
  operatingCosts: number;
  totalCosts: number;
  owningPct: number;
  operatingPct: number;
}

// ---------------------------------------------------------------------------
// P&L KPI Cards
// ---------------------------------------------------------------------------

function buildPnlKpiCards(rows: PnlRow[]): HTMLElement {
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCosts = rows.reduce((s, r) => s + r.totalCosts, 0);
  const totalNet = rows.reduce((s, r) => s + r.netIncome, 0);
  const unitCount = rows.length;

  const grid = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6');

  const items: { label: string; value: string; colorCls?: string }[] = [
    { label: 'Total Revenue', value: fmtCurrency(totalRevenue), colorCls: 'text-emerald-400' },
    { label: 'Total Costs', value: fmtCurrency(totalCosts), colorCls: 'text-red-400' },
    {
      label: 'Total Net Income',
      value: fmtCurrency(totalNet),
      colorCls: totalNet >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
    { label: 'Unit Count', value: String(unitCount) },
  ];

  for (const item of items) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', item.label));
    card.appendChild(el('div', `text-2xl font-bold mt-1 ${item.colorCls ?? 'text-[var(--text)]'}`, item.value));
    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Owning vs Operating KPI Cards
// ---------------------------------------------------------------------------

function buildOvoKpiCards(rows: OvoRow[]): HTMLElement {
  const totalOwning = rows.reduce((s, r) => s + r.owningCosts, 0);
  const totalOperating = rows.reduce((s, r) => s + r.operatingCosts, 0);
  const ratio = totalOperating > 0 ? (totalOwning / totalOperating) : 0;

  const grid = el('div', 'grid grid-cols-2 md:grid-cols-3 gap-4 mb-6');

  const items: { label: string; value: string }[] = [
    { label: 'Total Owning', value: fmtCurrency(totalOwning) },
    { label: 'Total Operating', value: fmtCurrency(totalOperating) },
    { label: 'Owning / Operating Ratio', value: ratio.toFixed(2) },
  ];

  for (const item of items) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', item.label));
    card.appendChild(el('div', 'text-2xl font-bold text-[var(--text)] mt-1', item.value));
    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// P&L Table
// ---------------------------------------------------------------------------

function buildPnlTable(rows: PnlRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'border-b border-[var(--border)]');
  const cols = ['Equip #', 'Description', 'Revenue', 'Fuel', 'Maintenance', 'Depreciation', 'Other', 'Total Costs', 'Net Income'];
  for (const col of cols) {
    const align = ['Revenue', 'Fuel', 'Maintenance', 'Depreciation', 'Other', 'Total Costs', 'Net Income'].includes(col)
      ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
      : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'Select a date range and click Load Report to view equipment P&L data.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const rowBg = row.netIncome >= 0
      ? 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)] bg-emerald-500/5'
      : 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)] bg-red-500/5';
    const tr = el('tr', rowBg);

    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', row.equipmentNumber));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', row.description));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono text-emerald-400', fmtCurrency(row.revenue)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono text-red-400', fmtCurrency(row.fuelCost)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono text-red-400', fmtCurrency(row.maintenanceCost)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono text-red-400', fmtCurrency(row.depreciationCost)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono text-red-400', fmtCurrency(row.otherCosts)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono font-medium text-[var(--text-muted)]', fmtCurrency(row.totalCosts)));

    const netCls = row.netIncome >= 0
      ? 'px-4 py-3 text-sm text-right font-mono font-bold text-emerald-400'
      : 'px-4 py-3 text-sm text-right font-mono font-bold text-red-400';
    tr.appendChild(el('td', netCls, fmtCurrency(row.netIncome)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Owning vs Operating Table
// ---------------------------------------------------------------------------

function buildOvoTable(rows: OvoRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'border-b border-[var(--border)]');
  const cols = ['Equip #', 'Description', 'Owning Costs', 'Operating Costs', 'Total Costs', 'Owning %', 'Operating %'];
  for (const col of cols) {
    const align = ['Owning Costs', 'Operating Costs', 'Total Costs', 'Owning %', 'Operating %'].includes(col)
      ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
      : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No owning vs operating data available for the selected period.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]');

    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', row.equipmentNumber));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', row.description));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono text-[var(--text)]', fmtCurrency(row.owningCosts)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono text-[var(--text)]', fmtCurrency(row.operatingCosts)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono font-medium text-[var(--text)]', fmtCurrency(row.totalCosts)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono text-[var(--text-muted)]', fmtPct(row.owningPct)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono text-[var(--text-muted)]', fmtPct(row.operatingPct)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onLoad: (fromDate: string, toDate: string) => void,
): { bar: HTMLElement; fromInput: HTMLInputElement; toInput: HTMLInputElement } {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-6');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  bar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'From:'));
  const fromInput = el('input', inputCls) as HTMLInputElement;
  fromInput.type = 'date';
  const year = new Date().getFullYear();
  fromInput.value = `${year}-01-01`;
  bar.appendChild(fromInput);

  bar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'To:'));
  const toInput = el('input', inputCls) as HTMLInputElement;
  toInput.type = 'date';
  toInput.value = `${year}-12-31`;
  bar.appendChild(toInput);

  const runBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Load Report');
  runBtn.addEventListener('click', () => onLoad(fromInput.value, toInput.value));
  bar.appendChild(runBtn);

  return { bar, fromInput, toInput };
}

// ---------------------------------------------------------------------------
// Tab Bar
// ---------------------------------------------------------------------------

function buildTabBar(
  tabs: string[],
  activeTab: string,
  onTabChange: (tab: string) => void,
): HTMLElement {
  const bar = el('div', 'flex gap-1 mb-4 border-b border-[var(--border)]');

  for (const tab of tabs) {
    const isActive = tab === activeTab;
    const btn = el(
      'button',
      isActive
        ? 'px-4 py-2 text-sm font-medium text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px'
        : 'px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]',
      tab,
    );
    btn.addEventListener('click', () => onTabChange(tab));
    bar.appendChild(btn);
  }

  return bar;
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportPnlCSV(rows: PnlRow[]): void {
  const headers = ['Equip #', 'Description', 'Revenue', 'Fuel', 'Maintenance', 'Depreciation', 'Other', 'Total Costs', 'Net Income'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      `"${r.equipmentNumber}"`,
      `"${r.description}"`,
      r.revenue.toFixed(2),
      r.fuelCost.toFixed(2),
      r.maintenanceCost.toFixed(2),
      r.depreciationCost.toFixed(2),
      r.otherCosts.toFixed(2),
      r.totalCosts.toFixed(2),
      r.netIncome.toFixed(2),
    ].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'equipment-pnl.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    // Header row
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment P&L & Analysis'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Export CSV');
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    // State
    let activeTab = 'P&L by Unit';
    let pnlRows: PnlRow[] = [];
    let ovoRows: OvoRow[] = [];

    // Containers
    const kpiContainer = el('div', '');
    const tabBarContainer = el('div', '');
    const tableContainer = el('div', '');

    // Build filter bar with defaults to current year
    const { bar, fromInput, toInput } = buildFilterBar((fromDate, toDate) => {
      void loadReport(fromDate, toDate);
    });
    wrapper.appendChild(bar);

    wrapper.appendChild(kpiContainer);
    wrapper.appendChild(tabBarContainer);
    wrapper.appendChild(tableContainer);

    // Export handler
    exportBtn.addEventListener('click', () => {
      if (pnlRows.length === 0) {
        showMsg(wrapper, 'No data to export. Load a report first.', true);
        return;
      }
      exportPnlCSV(pnlRows);
    });

    // Render active tab content
    function renderTab(): void {
      tabBarContainer.innerHTML = '';
      tabBarContainer.appendChild(buildTabBar(['P&L by Unit', 'Owning vs Operating'], activeTab, (tab) => {
        activeTab = tab;
        renderTab();
      }));

      kpiContainer.innerHTML = '';
      tableContainer.innerHTML = '';

      switch (activeTab) {
        case 'P&L by Unit':
          kpiContainer.appendChild(buildPnlKpiCards(pnlRows));
          tableContainer.appendChild(buildPnlTable(pnlRows));
          break;
        case 'Owning vs Operating':
          kpiContainer.appendChild(buildOvoKpiCards(ovoRows));
          tableContainer.appendChild(buildOvoTable(ovoRows));
          break;
      }
    }

    // Load report data from service
    async function loadReport(dateFrom: string, dateTo: string): Promise<void> {
      if (!dateFrom || !dateTo) {
        showMsg(wrapper, 'Please select both From and To dates.', true);
        return;
      }

      try {
        const svc = getEquipService();

        const [pnlData, ovoData] = await Promise.all([
          svc.getEquipmentPnl(dateFrom, dateTo),
          svc.getOwningVsOperating(dateFrom, dateTo),
        ]);

        pnlRows = pnlData.map((r) => ({
          equipmentId: r.equipmentId,
          equipmentNumber: r.equipmentNumber,
          description: r.description,
          revenue: r.revenue,
          fuelCost: r.fuelCost,
          maintenanceCost: r.maintenanceCost,
          depreciationCost: r.depreciationCost,
          otherCosts: r.otherCosts,
          totalCosts: r.totalCosts,
          netIncome: r.netIncome,
        }));

        ovoRows = ovoData.map((r) => ({
          equipmentId: r.equipmentId,
          equipmentNumber: r.equipmentNumber,
          description: r.description,
          owningCosts: r.owningCosts,
          operatingCosts: r.operatingCosts,
          totalCosts: r.totalCosts,
          owningPct: r.owningPct,
          operatingPct: r.operatingPct,
        }));

        // Rebuild tab + KPIs + table
        renderTab();

        showMsg(wrapper, `Loaded P&L for ${pnlRows.length} equipment units.`, false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load P&L data';
        showMsg(wrapper, message, true);
      }
    }

    // Initial render with empty state
    renderTab();

    // Auto-load on mount with default date range
    void (async () => {
      try {
        await loadReport(fromInput.value, toInput.value);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load P&L data';
        showMsg(wrapper, message, true);
      }
    })();

    container.appendChild(wrapper);
  },
};
