/**
 * Cost Impact Analysis view.
 * Breakdown by cost type, markup summary, total impact for a change order.
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
// Cost Type Cards
// ---------------------------------------------------------------------------

function buildCostTypeCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-3 gap-3 mb-6');

  const buildCard = (label: string, amount: string, colorCls: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold font-mono ${colorCls}`, amount));
    return card;
  };

  row.appendChild(buildCard('Labor', fmtCurrency(0), 'text-blue-400'));
  row.appendChild(buildCard('Material', fmtCurrency(0), 'text-emerald-400'));
  row.appendChild(buildCard('Subcontract', fmtCurrency(0), 'text-purple-400'));
  row.appendChild(buildCard('Equipment', fmtCurrency(0), 'text-amber-400'));
  row.appendChild(buildCard('Overhead', fmtCurrency(0), 'text-orange-400'));
  row.appendChild(buildCard('Other', fmtCurrency(0), 'text-zinc-400'));

  return row;
}

// ---------------------------------------------------------------------------
// Impact Summary Table
// ---------------------------------------------------------------------------

interface ImpactRow {
  category: string;
  amount: number;
  pctOfTotal: number;
}

function buildImpactTable(rows: ImpactRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  headRow.appendChild(el('th', 'py-2 px-4 font-medium', 'Cost Category'));
  headRow.appendChild(el('th', 'py-2 px-4 font-medium text-right', 'Amount'));
  headRow.appendChild(el('th', 'py-2 px-4 font-medium text-right', '% of Total'));
  headRow.appendChild(el('th', 'py-2 px-4 font-medium', 'Distribution'));
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No cost impact data. Add line items to the change order to see cost breakdown.');
    td.setAttribute('colspan', '4');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)]');
    tr.appendChild(el('td', 'py-2 px-4 font-medium text-[var(--text)]', row.category));
    tr.appendChild(el('td', 'py-2 px-4 text-right font-mono', fmtCurrency(row.amount)));
    tr.appendChild(el('td', 'py-2 px-4 text-right font-mono text-[var(--text-muted)]', `${row.pctOfTotal.toFixed(1)}%`));

    const tdBar = el('td', 'py-2 px-4');
    const barOuter = el('div', 'w-full bg-[var(--surface)] rounded-full h-2');
    const barInner = el('div', 'bg-[var(--accent)] rounded-full h-2');
    barInner.style.width = `${Math.min(row.pctOfTotal, 100)}%`;
    barOuter.appendChild(barInner);
    tdBar.appendChild(barOuter);
    tr.appendChild(tdBar);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Markup Summary
// ---------------------------------------------------------------------------

function buildMarkupSummary(): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mt-4');
  section.appendChild(el('h3', 'text-sm font-semibold text-[var(--text-muted)] mb-3', 'MARKUP & TOTAL IMPACT'));

  const grid = el('div', 'grid grid-cols-3 gap-4 text-sm');

  const buildRow = (label: string, value: string, bold?: boolean): HTMLElement => {
    const group = el('div', 'flex justify-between');
    group.appendChild(el('span', 'text-[var(--text-muted)]', label));
    group.appendChild(el('span', `font-mono ${bold ? 'font-bold text-[var(--text)]' : 'text-[var(--text)]'}`, value));
    return group;
  };

  const col1 = el('div', 'space-y-2');
  col1.appendChild(buildRow('Subtotal (All Cost Types)', fmtCurrency(0)));
  col1.appendChild(buildRow('Total Markup', fmtCurrency(0)));

  const col2 = el('div', 'space-y-2');
  col2.appendChild(buildRow('Schedule Impact', '0 days'));
  col2.appendChild(buildRow('Effective Date', '-'));

  const col3 = el('div', 'space-y-2');
  col3.appendChild(buildRow('Grand Total', fmtCurrency(0), true));
  col3.appendChild(buildRow('Approved Amount', fmtCurrency(0)));

  grid.appendChild(col1);
  grid.appendChild(col2);
  grid.appendChild(col3);
  section.appendChild(grid);

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Cost Impact Analysis'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Change Order') as HTMLAnchorElement;
    backLink.href = '#/change-orders/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildCostTypeCards());

    wrapper.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Cost Breakdown'));
    const rows: ImpactRow[] = [];
    wrapper.appendChild(buildImpactTable(rows));

    wrapper.appendChild(buildMarkupSummary());

    container.appendChild(wrapper);
  },
};
