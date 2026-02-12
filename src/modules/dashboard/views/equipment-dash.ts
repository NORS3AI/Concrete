/**
 * Equipment Utilization Dashboard view.
 *
 * Displays equipment utilization rates, assigned vs. available equipment,
 * equipment cost per hour, maintenance schedules, and idle equipment alerts.
 * Supports period selector and entity filter.
 */

import {
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

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EquipmentRow {
  [key: string]: unknown;
  id: string;
  name: string;
  type: string;
  status: string;
  assignedJob: string;
  hoursUsed: number;
  costPerHour: number;
  totalCost: number;
  utilizationPct: number;
}

interface EquipmentSummary {
  [key: string]: unknown;
  totalUnits: number;
  assignedUnits: number;
  availableUnits: number;
  maintenanceUnits: number;
  retiredUnits: number;
  overallUtilization: number;
  totalCost: number;
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function buildUtilizationSummary(summary: EquipmentSummary): HTMLElement {
  const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4');

  const cards = [
    { label: 'Total Equipment', value: summary.totalUnits.toString(), cls: 'text-[var(--text)]' },
    { label: 'Assigned', value: summary.assignedUnits.toString(), cls: 'text-emerald-400' },
    { label: 'Available', value: summary.availableUnits.toString(), cls: 'text-blue-400' },
    { label: 'Utilization Rate', value: `${summary.overallUtilization.toFixed(1)}%`, cls: summary.overallUtilization >= 60 ? 'text-emerald-400' : 'text-amber-400' },
  ];

  for (const card of cards) {
    const cardEl = el('div', 'p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]');
    cardEl.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', card.label));
    cardEl.appendChild(el('div', `text-2xl font-bold ${card.cls}`, card.value));
    grid.appendChild(cardEl);
  }

  return grid;
}

function buildUtilizationChart(): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  const placeholder = el('div', 'flex items-center justify-center h-48 text-[var(--text-muted)]', 'Equipment utilization chart will render here when Chart.js is connected and equipment data is available.');
  wrap.appendChild(placeholder);
  return wrap;
}

function buildEquipmentTable(rows: EquipmentRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Equipment', 'Type', 'Status', 'Assigned Job', 'Hours', 'Cost/Hr', 'Total Cost', 'Util. %']) {
    const align = ['Hours', 'Cost/Hr', 'Total Cost', 'Util. %'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No equipment data available.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline font-medium', row.name) as HTMLAnchorElement;
    link.href = `#/equip/equipment/${row.id}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.type));

    const statusColors: Record<string, string> = {
      assigned: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      available: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      maintenance: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      retired: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
    };
    const tdStatus = el('td', 'py-2 px-3');
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[row.status] ?? statusColors.available}`, row.status));
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.assignedJob || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.hoursUsed.toFixed(0)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.costPerHour)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalCost)));

    const utilCls = row.utilizationPct >= 60 ? 'text-emerald-400' : row.utilizationPct >= 40 ? 'text-amber-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${utilCls}`, `${row.utilizationPct.toFixed(1)}%`));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
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
      'Equipment Utilization',
      'Equipment assignment, utilization rates, and cost analysis',
      periodSelector,
      entityFilter,
    );
    wrapper.appendChild(header);

    // Summary
    const summary: EquipmentSummary = {
      totalUnits: 0,
      assignedUnits: 0,
      availableUnits: 0,
      maintenanceUnits: 0,
      retiredUnits: 0,
      overallUtilization: 0,
      totalCost: 0,
    };
    wrapper.appendChild(buildSection('Utilization Summary', buildUtilizationSummary(summary)));

    // Chart
    wrapper.appendChild(buildSection('Utilization Trend', buildUtilizationChart()));

    // Table
    const equipmentRows: EquipmentRow[] = [];
    wrapper.appendChild(buildSection('Equipment Detail', buildEquipmentTable(equipmentRows)));

    if (equipmentRows.length === 0) {
      wrapper.appendChild(
        buildEmptyState(
          'No equipment data available. Add equipment records to see utilization metrics.',
          'Go to Equipment',
          () => { window.location.hash = '#/equip/equipment'; },
        ),
      );
    }

    container.appendChild(wrapper);
  },
};
