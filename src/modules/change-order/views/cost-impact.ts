/**
 * Cost Impact Analysis view.
 * Breakdown by cost type, markup summary, total impact for a change order.
 * Wired to ChangeOrderService for live data.
 */

import { getChangeOrderService } from '../service-accessor';

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

// ---------------------------------------------------------------------------
// Cost Type Cards
// ---------------------------------------------------------------------------

interface CostImpactData {
  labor: number;
  material: number;
  subcontract: number;
  equipment: number;
  overhead: number;
  other: number;
  subtotal: number;
  markup: number;
  total: number;
}

function buildCostTypeCards(impact: CostImpactData): HTMLElement {
  const row = el('div', 'grid grid-cols-3 gap-3 mb-6');

  const buildCard = (label: string, amount: string, colorCls: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold font-mono ${colorCls}`, amount));
    return card;
  };

  row.appendChild(buildCard('Labor', fmtCurrency(impact.labor), 'text-blue-400'));
  row.appendChild(buildCard('Material', fmtCurrency(impact.material), 'text-emerald-400'));
  row.appendChild(buildCard('Subcontract', fmtCurrency(impact.subcontract), 'text-purple-400'));
  row.appendChild(buildCard('Equipment', fmtCurrency(impact.equipment), 'text-amber-400'));
  row.appendChild(buildCard('Overhead', fmtCurrency(impact.overhead), 'text-orange-400'));
  row.appendChild(buildCard('Other', fmtCurrency(impact.other), 'text-zinc-400'));

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

function buildMarkupSummary(
  impact: CostImpactData,
  scheduleExtensionDays: number,
  effectiveDate: string,
  approvedAmount: number,
): HTMLElement {
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
  col1.appendChild(buildRow('Subtotal (All Cost Types)', fmtCurrency(impact.subtotal)));
  col1.appendChild(buildRow('Total Markup', fmtCurrency(impact.markup)));

  const col2 = el('div', 'space-y-2');
  col2.appendChild(buildRow('Schedule Impact', scheduleExtensionDays > 0 ? `${scheduleExtensionDays} days` : '0 days'));
  col2.appendChild(buildRow('Effective Date', effectiveDate || '-'));

  const col3 = el('div', 'space-y-2');
  col3.appendChild(buildRow('Grand Total', fmtCurrency(impact.total), true));
  col3.appendChild(buildRow('Approved Amount', fmtCurrency(approvedAmount)));

  grid.appendChild(col1);
  grid.appendChild(col2);
  grid.appendChild(col3);
  section.appendChild(grid);

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

void (async () => {
  try {
    const svc = getChangeOrderService();

    // Parse CO ID from hash
    const match = location.hash.match(/#\/change-orders\/([^/]+)\/cost-impact/);
    const coId = match?.[1] ?? null;

    if (!coId) {
      showMsg(wrapper, 'No change order ID found in URL.', true);
      return;
    }

    // Load change order data
    const co = svc.getChangeOrder(coId);
    if (!co) {
      showMsg(wrapper, `Change order not found: ${coId}`, true);
      return;
    }

    // Load cost impact
    const impact = svc.calculateCostImpact(coId);

    // Header with CO title/number
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', `Cost Impact Analysis - ${co.number}`));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Change Order') as HTMLAnchorElement;
    backLink.href = `#/change-orders/${coId}`;
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // CO title subtitle
    wrapper.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', co.title));

    // Cost type cards with actual values
    wrapper.appendChild(buildCostTypeCards(impact));

    // Impact table
    wrapper.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Cost Breakdown'));

    // Build impact rows from the CostImpact breakdown
    const costCategories: { category: string; amount: number }[] = [
      { category: 'Labor', amount: impact.labor },
      { category: 'Material', amount: impact.material },
      { category: 'Subcontract', amount: impact.subcontract },
      { category: 'Equipment', amount: impact.equipment },
      { category: 'Overhead', amount: impact.overhead },
      { category: 'Other', amount: impact.other },
    ];

    // Filter out zero-amount categories and compute percentages
    const nonZeroCategories = costCategories.filter((c) => c.amount !== 0);
    const impactRows: ImpactRow[] = nonZeroCategories.map((c) => ({
      category: c.category,
      amount: c.amount,
      pctOfTotal: impact.subtotal > 0 ? (c.amount / impact.subtotal) * 100 : 0,
    }));

    wrapper.appendChild(buildImpactTable(impactRows));

    // Markup summary with real totals
    wrapper.appendChild(buildMarkupSummary(
      impact,
      co.scheduleExtensionDays ?? 0,
      co.effectiveDate ?? '',
      co.approvedAmount ?? 0,
    ));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    showMsg(wrapper, message, true);
  }
})();

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};
