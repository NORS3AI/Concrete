/**
 * Equipment Utilization view.
 * Displays utilization analysis by equipment and by job for a given date range.
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
// Types
// ---------------------------------------------------------------------------

interface UtilizationRow {
  equipmentNumber: string;
  description: string;
  totalHours: number;
  totalDays: number;
  totalAmount: number;
  availableHours: number;
  utilizationPct: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (fromDate: string, toDate: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const fromLabel = el('span', 'text-sm text-[var(--text-muted)]', 'From:');
  bar.appendChild(fromLabel);
  const fromDate = el('input', inputCls) as HTMLInputElement;
  fromDate.type = 'date';
  bar.appendChild(fromDate);

  const toLabel = el('span', 'text-sm text-[var(--text-muted)]', 'To:');
  bar.appendChild(toLabel);
  const toDate = el('input', inputCls) as HTMLInputElement;
  toDate.type = 'date';
  bar.appendChild(toDate);

  const runBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Run Report');
  runBtn.addEventListener('click', () => onFilter(fromDate.value, toDate.value));
  bar.appendChild(runBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Utilization Bar
// ---------------------------------------------------------------------------

function buildUtilizationBar(pct: number): HTMLElement {
  const wrap = el('div', 'flex items-center gap-2');

  const barOuter = el('div', 'flex-1 h-3 bg-[var(--surface)] rounded-full overflow-hidden');
  const barInner = el('div', 'h-full rounded-full');

  let barColor = 'bg-emerald-500';
  if (pct < 30) barColor = 'bg-red-500';
  else if (pct < 60) barColor = 'bg-amber-500';

  barInner.className = `h-full rounded-full ${barColor}`;
  barInner.style.width = `${Math.min(pct, 100)}%`;
  barOuter.appendChild(barInner);
  wrap.appendChild(barOuter);

  wrap.appendChild(el('span', 'text-xs font-mono text-[var(--text-muted)] w-12 text-right', fmtPct(pct)));
  return wrap;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: UtilizationRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Equipment', 'Description', 'Total Hours', 'Total Days', 'Amount', 'Available Hrs', 'Utilization']) {
    const align = ['Total Hours', 'Total Days', 'Amount', 'Available Hrs'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'Select a date range and run the report to view utilization data.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.equipmentNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.totalHours.toFixed(1)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.totalDays.toFixed(1)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(row.availableHours)));

    const tdUtil = el('td', 'py-2 px-3');
    tdUtil.appendChild(buildUtilizationBar(row.utilizationPct));
    tr.appendChild(tdUtil);

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

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment Utilization'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Export CSV');
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_from, _to) => { /* filter placeholder */ }));

    const rows: UtilizationRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
