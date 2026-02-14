/**
 * Equipment Utilization view.
 * Displays utilization analysis by equipment, by job, and FHWA rate comparison
 * for a given date range. Wired to EquipService for live data.
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
// Types (local view-layer mirrors)
// ---------------------------------------------------------------------------

interface UtilRow {
  equipmentId: string;
  equipmentNumber: string;
  description: string;
  totalHours: number;
  totalDays: number;
  totalAmount: number;
  availableHours: number;
  utilizationPct: number;
}

interface ByJobRow {
  jobId: string;
  equipmentId: string;
  equipmentNumber: string;
  totalHours: number;
  totalDays: number;
  totalAmount: number;
}

interface FhwaRow {
  equipmentId: string;
  equipmentNumber: string;
  description: string;
  internalHourlyRate: number;
  fhwaRate: number;
  variance: number;
  variancePct: number;
}

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------

function buildKpiCards(rows: UtilRow[]): HTMLElement {
  const totalEquipment = rows.length;
  const avgUtil = rows.length > 0
    ? rows.reduce((s, r) => s + r.utilizationPct, 0) / rows.length
    : 0;
  const totalHours = rows.reduce((s, r) => s + r.totalHours, 0);
  const totalAmount = rows.reduce((s, r) => s + r.totalAmount, 0);

  const grid = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6');

  const items: { label: string; value: string; colorCls?: string }[] = [
    { label: 'Total Equipment', value: String(totalEquipment) },
    {
      label: 'Avg Utilization',
      value: fmtPct(avgUtil),
      colorCls: avgUtil >= 75 ? 'text-emerald-400' : avgUtil >= 50 ? 'text-amber-400' : 'text-red-400',
    },
    { label: 'Total Hours', value: totalHours.toFixed(1) },
    { label: 'Total Amount', value: fmtCurrency(totalAmount) },
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
// Utilization Bar
// ---------------------------------------------------------------------------

function buildUtilizationBar(pct: number): HTMLElement {
  const wrap = el('div', 'flex items-center gap-2');

  const barOuter = el('div', 'flex-1 h-3 bg-[var(--surface)] rounded-full overflow-hidden');
  const barInner = el('div', 'h-full rounded-full');

  let barColor = 'bg-emerald-500';
  if (pct < 50) barColor = 'bg-red-500';
  else if (pct < 75) barColor = 'bg-amber-500';

  barInner.className = `h-full rounded-full ${barColor}`;
  barInner.style.width = `${Math.min(pct, 100)}%`;
  barOuter.appendChild(barInner);
  wrap.appendChild(barOuter);

  const pctColor = pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
  wrap.appendChild(el('span', `text-xs font-mono w-12 text-right ${pctColor}`, fmtPct(pct)));
  return wrap;
}

// ---------------------------------------------------------------------------
// By Equipment Table
// ---------------------------------------------------------------------------

function buildEquipmentTable(rows: UtilRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'border-b border-[var(--border)]');
  const cols = ['Equip #', 'Description', 'Total Hours', 'Total Days', 'Total Amount', 'Available Hours', 'Utilization %'];
  for (const col of cols) {
    const align = ['Total Hours', 'Total Days', 'Total Amount', 'Available Hours'].includes(col)
      ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
      : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'Select a date range and click Load Report to view utilization data.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]');

    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', row.equipmentNumber));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', row.description));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', row.totalHours.toFixed(1)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', row.totalDays.toFixed(1)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(row.totalAmount)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', String(row.availableHours)));

    const tdUtil = el('td', 'px-4 py-3');
    tdUtil.appendChild(buildUtilizationBar(row.utilizationPct));
    tr.appendChild(tdUtil);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// By Job Table
// ---------------------------------------------------------------------------

function buildJobTable(rows: ByJobRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'border-b border-[var(--border)]');
  const cols = ['Job ID', 'Equip #', 'Total Hours', 'Total Days', 'Total Amount'];
  for (const col of cols) {
    const align = ['Total Hours', 'Total Days', 'Total Amount'].includes(col)
      ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
      : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No job-level utilization data found for the selected period.');
    td.setAttribute('colspan', '5');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]');

    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', row.jobId));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', row.equipmentNumber));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', row.totalHours.toFixed(1)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', row.totalDays.toFixed(1)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(row.totalAmount)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// FHWA Comparison Table
// ---------------------------------------------------------------------------

function buildFhwaTable(rows: FhwaRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'border-b border-[var(--border)]');
  const cols = ['Equip #', 'Description', 'Internal Rate', 'FHWA Rate', 'Variance $', 'Variance %'];
  for (const col of cols) {
    const align = ['Internal Rate', 'FHWA Rate', 'Variance $', 'Variance %'].includes(col)
      ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
      : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No FHWA comparison data available. Ensure FHWA rates are configured in rate tables.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]');

    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', row.equipmentNumber));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', row.description));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(row.internalHourlyRate)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(row.fhwaRate)));

    const varCls = row.variance >= 0
      ? 'px-4 py-3 text-sm text-right font-mono text-emerald-400'
      : 'px-4 py-3 text-sm text-right font-mono text-red-400';
    tr.appendChild(el('td', varCls, fmtCurrency(row.variance)));
    tr.appendChild(el('td', varCls, fmtPct(row.variancePct)));

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

function exportUtilizationCSV(rows: UtilRow[]): void {
  const headers = ['Equip #', 'Description', 'Total Hours', 'Total Days', 'Total Amount', 'Available Hours', 'Utilization %'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      `"${r.equipmentNumber}"`,
      `"${r.description}"`,
      r.totalHours.toFixed(1),
      r.totalDays.toFixed(1),
      r.totalAmount.toFixed(2),
      String(r.availableHours),
      r.utilizationPct.toFixed(1),
    ].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'equipment-utilization.csv';
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment Utilization'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Export CSV');
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    // State
    let activeTab = 'By Equipment';
    let equipRows: UtilRow[] = [];
    let jobRows: ByJobRow[] = [];
    let fhwaRows: FhwaRow[] = [];

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
      if (equipRows.length === 0) {
        showMsg(wrapper, 'No data to export. Load a report first.', true);
        return;
      }
      exportUtilizationCSV(equipRows);
    });

    // Render active tab content
    function renderTab(): void {
      tabBarContainer.innerHTML = '';
      tabBarContainer.appendChild(buildTabBar(['By Equipment', 'By Job', 'FHWA'], activeTab, (tab) => {
        activeTab = tab;
        renderTab();
      }));

      tableContainer.innerHTML = '';
      switch (activeTab) {
        case 'By Equipment':
          tableContainer.appendChild(buildEquipmentTable(equipRows));
          break;
        case 'By Job':
          tableContainer.appendChild(buildJobTable(jobRows));
          break;
        case 'FHWA':
          tableContainer.appendChild(buildFhwaTable(fhwaRows));
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

        const [utilRows, utilJobRows, fhwaCompRows] = await Promise.all([
          svc.getUtilizationByEquipment(dateFrom, dateTo),
          svc.getUtilizationByJob(dateFrom, dateTo),
          svc.getFhwaComparison(dateTo),
        ]);

        equipRows = utilRows.map((r) => ({
          equipmentId: r.equipmentId,
          equipmentNumber: r.equipmentNumber,
          description: r.description,
          totalHours: r.totalHours,
          totalDays: r.totalDays,
          totalAmount: r.totalAmount,
          availableHours: r.availableHours,
          utilizationPct: r.utilizationPct,
        }));

        jobRows = utilJobRows.map((r) => ({
          jobId: r.jobId,
          equipmentId: r.equipmentId,
          equipmentNumber: r.equipmentNumber,
          totalHours: r.totalHours,
          totalDays: r.totalDays,
          totalAmount: r.totalAmount,
        }));

        fhwaRows = fhwaCompRows.map((r) => ({
          equipmentId: r.equipmentId,
          equipmentNumber: r.equipmentNumber,
          description: r.description,
          internalHourlyRate: r.internalHourlyRate,
          fhwaRate: r.fhwaRate,
          variance: r.variance,
          variancePct: r.variancePct,
        }));

        // Rebuild KPI cards
        kpiContainer.innerHTML = '';
        kpiContainer.appendChild(buildKpiCards(equipRows));

        // Rebuild tab + table
        renderTab();

        showMsg(wrapper, `Loaded ${equipRows.length} equipment records, ${jobRows.length} job records.`, false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load utilization data';
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
        const message = err instanceof Error ? err.message : 'Failed to load utilization data';
        showMsg(wrapper, message, true);
      }
    })();

    container.appendChild(wrapper);
  },
};
