/**
 * Job Cost Detail report view.
 * KPI summary row + cost detail table grouped by cost code and cost type.
 * Over-budget rows are highlighted in red.
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

interface CostDetailRow {
  costCode: string;
  costCodeDescription: string;
  costType: string;
  budget: number;
  actual: number;
  committed: number;
  etc: number;
  eac: number;
  variance: number;
}

// ---------------------------------------------------------------------------
// KPI Row
// ---------------------------------------------------------------------------

function buildKpiRow(
  budget: number,
  actual: number,
  committed: number,
  eac: number,
  variance: number,
): HTMLElement {
  const row = el('div', 'grid grid-cols-5 gap-4 mb-6');

  const kpis = [
    { label: 'Total Budget', value: fmtCurrency(budget), cls: '' },
    { label: 'Actual Cost', value: fmtCurrency(actual), cls: '' },
    { label: 'Committed', value: fmtCurrency(committed), cls: '' },
    { label: 'Est. at Completion', value: fmtCurrency(eac), cls: '' },
    { label: 'Variance', value: fmtCurrency(variance), cls: variance >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]' },
  ];

  for (const kpi of kpis) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', kpi.label));
    card.appendChild(el('div', `text-lg font-bold ${kpi.cls}`.trim(), kpi.value));
    row.appendChild(card);
  }

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: CostDetailRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const cols = ['Cost Code', 'Cost Type', 'Budget', 'Actual', 'Committed', 'ETC', 'EAC', 'Variance'];
  for (const col of cols) {
    const align = ['Budget', 'Actual', 'Committed', 'ETC', 'EAC', 'Variance'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No cost data found for this job.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totalBudget = 0;
  let totalActual = 0;
  let totalCommitted = 0;
  let totalEtc = 0;
  let totalEac = 0;
  let totalVariance = 0;

  for (const row of rows) {
    const isOverBudget = row.variance < 0;
    const rowCls = isOverBudget
      ? 'border-b border-[var(--border)] bg-red-500/5'
      : 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors';
    const tr = el('tr', rowCls);

    const tdCode = el('td', 'py-2 px-3');
    tdCode.appendChild(el('span', 'font-mono', row.costCode));
    tdCode.appendChild(el('span', 'text-[var(--text-muted)] ml-2 text-xs', row.costCodeDescription));
    tr.appendChild(tdCode);

    tr.appendChild(el('td', 'py-2 px-3', row.costType));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.budget)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.actual)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.committed)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.etc)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.eac)));

    const varCls = row.variance >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono font-semibold ${varCls}`, fmtCurrency(row.variance)));

    tbody.appendChild(tr);

    totalBudget += row.budget;
    totalActual += row.actual;
    totalCommitted += row.committed;
    totalEtc += row.etc;
    totalEac += row.eac;
    totalVariance += row.variance;
  }

  table.appendChild(tbody);

  // Totals footer
  if (rows.length > 0) {
    const tfoot = el('tfoot');
    const footRow = el('tr', 'border-t-2 border-[var(--border)] font-semibold');
    footRow.appendChild(el('td', 'py-2 px-3', 'Totals'));
    footRow.appendChild(el('td', 'py-2 px-3', ''));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalBudget)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalActual)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalCommitted)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalEtc)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalEac)));
    const varCls = totalVariance >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';
    footRow.appendChild(el('td', `py-2 px-3 text-right font-mono ${varCls}`, fmtCurrency(totalVariance)));
    tfoot.appendChild(footRow);
    table.appendChild(tfoot);
  }

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Job Cost Detail'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Jobs') as HTMLAnchorElement;
    backLink.href = '#/jobs';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // KPI row (placeholder zeros)
    wrapper.appendChild(buildKpiRow(0, 0, 0, 0, 0));

    // Table
    const rows: CostDetailRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
