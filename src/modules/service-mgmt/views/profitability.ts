/**
 * Service Profitability Analysis view.
 * Shows profitability by agreement and overall, with revenue vs cost breakdown.
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

interface ProfitabilityRow {
  agreementId: string;
  agreementName: string;
  revenue: number;
  laborCost: number;
  materialCost: number;
  profit: number;
  margin: number;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(overall: ProfitabilityRow | null): HTMLElement {
  const row = el('div', 'grid grid-cols-5 gap-4 mb-6');

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold font-mono ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  const data = overall ?? { revenue: 0, laborCost: 0, materialCost: 0, profit: 0, margin: 0 };
  row.appendChild(buildCard('Total Revenue', fmtCurrency(data.revenue), 'text-[var(--accent)]'));
  row.appendChild(buildCard('Labor Cost', fmtCurrency(data.laborCost)));
  row.appendChild(buildCard('Material Cost', fmtCurrency(data.materialCost)));
  row.appendChild(buildCard('Profit', fmtCurrency(data.profit), data.profit >= 0 ? 'text-emerald-400' : 'text-red-400'));
  row.appendChild(buildCard('Margin', fmtPct(data.margin), data.margin >= 0 ? 'text-emerald-400' : 'text-red-400'));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: ProfitabilityRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Agreement', 'Revenue', 'Labor Cost', 'Material Cost', 'Profit', 'Margin']) {
    const align = col !== 'Agreement' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No profitability data available. Complete work orders to see analysis.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.agreementName) as HTMLAnchorElement;
    link.href = `#/service/agreements/${row.agreementId}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.revenue)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.laborCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.materialCost)));

    const profitCls = row.profit >= 0 ? 'text-emerald-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono font-medium ${profitCls}`, fmtCurrency(row.profit)));

    const marginCls = row.margin >= 0 ? 'text-emerald-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${marginCls}`, fmtPct(row.margin)));

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Service Profitability'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export Report');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards(null));

    wrapper.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'By Agreement'));
    const rows: ProfitabilityRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
