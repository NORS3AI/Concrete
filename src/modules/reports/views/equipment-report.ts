/**
 * Equipment Report view.
 * Renders equipment utilization and cost reports showing hours, cost
 * analysis, job allocation, and utilization percentages.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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
// Constants
// ---------------------------------------------------------------------------

const REPORT_TYPE_OPTIONS = [
  { value: 'utilization', label: 'Utilization Report' },
  { value: 'cost', label: 'Cost Report' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EquipmentUtilizationDisplayRow {
  equipmentCode: string;
  equipmentName: string;
  totalHours: number;
  totalCost: number;
  averageHourlyRate: number;
  utilizationPct: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onApply: (reportType: string, periodStart: string, periodEnd: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of REPORT_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fromLabel = el('label', 'text-sm text-[var(--text-muted)]', 'From:');
  bar.appendChild(fromLabel);
  const periodStartInput = el('input', inputCls) as HTMLInputElement;
  periodStartInput.type = 'date';
  bar.appendChild(periodStartInput);

  const toLabel = el('label', 'text-sm text-[var(--text-muted)]', 'To:');
  bar.appendChild(toLabel);
  const periodEndInput = el('input', inputCls) as HTMLInputElement;
  periodEndInput.type = 'date';
  periodEndInput.value = new Date().toISOString().split('T')[0];
  bar.appendChild(periodEndInput);

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  applyBtn.addEventListener('click', () => {
    onApply(typeSelect.value, periodStartInput.value, periodEndInput.value);
  });
  bar.appendChild(applyBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: EquipmentUtilizationDisplayRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const columns = [
    { name: 'Equipment', numeric: false },
    { name: 'Total Hours', numeric: true },
    { name: 'Total Cost', numeric: true },
    { name: 'Avg Rate/Hr', numeric: true },
    { name: 'Utilization', numeric: true },
  ];

  for (const col of columns) {
    const align = col.numeric ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col.name));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No equipment data available. Select a period and generate the report.');
    td.setAttribute('colspan', '5');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totalHours = 0;
  let totalCost = 0;

  for (const row of rows) {
    totalHours += row.totalHours;
    totalCost += row.totalCost;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium', `${row.equipmentCode} - ${row.equipmentName}`));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.totalHours.toFixed(1)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.averageHourlyRate)));

    const utilCls = row.utilizationPct >= 75
      ? 'py-2 px-3 text-right font-mono text-emerald-400'
      : row.utilizationPct >= 50
      ? 'py-2 px-3 text-right font-mono text-amber-400'
      : 'py-2 px-3 text-right font-mono text-red-400';
    tr.appendChild(el('td', utilCls, fmtPct(row.utilizationPct)));

    tbody.appendChild(tr);
  }

  if (rows.length > 0) {
    const totalRow = el('tr', 'bg-[var(--surface)] font-bold border-t-2 border-[var(--border)]');
    totalRow.appendChild(el('td', 'py-2 px-3', `Totals (${rows.length} items)`));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', totalHours.toFixed(1)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalCost)));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    totalRow.appendChild(el('td', 'py-2 px-3'));
    tbody.appendChild(totalRow);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment Reports'));

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_reportType, _periodStart, _periodEnd) => {
      /* filter action placeholder */
    }));

    const rows: EquipmentUtilizationDisplayRow[] = [];
    wrapper.appendChild(buildTable(rows));
    wrapper.appendChild(buildExportBar());

    container.appendChild(wrapper);
  },
};
