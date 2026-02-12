/**
 * Change Order Trend Report view.
 * CO volume chart placeholder, cost by job table, period comparison.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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

interface TrendPeriodRow {
  period: string;
  count: number;
  totalAmount: number;
  approvedAmount: number;
}

interface JobCostRow {
  jobId: string;
  jobName: string;
  totalCOs: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  netImpact: number;
}

// ---------------------------------------------------------------------------
// Chart Placeholder
// ---------------------------------------------------------------------------

function buildChartPlaceholder(): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-6');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Change Order Volume & Cost Trend'));

  const chartArea = el('div', 'h-64 flex items-center justify-center border border-dashed border-[var(--border)] rounded-lg bg-[var(--surface)]');
  chartArea.appendChild(el('span', 'text-[var(--text-muted)] text-sm', 'Chart placeholder -- CO volume and cost trend over time'));
  section.appendChild(chartArea);

  return section;
}

// ---------------------------------------------------------------------------
// Period Comparison Table
// ---------------------------------------------------------------------------

function buildPeriodTable(rows: TrendPeriodRow[]): HTMLElement {
  const section = el('div', 'space-y-3 mb-6');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Period Comparison'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Period', 'Count', 'Total Amount', 'Approved Amount']) {
    const align = ['Count', 'Total Amount', 'Approved Amount'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No trend data available. Create change orders to generate trend analysis.');
    td.setAttribute('colspan', '4');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.period));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(row.count)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(row.approvedAmount)));
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ---------------------------------------------------------------------------
// Cost by Job Table
// ---------------------------------------------------------------------------

function buildJobCostTable(rows: JobCostRow[]): HTMLElement {
  const section = el('div', 'space-y-3');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Cost by Job'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Job', 'Total COs', 'Approved', 'Pending', 'Rejected', 'Net Impact']) {
    const align = ['Total COs', 'Approved', 'Pending', 'Rejected', 'Net Impact'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No job cost data available.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.jobName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(row.totalCOs)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(row.approvedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', fmtCurrency(row.pendingAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', fmtCurrency(row.rejectedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium text-[var(--text)]', fmtCurrency(row.netImpact)));
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
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

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Change Order Trend Report'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildChartPlaceholder());

    const periodRows: TrendPeriodRow[] = [];
    wrapper.appendChild(buildPeriodTable(periodRows));

    const jobRows: JobCostRow[] = [];
    wrapper.appendChild(buildJobCostTable(jobRows));

    container.appendChild(wrapper);
  },
};
